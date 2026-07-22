import { pool } from '../../config/database';

export interface ChecklistItemRow {
  id: string;
  category: string;
  label: string;
  is_complete: boolean;
  notes: string | null;
  sort_order: number;
}

export interface DocumentRow {
  id: string;
  title: string;
  category: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
}

export interface LessonRow {
  id: string;
  category: string | null;
  observation: string;
  recommendation: string | null;
  created_at: string;
}

// The brief's closure surface, reduced to one checklist item per
// sub-area rather than a longer literal transcription - each label is
// specific enough to check off honestly, which is what the gate relies on.
const DEFAULT_CHECKLIST: { category: string; label: string; sort_order: number }[] = [
  { category: 'contractual', label: 'Contract obligations fulfilled or formally released', sort_order: 0 },
  { category: 'administrative', label: 'All approvals and sign-offs filed', sort_order: 1 },
  { category: 'financial', label: 'Final invoicing and payments reconciled', sort_order: 2 },
  { category: 'financial', label: 'Budget vs. actual reconciled and reported', sort_order: 3 },
  { category: 'documentation', label: 'Project documents archived in the repository', sort_order: 4 },
  { category: 'documentation', label: 'Resources and equipment released', sort_order: 5 },
  { category: 'lessons_learned', label: 'Lessons-learned session held and captured', sort_order: 6 },
];

export class ClosureService {
  // ── Closure checklist ────────────────────────────────────────────────

  async getChecklist(tenantId: string, projectId: string): Promise<ChecklistItemRow[]> {
    const existing = await pool.query<ChecklistItemRow>(
      `SELECT id, category, label, is_complete, notes, sort_order FROM pf_closure_checklist_item
       WHERE tenant_id = $1 AND project_id = $2 ORDER BY sort_order ASC`,
      [tenantId, projectId]
    );
    if (existing.rows.length > 0) return existing.rows;

    // Lazily seed on first read - a project only needs a checklist once
    // someone actually opens the closure screen, not at creation time.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of DEFAULT_CHECKLIST) {
        await client.query(
          `INSERT INTO pf_closure_checklist_item (tenant_id, project_id, category, label, sort_order) VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, projectId, item.category, item.label, item.sort_order]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const seeded = await pool.query<ChecklistItemRow>(
      `SELECT id, category, label, is_complete, notes, sort_order FROM pf_closure_checklist_item
       WHERE tenant_id = $1 AND project_id = $2 ORDER BY sort_order ASC`,
      [tenantId, projectId]
    );
    return seeded.rows;
  }

  async setChecklistItem(tenantId: string, itemId: string, isComplete: boolean, notes?: string): Promise<ChecklistItemRow> {
    const result = await pool.query<ChecklistItemRow>(
      `UPDATE pf_closure_checklist_item SET is_complete = $1, notes = COALESCE($2, notes), updated_at = now()
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, category, label, is_complete, notes, sort_order`,
      [isComplete, notes ?? null, itemId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Checklist item not found');
    return result.rows[0];
  }

  /**
   * The gate check consumed by service.ts's getGateContext. True only when
   * the checklist exists, every item is complete, and a closure outcome
   * has been recorded - matches the brief's "must close one way or another".
   */
  async isChecklistComplete(tenantId: string, projectId: string): Promise<boolean> {
    const items = await pool.query<{ is_complete: boolean }>(
      `SELECT is_complete FROM pf_closure_checklist_item WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );
    if (items.rows.length === 0) return false;
    const allComplete = items.rows.every((r) => r.is_complete);

    const outcome = await pool.query<{ pf_closure_outcome: string | null }>(
      `SELECT pf_closure_outcome FROM public.projects WHERE tenant_id = $1 AND id = $2`,
      [tenantId, projectId]
    );
    const hasOutcome = outcome.rows.length > 0 && outcome.rows[0].pf_closure_outcome != null;

    return allComplete && hasOutcome;
  }

  // ── Closure outcome ──────────────────────────────────────────────────

  async setClosureOutcome(tenantId: string, projectId: string, outcome: 'completed' | 'terminated' | 'cancelled'): Promise<void> {
    const result = await pool.query(
      `UPDATE public.projects SET pf_closure_outcome = $1, updated_at = now() WHERE tenant_id = $2 AND id = $3 RETURNING id`,
      [outcome, tenantId, projectId]
    );
    if (result.rows.length === 0) throw new Error('Project not found');
  }

  async getClosureOutcome(tenantId: string, projectId: string): Promise<string | null> {
    const result = await pool.query<{ pf_closure_outcome: string | null }>(
      `SELECT pf_closure_outcome FROM public.projects WHERE tenant_id = $1 AND id = $2`,
      [tenantId, projectId]
    );
    if (result.rows.length === 0) throw new Error('Project not found');
    return result.rows[0].pf_closure_outcome;
  }

  // ── Document repository ──────────────────────────────────────────────

  async listDocuments(tenantId: string, projectId: string): Promise<DocumentRow[]> {
    const result = await pool.query<DocumentRow>(
      `SELECT id, title, category, url, notes, created_at FROM pf_document
       WHERE tenant_id = $1 AND project_id = $2 ORDER BY created_at DESC`,
      [tenantId, projectId]
    );
    return result.rows;
  }

  async addDocument(tenantId: string, projectId: string, input: { title: string; category?: string; url?: string; notes?: string }): Promise<DocumentRow> {
    const result = await pool.query<DocumentRow>(
      `INSERT INTO pf_document (tenant_id, project_id, title, category, url, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, category, url, notes, created_at`,
      [tenantId, projectId, input.title, input.category || null, input.url || null, input.notes || null]
    );
    return result.rows[0];
  }

  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    const result = await pool.query(`DELETE FROM pf_document WHERE id = $1 AND tenant_id = $2 RETURNING id`, [documentId, tenantId]);
    if (result.rows.length === 0) throw new Error('Document not found');
  }

  // ── Lessons learned ───────────────────────────────────────────────────

  async listLessons(tenantId: string, projectId: string): Promise<LessonRow[]> {
    const result = await pool.query<LessonRow>(
      `SELECT id, category, observation, recommendation, created_at FROM pf_lessons_learned
       WHERE tenant_id = $1 AND project_id = $2 ORDER BY created_at DESC`,
      [tenantId, projectId]
    );
    return result.rows;
  }

  async addLesson(tenantId: string, projectId: string, input: { category?: string; observation: string; recommendation?: string }): Promise<LessonRow> {
    const result = await pool.query<LessonRow>(
      `INSERT INTO pf_lessons_learned (tenant_id, project_id, category, observation, recommendation)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, category, observation, recommendation, created_at`,
      [tenantId, projectId, input.category || null, input.observation, input.recommendation || null]
    );
    return result.rows[0];
  }

  async deleteLesson(tenantId: string, lessonId: string): Promise<void> {
    const result = await pool.query(`DELETE FROM pf_lessons_learned WHERE id = $1 AND tenant_id = $2 RETURNING id`, [lessonId, tenantId]);
    if (result.rows.length === 0) throw new Error('Lesson not found');
  }
}
