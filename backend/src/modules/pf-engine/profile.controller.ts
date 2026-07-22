import { Response } from 'express';
import { TenantRequest } from '../../types';
import { ProfileService } from './profile.service';

const notFound = (error: any) => /not found/i.test(error?.message || '');

export class ProfileController {
  private service: ProfileService;

  constructor() {
    this.service = new ProfileService();
  }

  listProfiles = async (_req: TenantRequest, res: Response) => {
    res.json({ success: true, data: this.service.listProfiles() });
  };

  getProjectProfile = async (req: TenantRequest, res: Response) => {
    try {
      const profile = await this.service.getProjectProfile(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  applyProfile = async (req: TenantRequest, res: Response) => {
    try {
      const { profileId } = req.body;
      if (!profileId) {
        res.status(400).json({ success: false, error: 'profileId is required' });
        return;
      }
      const result = await this.service.applyProfile(req.tenant!.id, req.params.projectId, profileId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : /^Unknown profile/.test(error.message) ? 400 : 500).json({ success: false, error: error.message });
    }
  };
}
