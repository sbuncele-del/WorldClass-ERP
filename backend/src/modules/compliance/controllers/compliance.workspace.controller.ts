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

    // 3) VAT201 derived from Financial GL
    const vatSnapshot = await getLatestVATSnapshot(tenantId);
    if (vatSnapshot) {
      const vatSubmission = await getLatestSubmissionFor(tenantId, 'VAT201', vatSnapshot.period);
      const vatStatus = vatSubmission
        ? 'submitted'
        : normalizeFilingStatus('pending', vatSnapshot.dueDate);

      filings.push({
        id: `GL-VAT201-${vatSnapshot.period}`,
        name: 'VAT201 Return',
        authority: 'SARS',
        type: 'VAT201',
        dueDate: vatSnapshot.dueDate,
        status: vatStatus,
        period: vatSnapshot.period,
        submittedDate: vatSubmission?.submittedDate,
        reference: vatSubmission?.reference,
        amount: vatSnapshot.netVat,
      });
    }

    // 4) SARS Sentinel submission history (if table exists)
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
    const emp201LastSubmission = await getLatestSubmissionFor(tenantId, 'EMP201', hrSnapshot?.period || undefined);
    const emp201NextDue = getNextMonthlyDueDate(7); // EMP201 due 7th of each month
    const emp201Status = emp201LastSubmission
      ? 'compliant'
      : hrSnapshot
        ? normalizeRequirementStatus(normalizeFilingStatus('pending', emp201NextDue))
        : 'attention';

    requirements.push({
      id: 'REQ-EMP201',
      name: 'EMP201 Monthly PAYE/UIF/SDL Return',
      authority: 'SARS',
      frequency: 'Monthly',
      nextDue: emp201NextDue,
      status: emp201Status,
      lastFiled: emp201LastSubmission?.submittedDate,
      description: hrSnapshot
        ? `Monthly statutory payroll return (PAYE, UIF, SDL). Last payroll: ${hrSnapshot.period}, total statutory: R${hrSnapshot.amount.toLocaleString()}.`
        : 'Monthly statutory payroll return based on payroll run data (PAYE, UIF, SDL).',
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

    // VAT201 requirement from Financial GL
    const vatSnapshot = await getLatestVATSnapshot(tenantId);
    const vat201Submission = vatSnapshot
      ? await getLatestSubmissionFor(tenantId, 'VAT201', vatSnapshot.period)
      : null;
    const vat201NextDue = getNextMonthlyDueDate(25); // VAT201 due 25th of each month
    requirements.push({
      id: 'REQ-VAT201',
      name: 'VAT201 Monthly Return',
      authority: 'SARS',
      frequency: 'Monthly',
      nextDue: vat201NextDue,
      status: vatSnapshot
        ? vat201Submission ? 'compliant' : normalizeRequirementStatus(normalizeFilingStatus('pending', vat201NextDue))
        : 'attention',
      lastFiled: vat201Submission?.submittedDate,
      description: vatSnapshot
        ? `Auto-calculated from GL: Output VAT R${vatSnapshot.outputVat.toLocaleString()} – Input VAT R${vatSnapshot.inputVat.toLocaleString()} = Net R${vatSnapshot.netVat.toLocaleString()}.`
        : 'VAT201 return. No journal entries found for the previous period.',
    });

    // B-BBEE requirement from HR Demographics
    const bbbeeScorecard = await getBBBEEScorecard(tenantId);
    requirements.push({
      id: 'REQ-BBBEE',
      name: 'B-BBEE Compliance Certificate',
      authority: 'B-BBEE Commission',
      frequency: 'Annual',
      nextDue: getNextAnnualDueDate(8, 30), // 30 September typical verification
      status: bbbeeScorecard
        ? bbbeeScorecard.estimatedLevel <= 4 ? 'compliant' : 'attention'
        : 'attention',
      description: bbbeeScorecard
        ? `Level ${bbbeeScorecard.estimatedLevel} (est.) — ${bbbeeScorecard.totalEmployees} employees, ${bbbeeScorecard.demographics.black + bbbeeScorecard.demographics.coloured + bbbeeScorecard.demographics.indian} designated (${bbbeeScorecard.blackOwnershipPercent}%), Mgmt control ${bbbeeScorecard.managementControlPercent}%.`
        : 'B-BBEE verification. Add employee demographics in HR module for automatic scoring.',
    });

    // FICA requirement
    const ficaPopia = await getFICAPOPIAStatus(tenantId);
    requirements.push({
      id: 'REQ-FICA',
      name: 'FICA Customer Due Diligence',
      authority: 'Financial Intelligence Centre',
      frequency: 'Ongoing',
      nextDue: '-',
      status: ficaPopia.ficaStatus === 'not-applicable' ? 'attention' : ficaPopia.ficaStatus,
      description: ficaPopia.ficaDetails.customersDueDiligence > 0
        ? `${ficaPopia.ficaDetails.customersVerified}/${ficaPopia.ficaDetails.customersDueDiligence} customers verified. ${ficaPopia.ficaDetails.suspiciousReports} open suspicious transaction reports.`
        : 'FICA requires Customer Due Diligence (CDD) for all clients. Create fica_customer_due_diligence records to track.',
    });

    // POPIA requirement
    requirements.push({
      id: 'REQ-POPIA',
      name: 'POPIA Data Protection Compliance',
      authority: 'Information Regulator',
      frequency: 'Ongoing',
      nextDue: '-',
      status: ficaPopia.popiaStatus === 'not-applicable' ? 'attention' : ficaPopia.popiaStatus,
      description: ficaPopia.popiaDetails.consentRecordsCount > 0 || ficaPopia.popiaDetails.dataProcessingAgreements > 0
        ? `${ficaPopia.popiaDetails.consentRecordsCount} consent records, ${ficaPopia.popiaDetails.dataProcessingAgreements} DPAs active. ${ficaPopia.popiaDetails.breachIncidents} open breach incidents. ${ficaPopia.popiaDetails.dataSubjectRequests} data subject requests.`
        : 'POPIA compliance tracking. Set up consent records and data processing agreements to monitor.',
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

    // CIPC requirement — pull real entity data from Multi-Entity module
    const cipcEntities = await getCIPCEntityDetails(tenantId);
    if (cipcEntities.length > 0) {
      for (const entity of cipcEntities) {
        const cipcSubmission = await getLatestSubmissionFor(tenantId, 'CIPC');
        requirements.push({
          id: `REQ-CIPC-${entity.registrationNumber.replace(/[^a-zA-Z0-9]/g, '')}`,
          name: `CIPC Annual Return — ${entity.entityName}`,
          authority: 'CIPC',
          frequency: 'Annual',
          nextDue: getNextAnnualDueDate(entity.registrationNumber ? getAnniversaryMonth(entity.registrationNumber) : 0, 28),
          status: cipcSubmission ? 'compliant' : 'attention',
          lastFiled: cipcSubmission?.submittedDate,
          description: `Reg: ${entity.registrationNumber} (${entity.entityType})${entity.vatNumber ? ', VAT: ' + entity.vatNumber : ''}.`,
        });
      }
    } else {
      requirements.push({
        id: 'REQ-CIPC',
        name: 'CIPC Annual Return',
        authority: 'CIPC',
        frequency: 'Annual',
        nextDue: '-',
        status: 'attention',
        description: 'No entities with registration numbers found. Add company details in Multi-Entity module.',
      });
    }

    // ── PRE-POPULATED SA REQUIREMENTS (available library) ──
    // These are always shown — user "activates" the ones relevant to their business
    const saRequirementsLibrary = [
      // SARS — Tax
      { id: 'SA-VAT201',  name: 'VAT201 Return',                    authority: 'SARS',                     frequency: 'Monthly/Bi-monthly', category: 'Tax',        description: 'Value-Added Tax return. Due by the 25th of the month following the tax period. Mandatory for VAT-registered businesses (turnover > R2.3m).' },
      { id: 'SA-EMP201',  name: 'EMP201 Monthly Return',            authority: 'SARS',                     frequency: 'Monthly',            category: 'Tax',        description: 'Monthly employer declaration for PAYE, UIF, and SDL. Due by the 7th of each month.' },
      { id: 'SA-EMP501',  name: 'EMP501 Reconciliation',            authority: 'SARS',                     frequency: 'Bi-Annual',          category: 'Tax',        description: 'Interim reconciliation (Oct) and annual reconciliation (May) of EMP201 returns against IRP5/IT3(a) certificates.' },
      { id: 'SA-IRP5',    name: 'IRP5/IT3(a) Tax Certificates',     authority: 'SARS',                     frequency: 'Annual',             category: 'Tax',        description: 'Employee tax certificates issued annually with EMP501 submission. Required for each active employee.' },
      { id: 'SA-IT14',    name: 'IT14 Company Tax Return',          authority: 'SARS',                     frequency: 'Annual',             category: 'Tax',        description: 'Annual income tax return for companies. Due 12 months after financial year-end.' },
      { id: 'SA-IT12',    name: 'IT12 Individual Tax Return',       authority: 'SARS',                     frequency: 'Annual',             category: 'Tax',        description: 'Individual/trust income tax return. Filing season typically July–October for non-provisional taxpayers.' },
      { id: 'SA-PROVTAX', name: 'Provisional Tax (IRP6)',           authority: 'SARS',                     frequency: 'Bi-Annual',          category: 'Tax',        description: 'First payment by end of 6th month of tax year, second by year-end. Third (top-up) within 6 months after year-end.' },
      { id: 'SA-DWT',     name: 'Dividends Withholding Tax',        authority: 'SARS',                     frequency: 'Per dividend',       category: 'Tax',        description: '20% withholding tax on dividends declared. Due by end of month following dividend payment.' },
      { id: 'SA-TTL',     name: 'Transfer Duty / Tax',              authority: 'SARS',                     frequency: 'Per transaction',    category: 'Tax',        description: 'Transfer duty on property acquisitions. Payable within 6 months of acquisition.' },
      { id: 'SA-CUSTOMS', name: 'Customs & Excise Duties',          authority: 'SARS Customs',             frequency: 'Per shipment',       category: 'Tax',        description: 'Import/export duties and excise. Only applicable to businesses importing goods or dealing in excise products.' },
      // CIPC — Company Registration
      { id: 'SA-CIPC-AR', name: 'CIPC Annual Return',               authority: 'CIPC',                     frequency: 'Annual',             category: 'Corporate',  description: 'Annual return filed within 30 business days of company anniversary date. Failure = deregistration risk.' },
      { id: 'SA-CIPC-CR', name: 'CIPC Change of Registered Details', authority: 'CIPC',                    frequency: 'As needed',          category: 'Corporate',  description: 'Notify CIPC within 10 business days of changes to directors, registered address, or financial year-end.' },
      { id: 'SA-CIPC-FS', name: 'Annual Financial Statements',      authority: 'CIPC / Companies Act',     frequency: 'Annual',             category: 'Corporate',  description: 'Companies Act s30: AFS must be prepared within 6 months of year-end. s33: filed if public interest score > 350.' },
      { id: 'SA-AGM',     name: 'Annual General Meeting',           authority: 'Companies Act',            frequency: 'Annual',             category: 'Corporate',  description: 'Public companies: AGM within 15 months of previous AGM. Private companies: not required unless MOI stipulates.' },
      // Labour — DoEL
      { id: 'SA-UIF',     name: 'UIF Monthly Contributions',        authority: 'Dept of Labour',           frequency: 'Monthly',            category: 'Labour',     description: 'UIF contributions (2% of remuneration, split employer/employee). Declared via EMP201 and paid to SARS.' },
      { id: 'SA-SDL',     name: 'Skills Development Levy',          authority: 'Dept of Labour',           frequency: 'Monthly',            category: 'Labour',     description: '1% of total payroll for employers with annual payroll > R500,000. Paid via EMP201.' },
      { id: 'SA-EE',      name: 'Employment Equity Report',         authority: 'Dept of Labour',           frequency: 'Annual',             category: 'Labour',     description: 'Employers with 50+ employees or turnover above sector threshold. Due 15 January annually (online) or 1 October (manual).' },
      { id: 'SA-WSP',     name: 'Workplace Skills Plan (WSP/ATR)',  authority: 'SETA',                     frequency: 'Annual',             category: 'Labour',     description: 'Due 30 April annually. Submit WSP (forward plans) and ATR (training already done) to your sector SETA. Failure affects mandatory grant claims.' },
      { id: 'SA-COIDA',   name: 'COIDA Return of Earnings',        authority: 'Compensation Fund',        frequency: 'Annual',             category: 'Labour',     description: 'Annual return of earnings for workplace injury/disease fund. Due 31 March. Letter of Good Standing needed for contracts.' },
      { id: 'SA-BCEA',    name: 'Basic Conditions of Employment',   authority: 'Dept of Labour',           frequency: 'Ongoing',            category: 'Labour',     description: 'Compliance with BCEA: working hours, leave, overtime, notice periods, payslips. Inspections can occur anytime.' },
      { id: 'SA-OHS',     name: 'Occupational Health & Safety',     authority: 'Dept of Labour',           frequency: 'Ongoing',            category: 'Labour',     description: 'OHS Act compliance: risk assessments, safety representatives, incident reporting. Required for all employers.' },
      // B-BBEE
      { id: 'SA-BBBEE',   name: 'B-BBEE Verification',             authority: 'B-BBEE Commission',        frequency: 'Annual',             category: 'B-BBEE',    description: 'Annual verification against the B-BBEE Codes of Good Practice. Required for government tenders and large enterprise supply chains.' },
      { id: 'SA-BBBEE-R', name: 'B-BBEE Annual Compliance Report', authority: 'B-BBEE Commission',        frequency: 'Annual',             category: 'B-BBEE',    description: 'Large enterprises (turnover > R50m) must file annual compliance report with the B-BBEE Commission within 90 days of verification.' },
      // Data Protection
      { id: 'SA-POPIA',   name: 'POPIA Compliance',                 authority: 'Information Regulator',    frequency: 'Ongoing',            category: 'Data',       description: 'Protection of Personal Information Act: consent management, data subject requests, breach notification (within 72 hours), information officer registration.' },
      { id: 'SA-PAIA',    name: 'PAIA Manual (s51)',                authority: 'Information Regulator',    frequency: 'As needed',          category: 'Data',       description: 'Promotion of Access to Information Act: every private body must compile and make available a s51 PAIA manual.' },
      // Financial Intelligence
      { id: 'SA-FICA',    name: 'FICA / AML Compliance',           authority: 'Financial Intelligence Centre', frequency: 'Ongoing',       category: 'Financial',  description: 'Financial Intelligence Centre Act: Customer Due Diligence (CDD), record-keeping, reporting of suspicious/unusual transactions. Applicable to accountable/reporting institutions.' },
      { id: 'SA-FICA-STR', name: 'Suspicious Transaction Reports', authority: 'Financial Intelligence Centre', frequency: 'As needed',     category: 'Financial',  description: 'Section 29 reports: file within 15 days of suspicion. Cash transactions > R24,999.99: file CTR within 2 days.' },
      // Industry-specific
      { id: 'SA-MHSA',    name: 'Mine Health & Safety',            authority: 'DMRE',                     frequency: 'Ongoing',            category: 'Industry',   description: 'Mine Health and Safety Act compliance. Only applicable to mining operations. Includes accident reporting, safety audits, and dust/noise measurements.' },
      { id: 'SA-NRCS',    name: 'NRCS Product Compliance',         authority: 'NRCS',                     frequency: 'Per product',        category: 'Industry',   description: 'Compulsory specifications for regulated products (electrical, automotive, food). Only applicable to manufacturers/importers of regulated goods.' },
      { id: 'SA-NHBRC',   name: 'NHBRC Registration',              authority: 'NHBRC',                    frequency: 'Annual',             category: 'Industry',   description: 'Home builders must be registered with NHBRC. Annual fees and compliance with structural defect warranty requirements. Only for construction sector.' },
      { id: 'SA-CIDB',    name: 'CIDB Grading',                    authority: 'CIDB',                     frequency: 'Annual',             category: 'Industry',   description: 'Construction Industry Development Board grading. Required for government construction tenders. Annual renewal and upgrading.' },
    ];

    // Check which requirements are tracked for this tenant
    await ensureRegulatoryTables();
    const trackedResult = await query(
      `SELECT requirement_id, tracked FROM tenant_compliance_tracking WHERE tenant_id = $1`,
      [tenantId]
    );
    const trackedMap = new Map<string, boolean>();
    for (const row of trackedResult.rows) {
      trackedMap.set(row.requirement_id, row.tracked);
    }

    // Merge dynamic requirements (already computed) as tracked=true
    for (const req of requirements) {
      (req as any).tracked = true;
    }

    // Add library items that aren't already covered by dynamic requirements
    const dynamicIds = new Set(requirements.map(r => r.id));
    for (const libReq of saRequirementsLibrary) {
      if (dynamicIds.has(libReq.id)) continue;
      const isTracked = trackedMap.get(libReq.id) ?? false;
      requirements.push({
        ...libReq,
        nextDue: '-',
        status: isTracked ? 'attention' : ('inactive' as any),
        tracked: isTracked,
      });
    }

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

    // VAT201 deadline from GL
    const vatSnapshotForDeadlines = await getLatestVATSnapshot(tenantId);
    if (vatSnapshotForDeadlines?.dueDate) {
      addDeadline(vatSnapshotForDeadlines.dueDate, {
        name: 'VAT201 Return',
        authority: 'SARS',
        type: 'VAT201',
      });
    }

    // B-BBEE annual verification deadline
    addDeadline(getNextAnnualDueDate(8, 30), {
      name: 'B-BBEE Verification',
      authority: 'B-BBEE Commission',
      type: 'BBBEE',
    });

    // CIPC entity anniversary deadlines
    const cipcEntitiesForDeadlines = await getCIPCEntityDetails(tenantId);
    for (const entity of cipcEntitiesForDeadlines) {
      const month = getAnniversaryMonth(entity.registrationNumber);
      addDeadline(getNextAnnualDueDate(month, 28), {
        name: `CIPC Annual Return — ${entity.entityName}`,
        authority: 'CIPC',
        type: 'CIPC',
      });
    }

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

/**
 * GET /api/compliance/regulatory/enhanced-status
 * Returns enhanced regulatory data: VAT snapshot, B-BBEE scorecard, CIPC entities, FICA/POPIA
 */
export const getRegulatoryEnhancedStatus = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Tenant ID not found' });
    }

    const [vatSnapshot, bbbeeScorecard, cipcEntities, ficaPopia] = await Promise.all([
      getLatestVATSnapshot(tenantId),
      getBBBEEScorecard(tenantId),
      getCIPCEntityDetails(tenantId),
      getFICAPOPIAStatus(tenantId),
    ]);

    return res.json({
      success: true,
      data: {
        vat: vatSnapshot,
        bbbee: bbbeeScorecard,
        cipc: cipcEntities,
        fica: ficaPopia.ficaStatus !== 'not-applicable' ? {
          status: ficaPopia.ficaStatus,
          ...ficaPopia.ficaDetails,
        } : null,
        popia: ficaPopia.popiaStatus !== 'not-applicable' ? {
          status: ficaPopia.popiaStatus,
          ...ficaPopia.popiaDetails,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Enhanced regulatory status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch enhanced regulatory status' });
  }
};

export const toggleRequirementTracking = async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'Tenant ID not found' });
    }

    const { requirementId, tracked } = req.body;
    if (!requirementId || typeof tracked !== 'boolean') {
      return res.status(400).json({ success: false, error: 'requirementId (string) and tracked (boolean) are required' });
    }

    await ensureRegulatoryTables();

    await query(
      `INSERT INTO tenant_compliance_tracking (tenant_id, requirement_id, tracked, activated_at, deactivated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, requirement_id)
       DO UPDATE SET tracked = $3,
         activated_at   = CASE WHEN $3 THEN NOW() ELSE tenant_compliance_tracking.activated_at END,
         deactivated_at = CASE WHEN NOT $3 THEN NOW() ELSE NULL END`,
      [tenantId, requirementId, tracked, tracked ? new Date() : null, tracked ? null : new Date()]
    );

    return res.json({ success: true, data: { requirementId, tracked } });
  } catch (error: any) {
    console.error('Toggle requirement tracking error:', error);
    return res.status(500).json({ success: false, error: 'Failed to toggle requirement tracking' });
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

    CREATE TABLE IF NOT EXISTS tenant_compliance_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      requirement_id VARCHAR(50) NOT NULL,
      tracked BOOLEAN NOT NULL DEFAULT true,
      activated_at TIMESTAMP DEFAULT NOW(),
      deactivated_at TIMESTAMP,
      UNIQUE(tenant_id, requirement_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tenant_compliance_tracking_tenant
      ON tenant_compliance_tracking (tenant_id);
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

/**
 * Get the next upcoming monthly due date on a given day-of-month.
 * If today is past that day this month, returns next month's date.
 */
function getNextMonthlyDueDate(dayOfMonth: number): string {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (thisMonth.getTime() > now.getTime()) return toDateString(thisMonth);
  return toDateString(new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth));
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

/**
 * CIPC annual returns are due within 30 days of the anniversary of registration.
 * We hash the registration number to derive the anniversary month (0-11).
 */
function getAnniversaryMonth(registrationNumber: string): number {
  // CIPC reg format is typically YYYY/NNNNNN/NN — extract year if possible
  const match = registrationNumber.match(/^(\d{4})\//);
  if (match) {
    // Use the registration year's month component as a proxy
    const regYear = parseInt(match[1], 10);
    return regYear % 12; // Distribute across months
  }
  // Fallback: hash chars to derive month
  let hash = 0;
  for (let i = 0; i < registrationNumber.length; i++) {
    hash = ((hash << 5) - hash + registrationNumber.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 12;
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

// ============================================================================
// VAT INTEGRATION — Financial GL Module
// ============================================================================

interface VATSnapshot {
  period: string;
  dueDate: string;
  outputVat: number;
  inputVat: number;
  netVat: number;
}

/**
 * Pull the latest month's VAT output & input from journal_entry_lines
 * linked to known VAT accounts (codes 2200 = Output, 2210/1230 = Input).
 */
async function getLatestVATSnapshot(tenantId: string): Promise<VATSnapshot | null> {
  const hasJournalEntries = await tableExists('public', 'journal_entries');
  const hasJournalLines = await tableExists('public', 'journal_entry_lines');
  if (!hasJournalEntries || !hasJournalLines) return null;

  const result = await query(
    `
    SELECT
      TO_CHAR(DATE_TRUNC('month', je.journal_date), 'YYYY-MM') AS period,
      COALESCE(SUM(jel.credit_amount) FILTER (
        WHERE UPPER(COALESCE(jel.tax_code, '')) LIKE '%OUTPUT%'
           OR jel.account_code IN (
              SELECT code FROM chart_of_accounts
              WHERE tenant_id = $1 AND UPPER(COALESCE(default_tax_code,'')) LIKE '%OUTPUT%'
           )
      ), 0) AS output_vat,
      COALESCE(SUM(jel.debit_amount) FILTER (
        WHERE UPPER(COALESCE(jel.tax_code, '')) LIKE '%INPUT%'
           OR jel.account_code IN (
              SELECT code FROM chart_of_accounts
              WHERE tenant_id = $1 AND UPPER(COALESCE(default_tax_code,'')) LIKE '%INPUT%'
           )
      ), 0) AS input_vat
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
                                 AND je.tenant_id = jel.tenant_id
    WHERE je.tenant_id = $1
      AND je.status IN ('posted', 'approved')
      AND COALESCE(je.journal_date, je.entry_date) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND COALESCE(je.journal_date, je.entry_date) < DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY DATE_TRUNC('month', je.journal_date)
    ORDER BY period DESC
    LIMIT 1
    `,
    [tenantId]
  );

  if (!result.rows[0]) return null;

  const row = result.rows[0];
  const outputVat = Number(row.output_vat || 0);
  const inputVat = Number(row.input_vat || 0);
  const periodDate = new Date(row.period + '-01');
  const dueDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 25); // VAT201 due 25th

  return {
    period: row.period,
    dueDate: toDateString(dueDate),
    outputVat,
    inputVat,
    netVat: outputVat - inputVat,
  };
}

// ============================================================================
// B-BBEE INTEGRATION — HR Demographics
// ============================================================================

interface BBBEEScorecard {
  totalEmployees: number;
  demographics: {
    black: number;
    coloured: number;
    indian: number;
    white: number;
    unspecified: number;
  };
  gender: {
    male: number;
    female: number;
    other: number;
  };
  disabilityCount: number;
  blackOwnershipPercent: number;
  managementControlPercent: number;
  estimatedLevel: number;
}

/**
 * Calculate B-BBEE scorecard from HR employee demographics.
 * Uses race, gender, disability_status fields from hr.employees.
 */
async function getBBBEEScorecard(tenantId: string): Promise<BBBEEScorecard | null> {
  if (!(await tableExists('hr', 'employees'))) return null;

  // Check if race column exists — not all deployments have demographic columns
  const colCheck = await query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'hr' AND table_name = 'employees' AND column_name = 'race'`
  );
  if (colCheck.rows.length === 0) return null;

  const result = await query(
    `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(race,'')) IN ('BLACK','AFRICAN')) AS black,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(race,'')) = 'COLOURED') AS coloured,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(race,'')) IN ('INDIAN','ASIAN')) AS indian,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(race,'')) = 'WHITE') AS white,
      COUNT(*) FILTER (WHERE COALESCE(race,'') = '' OR race IS NULL) AS unspecified,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(gender,'')) IN ('MALE','M')) AS male,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(gender,'')) IN ('FEMALE','F')) AS female,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(gender,'')) NOT IN ('MALE','M','FEMALE','F','')) AS gender_other,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(disability_status,'')) IN ('YES','Y','TRUE','DISABLED')) AS disabled
    FROM hr.employees
    WHERE tenant_id = $1
      AND COALESCE(employment_status, 'Active') ILIKE 'active%'
    `,
    [tenantId]
  );

  if (!result.rows[0] || Number(result.rows[0].total) === 0) return null;

  const r = result.rows[0];
  const total = Number(r.total);
  const black = Number(r.black);
  const coloured = Number(r.coloured);
  const indian = Number(r.indian);
  const designated = black + coloured + indian;

  // Management control: check designated groups in management positions
  const mgmtResult = await query(
    `
    SELECT
      COUNT(*) AS total_mgmt,
      COUNT(*) FILTER (
        WHERE UPPER(COALESCE(race,'')) IN ('BLACK','AFRICAN','COLOURED','INDIAN','ASIAN')
      ) AS designated_mgmt
    FROM hr.employees
    WHERE tenant_id = $1
      AND COALESCE(employment_status, 'Active') ILIKE 'active%'
      AND (
        UPPER(COALESCE(job_title,'')) LIKE '%MANAGER%'
        OR UPPER(COALESCE(job_title,'')) LIKE '%DIRECTOR%'
        OR UPPER(COALESCE(job_title,'')) LIKE '%HEAD%'
        OR UPPER(COALESCE(job_title,'')) LIKE '%EXECUTIVE%'
        OR UPPER(COALESCE(job_title,'')) LIKE '%CEO%'
        OR UPPER(COALESCE(job_title,'')) LIKE '%CFO%'
        OR UPPER(COALESCE(job_title,'')) LIKE '%COO%'
      )
    `,
    [tenantId]
  );

  const totalMgmt = Number(mgmtResult.rows[0]?.total_mgmt || 0);
  const designatedMgmt = Number(mgmtResult.rows[0]?.designated_mgmt || 0);
  const mgmtPercent = totalMgmt > 0 ? Math.round((designatedMgmt / totalMgmt) * 100) : 0;
  const designatedPercent = total > 0 ? Math.round((designated / total) * 100) : 0;

  // Simplified B-BBEE level estimation based on designated group % and management control
  // Real B-BBEE has 5 pillars; this covers the two biggest: Ownership proxy + Management Control
  const combinedScore = (designatedPercent * 0.6) + (mgmtPercent * 0.4);
  let level = 8;
  if (combinedScore >= 95) level = 1;
  else if (combinedScore >= 85) level = 2;
  else if (combinedScore >= 75) level = 3;
  else if (combinedScore >= 65) level = 4;
  else if (combinedScore >= 55) level = 5;
  else if (combinedScore >= 45) level = 6;
  else if (combinedScore >= 35) level = 7;

  return {
    totalEmployees: total,
    demographics: {
      black,
      coloured,
      indian,
      white: Number(r.white),
      unspecified: Number(r.unspecified),
    },
    gender: {
      male: Number(r.male),
      female: Number(r.female),
      other: Number(r.gender_other),
    },
    disabilityCount: Number(r.disabled),
    blackOwnershipPercent: designatedPercent, // Proxy: designated group % of workforce
    managementControlPercent: mgmtPercent,
    estimatedLevel: level,
  };
}

// ============================================================================
// CIPC INTEGRATION — Multi-Entity Module
// ============================================================================

interface CIPCEntityInfo {
  entityName: string;
  registrationNumber: string;
  entityType: string;
  vatNumber?: string;
  taxNumber?: string;
}

/**
 * Pull company registration details from legal_entities / entities tables.
 */
async function getCIPCEntityDetails(tenantId: string): Promise<CIPCEntityInfo[]> {
  // Try legal_entities (V2) first, fall back to entities (legacy)
  if (await tableExists('public', 'legal_entities')) {
    const result = await query(
      `
      SELECT name, registration_number, type, vat_number, tax_number
      FROM legal_entities
      WHERE tenant_id = $1
        AND registration_number IS NOT NULL
        AND registration_number != ''
      ORDER BY name
      `,
      [tenantId]
    );
    if (result.rows.length > 0) {
      return result.rows.map((r: any) => ({
        entityName: r.name,
        registrationNumber: r.registration_number,
        entityType: r.type || 'company',
        vatNumber: r.vat_number || undefined,
        taxNumber: r.tax_number || undefined,
      }));
    }
  }

  if (await tableExists('public', 'entities')) {
    const result = await query(
      `
      SELECT name, registration_number, entity_type, tax_number, vat_number
      FROM entities
      WHERE tenant_id = $1
        AND registration_number IS NOT NULL
        AND registration_number != ''
      ORDER BY name
      `,
      [tenantId]
    );
    return result.rows.map((r: any) => ({
      entityName: r.name,
      registrationNumber: r.registration_number,
      entityType: r.entity_type || 'company',
      vatNumber: r.vat_number || undefined,
      taxNumber: r.tax_number || undefined,
    }));
  }

  return [];
}

// ============================================================================
// FICA / POPIA TRACKING
// ============================================================================

interface FICAPOPIAStatus {
  ficaStatus: 'compliant' | 'attention' | 'non-compliant' | 'not-applicable';
  popiaStatus: 'compliant' | 'attention' | 'non-compliant' | 'not-applicable';
  ficaDetails: {
    customersDueDiligence: number;
    customersVerified: number;
    suspiciousReports: number;
  };
  popiaDetails: {
    dataSubjectRequests: number;
    consentRecordsCount: number;
    breachIncidents: number;
    dataProcessingAgreements: number;
  };
}

/**
 * Aggregate FICA and POPIA compliance status from compliance tables.
 */
async function getFICAPOPIAStatus(tenantId: string): Promise<FICAPOPIAStatus> {
  const defaults: FICAPOPIAStatus = {
    ficaStatus: 'not-applicable',
    popiaStatus: 'not-applicable',
    ficaDetails: { customersDueDiligence: 0, customersVerified: 0, suspiciousReports: 0 },
    popiaDetails: { dataSubjectRequests: 0, consentRecordsCount: 0, breachIncidents: 0, dataProcessingAgreements: 0 },
  };

  // FICA: Check fica_customer_due_diligence table
  if (await tableExists('public', 'fica_customer_due_diligence')) {
    const ficaResult = await query(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(verification_status,'')) IN ('VERIFIED','COMPLETE')) AS verified,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(risk_rating,'')) IN ('HIGH','CRITICAL')) AS high_risk
      FROM fica_customer_due_diligence
      WHERE tenant_id = $1
      `,
      [tenantId]
    );
    const r = ficaResult.rows[0];
    const total = Number(r?.total || 0);
    const verified = Number(r?.verified || 0);
    defaults.ficaDetails.customersDueDiligence = total;
    defaults.ficaDetails.customersVerified = verified;
    defaults.ficaStatus = total === 0 ? 'attention' : verified >= total * 0.9 ? 'compliant' : 'attention';
  }

  // FICA: Check suspicious transaction reports
  if (await tableExists('public', 'fica_suspicious_reports')) {
    const strResult = await query(
      `SELECT COUNT(*) AS cnt FROM fica_suspicious_reports WHERE tenant_id = $1 AND status = 'open'`,
      [tenantId]
    );
    defaults.ficaDetails.suspiciousReports = Number(strResult.rows[0]?.cnt || 0);
    if (defaults.ficaDetails.suspiciousReports > 0) defaults.ficaStatus = 'non-compliant';
  }

  // POPIA: Check data subject requests
  if (await tableExists('public', 'popia_data_subject_requests')) {
    const dsrResult = await query(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(status,'')) NOT IN ('COMPLETED','CLOSED')) AS open_requests
      FROM popia_data_subject_requests
      WHERE tenant_id = $1
      `,
      [tenantId]
    );
    defaults.popiaDetails.dataSubjectRequests = Number(dsrResult.rows[0]?.total || 0);
    const openReqs = Number(dsrResult.rows[0]?.open_requests || 0);
    defaults.popiaStatus = openReqs > 0 ? 'attention' : 'compliant';
  }

  // POPIA: consent records
  if (await tableExists('public', 'popia_consent_records')) {
    const consentResult = await query(
      `SELECT COUNT(*) AS cnt FROM popia_consent_records WHERE tenant_id = $1`,
      [tenantId]
    );
    defaults.popiaDetails.consentRecordsCount = Number(consentResult.rows[0]?.cnt || 0);
  }

  // POPIA: breach incidents
  if (await tableExists('public', 'popia_breach_incidents')) {
    const breachResult = await query(
      `SELECT COUNT(*) AS cnt FROM popia_breach_incidents WHERE tenant_id = $1 AND UPPER(COALESCE(status,'')) != 'CLOSED'`,
      [tenantId]
    );
    defaults.popiaDetails.breachIncidents = Number(breachResult.rows[0]?.cnt || 0);
    if (defaults.popiaDetails.breachIncidents > 0) defaults.popiaStatus = 'non-compliant';
  }

  // POPIA: data processing agreements
  if (await tableExists('public', 'popia_processing_agreements')) {
    const dpaResult = await query(
      `SELECT COUNT(*) AS cnt FROM popia_processing_agreements WHERE tenant_id = $1 AND COALESCE(is_active, true) = true`,
      [tenantId]
    );
    defaults.popiaDetails.dataProcessingAgreements = Number(dpaResult.rows[0]?.cnt || 0);
  }

  return defaults;
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
