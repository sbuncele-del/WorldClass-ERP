import React, { lazy, Suspense, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Menu, Spin } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';

// Lazy-loaded sub-pages
const PracticeDashboardPage = lazy(() => import('./pages/PracticeDashboardPage'));
const ClientManagement = lazy(() => import('./pages/ClientManagement'));
const EngagementsPage = lazy(() => import('./pages/EngagementsPage'));
const TimeTrackingPage = lazy(() => import('./pages/TimeTrackingPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const PracticeReportsPage = lazy(() => import('./pages/PracticeReportsPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
    <Spin size="large" />
  </div>
);

const PracticeModule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine base path (handles both /practice and /practice-hub)
  const basePath = location.pathname.startsWith('/app/practice-hub') ? '/app/practice-hub' : '/app/practice';

  const activeKey = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/clients')) return 'clients';
    if (path.includes('/engagements')) return 'engagements';
    if (path.includes('/time-tracking')) return 'time-tracking';
    if (path.includes('/billing')) return 'billing';
    if (path.includes('/reports')) return 'reports';
    return 'dashboard';
  }, [location.pathname]);

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'clients', icon: <TeamOutlined />, label: 'Clients' },
    { key: 'engagements', icon: <ProjectOutlined />, label: 'Engagements' },
    { key: 'time-tracking', icon: <ClockCircleOutlined />, label: 'Time Tracking' },
    { key: 'billing', icon: <DollarOutlined />, label: 'Billing' },
    { key: 'reports', icon: <BarChartOutlined />, label: 'Reports' },
  ];

  return (
    <div>
      <Menu
        mode="horizontal"
        selectedKeys={[activeKey]}
        onClick={({ key }) => navigate(key === 'dashboard' ? basePath : `${basePath}/${key}`)}
        items={menuItems}
        style={{
          marginBottom: 24,
          borderBottom: '2px solid #f0f0f0',
          background: 'transparent',
          fontWeight: 500,
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<PracticeDashboardPage />} />
          <Route path="/clients" element={<ClientManagement />} />
          <Route path="/engagements" element={<EngagementsPage />} />
          <Route path="/time-tracking" element={<TimeTrackingPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/reports" element={<PracticeReportsPage />} />
          <Route path="*" element={<Navigate to={basePath} replace />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default PracticeModule;
