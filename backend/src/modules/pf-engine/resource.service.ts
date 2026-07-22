import { pool } from '../../config/database';

export interface ResourceRow {
  id: string;
  name: string;
  cost_per_hour: string;
  productivity_factor: string;
}

export interface AssignmentRow {
  id: string;
  activity_id: string;
  resource_id: string;
  planned_hours: string;
  resource_name?: string;
}

export class ResourceService {
  // Resources are tenant-wide (a person/crew works across projects), not
  // project-scoped - matches pf_resource's schema (tenant_id only).

  async list(tenantId: string): Promise<ResourceRow[]> {
    const result = await pool.query<ResourceRow>(
      `SELECT id, name, cost_per_hour, productivity_factor FROM pf_resource WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return result.rows;
  }

  async create(tenantId: string, name: string, costPerHour: number, productivityFactor: number): Promise<ResourceRow> {
    const result = await pool.query<ResourceRow>(
      `INSERT INTO pf_resource (tenant_id, name, cost_per_hour, productivity_factor)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, cost_per_hour, productivity_factor`,
      [tenantId, name, costPerHour, productivityFactor || 1.0]
    );
    return result.rows[0];
  }

  async update(tenantId: string, resourceId: string, updates: { name?: string; costPerHour?: number; productivityFactor?: number }): Promise<ResourceRow> {
    const result = await pool.query<ResourceRow>(
      `UPDATE pf_resource SET
         name = COALESCE($1, name),
         cost_per_hour = COALESCE($2, cost_per_hour),
         productivity_factor = COALESCE($3, productivity_factor)
       WHERE id = $4 AND tenant_id = $5
       RETURNING id, name, cost_per_hour, productivity_factor`,
      [updates.name ?? null, updates.costPerHour ?? null, updates.productivityFactor ?? null, resourceId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Resource not found');
    return result.rows[0];
  }

  async delete(tenantId: string, resourceId: string): Promise<void> {
    const result = await pool.query(`DELETE FROM pf_resource WHERE id = $1 AND tenant_id = $2 RETURNING id`, [resourceId, tenantId]);
    if (result.rows.length === 0) throw new Error('Resource not found');
  }

  // ── Assignments ──────────────────────────────────────────────────────────

  async assign(tenantId: string, activityId: string, resourceId: string, plannedHours: number): Promise<AssignmentRow> {
    const result = await pool.query<AssignmentRow>(
      `INSERT INTO pf_assignment (tenant_id, activity_id, resource_id, planned_hours)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (activity_id, resource_id) DO UPDATE SET planned_hours = EXCLUDED.planned_hours
       RETURNING id, activity_id, resource_id, planned_hours`,
      [tenantId, activityId, resourceId, plannedHours]
    );
    return result.rows[0];
  }

  async unassign(tenantId: string, assignmentId: string): Promise<void> {
    const result = await pool.query(`DELETE FROM pf_assignment WHERE id = $1 AND tenant_id = $2 RETURNING id`, [assignmentId, tenantId]);
    if (result.rows.length === 0) throw new Error('Assignment not found');
  }

  /**
   * Per-activity labour cost: effective hours (planned ÷ productivity factor)
   * × cost/hour, summed across every resource assigned to that activity.
   * This is the number that feeds the project's total_cost and, once a
   * baseline is frozen, the BCWS curve.
   */
  async getCostByActivity(tenantId: string, projectId: string): Promise<Map<string, number>> {
    const result = await pool.query<{ activity_id: string; cost: string }>(
      `SELECT
         a.id AS activity_id,
         COALESCE(SUM((asn.planned_hours / NULLIF(r.productivity_factor, 0)) * r.cost_per_hour), 0) AS cost
       FROM pf_activity a
       LEFT JOIN pf_assignment asn ON asn.activity_id = a.id AND asn.tenant_id = $1
       LEFT JOIN pf_resource r ON r.id = asn.resource_id
       WHERE a.tenant_id = $1 AND a.project_id = $2
       GROUP BY a.id`,
      [tenantId, projectId]
    );
    return new Map(result.rows.map((r) => [r.activity_id, parseFloat(r.cost)]));
  }

  async getAssignmentsByActivity(tenantId: string, projectId: string): Promise<Map<string, AssignmentRow[]>> {
    const result = await pool.query<AssignmentRow>(
      `SELECT asn.id, asn.activity_id, asn.resource_id, asn.planned_hours, r.name AS resource_name
       FROM pf_assignment asn
       JOIN pf_activity a ON a.id = asn.activity_id
       JOIN pf_resource r ON r.id = asn.resource_id
       WHERE asn.tenant_id = $1 AND a.project_id = $2`,
      [tenantId, projectId]
    );
    const byActivity = new Map<string, AssignmentRow[]>();
    for (const row of result.rows) {
      if (!byActivity.has(row.activity_id)) byActivity.set(row.activity_id, []);
      byActivity.get(row.activity_id)!.push(row);
    }
    return byActivity;
  }
}
