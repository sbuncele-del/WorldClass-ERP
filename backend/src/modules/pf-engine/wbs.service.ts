import { PoolClient } from 'pg';
import { pool } from '../../config/database';

export interface WbsRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  sort_order: number;
}

export interface ActivityRow {
  id: string;
  project_id: string;
  wbs_element_id: string;
  name: string;
  duration_days: string;
  status: string;
  sort_order: number;
}

export interface WbsNode extends WbsRow {
  children: WbsNode[];
  activities: ActivityRow[];
}

export class WbsService {
  /**
   * Recompute every code in the project's WBS from scratch, depth-first
   * ("1", "1.1", "1.2", "2", ...). Called after any structural change
   * (insert, move, delete) so codes never drift from the actual tree shape.
   *
   * Two-phase update (temp codes, then real codes) because `code` is under
   * a UNIQUE(project_id, code) constraint - renumbering in one pass risks a
   * transient collision (e.g. swapping "1.1" and "1.2").
   */
  private async recomputeCodes(client: PoolClient, tenantId: string, projectId: string): Promise<void> {
    const { rows } = await client.query<WbsRow>(
      `SELECT id, project_id, parent_id, code, name, sort_order
       FROM pf_wbs_element
       WHERE tenant_id = $1 AND project_id = $2
       ORDER BY parent_id NULLS FIRST, sort_order ASC`,
      [tenantId, projectId]
    );

    const byParent = new Map<string | null, WbsRow[]>();
    for (const row of rows) {
      const key = row.parent_id;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(row);
    }

    const assignments: Array<{ id: string; code: string }> = [];
    const walk = (parentId: string | null, prefix: string) => {
      const siblings = byParent.get(parentId) || [];
      siblings.forEach((row, index) => {
        const code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
        assignments.push({ id: row.id, code });
        walk(row.id, code);
      });
    };
    walk(null, '');

    if (assignments.length === 0) return;

    // Phase 1: temp codes, guaranteed unique and never colliding with real ones.
    for (const a of assignments) {
      await client.query(`UPDATE pf_wbs_element SET code = $1 WHERE id = $2`, [`_tmp_${a.id}`, a.id]);
    }
    // Phase 2: real codes.
    for (const a of assignments) {
      await client.query(`UPDATE pf_wbs_element SET code = $1, updated_at = now() WHERE id = $2`, [a.code, a.id]);
    }
  }

  async getTree(tenantId: string, projectId: string): Promise<WbsNode[]> {
    const [wbsResult, activityResult] = await Promise.all([
      pool.query<WbsRow>(
        `SELECT id, project_id, parent_id, code, name, sort_order
         FROM pf_wbs_element WHERE tenant_id = $1 AND project_id = $2
         ORDER BY parent_id NULLS FIRST, sort_order ASC`,
        [tenantId, projectId]
      ),
      pool.query<ActivityRow>(
        `SELECT id, project_id, wbs_element_id, name, duration_days, status, sort_order
         FROM pf_activity WHERE tenant_id = $1 AND project_id = $2
         ORDER BY wbs_element_id, sort_order ASC`,
        [tenantId, projectId]
      ),
    ]);

    const nodes = new Map<string, WbsNode>();
    for (const row of wbsResult.rows) {
      nodes.set(row.id, { ...row, children: [], activities: [] });
    }
    for (const activity of activityResult.rows) {
      nodes.get(activity.wbs_element_id)?.activities.push(activity);
    }

    const roots: WbsNode[] = [];
    for (const row of wbsResult.rows) {
      const node = nodes.get(row.id)!;
      if (row.parent_id && nodes.has(row.parent_id)) {
        nodes.get(row.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async createElement(
    tenantId: string,
    projectId: string,
    parentId: string | null,
    name: string
  ): Promise<WbsRow> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const siblingCount = await client.query(
        `SELECT COUNT(*) FROM pf_wbs_element WHERE tenant_id = $1 AND project_id = $2 AND parent_id IS NOT DISTINCT FROM $3`,
        [tenantId, projectId, parentId]
      );
      const sortOrder = parseInt(siblingCount.rows[0].count, 10);

      // Placeholder code - recomputeCodes assigns the real one below.
      const result = await client.query<WbsRow>(
        `INSERT INTO pf_wbs_element (tenant_id, project_id, parent_id, code, name, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [tenantId, projectId, parentId, `_new_${Date.now()}`, name, sortOrder]
      );

      await this.recomputeCodes(client, tenantId, projectId);

      const final = await client.query<WbsRow>(`SELECT * FROM pf_wbs_element WHERE id = $1`, [result.rows[0].id]);
      await client.query('COMMIT');
      return final.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async renameElement(tenantId: string, elementId: string, name: string): Promise<WbsRow> {
    const result = await pool.query<WbsRow>(
      `UPDATE pf_wbs_element SET name = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [name, elementId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('WBS element not found');
    return result.rows[0];
  }

  /**
   * Move a WBS element: reorder among siblings (up/down) or renest under a
   * different parent (indent = become a child of the previous sibling;
   * outdent = become a sibling of its current parent).
   */
  async moveElement(
    tenantId: string,
    projectId: string,
    elementId: string,
    direction: 'up' | 'down' | 'indent' | 'outdent'
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const currentResult = await client.query<WbsRow>(
        `SELECT * FROM pf_wbs_element WHERE id = $1 AND tenant_id = $2 AND project_id = $3 FOR UPDATE`,
        [elementId, tenantId, projectId]
      );
      if (currentResult.rows.length === 0) throw new Error('WBS element not found');
      const current = currentResult.rows[0];

      const siblingsResult = await client.query<WbsRow>(
        `SELECT * FROM pf_wbs_element WHERE tenant_id = $1 AND project_id = $2 AND parent_id IS NOT DISTINCT FROM $3 ORDER BY sort_order ASC`,
        [tenantId, projectId, current.parent_id]
      );
      const siblings = siblingsResult.rows;
      const index = siblings.findIndex((s) => s.id === elementId);

      if (direction === 'up' || direction === 'down') {
        const swapWith = direction === 'up' ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= siblings.length) {
          await client.query('ROLLBACK');
          return; // already at the boundary - no-op, not an error
        }
        const other = siblings[swapWith];
        await client.query(`UPDATE pf_wbs_element SET sort_order = $1 WHERE id = $2`, [other.sort_order, current.id]);
        await client.query(`UPDATE pf_wbs_element SET sort_order = $1 WHERE id = $2`, [current.sort_order, other.id]);
      } else if (direction === 'indent') {
        if (index === 0) {
          await client.query('ROLLBACK');
          return; // no preceding sibling to become a child of
        }
        const newParent = siblings[index - 1];
        const newSiblingCount = await client.query(
          `SELECT COUNT(*) FROM pf_wbs_element WHERE tenant_id = $1 AND project_id = $2 AND parent_id = $3`,
          [tenantId, projectId, newParent.id]
        );
        await client.query(
          `UPDATE pf_wbs_element SET parent_id = $1, sort_order = $2 WHERE id = $3`,
          [newParent.id, parseInt(newSiblingCount.rows[0].count, 10), current.id]
        );
      } else if (direction === 'outdent') {
        if (!current.parent_id) {
          await client.query('ROLLBACK');
          return; // already top-level
        }
        const parentResult = await client.query<WbsRow>(`SELECT * FROM pf_wbs_element WHERE id = $1`, [current.parent_id]);
        const parent = parentResult.rows[0];
        const newSiblingCount = await client.query(
          `SELECT COUNT(*) FROM pf_wbs_element WHERE tenant_id = $1 AND project_id = $2 AND parent_id IS NOT DISTINCT FROM $3`,
          [tenantId, projectId, parent.parent_id]
        );
        await client.query(
          `UPDATE pf_wbs_element SET parent_id = $1, sort_order = $2 WHERE id = $3`,
          [parent.parent_id, parseInt(newSiblingCount.rows[0].count, 10), current.id]
        );
      }

      await this.recomputeCodes(client, tenantId, projectId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteElement(tenantId: string, projectId: string, elementId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `DELETE FROM pf_wbs_element WHERE id = $1 AND tenant_id = $2 AND project_id = $3 RETURNING id`,
        [elementId, tenantId, projectId]
      );
      if (result.rows.length === 0) throw new Error('WBS element not found');
      await this.recomputeCodes(client, tenantId, projectId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ── Activities (leaves of the WBS) ──────────────────────────────────────

  async createActivity(tenantId: string, projectId: string, wbsElementId: string, name: string): Promise<ActivityRow> {
    const siblingCount = await pool.query(
      `SELECT COUNT(*) FROM pf_activity WHERE tenant_id = $1 AND wbs_element_id = $2`,
      [tenantId, wbsElementId]
    );
    const result = await pool.query<ActivityRow>(
      `INSERT INTO pf_activity (tenant_id, project_id, wbs_element_id, name, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, project_id, wbs_element_id, name, duration_days, status, sort_order`,
      [tenantId, projectId, wbsElementId, name, parseInt(siblingCount.rows[0].count, 10)]
    );
    return result.rows[0];
  }

  async updateActivity(
    tenantId: string,
    activityId: string,
    updates: { name?: string; durationDays?: number }
  ): Promise<ActivityRow> {
    const result = await pool.query<ActivityRow>(
      `UPDATE pf_activity SET
         name = COALESCE($1, name),
         duration_days = COALESCE($2, duration_days),
         updated_at = now()
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, project_id, wbs_element_id, name, duration_days, status, sort_order`,
      [updates.name ?? null, updates.durationDays ?? null, activityId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Activity not found');
    return result.rows[0];
  }

  async deleteActivity(tenantId: string, activityId: string): Promise<void> {
    const result = await pool.query(
      `DELETE FROM pf_activity WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [activityId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Activity not found');
  }

  // ── Scope statement ─────────────────────────────────────────────────────

  async getScopeStatement(tenantId: string, projectId: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT pf_scope_statement FROM public.projects WHERE id = $1 AND tenant_id = $2`,
      [projectId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Project not found');
    return result.rows[0].pf_scope_statement;
  }

  async updateScopeStatement(tenantId: string, projectId: string, statement: string): Promise<void> {
    const result = await pool.query(
      `UPDATE public.projects SET pf_scope_statement = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3 RETURNING id`,
      [statement, projectId, tenantId]
    );
    if (result.rows.length === 0) throw new Error('Project not found');
  }
}
