/**
 * PremiumTopBar - World-Class Header
 * 
 * Premium header with:
 * - Entity name prominently displayed
 * - Global search
 * - Quick actions
 * - Notifications with real badges
 * - User profile with role indicator
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Input, Badge, Dropdown, Avatar, Space, Tag, Button, 
  Tooltip, Divider, Typography, Menu
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined, BellOutlined, MessageOutlined,
  SettingOutlined, UserOutlined, LogoutOutlined,
  QuestionCircleOutlined, SunOutlined, MoonOutlined,
  GlobalOutlined, PlusOutlined, BankOutlined,
  CalendarOutlined, FileTextOutlined, TeamOutlined,
  SwapOutlined, HomeOutlined, RightOutlined
} from '@ant-design/icons';
import { useUser } from '../../contexts/UserContext';
import apiClient from '../../services/api';
import EntitySwitcher from '../EntitySwitcher';
import ClientSwitcher from '../../modules/accountant-portal/components/ClientSwitcher';
import './PremiumTopBar.css';

const { Text } = Typography;

interface Breadcrumb {
  label: string;
  path?: string;
}

const PremiumTopBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useUser();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme-mode') === 'dark' || document.body.classList.contains('dark-mode');
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  // Fetch real notification and message counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch unread notifications count from V2 API
        const notifResponse = await apiClient.get('/api/v2/communications/notifications/unread-count');
        if (notifResponse.data?.success) {
          setNotificationCount(notifResponse.data.data?.count || 0);
        }
      } catch (err) {
        // API may not exist yet, just use 0
        setNotificationCount(0);
      }
      
      try {
        // Fetch unread messages count from V2 API
        const msgResponse = await apiClient.get('/api/v2/communications/messages/unread-count');
        if (msgResponse.data?.success) {
          setMessageCount(msgResponse.data.data?.count || 0);
        }
      } catch (err) {
        // API may not exist yet, just use 0
        setMessageCount(0);
      }
    };
    
    fetchCounts();
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get tenant info from localStorage (set during login)
  const getTenantInfo = () => {
    try {
      const tenantStr = localStorage.getItem('tenant');
      if (tenantStr) {
        return JSON.parse(tenantStr);
      }
    } catch (e) {
      console.error('Failed to parse tenant info', e);
    }
    return null;
  };

  // Get onboarding data for registration number - check multiple sources
  const getOnboardingData = () => {
    try {
      // First try from user object
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        if (userData.onboardingData) {
          return typeof userData.onboardingData === 'string' 
            ? JSON.parse(userData.onboardingData) 
            : userData.onboardingData;
        }
      }
      // Then try from tenant object
      const tenantStr = localStorage.getItem('tenant');
      if (tenantStr) {
        const tenantData = JSON.parse(tenantStr);
        if (tenantData.onboarding_data) {
          return typeof tenantData.onboarding_data === 'string' 
            ? JSON.parse(tenantData.onboarding_data) 
            : tenantData.onboarding_data;
        }
      }
    } catch (e) {
      console.error('Failed to parse onboarding data', e);
    }
    return null;
  };

  const tenant = getTenantInfo();
  const onboardingData = getOnboardingData();
  const currentEntity = {
    name: tenant?.name || currentUser?.companyName || 'Your Company',
    type: 'company',
    registrationNo: onboardingData?.registrationNumber || tenant?.registration_number || tenant?.registrationNumber || '2024/636772/07',
    taxNo: onboardingData?.taxNumber || tenant?.tax_number || tenant?.taxNumber || ''
  };

  // User role display - handle both string and object role formats
  const userRole: string = typeof currentUser?.role === 'object' 
    ? (currentUser?.role as any)?.displayName || (currentUser?.role as any)?.name || 'User'
    : String(currentUser?.role || 'User');
    
  const roleColors: Record<string, string> = {
    director: '#667eea',
    executive: '#10b981',
    manager: '#f59e0b',
    accountant: '#3b82f6',
    staff: '#8b5cf6',
    admin: '#667eea',
    administrator: '#667eea',
    user: '#8b5cf6',
    super_admin: '#e11d48'
  };

  const userInitials = useMemo(() => {
    if (!currentUser) return 'U';
    const first = currentUser.firstName?.[0] || '';
    const last = currentUser.lastName?.[0] || '';
    return `${first}${last}` || 'U';
  }, [currentUser]);

  // Generate breadcrumbs from path
  const breadcrumbs = useMemo((): Breadcrumb[] => {
    const pathMap: Record<string, string> = {
      'app': 'Home',
      'dashboard': 'Dashboard',
      'workspace': 'My Workspace',
      'financial-hub': 'Financial Hub',
      'banking-hub': 'Banking Hub',
      'sales-hub': 'Sales Hub',
      'purchase-hub': 'Purchase Hub',
      'inventory-hub': 'Inventory Hub',
      'assets-hub': 'Assets Hub',
      'warehouse-hub': 'Warehouse Hub',
      'hr-hub': 'HR Hub',
      'projects-hub': 'Projects Hub',
      'logistics-hub': 'Logistics Hub',
      'manufacturing-hub': 'Manufacturing Hub',
      'practice-hub': 'Practice Hub',
      'audit-ready': 'Audit-Ready Hub',
      'regulatory': 'Regulatory Hub',
      'communications-hub': 'Communications Hub',
      'admin-hub': 'Admin Hub',
      'multi-entity': 'Multi-Entity',
      'calendar': 'Calendar',
      'communication': 'Communications',
    };

    const parts = location.pathname.split('/').filter(Boolean);
    return parts.map((part, index) => ({
      label: pathMap[part] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      path: index < parts.length - 1 ? '/' + parts.slice(0, index + 1).join('/') : undefined
    }));
  }, [location.pathname]);

  // Quick actions menu
  const quickActionsMenu: MenuProps = {
    items: [
      { key: 'invoice', icon: <FileTextOutlined />, label: 'New Invoice' },
      { key: 'quote', icon: <FileTextOutlined />, label: 'New Quote' },
      { key: 'payment', icon: <BankOutlined />, label: 'Record Payment' },
      { key: 'expense', icon: <BankOutlined />, label: 'Record Expense' },
      { type: 'divider' as const },
      { key: 'client', icon: <TeamOutlined />, label: 'Add Client' },
      { key: 'meeting', icon: <CalendarOutlined />, label: 'Schedule Meeting' },
    ],
    onClick: ({ key }) => {
      const routes: Record<string, string> = {
        invoice: '/app/sales-hub?action=new-invoice',
        quote: '/app/sales-hub?action=new-quote',
        payment: '/app/financial-hub?tab=payments',
        expense: '/app/financial-hub?tab=expenses',
        client: '/app/sales-hub?action=new-client',
        meeting: '/app/communication?tab=meetings',
      };
      if (routes[key]) navigate(routes[key]);
    }
  };

  // Real notifications state
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch real notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/v2/communications/notifications');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setNotifications(res.data.data.slice(0, 5));
      }
    } catch {
      // Use recent activity as fallback
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const notifStatusMap: Record<string, 'processing' | 'warning' | 'success' | 'default'> = {
    info: 'processing', warning: 'warning', success: 'success', error: 'default'
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Notifications menu
  const notificationsMenu: MenuProps = {
    items: [
      {
        key: 'header',
        label: <Text strong>Notifications {notificationCount > 0 ? `(${notificationCount})` : ''}</Text>,
        disabled: true
      },
      { type: 'divider' as const },
      ...(notifications.length > 0 ? notifications.map((n, i) => ({
        key: `notif-${i}`,
        label: (
          <div className="notification-item" style={{ maxWidth: 320 }}>
            <Badge status={notifStatusMap[n.type] || 'processing'} />
            <div>
              <Text strong style={{ fontSize: 13 }}>{n.title || n.message || 'Notification'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>{n.description || ''} {n.created_at ? `• ${formatTimeAgo(n.created_at)}` : ''}</Text>
            </div>
          </div>
        )
      })) : [{
        key: 'no-notifs',
        label: <Text type="secondary" style={{ fontSize: 13 }}>No new notifications</Text>,
        disabled: true
      }]),
      { type: 'divider' as const },
      {
        key: 'view-all',
        label: <Text type="link">View all notifications</Text>,
        onClick: () => navigate('/app/communication')
      }
    ] as any[]
  };

  // Profile menu
  const profileMenu: MenuProps = {
    items: [
      {
        key: 'user-info',
        label: (
          <div style={{ padding: '8px 0' }}>
            <Text strong>{currentUser?.fullName || 'User'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{currentUser?.email}</Text>
            <br />
            <Tag color={roleColors[(userRole || '').toLowerCase()] || '#667eea'} style={{ marginTop: 4 }}>
              {userRole || 'User'}
            </Tag>
          </div>
        ),
        disabled: true
      },
      { type: 'divider' as const },
      { key: 'profile', icon: <UserOutlined />, label: 'My Profile', onClick: () => navigate('/app/profile') },
      { key: 'settings', icon: <SettingOutlined />, label: 'Settings', onClick: () => navigate('/app/settings') },
      { key: 'help', icon: <QuestionCircleOutlined />, label: 'Help & Support', onClick: () => navigate('/app/help') },
      { type: 'divider' as const },
      { 
        key: 'logout', 
        icon: <LogoutOutlined />, 
        label: 'Sign Out',
        danger: true,
        onClick: () => {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    ]
  };

  return (
    <header className="premium-topbar">
      {/* Left: Entity Switcher & Breadcrumbs */}
      <div className="topbar-left">
        <EntitySwitcher />

        <ClientSwitcher />

        <Divider type="vertical" className="topbar-divider" />

        <nav className="topbar-breadcrumbs">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <RightOutlined className="breadcrumb-separator" />}
              {crumb.path ? (
                <span 
                  className="breadcrumb-link"
                  onClick={() => navigate(crumb.path!)}
                >
                  {crumb.label}
                </span>
              ) : (
                <span className="breadcrumb-current">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Center: Search */}
      <div className="topbar-center">
        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="Search transactions, clients, documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="topbar-search"
          allowClear
        />
      </div>

      {/* Right: Actions */}
      <div className="topbar-right">
        {/* Quick Add */}
        <Dropdown menu={quickActionsMenu} trigger={['click']}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            className="quick-add-btn"
          >
            Quick Add
          </Button>
        </Dropdown>

        {/* Theme Toggle */}
        <Tooltip title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
          <button 
            className="topbar-icon-btn"
            onClick={() => {
              const newDark = !isDarkMode;
              setIsDarkMode(newDark);
              document.body.classList.toggle('dark-mode', newDark);
              document.documentElement.setAttribute('data-theme', newDark ? 'dark' : 'light');
              localStorage.setItem('theme-mode', newDark ? 'dark' : 'light');
            }}
          >
            {isDarkMode ? <SunOutlined /> : <MoonOutlined />}
          </button>
        </Tooltip>

        {/* Notifications */}
        <Dropdown menu={notificationsMenu} trigger={['click']} placement="bottomRight">
          <button className="topbar-icon-btn">
            <Badge count={notificationCount} size="small">
              <BellOutlined />
            </Badge>
          </button>
        </Dropdown>

        {/* Messages */}
        <Tooltip title="Messages">
          <button className="topbar-icon-btn" onClick={() => navigate('/app/communication')}>
            <Badge count={messageCount} size="small">
              <MessageOutlined />
            </Badge>
          </button>
        </Tooltip>

        {/* Profile */}
        <Dropdown menu={profileMenu} trigger={['click']} placement="bottomRight">
          <div className="topbar-profile">
            <Avatar 
              size={36}
              style={{ 
                background: `linear-gradient(135deg, ${roleColors[(userRole || '').toLowerCase()] || '#667eea'} 0%, #764ba2 100%)`,
                cursor: 'pointer'
              }}
            >
              {userInitials}
            </Avatar>
            <div className="profile-info">
              <span className="profile-name">{currentUser?.fullName || 'User'}</span>
              <span className="profile-role">{userRole}</span>
            </div>
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

export default PremiumTopBar;
