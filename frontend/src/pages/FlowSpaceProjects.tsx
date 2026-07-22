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
import './FlowSpaceLanding.css';

interface ProjectRow {
  id: string;
  name: string;
  code?: string;
  status?: string;
  client_name?: string | null;
}

const FlowSpaceProjects = () => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="pf-landing" style={{ minHeight: '100vh' }}>
      <header className="pf-header">
        <div className="pf-header-inner">
          <span className="pf-wordmark">FlowSpace</span>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ marginBottom: 8 }}>Your projects</h1>
        <p style={{ color: '#4b5457', marginBottom: 24 }}>Open a project to plan its scope, schedule, budget, risk, and closure.</p>

        {error && <div style={{ background: '#f3ebda', border: '1px solid #d8dedf', borderRadius: 8, padding: 16, color: '#a5721a', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createProject()}
            placeholder="New project name"
            style={{ flex: 1, padding: '10px 12px', border: '1px solid #d8dedf', borderRadius: 6 }}
          />
          <button
            onClick={createProject}
            disabled={creating || !name.trim()}
            style={{ padding: '10px 20px', background: '#0c5f53', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: creating || !name.trim() ? 0.6 : 1 }}
          >
            {creating ? 'Creating…' : 'New project'}
          </button>
        </div>

        {loading && <p>Loading…</p>}
        {!loading && projects.length === 0 && <p style={{ color: '#737c7e' }}>No projects yet — create your first one above.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/app/projects/engine-preview/${p.id}`}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', border: '1px solid #d8dedf', borderRadius: 8,
                color: '#15191c', textDecoration: 'none',
              }}
            >
              <span>
                <strong>{p.name}</strong>
                {p.code && <span style={{ color: '#737c7e', fontSize: 12, marginLeft: 8 }}>{p.code}</span>}
              </span>
              <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#0c5f53' }}>{p.status || 'planning'}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default FlowSpaceProjects;
