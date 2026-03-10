/**
 * Scheduler API Routes
 *
 * GET  /api/scheduler/jobs          — List all registered jobs & status
 * POST /api/scheduler/trigger/:job  — Manually trigger a job (admin only)
 */

import { Router, Request, Response } from 'express';
import { listJobs, triggerJob } from '../services/scheduler.service';

const router = Router();

// List all registered jobs
router.get('/jobs', async (_req: Request, res: Response) => {
  try {
    const jobs = listJobs();
    res.json({
      success: true,
      data: jobs.map((j) => ({
        name: j.name,
        cron: j.cron,
        description: j.description,
        enabled: j.enabled,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manually trigger a specific job
router.post('/trigger/:jobType', async (req: Request, res: Response) => {
  try {
    const { jobType } = req.params;
    const userId = (req as any).user?.id || 'manual';

    const result = await triggerJob(jobType, userId);
    res.json({
      success: true,
      message: `Job ${jobType} triggered`,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
