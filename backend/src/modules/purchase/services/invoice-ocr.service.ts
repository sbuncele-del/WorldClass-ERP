/**
 * Invoice capture: extracts structured data from an uploaded vendor invoice
 * (image or PDF) using Claude's vision API, matches it to an existing
 * supplier, persists the source document to S3, and creates a draft
 * purchase.vendor_invoices row for review.
 */

import AWS from 'aws-sdk';
import pool from '../../../config/database';
import { purchaseInvoiceRepository } from '../../../repositories/purchase';
import { TenantContext } from '../../../repositories/BaseRepository';

const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'eu-north-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const S3_BUCKET = process.env.S3_BUCKET_NAME || 'aetheros-erp-invoices';
const SUPPLIER_MATCH_THRESHOLD = 0.55;

interface ExtractedInvoiceData {
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  currency_code: string | null;
  confidence: number;
  line_items: Array<{ description: string; quantity?: number; unit_price?: number; amount?: number }>;
}

async function uploadDocumentToS3(buffer: Buffer, mimeType: string, tenantId: string): Promise<string> {
  const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType.split('/')[1] || 'bin';
  const key = `vendor-invoices/${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'private',
  }).promise();

  return `s3://${S3_BUCKET}/${key}`;
}

function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in Claude response');
  return JSON.parse(match[0]);
}

async function callClaudeVision(buffer: Buffer, mimeType: string): Promise<ExtractedInvoiceData> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const isPdf = mimeType === 'application/pdf';
  const documentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') } }
    : { type: 'image', source: { type: 'base64', media_type: mimeType, data: buffer.toString('base64') } };

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    temperature: 0,
    system: 'You extract structured data from vendor invoices. Respond only with a single valid JSON object, no other text.',
    messages: [{
      role: 'user',
      content: [
        documentBlock,
        {
          type: 'text',
          text: `Extract this invoice's data as JSON with exactly these keys:
{
  "vendor_name": string or null,
  "invoice_number": string or null,
  "invoice_date": "YYYY-MM-DD" or null,
  "due_date": "YYYY-MM-DD" or null,
  "subtotal": number or null,
  "vat_amount": number or null,
  "total_amount": number or null,
  "currency_code": "ZAR"/"USD"/etc or null,
  "confidence": number from 0 to 100 (your confidence in this extraction),
  "line_items": [{ "description": string, "quantity": number, "unit_price": number, "amount": number }]
}
If a field isn't present on the invoice, use null. Do not guess values.`,
        },
      ],
    }],
  });

  const content = response.content?.[0]?.type === 'text' ? response.content[0].text : '{}';
  return extractJson(content);
}

// Dice coefficient over normalized bigrams - dependency-free fuzzy match
// good enough to catch "ABC Suppliers (Pty) Ltd" vs "ABC Suppliers".
function similarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  let overlap = 0;
  for (const bg of ba) if (bb.has(bg)) overlap++;
  return (2 * overlap) / (ba.size + bb.size || 1);
}

async function matchSupplier(tenantId: string, vendorName: string | null): Promise<{ supplierId: number | null; score: number }> {
  if (!vendorName) return { supplierId: null, score: 0 };

  const result = await pool.query(
    `SELECT supplier_id, company_name FROM purchase.suppliers WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId]
  );

  let best: { supplier_id: number; score: number } | null = null;
  for (const row of result.rows) {
    const score = similarity(vendorName, row.company_name);
    if (!best || score > best.score) best = { supplier_id: row.supplier_id, score };
  }

  if (best && best.score >= SUPPLIER_MATCH_THRESHOLD) {
    return { supplierId: best.supplier_id, score: best.score };
  }
  return { supplierId: null, score: best?.score || 0 };
}

export async function captureVendorInvoice(
  ctx: TenantContext,
  file: { buffer: Buffer; mimetype: string }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Invoice capture is not configured (ANTHROPIC_API_KEY missing)');
  }

  const [extracted, sourceDocumentUrl] = await Promise.all([
    callClaudeVision(file.buffer, file.mimetype),
    uploadDocumentToS3(file.buffer, file.mimetype, ctx.tenantId),
  ]);

  const { supplierId, score } = await matchSupplier(ctx.tenantId, extracted.vendor_name);

  const invoiceNumber = extracted.invoice_number || `CAPTURE-${Date.now()}`;
  const subtotal = extracted.subtotal ?? extracted.total_amount ?? 0;
  const vatAmount = extracted.vat_amount ?? 0;
  const totalAmount = extracted.total_amount ?? (subtotal + vatAmount);

  const lowConfidence = (extracted.confidence || 0) < 70;
  const needsReview = lowConfidence || !supplierId;

  const invoice = await purchaseInvoiceRepository.create(ctx, {
    invoice_number: invoiceNumber,
    supplier_id: supplierId ?? undefined,
    invoice_date: extracted.invoice_date || new Date().toISOString().slice(0, 10),
    due_date: extracted.due_date || undefined,
    status: 'draft',
    subtotal,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    amount_paid: 0,
    amount_outstanding: totalAmount,
    currency_code: extracted.currency_code || 'ZAR',
    source_document_url: sourceDocumentUrl,
    extracted_vendor_name: extracted.vendor_name || undefined,
    ocr_confidence: extracted.confidence || 0,
    ocr_raw_response: JSON.stringify(extracted),
    capture_method: 'ocr',
    needs_review: needsReview,
  } as any);

  return {
    invoice,
    extracted,
    supplierMatch: { supplierId, score },
    needsReview,
  };
}
