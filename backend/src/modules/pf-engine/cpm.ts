/**
 * ProjectFlow PM Engine — CPM / PERT computation (Phase 2)
 *
 * Pure functions, no DB access - deliberately, so this is easy to reason
 * about and unit-test in isolation from persistence.
 *
 * Scope decisions (per the Phase 2 pre-flight):
 * - Finish-to-Start dependencies only. The schema (pf_dependency.dependency_type)
 *   is ready for SS/FF/SF + lag, but only FS is computed here - the UI only
 *   creates FS links, so treating every link as FS is correct for what can
 *   actually exist right now. Extending the pass math for SS/FF/SF is a
 *   later increment, not a schema change.
 * - Continuous days, not a real working calendar (no weekends/holidays
 *   skipped). Phase 3 introduces the working-calendar engine; until then,
 *   "day 5" is literally startDate + 5 calendar days.
 */

export interface CpmActivityInput {
  id: string;
  durationDays: number;
  /** ids of activities that must finish before this one can start (FS) */
  predecessorIds: string[];
}

export interface CpmActivityResult {
  id: string;
  earlyStart: number;   // day offset from project start (0-indexed)
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
}

export interface CpmResult {
  activities: Map<string, CpmActivityResult>;
  projectDurationDays: number;
  criticalPath: string[]; // activity ids, in schedule order
}

export class CpmCycleError extends Error {
  constructor() {
    super('The dependency graph contains a cycle - a schedule cannot be computed until it is removed.');
  }
}

const FLOAT_TOLERANCE = 1e-6;

/**
 * Kahn's algorithm topological sort. Throws CpmCycleError if the graph isn't
 * a DAG - the two network rules (predecessors must finish first; arrows
 * denote logical order) are meaningless otherwise.
 */
function topologicalSort(activities: CpmActivityInput[]): string[] {
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();

  for (const activity of activities) {
    inDegree.set(activity.id, 0);
    successors.set(activity.id, []);
  }
  for (const activity of activities) {
    for (const predId of activity.predecessorIds) {
      if (!successors.has(predId)) continue; // ignore dangling refs defensively
      successors.get(predId)!.push(activity.id);
      inDegree.set(activity.id, (inDegree.get(activity.id) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const succId of successors.get(id) || []) {
      const remaining = (inDegree.get(succId) || 0) - 1;
      inDegree.set(succId, remaining);
      if (remaining === 0) queue.push(succId);
    }
  }

  if (order.length !== activities.length) {
    throw new CpmCycleError();
  }
  return order;
}

export function computeCpm(activities: CpmActivityInput[]): CpmResult {
  if (activities.length === 0) {
    return { activities: new Map(), projectDurationDays: 0, criticalPath: [] };
  }

  const byId = new Map(activities.map((a) => [a.id, a]));
  const order = topologicalSort(activities);

  const successors = new Map<string, string[]>();
  for (const a of activities) successors.set(a.id, []);
  for (const a of activities) {
    for (const predId of a.predecessorIds) {
      successors.get(predId)?.push(a.id);
    }
  }

  // Forward pass: earliest an activity can start/finish.
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();
  for (const id of order) {
    const activity = byId.get(id)!;
    const preds = activity.predecessorIds.filter((p) => byId.has(p));
    const es = preds.length === 0 ? 0 : Math.max(...preds.map((p) => earlyFinish.get(p)!));
    earlyStart.set(id, es);
    earlyFinish.set(id, es + activity.durationDays);
  }

  const projectDurationDays = Math.max(...Array.from(earlyFinish.values()));

  // Backward pass: latest an activity can start/finish without delaying the project.
  const lateFinish = new Map<string, number>();
  const lateStart = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const activity = byId.get(id)!;
    const succs = successors.get(id) || [];
    const lf = succs.length === 0 ? projectDurationDays : Math.min(...succs.map((s) => lateStart.get(s)!));
    lateFinish.set(id, lf);
    lateStart.set(id, lf - activity.durationDays);
  }

  const results = new Map<string, CpmActivityResult>();
  for (const id of order) {
    const es = earlyStart.get(id)!;
    const ef = earlyFinish.get(id)!;
    const ls = lateStart.get(id)!;
    const lf = lateFinish.get(id)!;
    const totalFloat = ls - es;
    results.set(id, {
      id,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloat,
      isCritical: Math.abs(totalFloat) < FLOAT_TOLERANCE,
    });
  }

  const criticalPath = order.filter((id) => results.get(id)!.isCritical);

  return { activities: results, projectDurationDays, criticalPath };
}

/**
 * PERT three-point weighted estimate: tE = (o + 4m + p) / 6
 * Returns null if any of the three inputs is missing - callers fall back to
 * a plain single-point duration in that case.
 */
export function pertWeightedDuration(
  optimistic: number | null | undefined,
  mostLikely: number | null | undefined,
  pessimistic: number | null | undefined
): number | null {
  if (optimistic == null || mostLikely == null || pessimistic == null) return null;
  return (optimistic + 4 * mostLikely + pessimistic) / 6;
}

export function pertVariance(
  optimistic: number | null | undefined,
  pessimistic: number | null | undefined
): number | null {
  if (optimistic == null || pessimistic == null) return null;
  return Math.pow((pessimistic - optimistic) / 6, 2);
}
