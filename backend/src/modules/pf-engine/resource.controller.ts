import { Response } from 'express';
import { TenantRequest } from '../../types';
import { ResourceService } from './resource.service';

const notFound = (error: any) => /not found/i.test(error?.message || '');

export class ResourceController {
  private service: ResourceService;

  constructor() {
    this.service = new ResourceService();
  }

  list = async (req: TenantRequest, res: Response) => {
    try {
      const resources = await this.service.list(req.tenant!.id);
      res.json({ success: true, data: resources });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  create = async (req: TenantRequest, res: Response) => {
    try {
      const { name, costPerHour, productivityFactor } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: 'name is required' });
        return;
      }
      const resource = await this.service.create(req.tenant!.id, name, costPerHour || 0, productivityFactor || 1.0);
      res.status(201).json({ success: true, data: resource });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  update = async (req: TenantRequest, res: Response) => {
    try {
      const { resourceId } = req.params;
      const { name, costPerHour, productivityFactor } = req.body;
      const resource = await this.service.update(req.tenant!.id, resourceId, { name, costPerHour, productivityFactor });
      res.json({ success: true, data: resource });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  delete = async (req: TenantRequest, res: Response) => {
    try {
      const { resourceId } = req.params;
      await this.service.delete(req.tenant!.id, resourceId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  assign = async (req: TenantRequest, res: Response) => {
    try {
      const { activityId } = req.params;
      const { resourceId, plannedHours } = req.body;
      if (!resourceId || plannedHours == null) {
        res.status(400).json({ success: false, error: 'resourceId and plannedHours are required' });
        return;
      }
      const assignment = await this.service.assign(req.tenant!.id, activityId, resourceId, plannedHours);
      res.status(201).json({ success: true, data: assignment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  unassign = async (req: TenantRequest, res: Response) => {
    try {
      const { assignmentId } = req.params;
      await this.service.unassign(req.tenant!.id, assignmentId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  getCostSummary = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const [costByActivity, assignmentsByActivity] = await Promise.all([
        this.service.getCostByActivity(tenantId, projectId),
        this.service.getAssignmentsByActivity(tenantId, projectId),
      ]);
      const totalCost = Array.from(costByActivity.values()).reduce((sum, c) => sum + c, 0);
      res.json({
        success: true,
        data: {
          totalCost,
          byActivity: Array.from(costByActivity.entries()).map(([activityId, cost]) => ({
            activityId,
            cost,
            assignments: assignmentsByActivity.get(activityId) || [],
          })),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
