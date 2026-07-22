import { pool } from '../../config/database';
import {
  PfLifecyclePhase,
  isPfLifecyclePhase,
  canTransition,
  GateContext,
  TransitionResult,
} from './lifecycle';

export class PfEngineService {
  /**
   * Current gate context for a project. Phase 0 wires the shape; the values
   * are real (queried against tables that exist from this migration) but will
   * only ever be non-trivial once Phase 3 (baselines) and Phase 6 (closure
   * checklist) exist. Until then hasCurrentBaseline is always false and
   * closureChecklistComplete is always false — so both gates correctly block,
   * because nothing to satisfy them has been built yet.
   */
  private async getGateContext(tenantId: string, projectId: string): Promise<GateContext> {
    const baselineResult = await pool.query(
      `SELECT 1 FROM pf_baseline WHERE tenant_id = $1 AND project_id = $2 AND is_current = true LIMIT 1`,
      [tenantId, projectId]
    );

    return {
      hasCurrentBaseline: baselineResult.rows.length > 0,
      // TODO(Phase 6): replace with a real closure-checklist completeness check.
      closureChecklistComplete: false,
    };
  }

  async getLifecyclePhase(tenantId: string, projectId: string): Promise<PfLifecyclePhase> {
    const result = await pool.query(
      `SELECT pf_lifecycle_phase FROM public.projects WHERE tenant_id = $1 AND id = $2`,
      [tenantId, projectId]
    );

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    const phase = result.rows[0].pf_lifecycle_phase as string;
    return isPfLifecyclePhase(phase) ? phase : 'define';
  }

  async getTransitionHistory(tenantId: string, projectId: string) {
    const result = await pool.query(
      `SELECT id, from_phase, to_phase, transitioned_by, transitioned_at
       FROM pf_lifecycle_transition
       WHERE tenant_id = $1 AND project_id = $2
       ORDER BY transitioned_at DESC`,
      [tenantId, projectId]
    );
    return result.rows;
  }

  async attemptTransition(
    tenantId: string,
    projectId: string,
    userId: string,
    toPhase: string
  ): Promise<{ result: TransitionResult; phase: PfLifecyclePhase }> {
    if (!isPfLifecyclePhase(toPhase)) {
      return {
        result: { allowed: false, reason: `"${toPhase}" is not a recognised lifecycle phase.` },
        phase: await this.getLifecyclePhase(tenantId, projectId),
      };
    }

    const fromPhase = await this.getLifecyclePhase(tenantId, projectId);
    const context = await this.getGateContext(tenantId, projectId);
    const result = canTransition(fromPhase, toPhase, context);

    if (!result.allowed) {
      return { result, phase: fromPhase };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE public.projects SET pf_lifecycle_phase = $1, updated_at = now() WHERE tenant_id = $2 AND id = $3`,
        [toPhase, tenantId, projectId]
      );
      await client.query(
        `INSERT INTO pf_lifecycle_transition (tenant_id, project_id, from_phase, to_phase, transitioned_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, projectId, fromPhase, toPhase, userId]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return { result, phase: toPhase };
  }
}
