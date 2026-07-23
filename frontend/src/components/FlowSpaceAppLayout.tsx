/**
 * FlowSpace's own authenticated app shell.
 *
 * Standalone product shells must look and feel completely isolated from
 * the ERP - same backend, same database, same auth, but the user should
 * see zero evidence of it. This layout deliberately does NOT reuse
 * PremiumSidebar/PremiumTopBar (the ERP's chrome, colours, and full module
 * nav) - it's FlowSpace's own sidebar, its own brand tokens (from the
 * FlowSpace Brand Guidelines), and its own small route set. Mounted from
 * SidebarLayout in App.tsx when the current shell isn't 'erp'.
 */

import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom';
import { ProductShell } from '../config/productShells';
import { useUser } from '../contexts/UserContext';
import EmailVerificationBanner from './EmailVerificationBanner';
import FlowSpaceLogo from './FlowSpaceLogo';
import './FlowSpaceAppLayout.css';

const FlowSpaceProjects = lazy(() => import('../pages/FlowSpaceProjects'));
const PfProjectWorkspace = lazy(() => import('../pages/PfProjectWorkspace'));
const PfOverviewTab = lazy(() => import('../pages/PfOverviewTab'));
const PfWbsBuilder = lazy(() => import('../pages/PfWbsBuilder'));
const PfScheduleView = lazy(() => import('../pages/PfScheduleView'));
const PfResourcesView = lazy(() => import('../pages/PfResourcesView'));
const PfEvaView = lazy(() => import('../pages/PfEvaView'));
const PfGovernanceView = lazy(() => import('../pages/PfGovernanceView'));
const PfClosureView = lazy(() => import('../pages/PfClosureView'));
const PfProfileView = lazy(() => import('../pages/PfProfileView'));

const NAV_ITEMS = [
  { to: '/app/projects/list', label: 'Projects', icon: '▤' },
];

const FlowSpaceAppLayout: React.FC<{ shell: ProductShell }> = ({ shell }) => {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = shell.brandName;
  }, [shell]);

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <div className="fs-app">
      <aside className="fs-sidebar">
        <div className="fs-sidebar-logo">
          <Link to="/app/projects/list">
            <FlowSpaceLogo variant="reversed" size={26} />
          </Link>
        </div>
        <div className="fs-nav-label">Workspace</div>
        <nav className="fs-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`fs-nav-item${location.pathname.startsWith(item.to) ? ' active' : ''}`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="fs-sidebar-spacer" />
        <div className="fs-sidebar-footer">
          {currentUser && <div className="fs-sidebar-user">{currentUser.email}</div>}
          <button className="fs-sidebar-signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <div className="fs-main">
        <EmailVerificationBanner />
        <div className="fs-main-inner">
          <Suspense fallback={<div style={{ padding: 48, color: 'var(--fs-slate)' }}>Loading…</div>}>
            <Routes>
              <Route path="/" element={<Navigate to={shell.homeRoute} replace />} />
              <Route path="/dashboard" element={<Navigate to={shell.homeRoute} replace />} />
              <Route path="/workspace" element={<Navigate to={shell.homeRoute} replace />} />

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

              <Route path="*" element={<Navigate to={shell.homeRoute} replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default FlowSpaceAppLayout;
