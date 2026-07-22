import { Response } from 'express';
import { TenantRequest } from '../../types';
import { BaselineService } from './baseline.service';
import { ScheduleService } from './schedule.service';

export class BaselineController {
  private baselineService: BaselineService;
  private scheduleService: ScheduleService;

  constructor() {
    this.baselineService = new BaselineService();
    this.scheduleService = new ScheduleService();
  }

  freeze = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const userId = req.user!.id;
      // Make sure the schedule is fresh before we snapshot it.
      await this.scheduleService.recompute(tenantId, projectId);
      const baseline = await this.baselineService.freeze(tenantId, projectId, userId);
      res.status(201).json({ success: true, data: baseline });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getCurrent = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const baseline = await this.baselineService.getCurrent(tenantId, projectId);
      if (!baseline) {
        res.json({ success: true, data: null });
        return;
      }
      const bcws = await this.baselineService.getBcwsCurve(tenantId, baseline.id);
      res.json({ success: true, data: { ...baseline, bcws } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  simulate = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId, activityId } = req.params;
      const { hypotheticalDurationDays } = req.body;
      if (hypotheticalDurationDays == null) {
        res.status(400).json({ success: false, error: 'hypotheticalDurationDays is required' });
        return;
      }
      const result = await this.scheduleService.simulate(tenantId, projectId, activityId, hypotheticalDurationDays);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
