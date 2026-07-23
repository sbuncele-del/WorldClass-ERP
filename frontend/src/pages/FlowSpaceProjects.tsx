/**
 * FlowSpace — project list / home
 *
 * The standalone FlowSpace shell's real front door: lists projects and
 * links each one straight into the PM engine (WBS/Schedule/EVA/Governance/
 * Closure/Profile) built across Phases 0-7, instead of the ERP's old
 * kanban/Gantt ProjectsHub. Deliberately minimal - list + create - the
 * engine hub itself is where the depth lives.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/project.service';
import '../components/FlowSpaceAppLayout.css';

interface ProjectRow {
  id: string;
  name: string;
  code?: string;
  status?: string;
  client_name?: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  planning: { bg: '#EEF6F3', fg: '#1B5E52' },
  active: { bg: '#EEF6F3', fg: '#1B5E52' },
  in_progress: { bg: '#EEF6F3', fg: '#1B5E52' },
  on_hold: { bg: '#FBF3E4', fg: '#8A6416' },
  completed: { bg: '#EEF3EE', fg: '#3A6B4F' },
  cancelled: { bg: '#FBECEB', fg: '#7A4A45' },
};

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const FlowSpaceProjects = () => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setError(null);
    projectService.getProjects()
      .then((res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setProjects(rows);
      })
      .catch((err: any) => setError(err.response?.data?.message || err.message || 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createProject = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await projectService.createProject({ name: name.trim(), status: 'planning', priority: 'medium' });
      setName('');
      setComposing(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="fs-page-eyebrow">Workspace</p>
          <h1 className="fs-page-title">Your projects</h1>
          <p className="fs-page-subtitle" style={{ marginBottom: 0 }}>Open a project to plan its scope, schedule, budget, risk, and closure.</p>
        </div>
        {!composing && (
          <button className="fs-btn fs-btn-primary" onClick={() => setComposing(true)}>+ New project</button>
        )}
      </div>

      {error && (
        <div style={{ background: '#FBECEB', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', padding: '12px 16px', color: '#7A4A45', margin: '24px 0', fontSize: 14 }}>
          {error}
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, margin: '28px 0' }}>
          <StatTile label="Total projects" value={projects.length} />
          <StatTile label="In planning" value={projects.filter((p) => (p.status || 'planning').toLowerCase() === 'planning').length} />
          <StatTile label="Active" value={projects.filter((p) => ['active', 'in_progress'].includes((p.status || '').toLowerCase())).length} />
          <StatTile label="Completed" value={projects.filter((p) => (p.status || '').toLowerCase() === 'completed').length} />
        </div>
      )}

      {composing && (
        <div className="fs-card" style={{ padding: 20, margin: '28px 0', display: 'flex', gap: 10 }}>
          <input
            autoFocus
            className="fs-input"
            style={{ flex: 1 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createProject();
              if (e.key === 'Escape') { setComposing(false); setName(''); }
            }}
            placeholder="Project name"
          />
          <button className="fs-btn fs-btn-primary" onClick={createProject} disabled={creating || !name.trim()}>
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button className="fs-btn fs-btn-secondary" onClick={() => { setComposing(false); setName(''); }}>Cancel</button>
        </div>
      )}

      <div style={{ marginTop: composing ? 8 : 32 }}>
        {loading && <p style={{ color: 'var(--fs-slate)' }}>Loading…</p>}

        {!loading && projects.length === 0 && (
          <div className="fs-card" style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--fs-slate)' }}>
            <p style={{ fontFamily: 'var(--fs-font-serif)', fontSize: 19, color: 'var(--fs-ink)', margin: '0 0 8px' }}>No projects yet</p>
            <p style={{ margin: 0, fontSize: 14 }}>Create your first project to start building its scope, schedule, and budget.</p>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {projects.map((p) => {
              const statusKey = (p.status || 'planning').toLowerCase();
              const style = STATUS_STYLE[statusKey] || STATUS_STYLE.planning;
              return (
                <Link
                  key={p.id}
                  to={`/app/projects/engine-preview/${p.id}`}
                  className="fs-card"
                  style={{ display: 'block', padding: 20, textDecoration: 'none', color: 'var(--fs-ink)', transition: 'border-color 0.12s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--fs-teal-400)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--fs-line)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: 'var(--fs-teal-wash)', color: 'var(--fs-teal)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0,
                    }}>
                      {initials(p.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      {p.code && <div style={{ fontFamily: 'var(--fs-font-mono)', fontSize: 11, color: 'var(--fs-slate)' }}>{p.code}</div>}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
                    padding: '4px 10px', borderRadius: 20, background: style.bg, color: style.fg,
                  }}>
                    {statusKey.replace('_', ' ')}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatTile = ({ label, value }: { label: string; value: number }) => (
  <div className="fs-card" style={{ padding: '16px 18px' }}>
    <div style={{ fontSize: 11, color: 'var(--fs-slate)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: 'var(--fs-font-serif)', fontSize: 28, fontWeight: 600, color: 'var(--fs-ink)' }}>{value}</div>
  </div>
);

export default FlowSpaceProjects;
