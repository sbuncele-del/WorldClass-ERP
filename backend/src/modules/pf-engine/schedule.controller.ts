import { Response } from 'express';
import { TenantRequest } from '../../types';
import { ScheduleService } from './schedule.service';

const notFound = (error: any) => /not found/i.test(error?.message || '');
const badRequest = (error: any) =>
  /must belong to this project|cannot depend on itself|circular dependency|Provide either/i.test(error?.message || '');

export class ScheduleController {
  private service: ScheduleService;

  constructor() {
    this.service = new ScheduleService();
  }

  getSchedule = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const [schedule, dependencies] = await Promise.all([
        this.service.getSchedule(tenantId, projectId),
        this.service.getDependencies(tenantId, projectId),
      ]);
      res.json({ success: true, data: { ...schedule, dependencies } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  updateDuration = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId, activityId } = req.params;
      const { durationDays, optimisticDays, mostLikelyDays, pessimisticDays } = req.body;
      await this.service.updateDuration(tenantId, projectId, activityId, {
        durationDays, optimisticDays, mostLikelyDays, pessimisticDays,
      });
      const schedule = await this.service.getSchedule(tenantId, projectId);
      res.json({ success: true, data: schedule });
    } catch (error: any) {
      const status = notFound(error) ? 404 : badRequest(error) ? 400 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  addDependency = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const { predecessorId, successorId } = req.body;
      if (!predecessorId || !successorId) {
        res.status(400).json({ success: false, error: 'predecessorId and successorId are required' });
        return;
      }
      await this.service.addDependency(tenantId, projectId, predecessorId, successorId);
      const schedule = await this.service.getSchedule(tenantId, projectId);
      const dependencies = await this.service.getDependencies(tenantId, projectId);
      res.status(201).json({ success: true, data: { ...schedule, dependencies } });
    } catch (error: any) {
      const status = notFound(error) ? 404 : badRequest(error) ? 400 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  removeDependency = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId, dependencyId } = req.params;
      await this.service.removeDependency(tenantId, projectId, dependencyId);
      const schedule = await this.service.getSchedule(tenantId, projectId);
      const dependencies = await this.service.getDependencies(tenantId, projectId);
      res.json({ success: true, data: { ...schedule, dependencies } });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };
}
