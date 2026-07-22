import { Response } from 'express';
import { TenantRequest } from '../../types';
import { PfEngineService } from './service';
import { getNextPhases } from './lifecycle';

export class PfEngineController {
  private service: PfEngineService;

  constructor() {
    this.service = new PfEngineService();
  }

  getLifecycle = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;

      const [phase, history] = await Promise.all([
        this.service.getLifecyclePhase(tenantId, projectId),
        this.service.getTransitionHistory(tenantId, projectId),
      ]);

      res.json({ success: true, data: { phase, history, nextPhases: getNextPhases(phase) } });
    } catch (error: any) {
      res.status(error.message === 'Project not found' ? 404 : 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  transitionLifecycle = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const userId = req.user!.id;
      const { projectId } = req.params;
      const { toPhase } = req.body;

      if (!toPhase) {
        res.status(400).json({ success: false, error: '"toPhase" is required' });
        return;
      }

      const { result, phase } = await this.service.attemptTransition(tenantId, projectId, userId, toPhase);

      if (!result.allowed) {
        res.status(409).json({ success: false, error: result.reason, data: { phase } });
        return;
      }

      res.json({ success: true, data: { phase } });
    } catch (error: any) {
      res.status(error.message === 'Project not found' ? 404 : 500).json({
        success: false,
        error: error.message,
      });
    }
  };
}
