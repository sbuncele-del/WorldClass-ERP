import React, { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Menu, Spin, Alert } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  SendOutlined,
  HistoryOutlined,
  SettingOutlined,
  BankOutlined,
  SolutionOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

// Lazy-loaded sub-pages
const AccountantDashboard = lazy(() => import('./pages/AccountantDashboard'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientsPage').then(m => ({ default: m.ClientDetailView })));
const InvitationsPage = lazy(() => import('./pages/InvitationsPage'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
const FirmSetup = lazy(() => import('./pages/FirmSetup'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const TimeTrackingPage = lazy(() => import('./pages/TimeTrackingPage'));
const CompliancePage = lazy(() => import('./pages/CompliancePage'));

const PageLoader: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
    <Spin size="large" />
  </div>
);

interface FirmCheckState {
  loading: boolean;
  hasFirm: boolean;
  error: string | null;
}

const AccountantPortalHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [firmState, setFirmState] = useState<FirmCheckState>({
    loading: true,
    hasFirm: false,
    error: null,
  });

  const basePath = '/app/accountant-portal';

  useEffect(() => {
    checkFirmSetup();
  }, []);

  const checkFirmSetup = async () => {
    try {
      const response = await fetch('/api/v2/accountant-portal/firm', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFirmState({ loading: false, hasFirm: !!data?.data?.id, error: null });
      } else if (response.status === 404) {
        setFirmState({ loading: false, hasFirm: false, error: null });
      } else {
        setFirmState({ loading: false, hasFirm: false, error: 'Failed to check firm status' });
      }
    } catch (err) {
      console.error('Error checking firm setup:', err);
      setFirmState({ loading: false, hasFirm: false, error: 'Failed to connect to server' });
    }
  };

  const activeKey = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/clients')) return 'clients';
    if (path.includes('/invitations')) return 'invitations';
    if (path.includes('/activity')) return 'activity';
    if (path.includes('/settings')) return 'settings';
    if (path.includes('/jobs')) return 'jobs';
    if (path.includes('/time')) return 'time';
    if (path.includes('/compliance')) return 'compliance';
    return 'dashboard';
  }, [location.pathname]);

  const menuItems = [
    { key: 'dashboard',   icon: <DashboardOutlined />,          label: 'Dashboard' },
    { key: 'clients',     icon: <TeamOutlined />,                label: 'Clients' },
    { key: 'jobs',        icon: <SolutionOutlined />,            label: 'Work / Jobs' },
    { key: 'time',        icon: <ClockCircleOutlined />,         label: 'Time Tracking' },
    { key: 'compliance',  icon: <SafetyCertificateOutlined />,   label: 'Compliance' },
    { key: 'invitations', icon: <SendOutlined />,                label: 'Invitations' },
    { key: 'activity',    icon: <HistoryOutlined />,             label: 'Activity Log' },
    { key: 'settings',    icon: <SettingOutlined />,             label: 'Firm Settings' },
  ];

  if (firmState.loading) {
    return <PageLoader />;
  }

  if (firmState.error) {
    return (
      <Alert
        type="warning"
        message="Connection Issue"
        description={firmState.error}
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  if (!firmState.hasFirm) {
    return (
      <Suspense fallback={<PageLoader />}>
        <FirmSetup onComplete={() => setFirmState({ loading: false, hasFirm: true, error: null })} />
      </Suspense>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <BankOutlined style={{ fontSize: 22, marginRight: 10, color: '#1890ff' }} />
        <h2 style={{ margin: 0, fontWeight: 600 }}>Accountant Portal</h2>
      </div>
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
          <Route path="/"            element={<AccountantDashboard />} />
          <Route path="/clients"     element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/jobs"        element={<JobsPage />} />
          <Route path="/time"        element={<TimeTrackingPage />} />
          <Route path="/compliance"  element={<CompliancePage />} />
          <Route path="/invitations" element={<InvitationsPage />} />
          <Route path="/activity"    element={<ActivityLogPage />} />
          <Route path="/settings"    element={<FirmSetup onComplete={() => {}} editMode />} />
          <Route path="*"            element={<Navigate to={basePath} replace />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default AccountantPortalHub;
