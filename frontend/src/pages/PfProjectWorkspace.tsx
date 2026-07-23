/**
 * The Project Workspace — persistent chrome for a single project.
 *
 * Replaces the old pattern of 8 disconnected full pages you "opened" and
 * "went back" from. This is the industry-standard shape (Asana/Linear/
 * ClickUp/monday.com): one project, one header, a tab bar that swaps
 * content in place. Renders the project's name/code/status/lifecycle
 * phase once, then an <Outlet/> for whichever tab is active - individual
 * tab components no longer render their own header or back-link.
 */

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { projectService } from '../services/project.service';
import { apiFetch } from '../utils/api';

interface ProjectSummary {
  name: string;
  code?: string;
  status?: string;
}

const TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'wbs', label: 'WBS' },
  { to: 'schedule', label: 'Schedule' },
  { to: 'resources', label: 'Resources' },
  { to: 'eva', label: 'Earned Value' },
  { to: 'governance', label: 'Governance' },
  { to: 'closure', label: 'Closure' },
  { to: 'profile', label: 'Profile' },
];

const PHASE_LABEL: Record<string, string> = {
  define: 'Define', develop: 'Develop', plan: 'Plan', execute: 'Execute',
  monitor_control: 'Monitor & Control', close: 'Close',
};

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  planning: { bg: '#EEF6F3', fg: '#1B5E52' },
  active: { bg: '#EEF6F3', fg: '#1B5E52' },
  in_progress: { bg: '#EEF6F3', fg: '#1B5E52' },
  on_hold: { bg: '#FBF3E4', fg: '#8A6416' },
  completed: { bg: '#EEF3EE', fg: '#3A6B4F' },
  cancelled: { bg: '#FBECEB', fg: '#7A4A45' },
};

const PfProjectWorkspace = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    // Robust name/status resolution: try the single-project endpoint, and
    // if it doesn't yield a name, fall back to the projects list (which the
    // nav panel already loads reliably) so the header never sticks on "Loading…".
    projectService.getProjectById(projectId)
      .then((res: any) => {
        const p = res?.data || res;
        if (p?.name) { setProject(p); return; }
        throw new Error('no-name');
      })
      .catch(() => {
        projectService.getProjects()
          .then((res: any) => {
            const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            const found = rows.find((r: any) => r.id === projectId);
            if (found) setProject(found);
          })
          .catch(() => {});
      });
    apiFetch(`/api/projects/engine/${projectId}/lifecycle`)
      .then((res) => setPhase(res.data.phase))
      .catch((err) => setError(err.message));
  }, [projectId]);

  if (!projectId) return <div style={{ padding: 48 }}>Missing project id.</div>;

  const statusKey = (project?.status || 'planning').toLowerCase();
  const statusStyle = STATUS_STYLE[statusKey] || STATUS_STYLE.planning;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <NavLink to="/app/projects/list" style={{ fontSize: 13, color: 'var(--fs-slate)', textDecoration: 'none' }}>
          ← All projects
        </NavLink>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h1 className="fs-page-title" style={{ margin: 0 }}>{project?.name || 'Loading…'}</h1>
        {project?.code && <span style={{ fontFamily: 'var(--fs-font-mono)', fontSize: 12, color: 'var(--fs-slate)' }}>{project.code}</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0 28px' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
          padding: '4px 10px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.fg,
        }}>
          {statusKey.replace('_', ' ')}
        </span>
        {phase && (
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: 20, background: 'var(--fs-cream)', color: 'var(--fs-ink)', border: '1px solid var(--fs-line)',
          }}>
            {PHASE_LABEL[phase] || phase}
          </span>
        )}
      </div>

      {error && (
        <div style={{ background: '#FBECEB', border: '1px solid var(--fs-line)', borderRadius: 'var(--fs-radius-sm)', padding: '12px 16px', color: '#7A4A45', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--fs-line)', marginBottom: 28, overflowX: 'auto' }}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            style={({ isActive }) => ({
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? 'var(--fs-teal)' : 'var(--fs-slate)',
              textDecoration: 'none',
              borderBottom: isActive ? '2px solid var(--fs-teal)' : '2px solid transparent',
              whiteSpace: 'nowrap',
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet context={{ projectId, phase }} />
    </div>
  );
};

export default PfProjectWorkspace;
