/**
 * ProjectFlow PM Engine — Lifecycle State Machine
 *
 * The 6-phase PMBOK lifecycle + the "soft gate" framework: phases mostly
 * transition freely, but the two logically-required gates are enforced here.
 * Gate *implementations* land in the phases that build what they check
 * (baseline in Phase 3, closure checklist in Phase 6) — this file only
 * defines the shape so those phases have a slot to fill in, not a redesign.
 */

export const PF_LIFECYCLE_PHASES = [
  'define',
  'develop',
  'plan',
  'execute',
  'monitor_control',
  'close',
] as const;

export type PfLifecyclePhase = typeof PF_LIFECYCLE_PHASES[number];

export const isPfLifecyclePhase = (value: string): value is PfLifecyclePhase =>
  (PF_LIFECYCLE_PHASES as readonly string[]).includes(value);

/**
 * Allowed transitions. The lifecycle is mostly linear (define -> ... -> close),
 * but Monitor & Control is a loop: it can send work back to Execute (rework)
 * or back to Plan (re-baseline after a major change), not just forward to Close.
 */
const ALLOWED_TRANSITIONS: Record<PfLifecyclePhase, PfLifecyclePhase[]> = {
  define: ['develop'],
  develop: ['define', 'plan'],
  plan: ['develop', 'execute'],
  execute: ['plan', 'monitor_control'],
  monitor_control: ['execute', 'plan', 'close'],
  close: [],
};

export interface GateContext {
  /** Does the project have a current (is_current=true) baseline? Set by Phase 3+. */
  hasCurrentBaseline: boolean;
  /** Has the closure checklist been fully cleared? Set by Phase 6+. */
  closureChecklistComplete: boolean;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Decide whether a transition is allowed. Two things are checked, in order:
 * 1. Is this an edge in the lifecycle graph at all?
 * 2. Does it cross one of the two soft gates, and if so, is the gate satisfied?
 */
export const canTransition = (
  from: PfLifecyclePhase,
  to: PfLifecyclePhase,
  context: GateContext
): TransitionResult => {
  if (from === to) {
    return { allowed: false, reason: `Project is already in "${to}".` };
  }

  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    return {
      allowed: false,
      reason: `Cannot move directly from "${from}" to "${to}". Allowed next steps: ${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}.`,
    };
  }

  // Gate 1: entering Monitor & Control requires a baseline to measure against.
  if (to === 'monitor_control' && !context.hasCurrentBaseline) {
    return {
      allowed: false,
      reason: 'A schedule baseline must be set before entering Monitor & Control — Earned Value has nothing to measure against otherwise.',
    };
  }

  // Gate 2: closing requires the closure checklist to be complete.
  if (to === 'close' && !context.closureChecklistComplete) {
    return {
      allowed: false,
      reason: 'The closure checklist must be complete before a project can close.',
    };
  }

  return { allowed: true };
};
