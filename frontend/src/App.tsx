import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { ConfigProvider, Spin } from 'antd';
import { antdTheme } from './theme/antd.theme';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Multi-Tenant Context Providers
import { ClientProvider } from './contexts/ClientContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { UserProvider } from './contexts/UserContext';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';

// Critical path components (loaded immediately)
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Layout Components (loaded immediately for shell)
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';

// Lazy-loaded Authentication Pages
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ResendVerification = lazy(() => import('./pages/ResendVerification'));

// Lazy-loaded Main Pages
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Billing = lazy(() => import('./pages/Billing'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const TenantSettings = lazy(() => import('./pages/TenantSettings'));
const APITestDashboard = lazy(() => import('./pages/APITestDashboard'));
const MyWorkspace = lazy(() => import('./pages/MyWorkspace'));

// Lazy-loaded Module Pages
const Sales = lazy(() => import('./pages/Sales'));
const Purchase = lazy(() => import('./pages/Purchase'));
const FinancialManagement = lazy(() => import('./pages/FinancialManagement'));
const CashManagement = lazy(() => import('./pages/CashManagement'));
const BankingDashboard = lazy(() => import('./pages/BankingDashboard'));
const TreasuryManagement = lazy(() => import('./pages/TreasuryManagement'));
const AuditReady = lazy(() => import('./pages/AuditReady'));

// Lazy-loaded Modules
const InventoryDashboard = lazy(() => import('./modules/inventory/InventoryDashboard'));
const HRDashboard = lazy(() => import('./modules/hr/HRDashboard'));
const AssetDashboard = lazy(() => import('./modules/assets/AssetDashboard'));
const WarehouseDashboard = lazy(() => import('./modules/warehouse/WarehouseDashboard'));
const ManufacturingDashboard = lazy(() => import('./modules/manufacturing/ManufacturingDashboard'));
const LogisticsModule = lazy(() => import('./modules/logistics/LogisticsModule'));
const SARSSentinel = lazy(() => import('./modules/sars-sentinel/SARSSentinel'));

// Lazy-loaded Practice Module
const PracticeDashboard = lazy(() => 
  import('./modules/practice/PracticeDashboard').then(module => ({ default: module.PracticeDashboard }))
);

// Lazy-loaded Industry Pages
const Healthcare = lazy(() => import('./pages/Healthcare'));
const Construction = lazy(() => import('./pages/Construction'));
const Agriculture = lazy(() => import('./pages/Agriculture'));
const Mining = lazy(() => import('./pages/Mining'));
const Wholesale = lazy(() => import('./pages/Wholesale'));
const ProfessionalServices = lazy(() => import('./pages/ProfessionalServices'));

// Lazy-loaded Admin Pages
const UserManagement = lazy(() => import('./pages/UserManagement'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));

// Lazy-loaded UI Components
const CoPilotAssistant = lazy(() => 
  import('./components/ui/CoPilotAssistant').then(module => ({ default: module.CoPilotAssistant }))
);

// Loading component for Suspense
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '400px' 
  }}>
    <Spin size="large" tip="Loading..." />
  </div>
);


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
      } catch {
        // Silently fail in production
        if (import.meta.env.DEV) {
          console.warn('Failed to load theme');
        }
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <ConfigProvider theme={antdTheme}>
        <UserProvider>
          <FeatureFlagProvider>
            <ClientProvider>
              <CurrencyProvider>
                <Router>
                  <Suspense fallback={<PageLoader />}>
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
                              <Suspense fallback={<PageLoader />}>
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
                                  {/* Industry Pages */}
                                  <Route path="/healthcare/*" element={<Healthcare />} />
                                  <Route path="/construction/*" element={<Construction />} />
                                  <Route path="/agriculture/*" element={<Agriculture />} />
                                  <Route path="/mining/*" element={<Mining />} />
                                  <Route path="/wholesale/*" element={<Wholesale />} />
                                  <Route path="/professional-services/*" element={<ProfessionalServices />} />
                                </Routes>
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />
                    </Routes>
                  </Suspense>
                </Router>
              </CurrencyProvider>
            </ClientProvider>
          </FeatureFlagProvider>
        </UserProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
