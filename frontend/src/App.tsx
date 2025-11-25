import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { antdTheme } from './theme/antd.theme';
import './App.css';

// Multi-Tenant Context Providers
import { ClientProvider } from './contexts/ClientContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { UserProvider } from './contexts/UserContext';

// Authentication Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import Billing from './pages/Billing';
import VerifyEmail from './pages/VerifyEmail';
import ResendVerification from './pages/ResendVerification';
import ProfileSettings from './pages/ProfileSettings';
import TenantSettings from './pages/TenantSettings';

// Layout Components
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import { CoPilotAssistant } from './components/ui/CoPilotAssistant';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import ProtectedRoute from './components/ProtectedRoute';

// Enterprise Dashboard
import EnterpriseDashboard from './pages/EnterpriseDashboard';

// Multi-Client Dashboard
import MultiClientDashboard from './pages/MultiClientDashboard';

// Design System Demo
import DesignSystemDemo from './pages/DesignSystemDemo';

// API Test Dashboard
import APITestDashboard from './pages/APITestDashboard';

// Module Pages
import Sales from './pages/Sales';
import Purchase from './pages/Purchase';
import InventoryDashboard from './modules/inventory/InventoryDashboard';
import HRDashboard from './modules/hr/HRDashboard';
import { PracticeDashboard } from './modules/practice/PracticeDashboard';
import AssetDashboard from './modules/assets/AssetDashboard';
import WarehouseDashboard from './modules/warehouse/WarehouseDashboard';
import ManufacturingDashboard from './modules/manufacturing/ManufacturingDashboard';
import FinancialManagement from './pages/FinancialManagement';
import CashManagement from './pages/CashManagement';
import BankingDashboard from './pages/BankingDashboard';
import BankStatementImport from './pages/BankStatementImport';
import SARSSentinel from './modules/sars-sentinel/SARSSentinel';
import LogisticsModule from './modules/logistics/LogisticsModule';
import MyWorkspace from './pages/MyWorkspace';
import AuditReady from './pages/AuditReady';
import TreasuryManagement from './pages/TreasuryManagement';
import Healthcare from './pages/Healthcare';
import Construction from './pages/Construction';
import Agriculture from './pages/Agriculture';
import Mining from './pages/Mining';
import Wholesale from './pages/Wholesale';
import ProfessionalServices from './pages/ProfessionalServices';
import HelpCenter from './pages/HelpCenter';
import UserManagement from './pages/UserManagement';
import SystemSettings from './pages/SystemSettings';
import AuditLogs from './pages/AuditLogs';


function App() {
  // Load saved theme on app startup
  useEffect(() => {
    const savedTheme = localStorage.getItem('aetheros-theme-colors');
    if (savedTheme) {
      try {
        const colors = JSON.parse(savedTheme);
        document.documentElement.style.setProperty('--primary-color', colors.primary);
        document.documentElement.style.setProperty('--secondary-color', colors.secondary);
        document.documentElement.style.setProperty('--gradient', colors.gradient);
        document.documentElement.style.setProperty('--theme-gradient', colors.gradient);
        document.documentElement.style.setProperty('--theme-bg', colors.bg || '#f8fafc');
        document.documentElement.style.setProperty('--theme-card-bg', colors.cardBg || '#ffffff');
        document.documentElement.style.setProperty('--theme-primary', colors.primary);
        document.documentElement.style.setProperty('--theme-secondary', colors.secondary);
        document.documentElement.style.setProperty('--sidebar-active-bg', colors.gradient);
        document.documentElement.style.setProperty('--button-gradient', colors.gradient);
        document.documentElement.style.setProperty('--chart-gradient', colors.gradient);
        
        const themeId = localStorage.getItem('aetheros-theme') || 'default';
        document.body.setAttribute('data-theme', themeId);
      } catch (e) {
        console.warn('Failed to load theme', e);
      }
    }
  }, []);

  return (
    <ConfigProvider theme={antdTheme}>
      <UserProvider>
        <ClientProvider>
          <CurrencyProvider>
            <Router>
            <Routes>
              {/* Public Routes - No Layout */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/resend-verification" element={<ResendVerification />} />
              
              {/* Protected Routes - With Layout */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <div className="app">
                    <TopBar />
                    <Sidebar />
                    <main className="main-content-v2">
                      <Routes>
                        <Route path="/" element={<EnterpriseDashboard />} />
                        <Route path="/dashboard" element={<EnterpriseDashboard />} />
                        <Route path="/logistics/*" element={<LogisticsModule />} />
                        <Route path="/sales/*" element={<Sales />} />
                        <Route path="/purchase/*" element={<Purchase />} />
                        <Route path="/financial/*" element={<FinancialManagement />} />
                        <Route path="/inventory/*" element={<InventoryDashboard />} />
                        <Route path="/hr/*" element={<HRDashboard />} />
                        <Route path="/practice/*" element={<PracticeDashboard />} />
                        <Route path="/assets/*" element={<AssetDashboard />} />
                        <Route path="/warehouse/*" element={<WarehouseDashboard />} />
                        <Route path="/manufacturing/*" element={<ManufacturingDashboard />} />
                        <Route path="/cash/*" element={<CashManagement />} />
                        <Route path="/banking/*" element={<BankingDashboard />} />
                        <Route path="/sars/*" element={<SARSSentinel />} />
                        <Route path="/workspace" element={<MyWorkspace />} />
                        <Route path="/audit" element={<AuditReady />} />
                        <Route path="/treasury" element={<TreasuryManagement />} />
                        <Route path="/api-test" element={<APITestDashboard />} />
                        <Route path="/profile" element={<ProfileSettings />} />
                        <Route path="/tenant-settings" element={<TenantSettings />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/settings" element={<SystemSettings />} />
                        <Route path="/audit-logs" element={<AuditLogs />} />
                        <Route path="/help" element={<HelpCenter />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/billing" element={<Billing />} />
                      </Routes>
                    </main>
                    <CoPilotAssistant />
                  </div>
                </ProtectedRoute>
              } />
            </Routes>
            </Router>
          </CurrencyProvider>
        </ClientProvider>
      </UserProvider>
    </ConfigProvider>
  );
}export default App;
