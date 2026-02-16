-- Auto-sync HR payroll obligations into SARS Sentinel submission history
-- Created: 2026-02-16

CREATE UNIQUE INDEX IF NOT EXISTS uq_sars_auto_emp201
  ON sars_submission_history (tenant_id, submission_type, tax_period)
  WHERE submission_method = 'AUTO_SYNC';

CREATE OR REPLACE FUNCTION public.sync_hr_payroll_to_sars_submission(p_tenant_id UUID, p_run_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_period_name TEXT;
  v_reference TEXT;
  v_reference_emp501 TEXT;
  v_reference_irp5 TEXT;
  v_run_date DATE;
  v_tax_year_start INT;
  v_tax_year_label TEXT;
  v_tax_year_from DATE;
  v_tax_year_to DATE;
  v_total NUMERIC(15,2);
  v_total_annual NUMERIC(15,2);
  v_paye_annual NUMERIC(15,2);
BEGIN
  SELECT COALESCE(pp.period_name, to_char(pr.run_date, 'YYYY-MM'))
    INTO v_period_name
  FROM hr.payroll_runs pr
  JOIN hr.payroll_periods pp ON pp.period_id = pr.period_id AND pp.tenant_id = pr.tenant_id
  WHERE pr.tenant_id = p_tenant_id
    AND pr.run_id = p_run_id
  LIMIT 1;

  SELECT pr.run_date::date
    INTO v_run_date
  FROM hr.payroll_runs pr
  WHERE pr.tenant_id = p_tenant_id
    AND pr.run_id = p_run_id
  LIMIT 1;

  IF v_period_name IS NULL OR v_run_date IS NULL THEN
    RETURN;
  END IF;

  SELECT ROUND((COALESCE(SUM(prd.paye_tax),0) + COALESCE(SUM(prd.uif_deduction),0) + COALESCE(SUM(prd.sdl_amount),0))::numeric, 2)
    INTO v_total
  FROM hr.payroll_run_details prd
  WHERE prd.tenant_id = p_tenant_id
    AND prd.run_id = p_run_id;

  v_total := COALESCE(v_total, 0);
  v_reference := 'AUTO-EMP201-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(p_tenant_id::text,1,8);
  v_tax_year_start := CASE WHEN EXTRACT(MONTH FROM v_run_date) >= 3 THEN EXTRACT(YEAR FROM v_run_date)::INT ELSE EXTRACT(YEAR FROM v_run_date)::INT - 1 END;
  v_tax_year_label := v_tax_year_start::TEXT || '/' || (v_tax_year_start + 1)::TEXT;
  v_tax_year_from := make_date(v_tax_year_start, 3, 1);
  v_tax_year_to := make_date(v_tax_year_start + 1, 2, 28);
  v_reference_emp501 := 'AUTO-EMP501-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(p_tenant_id::text,1,8);
  v_reference_irp5 := 'AUTO-IRP5-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(p_tenant_id::text,1,8);

  SELECT
    ROUND((COALESCE(SUM(prd.paye_tax),0) + COALESCE(SUM(prd.uif_deduction),0) + COALESCE(SUM(prd.sdl_amount),0))::numeric, 2),
    ROUND(COALESCE(SUM(prd.paye_tax),0)::numeric, 2)
  INTO v_total_annual, v_paye_annual
  FROM hr.payroll_runs pr
  LEFT JOIN hr.payroll_run_details prd ON prd.tenant_id = pr.tenant_id AND prd.run_id = pr.run_id
  WHERE pr.tenant_id = p_tenant_id
    AND pr.run_date::date >= v_tax_year_from
    AND pr.run_date::date <= v_tax_year_to;

  v_total_annual := COALESCE(v_total_annual, 0);
  v_paye_annual := COALESCE(v_paye_annual, 0);

  INSERT INTO sars_submission_history (
    tenant_id,
    submission_type,
    tax_period,
    submission_date,
    status,
    submitted_by_name,
    submission_method,
    efiling_reference,
    amount_payable
  ) VALUES (
    p_tenant_id,
    'EMP201',
    v_period_name,
    NOW(),
    'SUBMITTED',
    'Auto Sync (HR Payroll)',
    'AUTO_SYNC',
    v_reference,
    v_total
  )
  ON CONFLICT (tenant_id, submission_type, tax_period)
  WHERE submission_method = 'AUTO_SYNC'
  DO UPDATE SET
    amount_payable = EXCLUDED.amount_payable,
    submission_date = NOW(),
    status = 'SUBMITTED',
    submitted_by_name = 'Auto Sync (HR Payroll)',
    efiling_reference = EXCLUDED.efiling_reference;

  -- EMP501 (Annual PAYE Reconciliation)
  INSERT INTO sars_submission_history (
    tenant_id,
    submission_type,
    tax_period,
    submission_date,
    status,
    submitted_by_name,
    submission_method,
    efiling_reference,
    amount_payable
  ) VALUES (
    p_tenant_id,
    'EMP501',
    v_tax_year_label,
    NOW(),
    'SUBMITTED',
    'Auto Sync (HR Payroll)',
    'AUTO_SYNC',
    v_reference_emp501,
    v_total_annual
  )
  ON CONFLICT (tenant_id, submission_type, tax_period)
  WHERE submission_method = 'AUTO_SYNC'
  DO UPDATE SET
    amount_payable = EXCLUDED.amount_payable,
    submission_date = NOW(),
    status = 'SUBMITTED',
    submitted_by_name = 'Auto Sync (HR Payroll)',
    efiling_reference = EXCLUDED.efiling_reference;

  -- IRP5 (annual employee tax certificate summary)
  INSERT INTO sars_submission_history (
    tenant_id,
    submission_type,
    tax_period,
    submission_date,
    status,
    submitted_by_name,
    submission_method,
    efiling_reference,
    amount_payable
  ) VALUES (
    p_tenant_id,
    'IRP5',
    v_tax_year_label,
    NOW(),
    'SUBMITTED',
    'Auto Sync (HR Payroll)',
    'AUTO_SYNC',
    v_reference_irp5,
    v_paye_annual
  )
  ON CONFLICT (tenant_id, submission_type, tax_period)
  WHERE submission_method = 'AUTO_SYNC'
  DO UPDATE SET
    amount_payable = EXCLUDED.amount_payable,
    submission_date = NOW(),
    status = 'SUBMITTED',
    submitted_by_name = 'Auto Sync (HR Payroll)',
    efiling_reference = EXCLUDED.efiling_reference;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_hr_payroll_to_sars_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id UUID;
  v_run_id INTEGER;
BEGIN
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  v_run_id := COALESCE(NEW.run_id, OLD.run_id);

  IF v_tenant_id IS NULL OR v_run_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM public.sync_hr_payroll_to_sars_submission(v_tenant_id, v_run_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_hr_payroll_details_to_sars ON hr.payroll_run_details;
CREATE TRIGGER trg_sync_hr_payroll_details_to_sars
AFTER INSERT OR UPDATE OR DELETE ON hr.payroll_run_details
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_hr_payroll_to_sars_submission();

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT pr.tenant_id, pr.run_id
    FROM hr.payroll_runs pr
  LOOP
    PERFORM public.sync_hr_payroll_to_sars_submission(rec.tenant_id, rec.run_id);
  END LOOP;
END $$;
