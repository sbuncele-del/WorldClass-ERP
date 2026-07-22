import { pool } from '../../config/database';

export interface RiskRow {
  id: string;
  risk_number: number;
  title: string;
  description: string | null;
  category: string | null;
  probability: number;
  impact: number;
  score: number;
  response_strategy: string | null;
  response_plan: string | null;
  owner: string | null;
  status: string;
}

export interface StakeholderRow {
  id: string;
  name: string;
  role: string | null;
  power: string;
  interest: string;
  engagement_current: string;
  engagement_desired: string;
  strategy: string | null;
}

export interface CommsItemRow {
  id: string;
  stakeholder_id: string | null;
  audience: string;
  message: string;
  method: string | null;
  frequency: string | null;
  owner: string | null;
  next_due: string | null;
}

export interface RaciEntryRow {
  id: string;
  task_label: string;
  person: string;
  role_code: 'R' | 'A' | 'C' | 'I';
}

export interface VendorOption {
  vendor: string;
  price: number;
  quality_score: number;
  delivery_score: number;
}

export interface ProcurementItemRow {
  id: string;
  item_name: string;
  description: string | null;
  procurement_type: string;
  estimated_value: string | null;
  vendor_options: VendorOption[];
  selected_vendor: string | null;
  status: string;
}

/**
 * Best-value score per the brief: not lowest-price-wins. Price is inverted
 * (cheaper = higher contribution) and blended with quality/delivery on a
 * fixed 40/30/30 weighting, all normalised to the option set's own range so
 * it works regardless of the currency/scale of a given procurement item.
 */
function scoreVendors(options: VendorOption[]): (VendorOption & { best_value_score: number })[] {
  if (options.length === 0) return [];
  const prices = options.map((o) => o.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  return options.map((o) => {
    const priceScore = maxPrice === minPrice ? 1 : (maxPrice - o.price) / (maxPrice - minPrice);
    const qualityScore = o.quality_score / 5;
    const deliveryScore = o.delivery_score / 5;
    const best_value_score = priceScore * 0.4 + qualityScore * 0.3 + deliveryScore * 0.3;
    return { ...o, best_value_score: Math.round(best_value_score * 1000) / 1000 };
  });
}

export class GovernanceService {
  // ── Risk register ──────────────────────────────────────────────────────

  async listRisks(tenantId: string, projectId: string): Promise<RiskRow[]> {
    const result = await pool.query<RiskRow>(
      `SELECT id, risk_number, title, description, category, probability, impact, score,
              response_strategy, response_plan, owner, status
       FROM pf_risk WHERE tenant_id = $1 AND project_id = $2 ORDER BY score DESC, risk_number ASC`,
      [tenantId, projectId]
    );
    return result.rows;
  }

  async createRisk(tenantId: string, projectId: string, input: {
    title: string; description?: string; category?: string; probability: number; impact: number;
  }): Promise<RiskRow> {
    const numResult = await pool.query<{ next: number }>(
      `SELECT COALESCE(MAX(risk_number), 0) + 1 AS next FROM pf_risk WHERE project_id = $1`,
      [projectId]
    );
    const riskNumber = numResult.rows[0].next;
    const result = await pool.query<RiskRow>(
      `INSERT INTO pf_risk (tenant_id, project_id, risk_number, title, description, category, probability, impact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, risk_number, title, description, category, probability, impact, score, response_strategy, response_plan, owner, status`,
      [tenantId, projectId, riskNumber, input.title, input.description || null, input.category || null, input.probability, input.impact]
    );
    return result.rows[0];
  }

  async updateRisk(tenantId: string, riskId: string, updates: {
    title?: string; description?: string; category?: string; probability?: number; impact?: number;
    responseStrategy?: string; responsePlan?: string; owner?: string; status?: string;
  }): Promise<RiskRow> {
    const result = await pool.query<RiskRow>(
      `UPDATE pf_risk SET
         title = COALESCE($1, title), description = COALESCE($2, description), category = COALESCE($3, category),
         probability = COALESCE($4, probability), impact = COALESCE($5, impact),
         response_strategy = COALESCE($6, response_strategy), response_plan = COALESCE($7, response_plan),
         owner = COALESCE($8, owner), status = COALESCE($9, status), updated_at = now()
       WHERE id = $10 AND tenant_id = $11
       RETURNING id, risk_number, title, description, category, probability, impact, score, response_strategy, response_plan, owner, status`,
      [updates.title ?? null, updates.description ?? null, updates.category ?? null, updates.probability ?? null,
       updates.impact ?? null, updates.responseStrategy ?? null, updates.responsePlan ?? null, updates.owner ?? null,
       updates.status ?? null, riskId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Risk not found');
    return result.rows[0];
  }

  async deleteRisk(tenantId: string, riskId: string): Promise<void> {
    const result = await pool.query(`DELETE FROM pf_risk WHERE id = $1 AND tenant_id = $2 RETURNING id`, [riskId, tenantId]);
    if (result.rows.length === 0) throw new Error('Risk not found');
  }

  // ── Stakeholder engagement matrix ────────────────────────────────────

  async listStakeholders(tenantId: string, projectId: string): Promise<StakeholderRow[]> {
    const result = await pool.query<StakeholderRow>(
      `SELECT id, name, role, power, interest, engagement_current, engagement_desired, strategy
       FROM pf_stakeholder WHERE tenant_id = $1 AND project_id = $2 ORDER BY name ASC`,
      [tenantId, projectId]
    );
    return result.rows;
  }

  async createStakeholder(tenantId: string, projectId: string, input: {
    name: string; role?: string; power: string; interest: string;
    engagementCurrent: string; engagementDesired: string; strategy?: string;
  }): Promise<StakeholderRow> {
    const result = await pool.query<StakeholderRow>(
      `INSERT INTO pf_stakeholder (tenant_id, project_id, name, role, power, interest, engagement_current, engagement_desired, strategy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, role, power, interest, engagement_current, engagement_desired, strategy`,
      [tenantId, projectId, input.name, input.role || null, input.power, input.interest,
       input.engagementCurrent, input.engagementDesired, input.strategy || null]
    );
    return result.rows[0];
  }

  async updateStakeholder(tenantId: string, stakeholderId: string, updates: {
    name?: string; role?: string; power?: string; interest?: string;
    engagementCurrent?: string; engagementDesired?: string; strategy?: string;
  }): Promise<StakeholderRow> {
    const result = await pool.query<StakeholderRow>(
      `UPDATE pf_stakeholder SET
         name = COALESCE($1, name), role = COALESCE($2, role), power = COALESCE($3, power),
         interest = COALESCE($4, interest), engagement_current = COALESCE($5, engagement_current),
         engagement_desired = COALESCE($6, engagement_desired), strategy = COALESCE($7, strategy), updated_at = now()
       WHERE id = $8 AND tenant_id = $9
       RETURNING id, name, role, power, interest, engagement_current, engagement_desired, strategy`,
      [updates.name ?? null, updates.role ?? null, updates.power ?? null, updates.interest ?? null,
       updates.engagementCurrent ?? null, updates.engagementDesired ?? null, updates.strategy ?? null,
       stakeholderId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Stakeholder not found');
    return result.rows[0];
  }

  async deleteStakeholder(tenantId: string, stakeholderId: string): Promise<void> {
    const result = await pool.query(`DELETE FROM pf_stakeholder WHERE id = $1 AND tenant_id = $2 RETURNING id`, [stakeholderId, tenantId]);
    if (result.rows.length === 0) throw new Error('Stakeholder not found');
  }

  // ── Communications plan ──────────────────────────────────────────────

  async listCommsItems(tenantId: string, projectId: string): Promise<CommsItemRow[]> {
    const result = await pool.query<CommsItemRow>(
      `SELECT id, stakeholder_id, audience, message, method, frequency, owner, next_due
       FROM pf_comms_item WHERE tenant_id = $1 AND project_id = $2 ORDER BY next_due ASC NULLS LAST, created_at ASC`,
      [tenantId, projectId]
    );
    return result.rows;
  }

  async createCommsItem(tenantId: string, projectId: string, input: {
    stakeholderId?: string; audience: string; message: string; method?: string; frequency?: string; owner?: string; nextDue?: string;
  }): Promise<CommsItemRow> {
    const result = await pool.query<CommsItemRow>(
      `INSERT INTO pf_comms_item (tenant_id, project_id, stakeholder_id, audience, message, method, frequency, owner, next_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, stakeholder_id, audience, message, method, frequency, owner, next_due`,
      [tenantId, projectId, input.stakeholderId || null, input.audience, input.message,
       input.method || null, input.frequency || null, input.owner || null, input.nextDue || null]
    );
    return result.rows[0];
  }

  async deleteCommsItem(tenantId: string, itemId: string): Promise<void> {
    const result = await pool.query(`DELETE FROM pf_comms_item WHERE id = $1 AND tenant_id = $2 RETURNING id`, [itemId, tenantId]);
    if (result.rows.length === 0) throw new Error('Communications item not found');
  }

  // ── RACI matrix ───────────────────────────────────────────────────────

  async getRaciGrid(tenantId: string, projectId: string): Promise<{ tasks: string[]; people: string[]; entries: RaciEntryRow[] }> {
    const result = await pool.query<RaciEntryRow>(
      `SELECT id, task_label, person, role_code FROM pf_raci_entry WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );
    const tasks = Array.from(new Set(result.rows.map((r) => r.task_label)));
    const people = Array.from(new Set(result.rows.map((r) => r.person)));
    return { tasks, people, entries: result.rows };
  }

  async setRaciCell(tenantId: string, projectId: string, taskLabel: string, person: string, roleCode: 'R' | 'A' | 'C' | 'I'): Promise<RaciEntryRow> {
    const result = await pool.query<RaciEntryRow>(
      `INSERT INTO pf_raci_entry (tenant_id, project_id, task_label, person, role_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id, task_label, person) DO UPDATE SET role_code = EXCLUDED.role_code
       RETURNING id, task_label, person, role_code`,
      [tenantId, projectId, taskLabel, person, roleCode]
    );
    return result.rows[0];
  }

  async clearRaciCell(tenantId: string, projectId: string, taskLabel: string, person: string): Promise<void> {
    await pool.query(
      `DELETE FROM pf_raci_entry WHERE tenant_id = $1 AND project_id = $2 AND task_label = $3 AND person = $4`,
      [tenantId, projectId, taskLabel, person]
    );
  }

  // ── Procurement ───────────────────────────────────────────────────────

  async listProcurementItems(tenantId: string, projectId: string): Promise<(ProcurementItemRow & { vendor_options: (VendorOption & { best_value_score: number })[] })[]> {
    const result = await pool.query<ProcurementItemRow>(
      `SELECT id, item_name, description, procurement_type, estimated_value, vendor_options, selected_vendor, status
       FROM pf_procurement_item WHERE tenant_id = $1 AND project_id = $2 ORDER BY created_at ASC`,
      [tenantId, projectId]
    );
    return result.rows.map((row) => ({ ...row, vendor_options: scoreVendors(row.vendor_options) }));
  }

  async createProcurementItem(tenantId: string, projectId: string, input: {
    itemName: string; description?: string; procurementType?: string; estimatedValue?: number;
  }): Promise<ProcurementItemRow> {
    const result = await pool.query<ProcurementItemRow>(
      `INSERT INTO pf_procurement_item (tenant_id, project_id, item_name, description, procurement_type, estimated_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, item_name, description, procurement_type, estimated_value, vendor_options, selected_vendor, status`,
      [tenantId, projectId, input.itemName, input.description || null, input.procurementType || 'buy', input.estimatedValue ?? null]
    );
    return result.rows[0];
  }

  async addVendorOption(tenantId: string, itemId: string, option: VendorOption): Promise<ProcurementItemRow> {
    const result = await pool.query<ProcurementItemRow>(
      `UPDATE pf_procurement_item SET vendor_options = vendor_options || $1::jsonb, updated_at = now()
       WHERE id = $2 AND tenant_id = $3
       RETURNING id, item_name, description, procurement_type, estimated_value, vendor_options, selected_vendor, status`,
      [JSON.stringify([option]), itemId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Procurement item not found');
    return result.rows[0];
  }

  async awardProcurementItem(tenantId: string, itemId: string, vendor: string): Promise<ProcurementItemRow> {
    const result = await pool.query<ProcurementItemRow>(
      `UPDATE pf_procurement_item SET selected_vendor = $1, status = 'awarded', updated_at = now()
       WHERE id = $2 AND tenant_id = $3
       RETURNING id, item_name, description, procurement_type, estimated_value, vendor_options, selected_vendor, status`,
      [vendor, itemId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Procurement item not found');
    return result.rows[0];
  }

  async deleteProcurementItem(tenantId: string, itemId: string): Promise<void> {
    const result = await pool.query(`DELETE FROM pf_procurement_item WHERE id = $1 AND tenant_id = $2 RETURNING id`, [itemId, tenantId]);
    if (result.rows.length === 0) throw new Error('Procurement item not found');
  }
}
