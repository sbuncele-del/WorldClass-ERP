/**
 * Waitlist Drip Email Job
 *
 * Runs daily at 09:00 SAST — checks the waitlist table and sends
 * drip emails based on signup age:
 *   Day 3  → Feature deep-dive email
 *   Day 7  → Demo invitation email
 *   Day 14 → Urgency / testimonial email
 *
 * Tracks which emails have been sent via the `drip_sent` JSONB column
 * to prevent duplicates.
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, SchedulerJobData } from '../scheduler.service';
import { sendEmail } from '../email.service';

// ── Self-register ───────────────────────────────────────

registerJob({
  name: 'WAITLIST_DRIP',
  cron: '0 9 * * *', // Daily at 09:00
  description: 'Send drip emails to waitlist signups (day 3, 7, 14)',
  enabled: true,
  handler: runWaitlistDrip,
});

// ── Drip schedule definition ────────────────────────────

interface DripStep {
  day: number;
  key: string;           // unique key stored in drip_sent
  template: string;      // email template name
  subject: string;
}

const DRIP_STEPS: DripStep[] = [
  {
    day: 3,
    key: 'day3_features',
    template: 'drip-day3-features',
    subject: 'How SiyaBusa Replaces 5+ Business Tools',
  },
  {
    day: 7,
    key: 'day7_demo',
    template: 'drip-day7-demo',
    subject: 'Ready for a Quick Walk-Through?',
  },
  {
    day: 14,
    key: 'day14_urgency',
    template: 'drip-day14-urgency',
    subject: 'Your Founding Spot Is Still Open',
  },
];

// ── Main handler ────────────────────────────────────────

async function runWaitlistDrip(_job: Job<SchedulerJobData>) {
  // Ensure the drip_sent column exists
  await ensureDripColumn();

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const step of DRIP_STEPS) {
    try {
      const result = await sendDripStep(step);
      sent += result.sent;
      skipped += result.skipped;
    } catch (err) {
      console.error(`❌ [WAITLIST_DRIP] Error on ${step.key}:`, (err as Error).message);
      errors++;
    }
  }

  console.log(`📧 [WAITLIST_DRIP] Complete — sent: ${sent}, skipped: ${skipped}, errors: ${errors}`);
  return { sent, skipped, errors };
}

async function sendDripStep(step: DripStep): Promise<{ sent: number; skipped: number }> {
  // Find waitlist entries that:
  //   1. Signed up exactly `step.day` days ago (or more, up to next step)
  //   2. Haven't received this drip email yet
  //   3. Are still 'active'
  const result = await query(
    `SELECT id, name, email, company
     FROM public.waitlist
     WHERE status = 'active'
       AND created_at <= NOW() - INTERVAL '${step.day} days'
       AND (drip_sent IS NULL OR NOT (drip_sent ? $1))
     ORDER BY created_at
     LIMIT 50`,
    [step.key]
  );

  let sent = 0;
  let skipped = 0;

  for (const lead of result.rows) {
    try {
      await sendEmail({
        to: lead.email,
        subject: step.subject,
        template: step.template,
        variables: {
          name: lead.name || 'there',
          email: lead.email,
          company: lead.company || '',
        },
      });

      // Mark as sent
      await query(
        `UPDATE public.waitlist
         SET drip_sent = COALESCE(drip_sent, '{}'::jsonb) || jsonb_build_object($1, NOW()::text),
             updated_at = NOW()
         WHERE id = $2`,
        [step.key, lead.id]
      );

      sent++;
      console.log(`  📨 [${step.key}] Sent to ${lead.email}`);
    } catch (err) {
      console.error(`  ❌ [${step.key}] Failed for ${lead.email}:`, (err as Error).message);
      skipped++;
    }
  }

  return { sent, skipped };
}

// ── Ensure schema ───────────────────────────────────────

async function ensureDripColumn(): Promise<void> {
  try {
    await query(`
      ALTER TABLE public.waitlist
      ADD COLUMN IF NOT EXISTS drip_sent JSONB DEFAULT '{}'::jsonb
    `);
  } catch {
    // Column might already exist — that's fine
  }
}
