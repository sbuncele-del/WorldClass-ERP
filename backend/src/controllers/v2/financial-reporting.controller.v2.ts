/**
 * Siyabusa Financial Reporting Platform - V2 Controller
 * Tenant-hardened controller for the reporting subdomain
 * 
 * CRITICAL: All queries include tenant_id filtering
 */

import { Response } from 'express';
import { TenantRequest } from '../../types';
import { EngagementService } from '../../modules/financial-reporting/services/engagement.service';
import { TrialBalanceService } from '../../modules/financial-reporting/services/trial-balance.service';
import { StatementGeneratorService } from '../../modules/financial-reporting/services/statement-generator.service';
import pool from '../../config/database';

// ============================================================================
// HELPERS
// ============================================================================

function getTenantContext(req: TenantRequest): { tenantId: string; userId?: string } {
  const tenantId = req.tenant?.id || req.tenantId;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId: req.user?.id };
}

// ============================================================================
// ENGAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/reporting/engagements
 * List all engagements (client files) for the tenant
 */
export async function listEngagements(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const { status, year, search } = req.query;

    const engagements = await EngagementService.list(tenantId, {
      status: status as any,
      year: year ? parseInt(year as string, 10) : undefined,
      search: search as string | undefined,
    });

    res.json({ success: true, data: engagements, meta: { total: engagements.length } });
  } catch (error) {
    console.error('Error listing engagements:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * GET /api/v2/reporting/engagements/:id
 * Get a single engagement with full details
 */
export async function getEngagement(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const engagement = await EngagementService.getById(tenantId, req.params.id);

    if (!engagement) {
      res.status(404).json({ success: false, error: 'Engagement not found' });
      return;
    }

    res.json({ success: true, data: engagement });
  } catch (error) {
    console.error('Error getting engagement:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * POST /api/v2/reporting/engagements
 * Create a new engagement (client file)
 */
export async function createEngagement(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = getTenantContext(req);

    if (!req.body.entity_name || !req.body.financial_year_end) {
      res.status(400).json({ success: false, error: 'entity_name and financial_year_end are required' });
      return;
    }

    const engagement = await EngagementService.create(tenantId, req.body, userId);
    res.status(201).json({ success: true, data: engagement });
  } catch (error) {
    console.error('Error creating engagement:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * PUT /api/v2/reporting/engagements/:id
 * Update an existing engagement
 */
export async function updateEngagement(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const engagement = await EngagementService.update(tenantId, req.params.id, req.body, userId);

    if (!engagement) {
      res.status(404).json({ success: false, error: 'Engagement not found' });
      return;
    }

    res.json({ success: true, data: engagement });
  } catch (error) {
    console.error('Error updating engagement:', error);
    const statusCode = error instanceof Error && error.message.includes('locked') ? 423 : 500;
    res.status(statusCode).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * DELETE /api/v2/reporting/engagements/:id
 */
export async function deleteEngagement(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const deleted = await EngagementService.delete(tenantId, req.params.id);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Engagement not found' });
      return;
    }

    res.json({ success: true, message: 'Engagement deleted' });
  } catch (error) {
    console.error('Error deleting engagement:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * POST /api/v2/reporting/engagements/:id/lock
 */
export async function lockEngagement(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const locked = await EngagementService.lock(tenantId, req.params.id, userId!);
    res.json({ success: true, data: { locked } });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * POST /api/v2/reporting/engagements/:id/unlock
 */
export async function unlockEngagement(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const unlocked = await EngagementService.unlock(tenantId, req.params.id);
    res.json({ success: true, data: { unlocked } });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * POST /api/v2/reporting/engagements/:id/roll-forward
 * Clone engagement to next financial year
 */
export async function rollForwardEngagement(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const newEngagement = await EngagementService.rollForward(tenantId, req.params.id, userId!);
    res.status(201).json({ success: true, data: newEngagement });
  } catch (error) {
    console.error('Error rolling forward engagement:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// ============================================================================
// TRIAL BALANCE ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/reporting/engagements/:id/trial-balance
 * Get the full working trial balance
 */
export async function getTrialBalance(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const data = await TrialBalanceService.getTrialBalance(tenantId, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting trial balance:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * POST /api/v2/reporting/engagements/:id/trial-balance/accounts
 * Add or update a single account
 */
export async function upsertAccount(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);

    if (!req.body.account_code || !req.body.account_name) {
      res.status(400).json({ success: false, error: 'account_code and account_name are required' });
      return;
    }

    const account = await TrialBalanceService.upsertAccount(tenantId, req.params.id, req.body);
    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Error upserting account:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * POST /api/v2/reporting/engagements/:id/trial-balance/import
 * Bulk import trial balance from file/external source
 */
export async function importTrialBalance(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { accounts, source } = req.body;

    if (!accounts || !Array.isArray(accounts)) {
      res.status(400).json({ success: false, error: 'accounts array is required' });
      return;
    }

    const importResult = await TrialBalanceService.bulkImport(
      tenantId, req.params.id, accounts, source || 'manual', userId
    );

    res.json({ success: true, data: importResult });
  } catch (error) {
    console.error('Error importing trial balance:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * POST /api/v2/reporting/engagements/:id/trial-balance/import-gl
 * Import from Siyabusa ERP General Ledger
 */
export async function importFromGL(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const importResult = await TrialBalanceService.importFromGL(tenantId, req.params.id, userId);
    res.json({ success: true, data: importResult });
  } catch (error) {
    console.error('Error importing from GL:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * PUT /api/v2/reporting/engagements/:id/trial-balance/link
 * Link an account to a financial statement line item
 */
export async function linkAccount(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const { account_code, link_number } = req.body;

    if (!account_code || !link_number) {
      res.status(400).json({ success: false, error: 'account_code and link_number are required' });
      return;
    }

    const account = await TrialBalanceService.linkAccount(tenantId, req.params.id, account_code, link_number);

    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Error linking account:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * POST /api/v2/reporting/engagements/:id/trial-balance/auto-link
 * Auto-link all unlinked accounts using smart matching
 */
export async function autoLinkAccounts(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const result = await TrialBalanceService.autoLink(tenantId, req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error auto-linking accounts:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * GET /api/v2/reporting/engagements/:id/link-numbers
 * Get available link numbers for smart linking dropdown
 */
export async function getAvailableLinks(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const { search } = req.query;
    const links = await TrialBalanceService.getAvailableLinks(tenantId, req.params.id, search as string);
    res.json({ success: true, data: links });
  } catch (error) {
    console.error('Error getting available links:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// ============================================================================
// FINANCIAL STATEMENT GENERATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/reporting/engagements/:id/statements/sofp
 * Generate Statement of Financial Position
 */
export async function generateSoFP(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const statement = await StatementGeneratorService.generateSoFP(tenantId, req.params.id);
    res.json({ success: true, data: statement });
  } catch (error) {
    console.error('Error generating SoFP:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * GET /api/v2/reporting/engagements/:id/statements/soci
 * Generate Statement of Comprehensive Income
 */
export async function generateSoCI(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const statement = await StatementGeneratorService.generateSoCI(tenantId, req.params.id);
    res.json({ success: true, data: statement });
  } catch (error) {
    console.error('Error generating SoCI:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * GET /api/v2/reporting/engagements/:id/statements/soce
 * Generate Statement of Changes in Equity
 */
export async function generateSoCE(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const statement = await StatementGeneratorService.generateSoCE(tenantId, req.params.id);
    res.json({ success: true, data: statement });
  } catch (error) {
    console.error('Error generating SoCE:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * GET /api/v2/reporting/engagements/:id/statements/scf
 * Generate Statement of Cash Flows
 */
export async function generateSCF(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const statement = await StatementGeneratorService.generateSCF(tenantId, req.params.id);
    res.json({ success: true, data: statement });
  } catch (error) {
    console.error('Error generating SCF:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * GET /api/v2/reporting/engagements/:id/statements/detailed-is
 * Generate Detailed Income Statement
 */
export async function generateDetailedIS(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const statement = await StatementGeneratorService.generateDetailedIS(tenantId, req.params.id);
    res.json({ success: true, data: statement });
  } catch (error) {
    console.error('Error generating Detailed IS:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * GET /api/v2/reporting/engagements/:id/statements/tax-computation
 * Generate Income Tax Computation
 */
export async function generateTaxComputation(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const statement = await StatementGeneratorService.generateTaxComputation(tenantId, req.params.id);
    res.json({ success: true, data: statement });
  } catch (error) {
    console.error('Error generating tax computation:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// ============================================================================
// NOTES & DISCLOSURES
// ============================================================================

/**
 * GET /api/v2/reporting/engagements/:id/notes
 * Get all financial notes for the engagement
 */
export async function getFinancialNotes(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const result = await pool.query(
      `SELECT * FROM reporting.financial_notes 
       WHERE engagement_id = $1 AND tenant_id = $2 
       ORDER BY note_number`,
      [req.params.id, tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * PUT /api/v2/reporting/engagements/:id/notes/:noteId
 * Update a financial note
 */
export async function updateFinancialNote(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const { title, structured_data, narrative, is_applicable, source_links } = req.body;

    const result = await pool.query(
      `UPDATE reporting.financial_notes 
       SET title = COALESCE($3, title),
           structured_data = COALESCE($4, structured_data),
           narrative = COALESCE($5, narrative),
           is_applicable = COALESCE($6, is_applicable),
           source_links = COALESCE($7, source_links),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [req.params.noteId, tenantId, title, 
       structured_data ? JSON.stringify(structured_data) : null,
       narrative, is_applicable,
       source_links ? JSON.stringify(source_links) : null]
    );

    if (!result.rows[0]) {
      res.status(404).json({ success: false, error: 'Note not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * GET /api/v2/reporting/engagements/:id/disclosures
 * Get disclosure checklist
 */
export async function getDisclosures(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const result = await pool.query(
      `SELECT * FROM reporting.disclosure_items 
       WHERE engagement_id = $1 AND tenant_id = $2 
       ORDER BY sort_order`,
      [req.params.id, tenantId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * PUT /api/v2/reporting/engagements/:id/disclosures/:disclosureId
 * Update a disclosure checklist item
 */
export async function updateDisclosure(req: TenantRequest, res: Response): Promise<void> {
  try {
    const { tenantId } = getTenantContext(req);
    const { is_applicable, is_compliant, comments, sign_off } = req.body;

    const result = await pool.query(
      `UPDATE reporting.disclosure_items 
       SET is_applicable = COALESCE($3, is_applicable),
           is_compliant = COALESCE($4, is_compliant),
           comments = COALESCE($5, comments),
           sign_off = COALESCE($6, sign_off),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [req.params.disclosureId, tenantId, is_applicable, is_compliant, comments, sign_off]
    );

    if (!result.rows[0]) {
      res.status(404).json({ success: false, error: 'Disclosure item not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// ============================================================================
// FRAMEWORKS & LINK MAPPINGS (Reference data)
// ============================================================================

/**
 * GET /api/v2/reporting/frameworks
 * List available reporting frameworks
 */
export async function listFrameworks(_req: TenantRequest, res: Response): Promise<void> {
  try {
    const frameworks = [
      { id: 'ifrs_full', name: 'IFRS+', description: 'Full IFRS Standards', price: 3325 },
      { id: 'ifrs_sme', name: 'IFRS SME+', description: 'IFRS for SMEs Accounting Standard', price: 330 },
      { id: 'ifrs_sme_plus', name: 'IFRS SME Consolidation+', description: 'IFRS for SMEs with Consolidation', price: 330 },
      { id: 'ifrs_micro', name: 'Micro Entity', description: 'Simplified reporting for micro entities', price: 80 },
    ];
    res.json({ success: true, data: frameworks });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * GET /api/v2/reporting/working-paper-types
 * List available working paper types
 */
export async function listWorkingPaperTypes(_req: TenantRequest, res: Response): Promise<void> {
  try {
    const types = [
      { id: 'accounting_officer', name: 'Accounting Officer+', price: 330 },
      { id: 'agreed_upon', name: 'Agreed-Upon Procedures', price: 290 },
      { id: 'compilation', name: 'Compilation+', price: 165 },
      { id: 'legal_practitioner', name: 'Legal Practitioner', price: 725 },
      { id: 'property_practitioner', name: 'Property Practitioner', price: 725 },
      { id: 'review', name: 'Review+', price: 815 },
      { id: 'audit', name: 'Audit (Coming Soon)', price: 0 },
    ];
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
