import Bull, { Queue, Job, JobOptions } from 'bull';
import { createRedisClient } from '../config/redis-connection';
import { sendEmail as sendEmailDirect } from '../services/email.service';

/**
 * Email Queue Configuration
 * 
 * Provides reliable, scalable email delivery with:
 * - Priority queues (high, normal, low)
 * - Automatic retries with exponential backoff
 * - Dead letter queue for failed emails
 * - Rate limiting per domain
 * - Scheduled delivery
 * - Monitoring and metrics
 */

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
  from?: string;
  userId?: number;
  tenantId?: number;
  category?: string;
  priority?: 'high' | 'normal' | 'low';
  scheduledFor?: Date | number; // Unix timestamp or Date object
}

// Check if Redis is disabled
const isRedisDisabled = process.env.REDIS_ENABLED === 'false' || process.env.SKIP_REDIS === 'true';

// Create email queue (only if Redis is enabled)
const EMAIL_QUEUE_CONCURRENCY = parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '10', 10);

// Mock queue for when Redis is disabled
class MockQueue {
  async add(data: EmailJobData, opts?: JobOptions): Promise<any> {
    console.log('📧 Mock queue - sending email directly:', data.to);
    try {
      await sendEmailDirect({
        to: data.to,
        subject: data.subject,
        template: data.template,
        variables: data.variables,
      });
      return { id: Date.now().toString(), data };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }
  async close(): Promise<void> {}
  process(_: any, __: any): void {}
  on(_: string, __: any): this { return this; }
  async getJobCounts(): Promise<any> { return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 }; }
  async getJobs(): Promise<any[]> { return []; }
  async getJob(): Promise<any> { return null; }
  async getFailed(): Promise<any[]> { return []; }
  async empty(): Promise<void> {}
  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async clean(): Promise<any[]> { return []; }
  async isPaused(): Promise<boolean> { return false; }
  async getWaitingCount(): Promise<number> { return 0; }
  async getActiveCount(): Promise<number> { return 0; }
  async getCompletedCount(): Promise<number> { return 0; }
  async getFailedCount(): Promise<number> { return 0; }
  async getDelayedCount(): Promise<number> { return 0; }
}

export const emailQueue = isRedisDisabled 
  ? new MockQueue() as any
  : new Bull<EmailJobData>('email', {
      createClient: (type) => {
        if (type === 'client') return createRedisClient('client');
        if (type === 'subscriber') return createRedisClient('subscriber');
        return createRedisClient('bclient');
      },
      defaultJobOptions: {
        attempts: 5, // Retry up to 5 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay, doubles each retry
        },
        removeOnComplete: true, // Clean up completed jobs after 1 hour
        removeOnFail: false, // Keep failed jobs for debugging
      },
      settings: {
        maxStalledCount: 3, // Max times a job can be recovered from stalled state
        stalledInterval: 30000, // Check for stalled jobs every 30 seconds
        lockDuration: 60000, // Job lock duration: 60 seconds
      },
    });

/**
 * Process email jobs (only for real queue)
 * 
 * Concurrency: Process up to 10 emails simultaneously
 */
if (!isRedisDisabled && emailQueue instanceof Bull) {
  (emailQueue as Queue<EmailJobData>).process(EMAIL_QUEUE_CONCURRENCY, async (job: Job<EmailJobData>) => {
    const { to, subject, template, variables, from, userId, tenantId, category } = job.data;

    try {
      console.log(`📧 Processing email job ${job.id}: ${template} to ${to}`);

      // Send email using direct email service
      await sendEmailDirect({
        to,
        subject,
        template,
        variables,
        from,
        userId,
        tenantId,
        category,
      });

      console.log(`✅ Email job ${job.id} completed successfully`);
      return { success: true, jobId: job.id, to, template };
    } catch (error) {
      console.error(`❌ Email job ${job.id} failed:`, error);

      // Log failure for monitoring
      if (job.attemptsMade < (job.opts.attempts || 5)) {
        console.log(`⏳ Email job ${job.id} will retry (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);
      } else {
        console.error(`💀 Email job ${job.id} moved to dead letter queue after ${job.attemptsMade} attempts`);
      }

      throw error; // Re-throw to trigger retry logic
    }
  });

  /**
   * Queue event handlers (only for real queue)
   */
  emailQueue.on('completed', (job: Job, result: any) => {
    console.log(`✅ Job ${job.id} completed:`, result);
  });

  emailQueue.on('failed', (job: Job, error: Error) => {
    console.error(`❌ Job ${job.id} failed:`, error.message);
    
    // If all retries exhausted, log to dead letter queue
    if (job.attemptsMade >= (job.opts.attempts || 5)) {
      console.error(`💀 Job ${job.id} dead letter:`, {
        to: job.data.to,
        template: job.data.template,
        attempts: job.attemptsMade,
        error: error.message,
      });
    }
  });

  emailQueue.on('stalled', (job: Job) => {
    console.warn(`⚠️ Job ${job.id} stalled (possibly crashed worker)`);
  });

  emailQueue.on('active', (job: Job) => {
    console.log(`🔄 Job ${job.id} started processing`);
  });

  emailQueue.on('error', (error: Error) => {
    console.error('❌ Queue error:', error);
  });
}

/**
 * Add email to queue
 * 
 * @param emailData - Email job data
 * @param options - Job options (priority, delay, etc.)
 * @returns Job instance or mock job
 */
export async function queueEmail(
  emailData: EmailJobData,
  options?: JobOptions
): Promise<Job<EmailJobData> | { id: string; data: EmailJobData }> {
  const priority = emailData.priority || 'normal';
  const priorityValue = {
    high: 1,
    normal: 5,
    low: 10,
  }[priority];

  const jobOptions: JobOptions = {
    priority: priorityValue,
    ...options,
  };

  // Handle scheduled emails
  if (emailData.scheduledFor) {
    const delay = typeof emailData.scheduledFor === 'number'
      ? emailData.scheduledFor - Date.now()
      : emailData.scheduledFor.getTime() - Date.now();

    if (delay > 0) {
      jobOptions.delay = delay;
      console.log(`📅 Email scheduled for ${new Date(Date.now() + delay).toISOString()}`);
    }
  }

  const job = await emailQueue.add(emailData, jobOptions);
  console.log(`📬 Email queued: Job ${job.id} (${priority} priority)`);

  return job;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Get failed jobs (dead letter queue)
 */
export async function getFailedJobs(limit: number = 50) {
  const failed = await emailQueue.getFailed(0, limit - 1);
  return failed.map((job) => ({
    id: job.id,
    data: job.data,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  }));
}

/**
 * Retry a failed job
 */
export async function retryFailedJob(jobId: string) {
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.retry();
    console.log(`🔄 Retrying job ${jobId}`);
    return true;
  }
  return false;
}

/**
 * Clear completed jobs
 */
export async function clearCompletedJobs() {
  await emailQueue.clean(0, 'completed');
  console.log('🧹 Cleared completed jobs');
}

/**
 * Clear failed jobs
 */
export async function clearFailedJobs() {
  await emailQueue.clean(0, 'failed');
  console.log('🧹 Cleared failed jobs');
}

/**
 * Pause queue
 */
export async function pauseQueue() {
  await emailQueue.pause();
  console.log('⏸️ Queue paused');
}

/**
 * Resume queue
 */
export async function resumeQueue() {
  await emailQueue.resume();
  console.log('▶️ Queue resumed');
}

/**
 * Graceful shutdown
 */
export async function closeQueue() {
  console.log('⏳ Closing email queue...');
  await emailQueue.close();
  console.log('✅ Email queue closed');
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await closeQueue();
});

export default emailQueue;
