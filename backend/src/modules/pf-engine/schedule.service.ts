import { pool } from '../../config/database';
import { computeCpm, pertWeightedDuration, CpmActivityInput } from './cpm';
import { addWorkingDays } from './calendar';

export interface DependencyRow {
  id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: string;
  lag_days: string;
}

export interface ScheduledActivity {
  id: string;
  wbs_element_id: string;
  name: string;
  duration_days: number;
  optimistic_days: number | null;
  most_likely_days: number | null;
  pessimistic_days: number | null;
  early_start: string | null;
  early_finish: string | null;
  late_start: string | null;
  late_finish: string | null;
  total_float: number | null;
  is_critical: boolean;
  status: string;
}

export class ScheduleService {
  /**
   * Time/cost/resource trade-off: run CPM with one activity's duration
   * hypothetically overridden, WITHOUT persisting anything. Lets a PM ask
   * "what if I crashed this activity to 2 days?" and see the schedule
   * impact before committing to it.
   */
  async simulate(
    tenantId: string,
    projectId: string,
    activityId: string,
    hypotheticalDurationDays: number
  ): Promise<{ currentProjectDurationDays: number; simulatedProjectDurationDays: number; deltaDays: number }> {
    const activitiesResult = await pool.query(
      `SELECT id, duration_days FROM pf_activity WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );
    const dependenciesResult = await pool.query<DependencyRow>(
      `SELECT d.predecessor_id, d.successor_id
       FROM pf_dependency d
       JOIN pf_activity a ON a.id = d.successor_id
       WHERE a.tenant_id = $1 AND a.project_id = $2`,
      [tenantId, projectId]
    );

    if (!activitiesResult.rows.some((r) => r.id === activityId)) {
      throw new Error('Activity not found');
    }

    const predecessorsByActivity = new Map<string, string[]>();
    for (const dep of dependenciesResult.rows) {
      if (!predecessorsByActivity.has(dep.successor_id)) predecessorsByActivity.set(dep.successor_id, []);
      predecessorsByActivity.get(dep.successor_id)!.push(dep.predecessor_id);
    }

    const buildInput = (durationOverride?: { id: string; duration: number }): CpmActivityInput[] =>
      activitiesResult.rows.map((row) => ({
        id: row.id,
        durationDays: durationOverride && durationOverride.id === row.id ? durationOverride.duration : parseFloat(row.duration_days) || 0,
        predecessorIds: predecessorsByActivity.get(row.id) || [],
      }));

    const current = computeCpm(buildInput());
    const simulated = computeCpm(buildInput({ id: activityId, duration: hypotheticalDurationDays }));

    return {
      currentProjectDurationDays: current.projectDurationDays,
      simulatedProjectDurationDays: simulated.projectDurationDays,
      deltaDays: simulated.projectDurationDays - current.projectDurationDays,
    };
  }

  /**
   * Recompute the whole project's CPM schedule from its current activities +
   * dependencies, and persist the result onto pf_activity. Called after any
   * change that could move the critical path: a duration/estimate edit, or a
   * dependency add/remove.
   */
  async recompute(tenantId: string, projectId: string): Promise<void> {
    const [activitiesResult, dependenciesResult, projectResult] = await Promise.all([
      pool.query(
        `SELECT id, duration_days FROM pf_activity WHERE tenant_id = $1 AND project_id = $2`,
        [tenantId, projectId]
      ),
      pool.query<DependencyRow>(
        `SELECT d.id, d.predecessor_id, d.successor_id, d.dependency_type, d.lag_days
         FROM pf_dependency d
         JOIN pf_activity a ON a.id = d.successor_id
         WHERE a.tenant_id = $1 AND a.project_id = $2`,
        [tenantId, projectId]
      ),
      pool.query(`SELECT start_date FROM public.projects WHERE id = $1 AND tenant_id = $2`, [projectId, tenantId]),
    ]);

    if (activitiesResult.rows.length === 0) return;

    const predecessorsByActivity = new Map<string, string[]>();
    for (const dep of dependenciesResult.rows) {
      // FS only (see cpm.ts) - every stored link, regardless of its dependency_type
      // column, is currently interpreted as Finish-to-Start.
      if (!predecessorsByActivity.has(dep.successor_id)) predecessorsByActivity.set(dep.successor_id, []);
      predecessorsByActivity.get(dep.successor_id)!.push(dep.predecessor_id);
    }

    const cpmInput: CpmActivityInput[] = activitiesResult.rows.map((row) => ({
      id: row.id,
      durationDays: parseFloat(row.duration_days) || 0,
      predecessorIds: predecessorsByActivity.get(row.id) || [],
    }));

    const result = computeCpm(cpmInput);

    const startDateRaw = projectResult.rows[0]?.start_date;
    const baseDate = startDateRaw ? new Date(startDateRaw) : new Date();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [activityId, r] of result.activities) {
        await client.query(
          `UPDATE pf_activity SET
             early_start = $1, early_finish = $2, late_start = $3, late_finish = $4,
             total_float = $5, is_critical = $6, updated_at = now()
           WHERE id = $7`,
          [
            addWorkingDays(baseDate, r.earlyStart),
            addWorkingDays(baseDate, r.earlyFinish),
            addWorkingDays(baseDate, r.lateStart),
            addWorkingDays(baseDate, r.lateFinish),
            r.totalFloat,
            r.isCritical,
            activityId,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSchedule(tenantId: string, projectId: string): Promise<{ activities: ScheduledActivity[]; projectDurationDays: number }> {
    const result = await pool.query<ScheduledActivity>(
      `SELECT id, wbs_element_id, name, duration_days, optimistic_days, most_likely_days, pessimistic_days,
              early_start, early_finish, late_start, late_finish, total_float, is_critical, status
       FROM pf_activity
       WHERE tenant_id = $1 AND project_id = $2
       ORDER BY early_start ASC NULLS LAST, sort_order ASC`,
      [tenantId, projectId]
    );

    const durations = result.rows
      .map((a) => (a.early_finish ? new Date(a.early_finish).getTime() : null))
      .filter((t): t is number => t !== null);
    const earliestStart = result.rows
      .map((a) => (a.early_start ? new Date(a.early_start).getTime() : null))
      .filter((t): t is number => t !== null);

    const projectDurationDays =
      durations.length > 0 && earliestStart.length > 0
        ? Math.round((Math.max(...durations) - Math.min(...earliestStart)) / (1000 * 60 * 60 * 24))
        : 0;

    return { activities: result.rows, projectDurationDays };
  }

  /**
   * Update an activity's duration - either a direct value, or a PERT
   * three-point estimate (which takes precedence and computes tE for you).
   * Triggers a full project recompute since any duration change can move
   * the critical path.
   */
  async updateDuration(
    tenantId: string,
    projectId: string,
    activityId: string,
    input: { durationDays?: number; optimisticDays?: number; mostLikelyDays?: number; pessimisticDays?: number }
  ): Promise<void> {
    const pertDuration = pertWeightedDuration(input.optimisticDays, input.mostLikelyDays, input.pessimisticDays);
    const finalDuration = pertDuration ?? input.durationDays;

    if (finalDuration == null) {
      throw new Error('Provide either durationDays, or all three of optimisticDays/mostLikelyDays/pessimisticDays');
    }

    const result = await pool.query(
      `UPDATE pf_activity SET
         duration_days = $1,
         optimistic_days = $2, most_likely_days = $3, pessimistic_days = $4,
         updated_at = now()
       WHERE id = $5 AND tenant_id = $6 AND project_id = $7
       RETURNING id`,
      [
        finalDuration,
        input.optimisticDays ?? null, input.mostLikelyDays ?? null, input.pessimisticDays ?? null,
        activityId, tenantId, projectId,
      ]
    );
    if (result.rows.length === 0) throw new Error('Activity not found');

    await this.recompute(tenantId, projectId);
  }

  async addDependency(tenantId: string, projectId: string, predecessorId: string, successorId: string): Promise<void> {
    if (predecessorId === successorId) {
      throw new Error('An activity cannot depend on itself.');
    }

    // Ownership check - both activities must belong to this tenant/project.
    const ownership = await pool.query(
      `SELECT id FROM pf_activity WHERE tenant_id = $1 AND project_id = $2 AND id = ANY($3::uuid[])`,
      [tenantId, projectId, [predecessorId, successorId]]
    );
    if (ownership.rows.length !== 2) {
      throw new Error('Both activities must belong to this project.');
    }

    // Cycle guard: would adding this edge make the graph unrunnable?
    // Cheap check - does a path already exist from successor back to predecessor?
    const depsResult = await pool.query<{ predecessor_id: string; successor_id: string }>(
      `SELECT predecessor_id, successor_id FROM pf_dependency
       WHERE predecessor_id IN (SELECT id FROM pf_activity WHERE tenant_id = $1 AND project_id = $2)`,
      [tenantId, projectId]
    );
    const adjacency = new Map<string, string[]>();
    for (const d of depsResult.rows) {
      if (!adjacency.has(d.predecessor_id)) adjacency.set(d.predecessor_id, []);
      adjacency.get(d.predecessor_id)!.push(d.successor_id);
    }
    const visited = new Set<string>();
    const stack = [successorId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === predecessorId) {
        throw new Error('That link would create a circular dependency (Network Rule 1 violation).');
      }
      if (visited.has(current)) continue;
      visited.add(current);
      stack.push(...(adjacency.get(current) || []));
    }

    await pool.query(
      `INSERT INTO pf_dependency (tenant_id, predecessor_id, successor_id, dependency_type)
       VALUES ($1, $2, $3, 'FS')
       ON CONFLICT (predecessor_id, successor_id) DO NOTHING`,
      [tenantId, predecessorId, successorId]
    );

    await this.recompute(tenantId, projectId);
  }

  async removeDependency(tenantId: string, projectId: string, dependencyId: string): Promise<void> {
    const result = await pool.query(
      `DELETE FROM pf_dependency WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [dependencyId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Dependency not found');
    await this.recompute(tenantId, projectId);
  }

  async getDependencies(tenantId: string, projectId: string): Promise<DependencyRow[]> {
    const result = await pool.query<DependencyRow>(
      `SELECT d.id, d.predecessor_id, d.successor_id, d.dependency_type, d.lag_days
       FROM pf_dependency d
       JOIN pf_activity a ON a.id = d.successor_id
       WHERE a.tenant_id = $1 AND a.project_id = $2`,
      [tenantId, projectId]
    );
    return result.rows;
  }
}
