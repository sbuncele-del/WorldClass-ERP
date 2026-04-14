/**
 * Siyabusa Financial Reporting Platform - Engagement Service
 * Manages client files / engagement lifecycle
 */

import pool from '../../../config/database';
import { PoolClient } from 'pg';
import {
  Engagement,
  CreateEngagementInput,
  EngagementStatus,
  ReportingFramework,
} from '../types';

export class EngagementService {
  /**
   * List all engagements for a tenant
   */
  static async list(
    tenantId: string,
    filters?: { status?: EngagementStatus; year?: number; search?: string }
  ): Promise<Engagement[]> {
    let query = `
      SELECT * FROM reporting.engagements
      WHERE tenant_id = $1
    `;
    const params: unknown[] = [tenantId];
    let paramIdx = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(filters.status);
    }

    if (filters?.year) {
      query += ` AND EXTRACT(YEAR FROM financial_year_end) = $${paramIdx++}`;
      params.push(filters.year);
    }

    if (filters?.search) {
      query += ` AND (entity_name ILIKE $${paramIdx} OR registration_number ILIKE $${paramIdx})`;
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    query += ` ORDER BY financial_year_end DESC, entity_name ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get single engagement by ID
   */
  static async getById(tenantId: string, engagementId: string): Promise<Engagement | null> {
    const result = await pool.query(
      `SELECT * FROM reporting.engagements WHERE id = $1 AND tenant_id = $2`,
      [engagementId, tenantId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new engagement (client file)
   */
  static async create(tenantId: string, data: Partial<CreateEngagementInput>, userId?: string): Promise<Engagement> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate financial year start from end date
      const fyEnd = new Date(data.financial_year_end!);
      const fyStart = data.financial_year_start 
        || new Date(fyEnd.getFullYear() - 1, fyEnd.getMonth(), fyEnd.getDate() + 1).toISOString().split('T')[0];

      const result = await client.query(
        `INSERT INTO reporting.engagements (
          tenant_id, entity_name, trading_as, registration_number, tax_number, vat_number,
          legal_form, nature_of_business, country,
          financial_year_end, financial_year_start, comparative_year_end, comparative_year_start,
          reporting_framework, working_paper_type,
          engagement_label, engagement_letter_date, date_of_signature,
          financial_statements_approval_date, agm_date,
          business_commencement, business_address, postal_address, bankers,
          directors, preparer_firm_name, preparer_contact,
          currency, currency_rounding, cash_flow_method, soci_presentation,
          materiality, performance_materiality,
          status, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15,
          $16, $17, $18,
          $19, $20,
          $21, $22, $23, $24,
          $25, $26, $27,
          $28, $29, $30, $31,
          $32, $33,
          'draft', $34
        ) RETURNING *`,
        [
          tenantId,
          data.entity_name,
          data.trading_as || null,
          data.registration_number || null,
          data.tax_number || null,
          data.vat_number || null,
          data.legal_form || 'private_company',
          data.nature_of_business || null,
          data.country || 'South Africa',
          data.financial_year_end,
          fyStart,
          data.comparative_year_end || null,
          data.comparative_year_start || null,
          data.reporting_framework || 'ifrs_sme',
          data.working_paper_type || 'compilation',
          data.engagement_label || data.entity_name,
          data.engagement_letter_date || null,
          data.date_of_signature || null,
          data.financial_statements_approval_date || null,
          data.agm_date || null,
          data.business_commencement || null,
          JSON.stringify(data.business_address || {}),
          JSON.stringify(data.postal_address || {}),
          data.bankers || null,
          JSON.stringify(data.directors || []),
          data.preparer_firm_name || null,
          JSON.stringify(data.preparer_contact || {}),
          data.currency || 'ZAR',
          data.currency_rounding || 'decimals',
          data.cash_flow_method || 'indirect',
          data.soci_presentation || 'function',
          data.materiality || 0,
          data.performance_materiality || 0,
          userId || null,
        ]
      );

      const engagement = result.rows[0];

      // Auto-generate default disclosure checklist items for the framework
      await this.generateDefaultDisclosures(client, tenantId, engagement.id, data.reporting_framework || 'ifrs_sme');

      // Auto-generate default financial notes structure
      await this.generateDefaultNotes(client, tenantId, engagement.id, data.reporting_framework || 'ifrs_sme');

      await client.query('COMMIT');
      return engagement;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing engagement
   */
  static async update(
    tenantId: string,
    engagementId: string,
    data: Partial<Engagement>,
    userId?: string
  ): Promise<Engagement | null> {
    // Prevent editing locked engagements
    const existing = await this.getById(tenantId, engagementId);
    if (!existing) return null;
    if (existing.locked_at) {
      throw new Error('Engagement is locked and cannot be edited');
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowedFields = [
      'entity_name', 'trading_as', 'registration_number', 'tax_number', 'vat_number',
      'legal_form', 'nature_of_business', 'country',
      'financial_year_end', 'financial_year_start',
      'comparative_year_end', 'comparative_year_start',
      'reporting_framework', 'working_paper_type',
      'engagement_label', 'engagement_letter_date', 'date_of_signature',
      'financial_statements_approval_date', 'agm_date',
      'business_commencement', 'bankers',
      'preparer_firm_name',
      'currency', 'currency_rounding', 'cash_flow_method', 'soci_presentation',
      'materiality', 'performance_materiality', 'status',
    ];

    const jsonFields = ['business_address', 'postal_address', 'directors', 'preparer_contact'];

    for (const field of allowedFields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        fields.push(`${field} = $${idx++}`);
        values.push((data as Record<string, unknown>)[field]);
      }
    }

    for (const field of jsonFields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        fields.push(`${field} = $${idx++}`);
        values.push(JSON.stringify((data as Record<string, unknown>)[field]));
      }
    }

    if (fields.length === 0) return existing;

    fields.push(`updated_at = NOW()`);
    fields.push(`updated_by = $${idx++}`);
    values.push(userId || null);

    values.push(engagementId);
    values.push(tenantId);

    const result = await pool.query(
      `UPDATE reporting.engagements 
       SET ${fields.join(', ')} 
       WHERE id = $${idx++} AND tenant_id = $${idx}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Lock an engagement (prevent further edits)
   */
  static async lock(tenantId: string, engagementId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE reporting.engagements 
       SET locked_at = NOW(), locked_by = $3, status = 'approved'
       WHERE id = $1 AND tenant_id = $2 AND locked_at IS NULL
       RETURNING id`,
      [engagementId, tenantId, userId]
    );
    return result.rowCount > 0;
  }

  /**
   * Unlock an engagement
   */
  static async unlock(tenantId: string, engagementId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE reporting.engagements 
       SET locked_at = NULL, locked_by = NULL, status = 'in_progress'
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [engagementId, tenantId]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete an engagement and all related data (cascade)
   */
  static async delete(tenantId: string, engagementId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM reporting.engagements WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [engagementId, tenantId]
    );
    return result.rowCount > 0;
  }

  /**
   * Clone an engagement (roll forward to next year)
   */
  static async rollForward(tenantId: string, engagementId: string, userId: string): Promise<Engagement> {
    const source = await this.getById(tenantId, engagementId);
    if (!source) throw new Error('Source engagement not found');

    // Calculate next financial year
    const currentEnd = new Date(source.financial_year_end);
    const nextEnd = new Date(currentEnd);
    nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    const nextStart = new Date(currentEnd);
    nextStart.setDate(nextStart.getDate() + 1);

    // Create new engagement with rolled-forward data
    const newEngagement = await this.create(tenantId, {
      ...source,
      financial_year_end: nextEnd.toISOString().split('T')[0],
      financial_year_start: nextStart.toISOString().split('T')[0],
      comparative_year_end: source.financial_year_end,
      comparative_year_start: source.financial_year_start,
      engagement_label: `${source.entity_name} (${nextEnd.getFullYear()})`,
      status: 'draft' as EngagementStatus,
    }, userId);

    // Copy account links with closing balances as opening balances
    await pool.query(
      `INSERT INTO reporting.account_links (
        tenant_id, engagement_id, account_code, account_name,
        link_number, link_description, category, fs_type,
        lead_schedule, lead_schedule_sub, wp_ref,
        opening_balance, prior_year_balance, is_active, is_linked, sort_order
      )
      SELECT 
        tenant_id, $1, account_code, account_name,
        link_number, link_description, category, fs_type,
        lead_schedule, lead_schedule_sub, wp_ref,
        closing_balance, closing_balance, is_active, is_linked, sort_order
      FROM reporting.account_links
      WHERE engagement_id = $2 AND tenant_id = $3`,
      [newEngagement.id, engagementId, tenantId]
    );

    return newEngagement;
  }

  // ------------------------------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------------------------------

  private static async generateDefaultDisclosures(
    client: PoolClient,
    tenantId: string,
    engagementId: string,
    framework: ReportingFramework
  ): Promise<void> {
    const disclosures = [
      { ref: 'IFRS-SME', section: 'The IFRS for SMEs® Accounting Standard', order: 1 },
      { ref: 'SA-LEG', section: 'South African legislative requirements', order: 2 },
      { ref: 'ISRE2400', section: 'ISRE2400 (Revised) Review reports', order: 3 },
      { ref: 'ISA700', section: 'ISA 700 (Revised) Audit Reports', order: 4 },
      { ref: 'ISA701', section: 'ISA 701 Key Audit Matters', order: 5 },
      { ref: 'ISA720', section: "ISA 720 The Auditor's Responsibilities Relating to Other Information", order: 6 },
      { ref: 'ISA705', section: "ISA 705 (Revised) Modifications to the Opinion in the Independent Auditor's Report", order: 7 },
      { ref: 'ISA706', section: "ISA 706 (Revised) Emphasis of Matter Paragraphs", order: 8 },
      { ref: 'ISA710', section: 'ISA 710 Comparative Information', order: 9 },
      { ref: 'ISA800', section: 'ISA 800 (Revised) Special Considerations', order: 10 },
    ];

    for (const d of disclosures) {
      await client.query(
        `INSERT INTO reporting.disclosure_items (tenant_id, engagement_id, standard_ref, section, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, engagementId, d.ref, d.section, d.order]
      );
    }
  }

  private static async generateDefaultNotes(
    client: PoolClient,
    tenantId: string,
    engagementId: string,
    _framework: ReportingFramework
  ): Promise<void> {
    const notes = [
      { num: 1, title: 'Presentation of financial statements', links: [] },
      { num: 2, title: 'Significant accounting policies', links: [] },
      { num: 3, title: 'Critical accounting estimates and judgements', links: [] },
      { num: 4, title: 'Trade and other receivables', links: ['ca.500.000'] },
      { num: 5, title: 'Current tax liabilities', links: ['cl.300.000'] },
      { num: 6, title: 'Cash and cash equivalents', links: ['c.840.001', 'cl.600.000'] },
      { num: 7, title: 'Shareholders loan', links: ['nl.500.000'] },
      { num: 8, title: 'Revenue', links: ['r.100.000'] },
      { num: 9, title: 'Cost of sales', links: ['cos.000.001'] },
      { num: 10, title: 'Administrative expenses', links: ['e.200.000'] },
      { num: 11, title: 'Other expenses', links: ['e.300.000'] },
      { num: 12, title: 'Income tax expense', links: ['tax.100.000', 'tax.200.000'] },
    ];

    for (const n of notes) {
      await client.query(
        `INSERT INTO reporting.financial_notes (tenant_id, engagement_id, note_number, title, source_links, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenantId, engagementId, n.num, n.title, JSON.stringify(n.links), n.num]
      );
    }
  }
}
