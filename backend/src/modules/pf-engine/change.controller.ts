import { Response } from 'express';
import { TenantRequest } from '../../types';
import { ChangeService } from './change.service';

const notFound = (error: any) => /not found/i.test(error?.message || '');

export class ChangeController {
  private service: ChangeService;

  constructor() {
    this.service = new ChangeService();
  }

  list = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const changes = await this.service.list(tenantId, projectId);
      res.json({ success: true, data: changes });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  log = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const userId = req.user!.id;
      const { projectId } = req.params;
      const { source, description, reason, scheduleImpactDays, budgetImpact, affectedActivityId } = req.body;
      if (!source || !description) {
        res.status(400).json({ success: false, error: 'source and description are required' });
        return;
      }
      const change = await this.service.log(tenantId, projectId, userId, {
        source, description, reason, scheduleImpactDays, budgetImpact, affectedActivityId,
      });
      res.status(201).json({ success: true, data: change });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  decide = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const userId = req.user!.id;
      const { changeId } = req.params;
      const { approve } = req.body;
      const change = await this.service.decide(tenantId, changeId, userId, !!approve);
      res.json({ success: true, data: change });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 400).json({ success: false, error: error.message });
    }
  };

  implement = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId, changeId } = req.params;
      const change = await this.service.implement(tenantId, projectId, changeId);
      res.json({ success: true, data: change });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 400).json({ success: false, error: error.message });
    }
  };
}
