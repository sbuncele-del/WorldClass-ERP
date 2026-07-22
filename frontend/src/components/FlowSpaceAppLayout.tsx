/**
 * FlowSpace's own authenticated app shell.
 *
 * Standalone product shells must look and feel completely isolated from
 * the ERP - same backend, same database, same auth, but the user should
 * see zero evidence of it. This layout deliberately does NOT reuse
 * PremiumSidebar/PremiumTopBar (the ERP's chrome, colours, and full module
 * nav) - it's FlowSpace's own header + its own small route set, nothing
 * else. Mounted from SidebarLayout in App.tsx when the current shell isn't
 * 'erp'.
 */

import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { ProductShell } from '../config/productShells';
import { useUser } from '../contexts/UserContext';
import EmailVerificationBanner from './EmailVerificationBanner';
import './FlowSpaceAppLayout.css';

const FlowSpaceProjects = lazy(() => import('../pages/FlowSpaceProjects'));
const PfEnginePreview = lazy(() => import('../pages/PfEnginePreview'));
const PfWbsBuilder = lazy(() => import('../pages/PfWbsBuilder'));
const PfScheduleView = lazy(() => import('../pages/PfScheduleView'));
const PfResourcesView = lazy(() => import('../pages/PfResourcesView'));
const PfEvaView = lazy(() => import('../pages/PfEvaView'));
const PfGovernanceView = lazy(() => import('../pages/PfGovernanceView'));
const PfClosureView = lazy(() => import('../pages/PfClosureView'));
const PfProfileView = lazy(() => import('../pages/PfProfileView'));

const FlowSpaceAppLayout: React.FC<{ shell: ProductShell }> = ({ shell }) => {
  const { currentUser } = useUser();
  const navigate = useNavigate();

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
      <EmailVerificationBanner />
      <header className="fs-app-header">
        <div className="fs-app-header-inner">
          <Link to="/app/projects/list" className="pf-wordmark fs-app-wordmark">{shell.brandName}</Link>
          <nav className="fs-app-nav">
            <Link to="/app/projects/list" className="fs-app-nav-link">Projects</Link>
            {currentUser && <span className="fs-app-user">{currentUser.email}</span>}
            <button className="fs-app-signout" onClick={signOut}>Sign out</button>
          </nav>
        </div>
      </header>
      <main className="fs-app-main">
        <Suspense fallback={<div style={{ padding: 48 }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to={shell.homeRoute} replace />} />
            <Route path="/dashboard" element={<Navigate to={shell.homeRoute} replace />} />
            <Route path="/workspace" element={<Navigate to={shell.homeRoute} replace />} />

            <Route path="/projects/list" element={<FlowSpaceProjects />} />
            <Route path="/projects/engine-preview/:projectId" element={<PfEnginePreview />} />
            <Route path="/projects/engine-preview/:projectId/wbs" element={<PfWbsBuilder />} />
            <Route path="/projects/engine-preview/:projectId/schedule" element={<PfScheduleView />} />
            <Route path="/projects/engine-preview/:projectId/resources" element={<PfResourcesView />} />
            <Route path="/projects/engine-preview/:projectId/eva" element={<PfEvaView />} />
            <Route path="/projects/engine-preview/:projectId/governance" element={<PfGovernanceView />} />
            <Route path="/projects/engine-preview/:projectId/closure" element={<PfClosureView />} />
            <Route path="/projects/engine-preview/:projectId/profile" element={<PfProfileView />} />

            <Route path="*" element={<Navigate to={shell.homeRoute} replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

export default FlowSpaceAppLayout;
