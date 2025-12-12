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

// Premium Layout Components
const PremiumSidebar = lazy(() => import('./components/layout/PremiumSidebar'));
const PremiumTopBar = lazy(() => import('./components/layout/PremiumTopBar'));

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
const ClientPortal = lazy(() => import('./modules/proposals/pages/ClientPortal'));
const PortalAccess = lazy(() => import('./modules/proposals/pages/PortalAccess'));

// Lazy-loaded Practice Module
const PracticeDashboard = lazy(() => 
  import('./modules/practice/PracticeDashboard').then(module => ({ default: module.PracticeDashboard }))
);
const ClientManagement = lazy(() => import('./modules/practice/pages/ClientManagement'));

// Enterprise Hub Pages (Premium SaaS Design)
const MultiEntityHub = lazy(() => import('./modules/multi-entity/MultiEntityHub'));
const BankingHub = lazy(() => import('./modules/banking/BankingHub'));
const PracticeHub = lazy(() => import('./modules/professional/PracticeHub'));
const HRHub = lazy(() => import('./modules/hr/HRHub'));
const FinancialHub = lazy(() => import('./modules/financial/FinancialHub'));
const SalesHub = lazy(() => import('./modules/sales/SalesHub'));
const InventoryHub = lazy(() => import('./modules/inventory/InventoryHub'));
const PurchaseHub = lazy(() => import('./modules/purchase/PurchaseHub'));
const AssetsHub = lazy(() => import('./modules/assets/AssetsHub'));
const WarehouseHub = lazy(() => import('./modules/warehouse/WarehouseHub'));
const ManufacturingHub = lazy(() => import('./modules/manufacturing/ManufacturingHub'));
const LogisticsHub = lazy(() => import('./modules/logistics/LogisticsHub'));
const MiningHub = lazy(() => import('./modules/mining/MiningHub'));
const AgricultureHub = lazy(() => import('./modules/agriculture/AgricultureHub'));
const ProjectsHub = lazy(() => import('./modules/projects/ProjectsHub'));
const ProposalsHub = lazy(() => import('./modules/proposals/ProposalsHub'));
const ConstructionHub = lazy(() => import('./modules/construction/ConstructionHub'));
const HealthcareHub = lazy(() => import('./modules/healthcare/HealthcareHub'));
const PropertyHub = lazy(() => import('./modules/property/PropertyHub'));
const CommunicationsHub = lazy(() => import('./modules/communication/CommunicationsHub'));
const AuditReadyHub = lazy(() => import('./modules/compliance/AuditReadyHub'));
const RegulatoryHub = lazy(() => import('./modules/compliance/RegulatoryHub'));
const AdminHub = lazy(() => import('./modules/admin/AdminHub'));
const AuditorPortalPreview = lazy(() => import('./modules/compliance/AuditorPortalPreview'));

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

// Component Preview (no login required)
const ComponentPreview = lazy(() => import('./pages/ComponentPreview'));

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
                      
                      {/* Public Client Portal - Access with code (no login required) */}
                      <Route path="/portal/:id" element={<PortalAccess />} />
                      <Route path="/portal/:id/view" element={<ClientPortal />} />
                      
                      {/* Preview Routes - For approval before deployment */}
                      <Route path="/preview/components" element={<ComponentPreview />} />
                      <Route path="/preview/assets-hub" element={<AssetsHub />} />
                      <Route path="/preview/financial-hub" element={<FinancialHub />} />
                      <Route path="/preview/sales-hub" element={<SalesHub />} />
                      <Route path="/preview/inventory-hub" element={<InventoryHub />} />
                      <Route path="/preview/purchase-hub" element={<PurchaseHub />} />
                      <Route path="/preview/warehouse-hub" element={<WarehouseHub />} />
                      <Route path="/preview/manufacturing-hub" element={<ManufacturingHub />} />
                      <Route path="/preview/logistics-hub" element={<LogisticsHub />} />
                      <Route path="/preview/mining-hub" element={<MiningHub />} />
                      <Route path="/preview/agriculture-hub" element={<AgricultureHub />} />
                      <Route path="/preview/projects-hub" element={<ProjectsHub />} />
                      <Route path="/preview/proposals-hub" element={<ProposalsHub />} />
                      <Route path="/preview/construction-hub" element={<ConstructionHub />} />
                      <Route path="/preview/healthcare-hub" element={<HealthcareHub />} />
                      <Route path="/preview/property-hub" element={<PropertyHub />} />
                      <Route path="/preview/communications-hub" element={<CommunicationsHub />} />
                      <Route path="/preview/audit-ready-hub" element={<AuditReadyHub />} />
                      <Route path="/preview/regulatory-hub" element={<RegulatoryHub />} />
                      <Route path="/preview/admin-hub" element={<AdminHub />} />
                      <Route path="/preview/auditor-portal" element={<AuditorPortalPreview />} />
                      
                      {/* Direct Hub Routes */}
                      <Route path="/audit-ready" element={<AuditReadyHub />} />
                      <Route path="/regulatory" element={<RegulatoryHub />} />
                      <Route path="/admin" element={<AdminHub />} />
                      
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
                      
                      {/* Protected Routes - With Layout */}
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
                                  <Route path="/practice/clients" element={<ClientManagement />} />
                                  <Route path="/assets/*" element={<AssetDashboard />} />
                                  <Route path="/warehouse/*" element={<WarehouseDashboard />} />
                                  <Route path="/manufacturing/*" element={<ManufacturingDashboard />} />
                                  <Route path="/cash/*" element={<CashManagement />} />
                                  <Route path="/banking/*" element={<BankingDashboard />} />
                                  <Route path="/banking-hub" element={<BankingHub />} />
                                  <Route path="/sars/*" element={<SARSSentinel />} />
                                  <Route path="/multi-entity" element={<MultiEntityHub />} />
                                  <Route path="/practice-hub" element={<PracticeHub />} />
                                  <Route path="/hr-hub" element={<HRHub />} />
                                  <Route path="/financial-hub" element={<FinancialHub />} />
                                  <Route path="/sales-hub" element={<SalesHub />} />
                                  <Route path="/inventory-hub" element={<InventoryHub />} />
                                  <Route path="/purchase-hub" element={<PurchaseHub />} />
                                  <Route path="/assets-hub" element={<AssetsHub />} />
                                  <Route path="/warehouse-hub" element={<WarehouseHub />} />
                                  <Route path="/manufacturing-hub" element={<ManufacturingHub />} />
                                  <Route path="/logistics-hub" element={<LogisticsHub />} />
                                  <Route path="/mining-hub" element={<MiningHub />} />
                                  <Route path="/agriculture-hub" element={<AgricultureHub />} />
                                  <Route path="/projects-hub" element={<ProjectsHub />} />
                                  <Route path="/proposals-hub" element={<ProposalsHub />} />
                                  <Route path="/construction-hub" element={<ConstructionHub />} />
                                  <Route path="/healthcare-hub" element={<HealthcareHub />} />
                                  <Route path="/property-hub" element={<PropertyHub />} />
                                  <Route path="/communications-hub" element={<CommunicationsHub />} />
                                  <Route path="/audit-ready" element={<AuditReadyHub />} />
                                  <Route path="/regulatory" element={<RegulatoryHub />} />
                                  <Route path="/admin-hub" element={<AdminHub />} />
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
