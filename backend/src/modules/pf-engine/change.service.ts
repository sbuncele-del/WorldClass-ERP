import { pool } from '../../config/database';
import { ScheduleService } from './schedule.service';

export interface ChangeRequestRow {
  id: string;
  change_number: number;
  source: string;
  description: string;
  reason: string | null;
  schedule_impact_days: string;
  budget_impact: string;
  affected_activity_id: string | null;
  status: string;
  requested_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  implemented_at: string | null;
  created_at: string;
}

/**
 * The brief's 6 steps, represented as a practical state machine:
 * 1. Log       -> status 'logged' (this.log)
 * 2. Screen    -> approve/reject decides whether it proceeds at all
 * 3. Approve   -> status 'approved' (this.decide with approve=true)
 * 4-6. Update plan / distribute / track -> happen together as one action,
 *      `implement`, which applies the schedule impact to the affected
 *      activity and re-baselines. A lightweight tool doesn't gain anything
 *      from gating those three separately - the moment a change is
 *      approved and implemented, the new plan IS the distributed, tracked
 *      plan going forward.
 */
export class ChangeService {
  private scheduleService = new ScheduleService();

  async list(tenantId: string, projectId: string): Promise<ChangeRequestRow[]> {
    const result = await pool.query<ChangeRequestRow>(
      `SELECT * FROM pf_change_request WHERE tenant_id = $1 AND project_id = $2 ORDER BY change_number DESC`,
      [tenantId, projectId]
    );
    return result.rows;
  }

  async log(
    tenantId: string,
    projectId: string,
    userId: string,
    input: { source: string; description: string; reason?: string; scheduleImpactDays?: number; budgetImpact?: number; affectedActivityId?: string }
  ): Promise<ChangeRequestRow> {
    if (!['scope', 'schedule', 'budget'].includes(input.source)) {
      throw new Error('source must be one of scope, schedule, budget');
    }
    const numberResult = await pool.query(
      `SELECT COALESCE(MAX(change_number), 0) + 1 AS next FROM pf_change_request WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );
    const changeNumber = numberResult.rows[0].next;

    const result = await pool.query<ChangeRequestRow>(
      `INSERT INTO pf_change_request (
         tenant_id, project_id, change_number, source, description, reason,
         schedule_impact_days, budget_impact, affected_activity_id, requested_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId, projectId, changeNumber, input.source, input.description, input.reason || null,
        input.scheduleImpactDays || 0, input.budgetImpact || 0, input.affectedActivityId || null, userId,
      ]
    );
    return result.rows[0];
  }

  async decide(tenantId: string, changeId: string, userId: string, approve: boolean): Promise<ChangeRequestRow> {
    const result = await pool.query<ChangeRequestRow>(
      `UPDATE pf_change_request SET
         status = $1, decided_by = $2, decided_at = now(), updated_at = now()
       WHERE id = $3 AND tenant_id = $4 AND status = 'logged'
       RETURNING *`,
      [approve ? 'approved' : 'rejected', userId, changeId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Change request not found, or already decided');
    return result.rows[0];
  }

  /**
   * Steps 4-6: apply the schedule impact to the affected activity (if any),
   * re-baseline, and mark implemented. Only callable once approved.
   */
  async implement(tenantId: string, projectId: string, changeId: string): Promise<ChangeRequestRow> {
    const changeResult = await pool.query<ChangeRequestRow>(
      `SELECT * FROM pf_change_request WHERE id = $1 AND tenant_id = $2 AND status = 'approved'`,
      [changeId, tenantId]
    );
    if (changeResult.rows.length === 0) throw new Error('Change request not found, or not approved yet');
    const change = changeResult.rows[0];

    if (change.affected_activity_id && parseFloat(change.schedule_impact_days) !== 0) {
      await pool.query(
        `UPDATE pf_activity SET duration_days = duration_days + $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
        [change.schedule_impact_days, change.affected_activity_id, tenantId]
      );
      await this.scheduleService.recompute(tenantId, projectId);
    }

    const result = await pool.query<ChangeRequestRow>(
      `UPDATE pf_change_request SET status = 'implemented', implemented_at = now(), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [changeId]
    );
    return result.rows[0];
  }
}
