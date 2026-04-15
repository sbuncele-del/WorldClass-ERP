/**
 * Siyabusa Financial Reporting Platform — Standalone Portal App
 * 
 * This is the top-level shell for reporting.siyabusaerp.co.za
 * It has its own sidebar, topbar, and navigation — completely independent from the main ERP.
 * Can also run embedded via /app/reporting/* inside the main ERP.
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import './styles/reporting-v2.css';

// Lazy load workspace pages
const ReportingDashboard = lazy(() => import('./pages/ReportingDashboard'));
const ClientSetup = lazy(() => import('./components/ClientSetup'));
const EngagementWorkspace = lazy(() => import('./components/EngagementWorkspace'));

const SIDEBAR_COLLAPSED_KEY = 'rpt-sidebar-collapsed';

export default function ReportingApp() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  const isActive = (path: string) => {
    if (path === '/reporting' || path === '/app/reporting') {
      return location.pathname === '/reporting' || location.pathname === '/app/reporting' || 
             location.pathname === '/reporting/' || location.pathname === '/app/reporting/';
    }
    return location.pathname.startsWith(path);
  };

  // Determine base path (standalone vs embedded)
  const basePath = location.pathname.startsWith('/app/') ? '/app/reporting' : '/reporting';

  return (
    <div className={`rpt-app ${collapsed ? 'rpt-sidebar-collapsed' : ''}`}>
      {/* ── Sidebar ── */}
      <aside className="rpt-sidebar">
        <div className="rpt-sidebar-header">
          <div className="rpt-logo">
            <div className="rpt-logo-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#rptGrad)" />
                <path d="M8 10h16M8 16h12M8 22h8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="rptGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#4F46E5" />
                    <stop offset="1" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            {!collapsed && (
              <div className="rpt-logo-text">
                <span className="rpt-logo-name">Siyabusa</span>
                <span className="rpt-logo-sub">Financial Reporting</span>
              </div>
            )}
          </div>
          <button className="rpt-sidebar-toggle" onClick={toggleSidebar} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="rpt-nav">
          <div className="rpt-nav-section">
            {!collapsed && <div className="rpt-nav-section-title">MAIN</div>}
            <Link
              to={basePath}
              className={`rpt-nav-item ${isActive(basePath) && !location.pathname.includes('/new') ? 'active' : ''}`}
            >
              <span className="rpt-nav-icon">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </span>
              {!collapsed && <span className="rpt-nav-label">Dashboard</span>}
            </Link>
            <Link
              to={`${basePath}/new`}
              className={`rpt-nav-item ${location.pathname.includes('/new') ? 'active' : ''}`}
            >
              <span className="rpt-nav-icon">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </span>
              {!collapsed && <span className="rpt-nav-label">New Client File</span>}
            </Link>
          </div>

          <div className="rpt-nav-section">
            {!collapsed && <div className="rpt-nav-section-title">TOOLS</div>}
            <a href="#" className="rpt-nav-item" onClick={e => { e.preventDefault(); }}>
              <span className="rpt-nav-icon">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
              {!collapsed && <span className="rpt-nav-label">XBRL Submission</span>}
            </a>
            <a href="#" className="rpt-nav-item" onClick={e => { e.preventDefault(); }}>
              <span className="rpt-nav-icon">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </span>
              {!collapsed && <span className="rpt-nav-label">Templates</span>}
            </a>
          </div>

          <div className="rpt-nav-section">
            {!collapsed && <div className="rpt-nav-section-title">SETTINGS</div>}
            <a href="#" className="rpt-nav-item" onClick={e => { e.preventDefault(); }}>
              <span className="rpt-nav-icon">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </span>
              {!collapsed && <span className="rpt-nav-label">Settings</span>}
            </a>
          </div>
        </nav>

        {!collapsed && (
          <div className="rpt-sidebar-footer">
            <div className="rpt-sidebar-footer-link">
              <a href="/app/dashboard" target="_blank" rel="noopener noreferrer">
                ← Back to Siyabusa ERP
              </a>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <div className="rpt-main">
        {/* Topbar */}
        <header className="rpt-topbar">
          <div className="rpt-topbar-left">
            <div className="rpt-breadcrumb">
              <span>Financial Reporting</span>
            </div>
          </div>
          <div className="rpt-topbar-right">
            <button className="rpt-topbar-btn" title="Help">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="rpt-topbar-btn" title="Notifications">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <div className="rpt-user-avatar" title="Profile">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="rpt-content">
          <Suspense fallback={
            <div className="rpt-page-loader">
              <div className="rpt-loader-spinner" />
            </div>
          }>
            <Routes>
              <Route index element={<ReportingDashboard />} />
              <Route path="new" element={<ClientSetup onCreated={(id) => navigate(`${basePath}/${id}`)} />} />
              <Route path=":engagementId/*" element={<EngagementWorkspace onBack={() => navigate(basePath)} />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
