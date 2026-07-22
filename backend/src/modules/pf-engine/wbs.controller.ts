import { Response } from 'express';
import { TenantRequest } from '../../types';
import { WbsService } from './wbs.service';

const notFound = (error: any) => /not found/i.test(error?.message || '');

export class WbsController {
  private service: WbsService;

  constructor() {
    this.service = new WbsService();
  }

  getTree = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const tree = await this.service.getTree(tenantId, projectId);
      res.json({ success: true, data: tree });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createElement = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const { parentId, name } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: 'name is required' });
        return;
      }
      const element = await this.service.createElement(tenantId, projectId, parentId || null, name);
      res.status(201).json({ success: true, data: element });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  renameElement = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { elementId } = req.params;
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: 'name is required' });
        return;
      }
      const element = await this.service.renameElement(tenantId, elementId, name);
      res.json({ success: true, data: element });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  moveElement = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId, elementId } = req.params;
      const { direction } = req.body;
      if (!['up', 'down', 'indent', 'outdent'].includes(direction)) {
        res.status(400).json({ success: false, error: 'direction must be one of up/down/indent/outdent' });
        return;
      }
      await this.service.moveElement(tenantId, projectId, elementId, direction);
      const tree = await this.service.getTree(tenantId, projectId);
      res.json({ success: true, data: tree });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  deleteElement = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId, elementId } = req.params;
      await this.service.deleteElement(tenantId, projectId, elementId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  createActivity = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId, elementId } = req.params;
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: 'name is required' });
        return;
      }
      const activity = await this.service.createActivity(tenantId, projectId, elementId, name);
      res.status(201).json({ success: true, data: activity });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  updateActivity = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { activityId } = req.params;
      const { name, durationDays } = req.body;
      const activity = await this.service.updateActivity(tenantId, activityId, { name, durationDays });
      res.json({ success: true, data: activity });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  deleteActivity = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { activityId } = req.params;
      await this.service.deleteActivity(tenantId, activityId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  getScopeStatement = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const statement = await this.service.getScopeStatement(tenantId, projectId);
      res.json({ success: true, data: { scopeStatement: statement } });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  updateScopeStatement = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { projectId } = req.params;
      const { scopeStatement } = req.body;
      await this.service.updateScopeStatement(tenantId, projectId, scopeStatement || '');
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };
}
