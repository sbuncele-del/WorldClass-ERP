import { Response } from 'express';
import { TenantRequest } from '../../../types';
import { query } from '../../../config/database';

/**
 * Helper to extract tenant ID with type safety
 */
function getTenantId(req: TenantRequest): string | null {
  return req.tenant?.id ?? null;
}

/**
 * Compliance Workspace Controller
 * Provides aggregated data for the Compliance Framework dashboard
 */

/**
 * GET /api/compliance/workspace
 * Returns all data needed for the Compliance Framework workspace dashboard
 */
export const getComplianceWorkspace = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    // Parallel queries for performance
    const [
      complianceScore,
      pendingAudits,
      policyUpdates,
      riskAlerts,
      complianceHistory,
      complianceSummary,
    ] = await Promise.all([
      getComplianceScore(tenantId),
      getPendingAudits(tenantId),
      getPolicyUpdates(tenantId),
      getRiskAlerts(tenantId),
      getComplianceHistory(tenantId),
      getComplianceSummary(tenantId),
    ]);

    res.json({
      success: true,
      data: {
        summary: complianceSummary,
        compliance_score: complianceScore,
        pending_audits: pendingAudits,
        policy_updates: policyUpdates,
        risk_alerts: riskAlerts,
        history: complianceHistory,
      },
    });
  } catch (error: any) {
    console.error('Compliance workspace error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch compliance workspace data',
    });
  }
};

/**
 * GET /api/compliance/regulatory/filings
 * Returns filing rows used by Regulatory Hub
 */
export const getRegulatoryFilings = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    await ensureRegulatoryTables();

    const filings: any[] = [];

    // 1) Manual filings from Regulatory Hub
    const manual = await query(
      `
      SELECT
        filing_id::text AS id,
        name,
        authority,
        filing_type AS type,
        due_date,
        status,
        period,
        submitted_date,
        reference,
        amount
      FROM regulatory_filings
      WHERE tenant_id = $1
      ORDER BY due_date DESC NULLS LAST, created_at DESC
      LIMIT 300
      `,
      [tenantId]
    );

    filings.push(
      ...manual.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        authority: row.authority,
        type: row.type,
        dueDate: row.due_date ? toDateString(row.due_date) : '-',
        status: normalizeFilingStatus(row.status, row.due_date),
        period: row.period || '-',
        submittedDate: row.submitted_date ? toDateString(row.submitted_date) : undefined,
        reference: row.reference,
        amount: Number(row.amount || 0),
      }))
    );

    // 2) HR-derived statutory filing snapshot (EMP201)
    const hrSnapshot = await getLatestPayrollSnapshot(tenantId);
    if (hrSnapshot) {
      const submission = await getLatestSubmissionFor(tenantId, 'EMP201', hrSnapshot.period);
      const status = submission
        ? 'submitted'
        : normalizeFilingStatus('pending', hrSnapshot.dueDate);

      filings.push({
        id: `HR-EMP201-${hrSnapshot.period}`,
        name: 'EMP201 Monthly Return',
        authority: 'SARS',
        type: 'EMP201',
        dueDate: hrSnapshot.dueDate,
        status,
        period: hrSnapshot.period,
        submittedDate: submission?.submittedDate,
        reference: submission?.reference,
        amount: hrSnapshot.amount,
      });
    }

    // 3) SARS Sentinel submission history (if table exists)
    if (await tableExists('public', 'sars_submission_history')) {
      const submissions = await query(
        `
        SELECT
          submission_id,
          submission_type,
          tax_period,
          submission_date,
          status,
          efiling_reference,
          amount_payable
        FROM sars_submission_history
        WHERE tenant_id = $1
        ORDER BY submission_date DESC
        LIMIT 100
        `,
        [tenantId]
      );

      filings.push(
        ...submissions.rows.map((row: any) => ({
          id: `SARS-SUB-${row.submission_id}`,
          name: `${row.submission_type || 'SARS'} Submission`,
          authority: 'SARS',
          type: row.submission_type || 'SARS',
          dueDate: row.submission_date ? toDateString(row.submission_date) : '-',
          status: 'submitted',
          period: row.tax_period || '-',
          submittedDate: row.submission_date ? toDateString(row.submission_date) : undefined,
          reference: row.efiling_reference || undefined,
          amount: Number(row.amount_payable || 0),
        }))
      );
    }

    const deduped = dedupeFilings(filings).sort((a, b) => {
      const ad = a.dueDate === '-' ? '' : a.dueDate;
      const bd = b.dueDate === '-' ? '' : b.dueDate;
      return bd.localeCompare(ad);
    });

    return res.json({ success: true, data: deduped });
  } catch (error: any) {
    console.error('Regulatory filings error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch regulatory filings' });
  }
};

/**
 * GET /api/compliance/regulatory/requirements
 * Returns requirement rows used by Regulatory Hub
 */
export const getRegulatoryRequirements = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    await ensureRegulatoryTables();

    const requirements: any[] = [];

    // HR-based requirements
    const hrSnapshot = await getLatestPayrollSnapshot(tenantId);
    const emp201Status = hrSnapshot
      ? normalizeRequirementStatus(normalizeFilingStatus('pending', hrSnapshot.dueDate))
      : 'attention';

    requirements.push({
      id: 'REQ-EMP201',
      name: 'EMP201 Monthly PAYE/UIF/SDL Return',
      authority: 'SARS',
      frequency: 'Monthly',
      nextDue: hrSnapshot?.dueDate || '-',
      status: emp201Status,
      lastFiled: (await getLatestSubmissionFor(tenantId, 'EMP201', hrSnapshot?.period || undefined))?.submittedDate,
      description: 'Monthly statutory payroll return based on payroll run data (PAYE, UIF, SDL).',
    });

    const taxYear = getCurrentTaxYearLabel();
    const emp501Submission = await getLatestSubmissionFor(tenantId, 'EMP501');
    requirements.push({
      id: 'REQ-EMP501',
      name: 'EMP501 Reconciliation',
      authority: 'SARS',
      frequency: 'Bi-Annual',
      nextDue: getEmp501DueDate(),
      status: emp501Submission ? 'compliant' : 'attention',
      lastFiled: emp501Submission?.submittedDate,
      description: `Tax year reconciliation (${taxYear}) generated from payroll details and submitted to SARS.`,
    });

    const employeeCount = await getActiveEmployeeCount(tenantId);
    requirements.push({
      id: 'REQ-IRP5',
      name: 'IRP5/IT3(a) Certificates',
      authority: 'SARS',
      frequency: 'Annual',
      nextDue: getIrp5DueDate(),
      status: employeeCount > 0 ? 'attention' : 'compliant',
      description: 'Annual employee tax certificates generated from payroll records.',
    });

    // SARS Sentinel correspondence requirement
    if (await tableExists('public', 'sars_correspondence')) {
      const corrStats = await query(
        `
        SELECT
          COUNT(*) FILTER (WHERE deadline_date < CURRENT_DATE AND status NOT IN ('COMPLETED','CLOSED')) AS overdue_count,
          COUNT(*) FILTER (WHERE status NOT IN ('COMPLETED','CLOSED')) AS open_count,
          MIN(deadline_date) FILTER (WHERE status NOT IN ('COMPLETED','CLOSED')) AS next_deadline
        FROM sars_correspondence
        WHERE tenant_id = $1 AND COALESCE(is_archived, false) = false
        `,
        [tenantId]
      );

      const overdue = Number(corrStats.rows[0]?.overdue_count || 0);
      const openCount = Number(corrStats.rows[0]?.open_count || 0);

      requirements.push({
        id: 'REQ-SARS-CORR',
        name: 'SARS Correspondence Response SLA',
        authority: 'SARS Sentinel',
        frequency: 'Ongoing',
        nextDue: corrStats.rows[0]?.next_deadline ? toDateString(corrStats.rows[0].next_deadline) : '-',
        status: overdue > 0 ? 'non-compliant' : openCount > 0 ? 'attention' : 'compliant',
        description: 'Tracks open SARS correspondence and overdue response deadlines from SARS Sentinel.',
      });
    }

    // SARS Sentinel deadline calendar requirements
    if (await tableExists('public', 'sars_deadline_calendar')) {
      const calendar = await query(
        `
        SELECT deadline_type, description, frequency, due_day_of_month, due_month
        FROM sars_deadline_calendar
        WHERE COALESCE(is_active, true) = true
        ORDER BY deadline_type
        `
      );

      for (const row of calendar.rows) {
        const requirementId = `REQ-SARS-CAL-${String(row.deadline_type || 'GEN').toUpperCase()}`;
        const nextDue = computeCalendarNextDueDate(row.frequency, row.due_day_of_month, row.due_month);
        if (requirements.find((r) => r.id === requirementId)) continue;

        requirements.push({
          id: requirementId,
          name: `${row.deadline_type || 'SARS'} Filing Deadline`,
          authority: 'SARS Sentinel',
          frequency: normalizeCalendarFrequency(row.frequency),
          nextDue: nextDue || '-',
          status: nextDue && new Date(nextDue).getTime() < Date.now() ? 'non-compliant' : 'attention',
          description: row.description || 'Deadline pulled automatically from SARS Sentinel calendar.',
        });
      }
    }

    // CIPC baseline requirement (manual/compliance operations)
    requirements.push({
      id: 'REQ-CIPC',
      name: 'CIPC Annual Return',
      authority: 'CIPC',
      frequency: 'Annual',
      nextDue: '-',
      status: 'attention',
      description: 'Company annual return filing managed through Regulatory Hub workflow.',
    });

    return res.json({ success: true, data: requirements });
  } catch (error: any) {
    console.error('Regulatory requirements error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch regulatory requirements' });
  }
};

/**
 * GET /api/compliance/regulatory/deadlines
 * Returns grouped upcoming deadlines used by Regulatory Hub calendar
 */
export const getRegulatoryDeadlines = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    await ensureRegulatoryTables();

    const grouped = new Map<string, { name: string; authority: string; type: string }[]>();

    const addDeadline = (date: string | null | undefined, filing: { name: string; authority: string; type: string }) => {
      if (!date || date === '-') return;
      const current = grouped.get(date) || [];
      current.push(filing);
      grouped.set(date, current);
    };

    const filings = await query(
      `
      SELECT name, authority, filing_type, due_date
      FROM regulatory_filings
      WHERE tenant_id = $1
        AND due_date IS NOT NULL
        AND due_date::date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY due_date ASC
      LIMIT 500
      `,
      [tenantId]
    );

    for (const row of filings.rows) {
      addDeadline(toDateString(row.due_date), {
        name: row.name,
        authority: row.authority,
        type: row.filing_type,
      });
    }

    const hrSnapshot = await getLatestPayrollSnapshot(tenantId);
    if (hrSnapshot?.dueDate) {
      addDeadline(hrSnapshot.dueDate, {
        name: 'EMP201 Monthly Return',
        authority: 'SARS',
        type: 'EMP201',
      });
    }

    addDeadline(getEmp501DueDate(), {
      name: 'EMP501 Reconciliation',
      authority: 'SARS',
      type: 'EMP501',
    });

    if (await tableExists('public', 'sars_correspondence')) {
      const corr = await query(
        `
        SELECT subject, deadline_date
        FROM sars_correspondence
        WHERE tenant_id = $1
          AND COALESCE(is_archived, false) = false
          AND status NOT IN ('COMPLETED','CLOSED')
          AND deadline_date IS NOT NULL
          AND deadline_date::date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY deadline_date ASC
        LIMIT 200
        `,
        [tenantId]
      );

      for (const row of corr.rows) {
        addDeadline(toDateString(row.deadline_date), {
          name: row.subject || 'SARS Correspondence',
          authority: 'SARS Sentinel',
          type: 'CORRESPONDENCE',
        });
      }
    }

    if (await tableExists('public', 'sars_deadline_calendar')) {
      const calendar = await query(
        `
        SELECT deadline_type, description, frequency, due_day_of_month, due_month
        FROM sars_deadline_calendar
        WHERE COALESCE(is_active, true) = true
        ORDER BY deadline_type
        LIMIT 200
        `
      );

      for (const row of calendar.rows) {
        const nextDue = computeCalendarNextDueDate(row.frequency, row.due_day_of_month, row.due_month);
        addDeadline(nextDue, {
          name: row.description || `${row.deadline_type || 'SARS'} Deadline`,
          authority: 'SARS Sentinel',
          type: row.deadline_type || 'SARS',
        });
      }
    }

    const deadlines = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, filings]) => ({ date, filings }));

    return res.json({ success: true, data: deadlines });
  } catch (error: any) {
    console.error('Regulatory deadlines error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch regulatory deadlines' });
  }
};

/**
 * GET /api/compliance/regulatory/auto-sync/status
 * Returns auto-sync health for HR -> SARS Sentinel pipeline
 */
export const getRegulatoryAutoSyncStatus = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    const hasSubmissions = await tableExists('public', 'sars_submission_history');
    const hasFunction = await functionExists('public', 'sync_hr_payroll_to_sars_submission');
    const hasTrigger = await triggerExists('hr', 'payroll_run_details', 'trg_sync_hr_payroll_details_to_sars');

    if (!hasSubmissions) {
      return res.json({
        success: true,
        data: {
          enabled: false,
          reason: 'sars_submission_history table not found',
          lastSyncAt: null,
          byType: [],
        },
      });
    }

    const byTypeResult = await query(
      `
      SELECT DISTINCT ON (submission_type)
        submission_type,
        submission_date,
        amount_payable,
        tax_period,
        efiling_reference,
        submission_method,
        submitted_by_name
      FROM sars_submission_history
      WHERE tenant_id = $1
        AND submission_method = 'AUTO_SYNC'
      ORDER BY submission_type, submission_date DESC
      `,
      [tenantId]
    );

    const lastSyncResult = await query(
      `
      SELECT MAX(submission_date) AS last_sync_at
      FROM sars_submission_history
      WHERE tenant_id = $1
        AND submission_method = 'AUTO_SYNC'
      `,
      [tenantId]
    );

    const byType = byTypeResult.rows.map((row: any) => ({
      type: row.submission_type,
      lastSyncAt: row.submission_date ? new Date(row.submission_date).toISOString() : null,
      amount: Number(row.amount_payable || 0),
      period: row.tax_period || '-',
      reference: row.efiling_reference || null,
      method: row.submission_method || null,
      source: row.submitted_by_name || null,
    }));

    return res.json({
      success: true,
      data: {
        enabled: hasFunction && hasTrigger,
        hasFunction,
        hasTrigger,
        lastSyncAt: lastSyncResult.rows[0]?.last_sync_at
          ? new Date(lastSyncResult.rows[0].last_sync_at).toISOString()
          : null,
        byType,
      },
    });
  } catch (error: any) {
    console.error('Regulatory auto-sync status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch auto-sync status' });
  }
};

/**
 * POST /api/compliance/regulatory/filings
 * Creates a draft filing record in compliance_status
 */
export const createRegulatoryFiling = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    await ensureRegulatoryTables();

    const { filingType, period, amount } = req.body || {};

    if (!filingType || !period) {
      return res.status(400).json({ success: false, error: 'filingType and period are required' });
    }

    const periodDate = new Date(period);
    const dueDate = computeDueDate(filingType, periodDate);
    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid period date' });
    }

    const descriptor = getFilingDescriptor(filingType);

    const insert = await query(
      `
      INSERT INTO regulatory_filings (
        tenant_id,
        filing_type,
        name,
        authority,
        period,
        due_date,
        status,
        amount,
        source,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, 'manual', NOW(), NOW())
      RETURNING filing_id::text AS id
      `,
      [
        tenantId,
        descriptor.type,
        descriptor.name,
        descriptor.authority,
        toPeriodString(periodDate),
        dueDate,
        Number(amount || 0) || 0,
      ]
    );

    return res.status(201).json({ success: true, data: insert.rows[0] });
  } catch (error: any) {
    console.error('Create regulatory filing error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create regulatory filing' });
  }
};

/**
 * POST /api/compliance/regulatory/filings/:id/submit
 * Marks a filing as submitted
 */
export const submitRegulatoryFiling = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    const { id } = req.params;

    await ensureRegulatoryTables();

    const update = await query(
      `
      UPDATE regulatory_filings
      SET
        status = 'submitted',
        submitted_date = NOW(),
        reference = COALESCE(reference, 'REG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING($2::text, 1, 8)),
        updated_at = NOW()
      WHERE tenant_id = $1
        AND filing_id = $2
      RETURNING filing_id::text AS id, filing_type, period, amount, reference
      `,
      [tenantId, id]
    );

    if (update.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Filing not found' });
    }

    // Optional mirror to SARS Sentinel submission history if table exists
    if (await tableExists('public', 'sars_submission_history')) {
      const userId = (req as any).user?.id || null;
      const row = update.rows[0];
      await query(
        `
        INSERT INTO sars_submission_history (
          tenant_id,
          submission_type,
          tax_period,
          submission_date,
          status,
          submitted_by,
          submitted_by_name,
          submission_method,
          efiling_reference,
          amount_payable
        )
        VALUES ($1, $2, $3, NOW(), 'SUBMITTED', $4, 'Regulatory Hub', 'HUB', $5, $6)
        `,
        [
          tenantId,
          row.filing_type || 'REGULATORY',
          row.period || null,
          userId,
          row.reference || null,
          Number(row.amount || 0) || 0,
        ]
      ).catch(() => {
        // Non-blocking mirror operation
      });
    }

    return res.json({ success: true, data: update.rows[0] });
  } catch (error: any) {
    console.error('Submit regulatory filing error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit filing' });
  }
};

async function ensureRegulatoryTables(): Promise<void> {
  await query(
    `
    CREATE TABLE IF NOT EXISTS regulatory_filings (
      filing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      filing_type VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      authority VARCHAR(120) NOT NULL,
      period VARCHAR(30),
      due_date DATE,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      submitted_date TIMESTAMP,
      reference VARCHAR(120),
      amount NUMERIC(14,2) DEFAULT 0,
      source VARCHAR(30) DEFAULT 'manual',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_regulatory_filings_tenant_due
      ON regulatory_filings (tenant_id, due_date DESC);
    `
  );
}

async function tableExists(schema: string, table: string): Promise<boolean> {
  const result = await query(`SELECT to_regclass($1) as reg`, [`${schema}.${table}`]);
  return !!result.rows[0]?.reg;
}

async function functionExists(schema: string, functionName: string): Promise<boolean> {
  const result = await query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = $1
        AND p.proname = $2
    ) AS exists
    `,
    [schema, functionName]
  );
  return !!result.rows[0]?.exists;
}

async function triggerExists(schema: string, table: string, triggerName: string): Promise<boolean> {
  const result = await query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND c.relname = $2
        AND t.tgname = $3
        AND NOT t.tgisinternal
    ) AS exists
    `,
    [schema, table, triggerName]
  );
  return !!result.rows[0]?.exists;
}

function toDateString(value: any): string {
  return new Date(value).toISOString().split('T')[0];
}

function toPeriodString(periodDate: Date): string {
  const d = Number.isNaN(periodDate.getTime()) ? new Date() : periodDate;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function normalizeFilingStatus(raw: string, dueDate?: string | Date): 'submitted' | 'pending' | 'overdue' | 'draft' {
  const status = (raw || '').toString().toLowerCase();
  if (status === 'submitted' || status === 'completed' || status === 'closed') return 'submitted';
  if (status === 'draft') return 'draft';
  const date = dueDate ? new Date(dueDate) : null;
  if (date && !Number.isNaN(date.getTime()) && date.getTime() < Date.now()) return 'overdue';
  return 'pending';
}

function normalizeRequirementStatus(filingStatus: 'submitted' | 'pending' | 'overdue' | 'draft'): 'compliant' | 'attention' | 'non-compliant' {
  if (filingStatus === 'submitted') return 'compliant';
  if (filingStatus === 'overdue') return 'non-compliant';
  return 'attention';
}

function getFilingDescriptor(filingType: string): { type: string; name: string; authority: string } {
  const t = (filingType || '').toUpperCase();
  if (t.includes('EMP201')) return { type: 'EMP201', name: 'EMP201 Monthly Return', authority: 'SARS' };
  if (t.includes('EMP501')) return { type: 'EMP501', name: 'EMP501 Reconciliation', authority: 'SARS' };
  if (t.includes('IT14')) return { type: 'IT14', name: 'IT14 Company Tax Return', authority: 'SARS' };
  if (t.includes('VAT201')) return { type: 'VAT201', name: 'VAT201 Return', authority: 'SARS' };
  if (t.includes('UIF')) return { type: 'UIF', name: 'UIF Declaration', authority: 'Department of Labour' };
  if (t.includes('CIPC')) return { type: 'CIPC', name: 'CIPC Annual Return', authority: 'CIPC' };
  return { type: t || 'REG', name: 'Regulatory Filing', authority: 'Regulator' };
}

function computeDueDate(filingType: string, periodDate: Date): Date {
  const base = Number.isNaN(periodDate.getTime()) ? new Date() : periodDate;
  const t = (filingType || '').toUpperCase();

  if (t.includes('EMP201') || t.includes('VAT201') || t.includes('UIF')) {
    return new Date(base.getFullYear(), base.getMonth() + 1, 7);
  }

  if (t.includes('EMP501')) {
    return new Date(base.getFullYear(), 4, 31); // 31 May
  }

  if (t.includes('IT14')) {
    return new Date(base.getFullYear() + 1, base.getMonth(), 28);
  }

  if (t.includes('CIPC')) {
    return new Date(base.getFullYear(), base.getMonth() + 1, 28);
  }

  return new Date(base.getFullYear(), base.getMonth() + 1, 15);
}

async function getLatestPayrollSnapshot(tenantId: string): Promise<{ period: string; dueDate: string; amount: number } | null> {
  const hasPayrollRuns = await tableExists('hr', 'payroll_runs');
  const hasPayrollDetails = await tableExists('hr', 'payroll_run_details');
  const hasPeriods = await tableExists('hr', 'payroll_periods');

  if (!hasPayrollRuns || !hasPayrollDetails || !hasPeriods) {
    return null;
  }

  const result = await query(
    `
    SELECT
      pr.run_date,
      pp.period_name,
      pp.end_date,
      COALESCE(SUM(prd.paye_tax), 0) AS total_paye,
      COALESCE(SUM(prd.uif_deduction), 0) AS total_uif,
      COALESCE(SUM(prd.sdl_amount), 0) AS total_sdl
    FROM hr.payroll_runs pr
    JOIN hr.payroll_periods pp ON pr.period_id = pp.period_id AND pr.tenant_id = pp.tenant_id
    LEFT JOIN hr.payroll_run_details prd ON pr.tenant_id = prd.tenant_id AND pr.run_id = prd.run_id
    WHERE pr.tenant_id = $1
    GROUP BY pr.run_date, pp.period_name, pp.end_date
    ORDER BY pr.run_date DESC
    LIMIT 1
    `,
    [tenantId]
  );

  if (!result.rows[0]) return null;

  const row = result.rows[0];
  const runDate = row.end_date ? new Date(row.end_date) : row.run_date ? new Date(row.run_date) : new Date();
  const dueDate = new Date(runDate.getFullYear(), runDate.getMonth() + 1, 7);
  const period = row.period_name || `${runDate.getFullYear()}-${String(runDate.getMonth() + 1).padStart(2, '0')}`;

  return {
    period,
    dueDate: toDateString(dueDate),
    amount: Number(row.total_paye || 0) + Number(row.total_uif || 0) + Number(row.total_sdl || 0),
  };
}

async function getLatestSubmissionFor(
  tenantId: string,
  submissionType: string,
  taxPeriod?: string
): Promise<{ submittedDate?: string; reference?: string } | null> {
  if (!(await tableExists('public', 'sars_submission_history'))) {
    return null;
  }

  const conditions: string[] = ['tenant_id = $1', 'UPPER(submission_type) = UPPER($2)'];
  const params: any[] = [tenantId, submissionType];

  if (taxPeriod) {
    conditions.push('tax_period = $3');
    params.push(taxPeriod);
  }

  const result = await query(
    `
    SELECT submission_date, efiling_reference
    FROM sars_submission_history
    WHERE ${conditions.join(' AND ')}
    ORDER BY submission_date DESC
    LIMIT 1
    `,
    params
  );

  if (!result.rows[0]) return null;
  return {
    submittedDate: result.rows[0].submission_date ? toDateString(result.rows[0].submission_date) : undefined,
    reference: result.rows[0].efiling_reference || undefined,
  };
}

function dedupeFilings(filings: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const filing of filings) {
    const key = `${filing.type}|${filing.period}|${filing.name}|${filing.authority}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(filing);
  }
  return out;
}

function getCurrentTaxYearLabel(): string {
  const now = new Date();
  const start = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${start + 1}`;
}

function getEmp501DueDate(): string {
  return getNextAnnualDueDate(4, 31); // 31 May
}

function getIrp5DueDate(): string {
  return getNextAnnualDueDate(4, 31); // 31 May
}

function computeCalendarNextDueDate(frequency: string | null, dueDayOfMonth: number | null, dueMonth: number | null): string | null {
  const now = new Date();
  const f = (frequency || '').toUpperCase();
  const annualLike = f.includes('ANNUAL') || f.includes('BI_ANNUAL');
  const monthFromInput = dueMonth ? Number(dueMonth) : annualLike ? 5 : null;
  const day = Number(dueDayOfMonth || (monthFromInput === 5 ? 31 : 1));

  const safeDate = (year: number, monthZeroBased: number, dayOfMonth: number): Date => {
    const d = new Date(year, monthZeroBased, dayOfMonth);
    if (d.getMonth() !== monthZeroBased) {
      return new Date(year, monthZeroBased + 1, 0);
    }
    return d;
  };

  if (f.includes('MONTHLY')) {
    let candidate = safeDate(now.getFullYear(), now.getMonth(), day);
    if (candidate < now) candidate = safeDate(now.getFullYear(), now.getMonth() + 1, day);
    return toDateString(candidate);
  }

  if (f.includes('BI_MONTHLY')) {
    let candidate = safeDate(now.getFullYear(), now.getMonth(), day);
    if (candidate < now) candidate = safeDate(now.getFullYear(), now.getMonth() + 2, day);
    return toDateString(candidate);
  }

  if (f.includes('BI_ANNUAL')) {
    const monthZero = Math.max(0, (monthFromInput || 5) - 1);
    let candidate = safeDate(now.getFullYear(), monthZero, day);
    if (candidate < now) candidate = safeDate(now.getFullYear() + 1, monthZero, day);
    return toDateString(candidate);
  }

  if (f.includes('ANNUAL')) {
    const monthZero = Math.max(0, (monthFromInput || 5) - 1);
    let candidate = safeDate(now.getFullYear(), monthZero, day);
    if (candidate < now) candidate = safeDate(now.getFullYear() + 1, monthZero, day);
    return toDateString(candidate);
  }

  return null;
}

function normalizeCalendarFrequency(frequency: string | null): string {
  const f = (frequency || '').toUpperCase();
  if (f.includes('MONTHLY')) return 'Monthly';
  if (f.includes('BI_MONTHLY')) return 'Bi-Monthly';
  if (f.includes('ANNUAL')) return 'Annual';
  if (f.includes('BI_ANNUAL')) return 'Bi-Annual';
  return 'Ongoing';
}

function getNextAnnualDueDate(monthZeroBased: number, dayOfMonth: number): string {
  const now = new Date();
  let candidate = new Date(now.getFullYear(), monthZeroBased, dayOfMonth);
  if (candidate < now) {
    candidate = new Date(now.getFullYear() + 1, monthZeroBased, dayOfMonth);
  }
  return toDateString(candidate);
}

async function getActiveEmployeeCount(tenantId: string): Promise<number> {
  if (!(await tableExists('hr', 'employees'))) return 0;
  const result = await query(
    `
    SELECT COUNT(*) AS cnt
    FROM hr.employees
    WHERE tenant_id = $1
      AND COALESCE(employment_status, 'Active') ILIKE 'active%'
    `,
    [tenantId]
  );
  return Number(result.rows[0]?.cnt || 0);
}

/**
 * Get overall compliance score
 */
async function getComplianceScore(tenantId: string) {
  const result = await query(
    `
    SELECT 
      framework_name,
      compliance_percentage,
      last_assessment_date,
      status
    FROM compliance_frameworks
    WHERE tenant_id = $1 AND is_active = true
    ORDER BY compliance_percentage ASC
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get pending audits
 */
async function getPendingAudits(tenantId: string) {
  const result = await query(
    `
    SELECT 
      id,
      audit_name,
      audit_type,
      scheduled_date,
      status,
      auditor,
      scope
    FROM compliance_audits
    WHERE tenant_id = $1 
      AND status IN ('scheduled', 'in_progress')
    ORDER BY scheduled_date ASC
    LIMIT 10
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get recent policy updates
 */
async function getPolicyUpdates(tenantId: string) {
  const result = await query(
    `
    SELECT 
      id,
      policy_name,
      policy_version,
      effective_date,
      status,
      last_review_date,
      next_review_date
    FROM compliance_policies
    WHERE tenant_id = $1
    ORDER BY effective_date DESC
    LIMIT 10
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get active risk alerts
 */
async function getRiskAlerts(tenantId: string) {
  const result = await query(
    `
    SELECT 
      id,
      risk_category,
      risk_level,
      description,
      detected_date,
      status,
      mitigation_plan
    FROM compliance_risks
    WHERE tenant_id = $1 
      AND status IN ('open', 'investigating')
      AND risk_level IN ('high', 'critical')
    ORDER BY 
      CASE risk_level
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        ELSE 3
      END,
      detected_date DESC
    LIMIT 15
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get compliance history (last 6 months)
 */
async function getComplianceHistory(tenantId: string) {
  const result = await query(
    `
    SELECT 
      DATE_TRUNC('month', assessment_date) as month,
      AVG(compliance_percentage) as avg_compliance,
      COUNT(*) as assessment_count
    FROM compliance_assessments
    WHERE tenant_id = $1 
      AND assessment_date >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', assessment_date)
    ORDER BY month DESC
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get compliance summary metrics
 */
async function getComplianceSummary(tenantId: string) {
  const result = await query(
    `
    SELECT 
      COUNT(DISTINCT cf.id) as active_frameworks,
      AVG(cf.compliance_percentage) as overall_compliance,
      COUNT(CASE WHEN ca.status IN ('scheduled', 'in_progress') THEN 1 END) as pending_audits,
      COUNT(CASE WHEN cr.status IN ('open', 'investigating') AND cr.risk_level IN ('high', 'critical') THEN 1 END) as critical_risks,
      COUNT(CASE WHEN cp.next_review_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as policies_due_review
    FROM compliance_frameworks cf
    LEFT JOIN compliance_audits ca ON ca.tenant_id = $1
    LEFT JOIN compliance_risks cr ON cr.tenant_id = $1
    LEFT JOIN compliance_policies cp ON cp.tenant_id = $1
    WHERE cf.tenant_id = $1 AND cf.is_active = true
    `,
    [tenantId]
  );

  return result.rows[0] || {
    active_frameworks: 0,
    overall_compliance: 0,
    pending_audits: 0,
    critical_risks: 0,
    policies_due_review: 0,
  };
}
