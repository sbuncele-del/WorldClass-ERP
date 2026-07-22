import { pool } from '../../config/database';
import { ResourceService } from './resource.service';

export interface BaselineRow {
  id: string;
  version: number;
  total_cost: string;
  frozen_at: string;
}

export interface BcwsPoint {
  date: string;
  dailyCost: number;
  cumulativeCost: number;
}

export class BaselineService {
  private resourceService = new ResourceService();

  /**
   * Freeze the project's current schedule + cost as a new baseline - the
   * BCWS reference everything in Phase 4 (Earned Value) measures against.
   * Requires every activity to already have a computed early_start/early_finish
   * (i.e. the schedule has been run at least once - see schedule.service.ts).
   */
  async freeze(tenantId: string, projectId: string, userId: string): Promise<BaselineRow> {
    const activities = await pool.query<{ id: string; early_start: string | null; early_finish: string | null }>(
      `SELECT id, early_start, early_finish FROM pf_activity WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );

    if (activities.rows.length === 0) {
      throw new Error('Add at least one activity before setting a baseline.');
    }
    if (activities.rows.some((a) => !a.early_start || !a.early_finish)) {
      throw new Error('Every activity needs a computed schedule before setting a baseline - open the Schedule view first.');
    }

    const costByActivity = await this.resourceService.getCostByActivity(tenantId, projectId);
    const totalCost = Array.from(costByActivity.values()).reduce((sum, c) => sum + c, 0);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const versionResult = await client.query(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM pf_baseline WHERE tenant_id = $1 AND project_id = $2`,
        [tenantId, projectId]
      );
      const version = versionResult.rows[0].next_version;

      await client.query(`UPDATE pf_baseline SET is_current = false WHERE tenant_id = $1 AND project_id = $2`, [tenantId, projectId]);

      const baselineResult = await client.query<BaselineRow>(
        `INSERT INTO pf_baseline (tenant_id, project_id, version, is_current, total_cost, frozen_by)
         VALUES ($1, $2, $3, true, $4, $5)
         RETURNING id, version, total_cost, frozen_at`,
        [tenantId, projectId, version, totalCost, userId]
      );
      const baseline = baselineResult.rows[0];

      for (const activity of activities.rows) {
        await client.query(
          `INSERT INTO pf_baseline_snapshot (baseline_id, activity_id, planned_start, planned_finish, planned_cost)
           VALUES ($1, $2, $3, $4, $5)`,
          [baseline.id, activity.id, activity.early_start, activity.early_finish, costByActivity.get(activity.id) || 0]
        );
      }

      await client.query('COMMIT');
      return baseline;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCurrent(tenantId: string, projectId: string): Promise<BaselineRow | null> {
    const result = await pool.query<BaselineRow>(
      `SELECT id, version, total_cost, frozen_at FROM pf_baseline WHERE tenant_id = $1 AND project_id = $2 AND is_current = true`,
      [tenantId, projectId]
    );
    return result.rows[0] || null;
  }

  /**
   * BCWS curve: each activity's planned cost is spread evenly (linearly)
   * across its planned_start -> planned_finish span, then summed per
   * calendar day and accumulated. Standard, simple EVA spend-curve model -
   * good enough until there's a reason to model non-linear spend.
   */
  async getBcwsCurve(tenantId: string, baselineId: string): Promise<BcwsPoint[]> {
    const result = await pool.query<{ planned_start: string; planned_finish: string; planned_cost: string }>(
      `SELECT bs.planned_start, bs.planned_finish, bs.planned_cost
       FROM pf_baseline_snapshot bs
       JOIN pf_baseline b ON b.id = bs.baseline_id
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [baselineId, tenantId]
    );

    const dailyCost = new Map<string, number>();
    for (const row of result.rows) {
      const start = new Date(row.planned_start);
      const finish = new Date(row.planned_finish);
      const spanDays = Math.max(1, Math.round((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const costPerDay = parseFloat(row.planned_cost) / spanDays;

      const cursor = new Date(start);
      for (let i = 0; i < spanDays; i++) {
        const key = cursor.toISOString().split('T')[0];
        dailyCost.set(key, (dailyCost.get(key) || 0) + costPerDay);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const sortedDates = Array.from(dailyCost.keys()).sort();
    let cumulative = 0;
    return sortedDates.map((date) => {
      cumulative += dailyCost.get(date)!;
      return { date, dailyCost: dailyCost.get(date)!, cumulativeCost: cumulative };
    });
  }
}
