import { Response } from 'express';
import { TenantRequest } from '../../types';
import { EvaService } from './eva.service';

export class EvaController {
  private service: EvaService;

  constructor() {
    this.service = new EvaService();
  }

  getSnapshot = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const statusDate = req.query.statusDate ? new Date(req.query.statusDate as string) : undefined;
      const snapshot = await this.service.getSnapshot(tenantId, projectId, statusDate);
      res.json({ success: true, data: snapshot });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getCurve = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const curve = await this.service.getCurve(tenantId, projectId);
      res.json({ success: true, data: curve });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  recordProgress = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const userId = req.user!.id;
      const { activityId } = req.params;
      const { percentComplete, actualCost } = req.body;
      if (percentComplete == null || actualCost == null) {
        res.status(400).json({ success: false, error: 'percentComplete and actualCost are required' });
        return;
      }
      await this.service.recordProgress(tenantId, activityId, percentComplete, actualCost, userId);
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
