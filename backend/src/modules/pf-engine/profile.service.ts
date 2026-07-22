import { pool } from '../../config/database';
import { PF_PROFILES, PfProfile, PfProfileId, isPfProfileId } from './profiles';
import { WbsService } from './wbs.service';

export class ProfileService {
  private wbsService = new WbsService();

  listProfiles(): PfProfile[] {
    return Object.values(PF_PROFILES);
  }

  async getProjectProfile(tenantId: string, projectId: string): Promise<PfProfile> {
    const result = await pool.query<{ pf_profile_id: string }>(
      `SELECT pf_profile_id FROM public.projects WHERE tenant_id = $1 AND id = $2`,
      [tenantId, projectId]
    );
    if (result.rows.length === 0) throw new Error('Project not found');
    const profileId = result.rows[0].pf_profile_id;
    return PF_PROFILES[isPfProfileId(profileId) ? profileId : 'general'];
  }

  /**
   * Apply a profile: always records the choice; seeds the profile's
   * starter WBS as top-level elements only if the WBS is currently empty
   * (never overwrites work someone has already built).
   */
  async applyProfile(tenantId: string, projectId: string, profileId: string): Promise<{ profile: PfProfile; seeded: boolean }> {
    if (!isPfProfileId(profileId)) {
      throw new Error(`Unknown profile "${profileId}"`);
    }

    const updateResult = await pool.query(
      `UPDATE public.projects SET pf_profile_id = $1, updated_at = now() WHERE tenant_id = $2 AND id = $3 RETURNING id`,
      [profileId, tenantId, projectId]
    );
    if (updateResult.rows.length === 0) throw new Error('Project not found');

    const profile = PF_PROFILES[profileId as PfProfileId];

    const existing = await pool.query(
      `SELECT 1 FROM pf_wbs_element WHERE tenant_id = $1 AND project_id = $2 LIMIT 1`,
      [tenantId, projectId]
    );
    let seeded = false;
    if (existing.rows.length === 0) {
      for (const name of profile.starterWbs) {
        await this.wbsService.createElement(tenantId, projectId, null, name);
      }
      seeded = true;
    }

    return { profile, seeded };
  }
}
