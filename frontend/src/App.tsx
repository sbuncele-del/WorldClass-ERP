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

// Landing Page (lazy loaded for performance)
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Footer Pages (lazy loaded)
const About = lazy(() => import('./pages/About'));
const Careers = lazy(() => import('./pages/Careers'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Security = lazy(() => import('./pages/Security'));
const Contact = lazy(() => import('./pages/Contact'));
const Documentation = lazy(() => import('./pages/Documentation'));
const Support = lazy(() => import('./pages/Support'));
const Partners = lazy(() => import('./pages/Partners'));
const Blog = lazy(() => import('./pages/Blog'));
const CaseStudies = lazy(() => import('./pages/CaseStudies'));

// Lazy-loaded Authentication Pages
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ResendVerification = lazy(() => import('./pages/ResendVerification'));

// Lazy-loaded Main Pages
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
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
const ProjectsModule = lazy(() => import('./modules/projects/ProjectsModule'));
const CommunicationModule = lazy(() => import('./modules/communication/CommunicationModule'));
const CalendarModule = lazy(() => import('./modules/calendar/CalendarModule'));
const ProposalsModule = lazy(() => import('./modules/proposals/ProposalsModule'));

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
                      {/* Landing Page - Public Homepage */}
                      <Route path="/" element={<LandingPage />} />
                      
                      {/* Public Footer Pages - No Layout */}
                      <Route path="/about" element={<About />} />
                      <Route path="/careers" element={<Careers />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/security" element={<Security />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/documentation" element={<Documentation />} />
                      <Route path="/support" element={<Support />} />
                      <Route path="/partners" element={<Partners />} />
                      <Route path="/blog" element={<Blog />} />
                      <Route path="/case-studies" element={<CaseStudies />} />
                      
                      {/* Public Routes - No Layout */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                      <Route path="/resend-verification" element={<ResendVerification />} />

                      {/* Onboarding - Protected but no sidebar/topbar */}
                      <Route
                        path="/onboarding"
                        element={
                          <ProtectedRoute>
                            <Onboarding />
                          </ProtectedRoute>
                        }
                      />

                      {/* Driver-first experience (no sidebar/topbar) */}
                      <Route
                        path="/driver"
                        element={
                          <ProtectedRoute>
                            <DriverDashboard />
                          </ProtectedRoute>
                        }
                      />

                      {/* Root-level protected routes with layout - for sidebar navigation */}
                      <Route path="/projects/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <ProjectsModule />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      <Route path="/communication/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <CommunicationModule />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      <Route path="/calendar/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <CalendarModule />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      <Route path="/proposals/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <ProposalsModule />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Sales & CRM */}
                      <Route path="/sales/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <Sales />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Purchase Management */}
                      <Route path="/purchase/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <Purchase />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Inventory Management */}
                      <Route path="/inventory/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <InventoryDashboard />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* HR & Payroll */}
                      <Route path="/hr/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <HRDashboard />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Asset Management */}
                      <Route path="/assets/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <AssetDashboard />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Logistics & Transport */}
                      <Route path="/logistics/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <LogisticsModule />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Practice Management */}
                      <Route path="/practice/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <PracticeDashboard />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Healthcare */}
                      <Route path="/healthcare/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <Healthcare />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Construction */}
                      <Route path="/construction/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <Construction />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Agriculture */}
                      <Route path="/agriculture/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <Agriculture />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Mining */}
                      <Route path="/mining/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <Mining />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Wholesale & Retail */}
                      <Route path="/wholesale/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <Wholesale />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Professional Services */}
                      <Route path="/professional-services/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <ProfessionalServices />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Financial Accounting */}
                      <Route path="/financial/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <FinancialManagement />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Cash Management */}
                      <Route path="/cash-management/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <CashManagement />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Treasury Management */}
                      <Route path="/treasury/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <TreasuryManagement />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* SARS Integration */}
                      <Route path="/sars-sentinel/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <SARSSentinel />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Audit-Ready Suite */}
                      <Route path="/audit-ready/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <AuditReady />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* My Workspace */}
                      <Route path="/my-workspace" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <MyWorkspace />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Warehouse Management */}
                      <Route path="/warehouse/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <WarehouseDashboard />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Manufacturing */}
                      <Route path="/manufacturing/*" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <ManufacturingDashboard />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* User Management */}
                      <Route path="/users" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <UserManagement />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* System Settings */}
                      <Route path="/settings" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <SystemSettings />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Audit Logs */}
                      <Route path="/audit-logs" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <AuditLogs />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Help Center */}
                      <Route path="/help" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <HelpCenter />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Profile Settings */}
                      <Route path="/profile" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <ProfileSettings />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Billing */}
                      <Route path="/billing" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <Billing />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* Tenant Settings */}
                      <Route path="/tenant-settings" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <TenantSettings />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />

                      {/* API Test Dashboard */}
                      <Route path="/api-test" element={
                        <ProtectedRoute>
                          <div className="app">
                            <TopBar />
                            <Sidebar />
                            <main className="main-content-v2">
                              <Suspense fallback={<PageLoader />}>
                                <APITestDashboard />
                              </Suspense>
                            </main>
                            <Suspense fallback={null}>
                              <CoPilotAssistant />
                            </Suspense>
                          </div>
                        </ProtectedRoute>
                      } />
                      
                      {/* Protected Routes - With Layout (legacy /app prefix) */}
                      <Route path="/app/*" element={
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
                                  <Route path="/projects/*" element={<ProjectsModule />} />
                                  <Route path="/communication/*" element={<CommunicationModule />} />
                                  <Route path="/calendar/*" element={<CalendarModule />} />
                                  <Route path="/proposals/*" element={<ProposalsModule />} />
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
