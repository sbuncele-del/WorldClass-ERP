/**
 * Sales & CRM Module — Unified Router
 * 
 * Routes all Sales sub-pages:
 *  /           → Dashboard (KPIs, pipeline, quick actions)
 *  /customers  → Customer Management (full CRUD, contacts, details)
 *  /invoices   → Invoice Management (payments, aging, overdue tracking)
 *  /quotations → Quotation Management (line items, convert to order)
 *  /orders     → Sales Order Management (status workflow, line items)
 *  /leads      → Lead Management (scoring, funnel, conversion)
 *  /opportunities → Opportunity Pipeline (stages, weighted value)
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Spin, Menu } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  FunnelPlotOutlined,
  RocketOutlined,
  AimOutlined,
  SettingOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

// Lazy load sub-pages
const SalesDashboardPage = lazy(() => import('./pages/SalesDashboardPage'));
const CustomerManagement = lazy(() => import('./components/CustomerManagement'));
const InvoiceManagement = lazy(() => import('./components/InvoiceManagement'));
const QuotationManagement = lazy(() => import('./components/QuotationManagement'));
const SalesOrderManagement = lazy(() => import('./components/SalesOrderManagement'));
const LeadsPage = lazy(() => import('./LeadsPage'));
const OpportunitiesPage = lazy(() => import('./OpportunitiesPage'));
const RetainerManagement = lazy(() => import('./components/RetainerManagement'));
const StatementsPage = lazy(() => import('../financial/components/StatementsPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, width: '100%' }}>
    <Spin size="large" tip="Loading..." />
  </div>
);

const SalesModule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine which sub-nav item is active
  const getActiveKey = (): string => {
    const path = location.pathname;
    if (path.includes('/customers')) return 'customers';
    if (path.includes('/invoices')) return 'invoices';
    if (path.includes('/quotations')) return 'quotations';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/leads')) return 'leads';
    if (path.includes('/opportunities')) return 'opportunities';
    if (path.includes('/retainers')) return 'retainers';
    if (path.includes('/statements')) return 'statements';
    if (path.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const handleNav = (key: string) => {
    // Build path relative to /app/sales-hub
    const basePath = location.pathname.includes('/sales-hub') ? '/app/sales-hub' : '/app/sales';
    if (key === 'dashboard') {
      navigate(basePath);
    } else {
      navigate(`${basePath}/${key}`);
    }
  };

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Sub-navigation bar */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Menu
          mode="horizontal"
          selectedKeys={[getActiveKey()]}
          onClick={({ key }) => handleNav(key)}
          style={{ borderBottom: 'none' }}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: 'Dashboard',
            },
            {
              key: 'customers',
              icon: <TeamOutlined />,
              label: 'Customers',
            },
            {
              key: 'quotations',
              icon: <FileTextOutlined />,
              label: 'Quotations',
            },
            {
              key: 'orders',
              icon: <ShoppingCartOutlined />,
              label: 'Orders',
            },
            {
              key: 'invoices',
              icon: <FunnelPlotOutlined />,
              label: 'Invoices',
            },
            {
              key: 'leads',
              icon: <AimOutlined />,
              label: 'Leads',
            },
            {
              key: 'opportunities',
              icon: <RocketOutlined />,
              label: 'Opportunities',
            },
            {
              key: 'retainers',
              icon: <CalendarOutlined />,
              label: 'Retainers',
            },
            {
              key: 'statements',
              icon: <FileTextOutlined />,
              label: 'Statements',
            },
          ]}
        />
      </div>

      {/* Sub-page content */}
      <div style={{ padding: '24px' }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<SalesDashboardPage />} />
            <Route path="/customers" element={<CustomerManagement />} />
            <Route path="/invoices" element={<InvoiceManagement />} />
            <Route path="/quotations" element={<QuotationManagement />} />
            <Route path="/orders" element={<SalesOrderManagement />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/retainers" element={<RetainerManagement />} />
            <Route path="/statements" element={<StatementsPage defaultMode="customers" />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

export default SalesModule;
