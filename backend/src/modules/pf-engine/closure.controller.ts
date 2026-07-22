import { Response } from 'express';
import { TenantRequest } from '../../types';
import { ClosureService } from './closure.service';

const notFound = (error: any) => /not found/i.test(error?.message || '');

export class ClosureController {
  private service: ClosureService;

  constructor() {
    this.service = new ClosureService();
  }

  getChecklist = async (req: TenantRequest, res: Response) => {
    try {
      const checklist = await this.service.getChecklist(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: checklist });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  setChecklistItem = async (req: TenantRequest, res: Response) => {
    try {
      const { isComplete, notes } = req.body;
      if (isComplete == null) {
        res.status(400).json({ success: false, error: 'isComplete is required' });
        return;
      }
      const item = await this.service.setChecklistItem(req.tenant!.id, req.params.itemId, isComplete, notes);
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  getClosureOutcome = async (req: TenantRequest, res: Response) => {
    try {
      const outcome = await this.service.getClosureOutcome(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: { outcome } });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  setClosureOutcome = async (req: TenantRequest, res: Response) => {
    try {
      const { outcome } = req.body;
      if (!['completed', 'terminated', 'cancelled'].includes(outcome)) {
        res.status(400).json({ success: false, error: 'outcome must be one of completed, terminated, cancelled' });
        return;
      }
      await this.service.setClosureOutcome(req.tenant!.id, req.params.projectId, outcome);
      res.json({ success: true, data: { outcome } });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  listDocuments = async (req: TenantRequest, res: Response) => {
    try {
      const documents = await this.service.listDocuments(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: documents });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  addDocument = async (req: TenantRequest, res: Response) => {
    try {
      const { title, category, url, notes } = req.body;
      if (!title) {
        res.status(400).json({ success: false, error: 'title is required' });
        return;
      }
      const document = await this.service.addDocument(req.tenant!.id, req.params.projectId, { title, category, url, notes });
      res.status(201).json({ success: true, data: document });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  deleteDocument = async (req: TenantRequest, res: Response) => {
    try {
      await this.service.deleteDocument(req.tenant!.id, req.params.documentId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  listLessons = async (req: TenantRequest, res: Response) => {
    try {
      const lessons = await this.service.listLessons(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: lessons });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  addLesson = async (req: TenantRequest, res: Response) => {
    try {
      const { category, observation, recommendation } = req.body;
      if (!observation) {
        res.status(400).json({ success: false, error: 'observation is required' });
        return;
      }
      const lesson = await this.service.addLesson(req.tenant!.id, req.params.projectId, { category, observation, recommendation });
      res.status(201).json({ success: true, data: lesson });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  deleteLesson = async (req: TenantRequest, res: Response) => {
    try {
      await this.service.deleteLesson(req.tenant!.id, req.params.lessonId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };
}
