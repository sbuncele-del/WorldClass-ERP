import { pool } from '../../config/database';
import { BaselineService } from './baseline.service';

export type HealthQuadrant = 'ahead_under' | 'behind_under' | 'ahead_over' | 'behind_over';

export interface EvaSnapshot {
  statusDate: string;
  bcws: number; // Budgeted Cost of Work Scheduled (planned, cumulative to status date)
  bcwp: number; // Budgeted Cost of Work Performed = Earned Value
  acwp: number; // Actual Cost of Work Performed
  cv: number;   // Cost Variance = BCWP - ACWP
  sv: number;   // Schedule Variance = BCWP - BCWS
  cpi: number | null; // Cost Performance Index = BCWP / ACWP
  spi: number | null; // Schedule Performance Index = BCWP / BCWS
  cvWithinThreshold: boolean;
  svWithinThreshold: boolean;
  healthQuadrant: HealthQuadrant;
}

export interface EvaCurvePoint {
  date: string;
  bcws: number;
  bcwp: number;
  acwp: number;
}

// ±10% of BCWS is a common default variance threshold; not yet an
// org-configurable setting (that's a natural follow-up, not required by
// the Phase 4 brief, which just says "thresholds must be defined").
const VARIANCE_THRESHOLD_PCT = 10;

export class EvaService {
  private baselineService = new BaselineService();

  private async loadInputs(tenantId: string, projectId: string) {
    const baseline = await this.baselineService.getCurrent(tenantId, projectId);
    if (!baseline) {
      throw new Error('No baseline set - freeze one first (Resources & Baseline view) before Earned Value can be computed.');
    }

    const snapshotResult = await pool.query<{ activity_id: string; planned_start: string; planned_finish: string; planned_cost: string }>(
      `SELECT activity_id, planned_start, planned_finish, planned_cost FROM pf_baseline_snapshot WHERE baseline_id = $1`,
      [baseline.id]
    );

    const progressResult = await pool.query<{ activity_id: string; as_of_date: string; percent_complete: string; actual_cost: string }>(
      `SELECT p.activity_id, p.as_of_date, p.percent_complete, p.actual_cost
       FROM pf_progress p
       JOIN pf_activity a ON a.id = p.activity_id
       WHERE a.tenant_id = $1 AND a.project_id = $2
       ORDER BY p.as_of_date ASC`,
      [tenantId, projectId]
    );

    return { baseline, snapshot: snapshotResult.rows, progress: progressResult.rows };
  }

  /** BCWS cumulative up to (and including) statusDate, from the baseline's linear spend model. */
  private bcwsAt(snapshot: { planned_start: string; planned_finish: string; planned_cost: string }[], statusDate: Date): number {
    let total = 0;
    for (const row of snapshot) {
      const start = new Date(row.planned_start);
      const finish = new Date(row.planned_finish);
      const cost = parseFloat(row.planned_cost);
      if (statusDate < start) continue;
      if (statusDate >= finish) {
        total += cost;
        continue;
      }
      const spanDays = Math.max(1, (finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = (statusDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      total += cost * (elapsedDays / spanDays);
    }
    return total;
  }

  /** Latest known percent_complete/actual_cost per activity as of statusDate. */
  private latestProgressAt(
    progress: { activity_id: string; as_of_date: string; percent_complete: string; actual_cost: string }[],
    statusDate: Date
  ): Map<string, { percentComplete: number; actualCost: number }> {
    const latest = new Map<string, { percentComplete: number; actualCost: number; date: Date }>();
    for (const row of progress) {
      const date = new Date(row.as_of_date);
      if (date > statusDate) continue;
      const existing = latest.get(row.activity_id);
      if (!existing || date >= existing.date) {
        latest.set(row.activity_id, { percentComplete: parseFloat(row.percent_complete), actualCost: parseFloat(row.actual_cost), date });
      }
    }
    return new Map(Array.from(latest.entries()).map(([id, v]) => [id, { percentComplete: v.percentComplete, actualCost: v.actualCost }]));
  }

  private bcwpAcwpAt(
    snapshot: { activity_id: string; planned_cost: string }[],
    progress: { activity_id: string; as_of_date: string; percent_complete: string; actual_cost: string }[],
    statusDate: Date
  ): { bcwp: number; acwp: number } {
    const latest = this.latestProgressAt(progress, statusDate);
    let bcwp = 0;
    let acwp = 0;
    for (const row of snapshot) {
      const p = latest.get(row.activity_id);
      if (!p) continue;
      bcwp += (p.percentComplete / 100) * parseFloat(row.planned_cost);
      acwp += p.actualCost;
    }
    return { bcwp, acwp };
  }

  private classify(cv: number, sv: number): HealthQuadrant {
    if (sv >= 0 && cv >= 0) return 'ahead_under';
    if (sv < 0 && cv >= 0) return 'behind_under';
    if (sv >= 0 && cv < 0) return 'ahead_over';
    return 'behind_over';
  }

  async getSnapshot(tenantId: string, projectId: string, statusDate: Date = new Date()): Promise<EvaSnapshot> {
    const { snapshot, progress } = await this.loadInputs(tenantId, projectId);

    const bcws = this.bcwsAt(snapshot, statusDate);
    const { bcwp, acwp } = this.bcwpAcwpAt(snapshot, progress, statusDate);
    const cv = bcwp - acwp;
    const sv = bcwp - bcws;

    const thresholdAmount = (VARIANCE_THRESHOLD_PCT / 100) * (bcws || 1);

    return {
      statusDate: statusDate.toISOString().split('T')[0],
      bcws, bcwp, acwp, cv, sv,
      cpi: acwp > 0 ? bcwp / acwp : null,
      spi: bcws > 0 ? bcwp / bcws : null,
      cvWithinThreshold: Math.abs(cv) <= thresholdAmount,
      svWithinThreshold: Math.abs(sv) <= thresholdAmount,
      healthQuadrant: this.classify(cv, sv),
    };
  }

  /** The three S-curves, one point per date anything happened (baseline span or progress record). */
  async getCurve(tenantId: string, projectId: string): Promise<EvaCurvePoint[]> {
    const { snapshot, progress } = await this.loadInputs(tenantId, projectId);

    const dateSet = new Set<string>();
    for (const row of snapshot) {
      dateSet.add(row.planned_start);
      dateSet.add(row.planned_finish);
    }
    for (const row of progress) dateSet.add(row.as_of_date);
    if (dateSet.size === 0) return [];

    const dates = Array.from(dateSet).sort();
    return dates.map((dateStr) => {
      const date = new Date(dateStr);
      const bcws = this.bcwsAt(snapshot, date);
      const { bcwp, acwp } = this.bcwpAcwpAt(snapshot, progress, date);
      return { date: dateStr, bcws, bcwp, acwp };
    });
  }

  async recordProgress(tenantId: string, activityId: string, percentComplete: number, actualCost: number, userId: string, asOfDate: Date = new Date()): Promise<void> {
    const dateStr = asOfDate.toISOString().split('T')[0];
    await pool.query(
      `INSERT INTO pf_progress (tenant_id, activity_id, as_of_date, percent_complete, actual_cost, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (activity_id, as_of_date) DO UPDATE SET percent_complete = EXCLUDED.percent_complete, actual_cost = EXCLUDED.actual_cost`,
      [tenantId, activityId, dateStr, percentComplete, actualCost, userId]
    );
  }
}
