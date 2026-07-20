/**
 * Bank Allocation Service
 *
 * Posts a bank statement line to the general ledger: resolves the GL account
 * and the bank account's own GL link, creates a balanced journal entry (bank
 * line + selected GL account line), and marks the statement line as matched.
 *
 * Extracted from the POST /cash-management/reconciliation/allocate route so
 * the same logic can run from a scheduled job (auto-allocating high-confidence
 * AI suggestions) without duplicating it.
 */

import { query } from '../../../config/database';

export interface AllocationResult {
  ok: boolean;
  status?: number;
  error?: string;
  data?: {
    journal_entry_id: number;
    amount: number;
    gl_account_id: number;
    gl_account_code: string;
    gl_account_name: string;
    is_debit: boolean;
  };
}

export async function allocateStatementLineToGL(
  tenantId: string,
  userId: string | undefined,
  statementLineId: number | string,
  glAccountId: number | string,
  description?: string
): Promise<AllocationResult> {
  if (!statementLineId || !glAccountId) {
    return { ok: false, status: 400, error: 'statement_line_id and gl_account_id are required' };
  }

  // Resolve gl_account_id - may be a UUID, a legacy non-UUID id, or an account code.
  const glLookup = await query(
    `SELECT id FROM chart_of_accounts
     WHERE tenant_id = $1 AND (id::text = $2 OR code = $2 OR account_code = $2) AND is_active = true
     LIMIT 1`,
    [tenantId, String(glAccountId)]
  );
  if (glLookup.rows.length === 0) {
    return { ok: false, status: 400, error: 'GL account not found. Please select a valid account.' };
  }
  const resolvedGLAccountId = glLookup.rows[0].id;

  // Get the statement line (join to statements to get bank account info + tenant check)
  const lineResult = await query(
    `SELECT l.*, s.account_id as bank_acct_id,
            COALESCE(l.credit_amount, 0) as credit_amt,
            COALESCE(l.debit_amount, 0) as debit_amt
     FROM cash_bank_statement_lines l
     JOIN cash_bank_statements s ON l.statement_id = s.statement_id
     WHERE s.tenant_id = $1 AND l.line_id = $2`,
    [tenantId, statementLineId]
  );

  if (lineResult.rows.length === 0) {
    return { ok: false, status: 404, error: 'Statement line not found' };
  }

  const line = lineResult.rows[0];
  const creditAmt = parseFloat(line.credit_amt) || 0;
  const debitAmt = parseFloat(line.debit_amt) || 0;
  const amount = creditAmt > 0 ? creditAmt : debitAmt; // raw positive amount
  const isDebit = debitAmt > 0; // true = money going OUT (payment)

  // Get bank account's GL account details (account_id is INTEGER PK on cash_bank_accounts)
  const bankAcctResult = await query(
    `SELECT ba.gl_account_code,
            coa.id as gl_account_id,
            COALESCE(NULLIF(coa.code,''), coa.account_code) as coa_code,
            COALESCE(NULLIF(coa.name,''), coa.account_name) as coa_name
     FROM cash_bank_accounts ba
     LEFT JOIN chart_of_accounts coa ON (coa.code = ba.gl_account_code OR coa.account_code = ba.gl_account_code)
       AND coa.tenant_id = ba.tenant_id
     WHERE ba.tenant_id = $1 AND ba.account_id = $2`,
    [tenantId, line.bank_acct_id]
  );

  const bankGLAccountId = bankAcctResult.rows[0]?.gl_account_id;
  const bankCoaCode = bankAcctResult.rows[0]?.coa_code || '';
  const bankCoaName = bankAcctResult.rows[0]?.coa_name || 'Bank Account';
  if (!bankGLAccountId) {
    return { ok: false, status: 400, error: 'Bank account not linked to GL account. Please set up bank GL mapping first.' };
  }

  // Get allocated GL account details (code + name required for journal_entry_lines)
  const glAcctResult = await query(
    `SELECT id, COALESCE(NULLIF(code,''), account_code) as code, COALESCE(NULLIF(name,''), account_name) as name
     FROM chart_of_accounts WHERE tenant_id = $1 AND id = $2`,
    [tenantId, resolvedGLAccountId]
  );
  if (glAcctResult.rows.length === 0) {
    return { ok: false, status: 400, error: 'Selected GL account not found.' };
  }
  const glAcct = glAcctResult.rows[0];

  // Create journal entry. Column set matches the confirmed-working insert in
  // logistics-fuel.controller.v2.ts - journal_entries has "source" (not
  // "source_type") and no posting_date/fiscal_year/fiscal_period/currency_code
  // columns. RETURNING entry_id, not id - that's the actual PK name.
  const txDate = line.transaction_date;
  const jeNum = `JE-BANK-${Date.now()}`;

  const jeResult = await query(
    `INSERT INTO journal_entries
       (tenant_id, journal_number, journal_date, description, reference,
        source, source_document_type, total_debit, total_credit, status, created_by)
     VALUES ($1, $2, $3, $4, $5, 'BANK_RECON', 'bank_reconciliation', $6, $6, 'POSTED', $7)
     RETURNING entry_id`,
    [tenantId, jeNum, txDate, description || line.description, line.reference,
     amount, userId || '00000000-0000-0000-0000-000000000000']
  );
  const jeId = jeResult.rows[0].entry_id;

  // Line 1: Bank account (Dr for receipts, Cr for payments)
  await query(
    `INSERT INTO journal_entry_lines
       (tenant_id, journal_entry_id, line_number, account_id, account_code,
        description, debit_amount, credit_amount)
     VALUES ($1, $2, 1, $3, $4, $5, $6, $7)`,
    [tenantId, jeId, bankGLAccountId, bankCoaCode,
     description || line.description, isDebit ? 0 : amount, isDebit ? amount : 0]
  );

  // Line 2: Selected GL account (opposite of bank)
  await query(
    `INSERT INTO journal_entry_lines
       (tenant_id, journal_entry_id, line_number, account_id, account_code,
        description, debit_amount, credit_amount)
     VALUES ($1, $2, 2, $3, $4, $5, $6, $7)`,
    [tenantId, jeId, resolvedGLAccountId, glAcct.code,
     description || line.description, isDebit ? amount : 0, isDebit ? 0 : amount]
  );

  // Update statement line as allocated - cash_bank_statement_lines has no
  // status/allocated_gl_account_id/allocated_gl_account_code/journal_entry_id/
  // reconciled_date columns. matched_transaction_id is FK'd to cash_transactions,
  // NOT journal_entries, so the journal entry id can't go there (would violate
  // the FK) - it goes in raw_data instead, and confirmed_category records the
  // GL code for display.
  await query(
    `UPDATE cash_bank_statement_lines
     SET is_matched = true,
         confirmed_category = $3,
         match_date = NOW(),
         matched_by = $4,
         raw_data = COALESCE(raw_data, '{}'::jsonb) || jsonb_build_object('journal_entry_id', $5::text)
     WHERE line_id = $2
       AND statement_id IN (
         SELECT statement_id FROM cash_bank_statements WHERE tenant_id = $1
       )`,
    [tenantId, statementLineId, glAcct.code, userId || null, jeId]
  );

  // Learn from this allocation for future AI suggestions
  try {
    const { allocationLearningService } = await import('./allocation-learning.service');
    await allocationLearningService.recordAllocation(
      tenantId,
      line.description || description || '',
      amount,
      isDebit,
      resolvedGLAccountId,
      userId
    );
  } catch (learnErr) {
    console.warn('Allocation learning recording failed (non-critical):', learnErr);
  }

  return {
    ok: true,
    data: {
      journal_entry_id: jeId,
      amount,
      gl_account_id: resolvedGLAccountId,
      gl_account_code: glAcct.code,
      gl_account_name: glAcct.name,
      is_debit: isDebit
    }
  };
}
