/**
 * Scheduler Service — Central Background Job Orchestrator
 *
 * Uses Bull repeatable jobs (Redis-backed) for reliable, distributed scheduling.
 * Falls back to in-process setInterval when Redis is unavailable.
 *
 * Jobs:
 *  - DAILY_DIGEST        06:30 — Morning email digest to all active users
 *  - INVOICE_REMINDERS   08:00 — Overdue & upcoming invoice reminders
 *  - BANK_RECONCILIATION 07:00 — Auto-match bank transactions
 *  - LEAVE_ACCRUAL       01:00 (1st of month) — Monthly leave accrual
 *  - COMPLIANCE_CHECK    07:30 — Regulatory deadline alerts
 *  - APPROVAL_ESCALATION 09:00 — Escalate stale approval requests
 *  - LOW_STOCK_ALERTS    06:00 — Inventory reorder point check
 *  - PAYROLL_REMINDER    08:00 (25th of month) — Payroll cutoff reminder
 */

import Bull, { Queue, Job } from 'bull';
import { createRedisClient } from '../config/redis-connection';
import { query } from '../config/database';

// ────────────────────────── Types ──────────────────────────

export interface SchedulerJobData {
  jobType: string;
  tenantId?: string;      // null = run for all tenants
  triggeredBy?: string;   // 'scheduler' | 'manual'
  params?: Record<string, any>;
}

interface ScheduledJobDef {
  name: string;
  cron: string;           // Bull cron expression (matches node-cron/crontab)
  handler: (job: Job<SchedulerJobData>) => Promise<any>;
  description: string;
  enabled: boolean;
}

// ────────────────────────── Globals ──────────────────────────

const isRedisDisabled = process.env.REDIS_ENABLED === 'false' || process.env.SKIP_REDIS === 'true';
const SCHEDULER_ENABLED = process.env.SCHEDULER_ENABLED !== 'false';

let schedulerQueue: Queue<SchedulerJobData> | null = null;
const fallbackTimers: NodeJS.Timeout[] = [];
const jobRegistry: Map<string, ScheduledJobDef> = new Map();

// ────────────────────────── Helpers ──────────────────────────

/** Get all active tenant IDs */
export async function getAllTenantIds(): Promise<string[]> {
  try {
    const result = await query(
      `SELECT id FROM tenants WHERE COALESCE(is_active, true) = true ORDER BY name`
    );
    return result.rows.map((r: any) => r.id);
  } catch {
    return [];
  }
}

/** Run a handler for every tenant */
export async function forEachTenant(
  fn: (tenantId: string) => Promise<void>
): Promise<{ succeeded: number; failed: number }> {
  const tenantIds = await getAllTenantIds();
  let succeeded = 0;
  let failed = 0;
  for (const tid of tenantIds) {
    try {
      await fn(tid);
      succeeded++;
    } catch (err) {
      console.error(`  ❌ Tenant ${tid}:`, (err as Error).message);
      failed++;
    }
  }
  return { succeeded, failed };
}

// ────────────────────────── Job Registration ──────────────────────────

export function registerJob(def: ScheduledJobDef) {
  jobRegistry.set(def.name, def);
}

// ────────────────────────── Initialisation ──────────────────────────

export async function initializeScheduler(): Promise<void> {
  if (!SCHEDULER_ENABLED) {
    console.log('⏸️  Scheduler disabled (SCHEDULER_ENABLED=false)');
    return;
  }

  // Lazy-import job modules so they self-register
  await import('./jobs/daily-digest.job');
  await import('./jobs/invoice-automation.job');
  await import('./jobs/bank-reconciliation.job');
  await import('./jobs/leave-accrual.job');
  await import('./jobs/compliance-alerts.job');
  await import('./jobs/approval-escalation.job');
  await import('./jobs/low-stock-alerts.job');
  await import('./jobs/payroll-reminder.job');
  await import('./jobs/waitlist-drip.job');

  if (!isRedisDisabled) {
    await initBullScheduler();
  } else {
    initFallbackScheduler();
  }

  console.log(`🕐 Scheduler initialised — ${jobRegistry.size} jobs registered`);
}

// ─── Bull-based (production) ────────────────────────────

async function initBullScheduler(): Promise<void> {
  schedulerQueue = new Bull<SchedulerJobData>('scheduler', {
    createClient: (type) => {
      if (type === 'client') return createRedisClient('client');
      if (type === 'subscriber') return createRedisClient('subscriber');
      return createRedisClient('bclient');
    },
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 30_000 },
      removeOnComplete: 100,   // keep last 100 completed
      removeOnFail: 200,       // keep last 200 failed for debugging
    },
  });

  // Register processor
  schedulerQueue.process(5, async (job: Job<SchedulerJobData>) => {
    const def = jobRegistry.get(job.data.jobType);
    if (!def) {
      console.warn(`⚠️  Unknown job type: ${job.data.jobType}`);
      return;
    }
    console.log(`🔄 [${job.data.jobType}] Starting…`);
    const start = Date.now();
    const result = await def.handler(job);
    console.log(`✅ [${job.data.jobType}] Completed in ${Date.now() - start}ms`);
    return result;
  });

  // Schedule repeatable jobs
  // First clean any stale repeatable jobs from previous deploys
  const existing = await schedulerQueue.getRepeatableJobs();
  for (const r of existing) {
    await schedulerQueue.removeRepeatableByKey(r.key);
  }

  for (const [name, def] of jobRegistry) {
    if (!def.enabled) continue;
    await schedulerQueue.add(
      { jobType: name, triggeredBy: 'scheduler' },
      { repeat: { cron: def.cron }, jobId: name }
    );
    console.log(`  📅 ${name} → ${def.cron} (${def.description})`);
  }

  schedulerQueue.on('error', (err) => console.error('Scheduler queue error:', err));
}

// ─── Fallback (no Redis) ────────────────────────────────

function initFallbackScheduler(): void {
  console.log('⚠️  Redis not available — using in-process fallback scheduler');

  for (const [name, def] of jobRegistry) {
    if (!def.enabled) continue;

    // Parse cron to a rough interval (good enough for fallback)
    const intervalMs = cronToIntervalMs(def.cron);
    const timer = setInterval(async () => {
      try {
        console.log(`🔄 [fallback] [${name}] Starting…`);
        await def.handler({ data: { jobType: name, triggeredBy: 'scheduler' } } as any);
        console.log(`✅ [fallback] [${name}] Done`);
      } catch (err) {
        console.error(`❌ [fallback] [${name}]:`, err);
      }
    }, intervalMs);

    fallbackTimers.push(timer);
    console.log(`  ⏰ ${name} → every ${Math.round(intervalMs / 60000)}min (${def.description})`);
  }
}

function cronToIntervalMs(cron: string): number {
  // Simple mapping: daily jobs → 24h, monthly → 24h (checked internally)
  // NOTE: Node.js setInterval max safe value is 2^31-1 ms (~24.8 days).
  // Values above that overflow to 1ms and fire in a tight loop.
  const MAX_SAFE_INTERVAL = 24 * 60 * 60 * 1000; // 24h cap
  const parts = cron.split(' ');
  if (parts.length < 5) return MAX_SAFE_INTERVAL;
  return MAX_SAFE_INTERVAL; // all jobs check daily; cron determines actual run
}

// ────────────────────────── Manual trigger ──────────────────────────

export async function triggerJob(jobType: string, params?: Record<string, any>): Promise<void> {
  const def = jobRegistry.get(jobType);
  if (!def) throw new Error(`Unknown job: ${jobType}`);

  if (schedulerQueue) {
    await schedulerQueue.add(
      { jobType, triggeredBy: 'manual', params },
      { priority: 1 } // high priority for manual triggers
    );
  } else {
    // Direct execution for fallback mode
    await def.handler({ data: { jobType, triggeredBy: 'manual', params } } as any);
  }
}

/** List all registered jobs and their status */
export function listJobs(): { name: string; cron: string; description: string; enabled: boolean }[] {
  return Array.from(jobRegistry.values()).map(({ name, cron, description, enabled }) => ({
    name, cron, description, enabled,
  }));
}

// ────────────────────────── Shutdown ──────────────────────────

export async function shutdownScheduler(): Promise<void> {
  for (const t of fallbackTimers) clearInterval(t);
  fallbackTimers.length = 0;
  if (schedulerQueue) {
    await schedulerQueue.close();
    schedulerQueue = null;
  }
  console.log('⏹️  Scheduler shut down');
}
