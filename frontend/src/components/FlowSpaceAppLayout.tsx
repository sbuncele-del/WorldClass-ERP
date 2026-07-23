/**
 * FlowSpace's own authenticated app shell — two-level left nav.
 *
 * A thin dark icon rail (Dashboard / Projects / Team) plus a secondary
 * panel that lists every project with an always-present "+ New project"
 * quick-add. This is the Linear/ClickUp/ProjectManager pattern: the
 * primary object (projects) is always visible and switchable in the
 * left nav, adding one is always one click, and top-level surfaces
 * (portfolio dashboard, team pool) give the app real breadth instead of
 * a single dead link. Content routes render in the main column.
 *
 * Deliberately does NOT reuse the ERP's PremiumSidebar/PremiumTopBar —
 * FlowSpace shares the backend/DB/auth but shows zero evidence of it.
 */

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ProductShell } from '../config/productShells';
import { useUser } from '../contexts/UserContext';
import { projectService } from '../services/project.service';
import EmailVerificationBanner from './EmailVerificationBanner';
import FlowSpaceLogo from './FlowSpaceLogo';
import { DashboardIcon, ProjectsIcon, TeamIcon, SearchIcon, PlusIcon } from './FlowSpaceIcons';
import './FlowSpaceAppLayout.css';

const FlowSpaceDashboard = lazy(() => import('../pages/FlowSpaceDashboard'));
const FlowSpaceProjects = lazy(() => import('../pages/FlowSpaceProjects'));
const FlowSpaceResources = lazy(() => import('../pages/FlowSpaceResources'));
const PfProjectWorkspace = lazy(() => import('../pages/PfProjectWorkspace'));
const PfOverviewTab = lazy(() => import('../pages/PfOverviewTab'));
const PfWbsBuilder = lazy(() => import('../pages/PfWbsBuilder'));
const PfScheduleView = lazy(() => import('../pages/PfScheduleView'));
const PfResourcesView = lazy(() => import('../pages/PfResourcesView'));
const PfEvaView = lazy(() => import('../pages/PfEvaView'));
const PfGovernanceView = lazy(() => import('../pages/PfGovernanceView'));
const PfClosureView = lazy(() => import('../pages/PfClosureView'));
const PfProfileView = lazy(() => import('../pages/PfProfileView'));

interface ProjectRow { id: string; name: string; code?: string; status?: string; }

const initials = (label: string) => label.trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const RAIL_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', Icon: DashboardIcon, match: (p: string) => p.startsWith('/app/dashboard') },
  { to: '/app/projects/list', label: 'Projects', Icon: ProjectsIcon, match: (p: string) => p.startsWith('/app/projects') },
  { to: '/app/team', label: 'Team', Icon: TeamIcon, match: (p: string) => p.startsWith('/app/team') },
];

const STATUS_DOT: Record<string, string> = {
  planning: '#8A6416', active: '#1B5E52', in_progress: '#1B5E52',
  on_hold: '#B58A2E', completed: '#3A6B4F', cancelled: '#B04A43',
};

const FlowSpaceAppLayout: React.FC<{ shell: ProductShell }> = ({ shell }) => {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const activeProjectId = useParams<{ projectId?: string }>().projectId
    || (location.pathname.match(/engine-preview\/([^/]+)/)?.[1] ?? null);

  useEffect(() => { document.title = shell.brandName; }, [shell]);

  const loadProjects = useCallback(() => {
    projectService.getProjects()
      .then((res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setProjects(rows);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  // Any page that creates/edits/deletes a project dispatches this so the rail stays in sync.
  useEffect(() => {
    const h = () => loadProjects();
    window.addEventListener('fs-projects-changed', h);
    return () => window.removeEventListener('fs-projects-changed', h);
  }, [loadProjects]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await projectService.createProject({ name: newName.trim(), status: 'planning', priority: 'medium' });
      setNewName('');
      setAdding(false);
      loadProjects();
      const id = created?.id || created?.data?.id;
      if (id) navigate(`/app/projects/engine-preview/${id}`);
    } catch {
      /* surfaced on the full projects page; keep the rail quiet */
    } finally {
      setCreating(false);
    }
  };

  const userLabel = currentUser?.email || '';
  const shown = filter.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : projects;

  return (
    <div className="fs-app">
      {/* ── Icon rail ── */}
      <nav className="fs-rail">
        <Link to="/app/dashboard" className="fs-rail-logo" title={shell.brandName}>
          <FlowSpaceLogo variant="reversed" showWordmark={false} size={26} />
        </Link>
        <div className="fs-rail-items">
          {RAIL_ITEMS.map(({ to, label, Icon, match }) => (
            <NavLink key={to} to={to} className={`fs-rail-item${match(location.pathname) ? ' active' : ''}`} title={label}>
              <Icon size={20} />
              <span className="fs-rail-item-label">{label}</span>
            </NavLink>
          ))}
        </div>
        <div className="fs-rail-spacer" />
        <div className="fs-rail-user" ref={menuRef}>
          <button className="fs-avatar" onClick={() => setMenuOpen((v) => !v)} title={userLabel}>{initials(userLabel)}</button>
          {menuOpen && (
            <div className="fs-avatar-menu">
              <div className="fs-avatar-menu-email">{userLabel}</div>
              <button className="fs-avatar-menu-item" onClick={signOut}>Sign out</button>
            </div>
          )}
        </div>
      </nav>

      {/* ── Project-list panel ── */}
      <aside className="fs-panel">
        <div className="fs-panel-head">
          <span className="fs-panel-title">Projects</span>
          <button className="fs-panel-add" onClick={() => setAdding((v) => !v)} title="New project"><PlusIcon size={16} /></button>
        </div>

        {adding && (
          <div className="fs-panel-addrow">
            <input
              autoFocus
              className="fs-input"
              style={{ width: '100%', fontSize: 13, padding: '7px 10px' }}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createProject();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
              placeholder="Project name…"
              disabled={creating}
            />
          </div>
        )}

        <div className="fs-panel-search">
          <SearchIcon size={14} />
          <input className="fs-panel-search-input" placeholder="Find a project" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>

        <div className="fs-panel-list">
          {shown.length === 0 && <div className="fs-panel-empty">{projects.length === 0 ? 'No projects yet' : 'No matches'}</div>}
          {shown.map((p) => (
            <Link
              key={p.id}
              to={`/app/projects/engine-preview/${p.id}`}
              className={`fs-panel-project${activeProjectId === p.id ? ' active' : ''}`}
            >
              <span className="fs-panel-project-dot" style={{ background: STATUS_DOT[(p.status || 'planning').toLowerCase()] || '#8A6416' }} />
              <span className="fs-panel-project-name">{p.name}</span>
            </Link>
          ))}
        </div>

        <Link to="/app/projects/list" className="fs-panel-footer-link">View all projects</Link>
      </aside>

      {/* ── Main column ── */}
      <div className="fs-main">
        <header className="fs-topbar">
          <div className="fs-topbar-search">
            <SearchIcon size={15} />
            <input className="fs-topbar-search-input" placeholder="Search…" disabled />
          </div>
        </header>

        <EmailVerificationBanner />
        <div className="fs-main-inner">
          <Suspense fallback={<div style={{ padding: 48, color: 'var(--fs-slate)' }}>Loading…</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/dashboard" element={<FlowSpaceDashboard />} />
              <Route path="/workspace" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/team" element={<FlowSpaceResources />} />

              <Route path="/projects/list" element={<FlowSpaceProjects />} />
              <Route path="/projects/engine-preview/:projectId" element={<PfProjectWorkspace />}>
                <Route index element={<PfOverviewTab />} />
                <Route path="wbs" element={<PfWbsBuilder />} />
                <Route path="schedule" element={<PfScheduleView />} />
                <Route path="resources" element={<PfResourcesView />} />
                <Route path="eva" element={<PfEvaView />} />
                <Route path="governance" element={<PfGovernanceView />} />
                <Route path="closure" element={<PfClosureView />} />
                <Route path="profile" element={<PfProfileView />} />
              </Route>

              <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default FlowSpaceAppLayout;
