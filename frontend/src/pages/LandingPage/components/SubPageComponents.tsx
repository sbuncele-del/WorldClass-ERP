/**
 * Sub-page components preserved from the original LandingPage.tsx
 * Used by FeaturesPage, CompliancePage, DemoPage etc.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, BarChart3, Users, Building2, Factory,
  ChevronRight, Check, X, Play, ArrowRight, Sparkles,
  Lock, Clock, TrendingUp, MessageSquare,
  Layers, Cpu,
  FileCheck, CircleDollarSign,
  ClipboardCheck, ShoppingCart, Package, Briefcase, FolderKanban,
  Landmark, FileText, Eye, AlertTriangle,
  Settings, Zap,
} from 'lucide-react';
import { fadeInUp, staggerContainer, scaleIn } from '../shared';
import type { Module } from '../shared';

// ─── Module Showcase ───
export const ModuleShowcase: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  const modules: Module[] = [
    {
      icon: <BarChart3 size={32} />,
      title: 'Financial Hub',
      tagline: 'Complete Financial Visibility. Close Faster. Stay Compliant.',
      businessBenefit: 'Real-time dashboards, cash flow management, multi-currency support, GL, AP, AR — all in one place',
      complianceBenefit: 'IFRS-compliant reporting, automated VAT calculations, SARS-ready submissions, complete audit trails',
      color: '#F4B400',
      features: [
        { title: 'General Ledger', description: 'Full double-entry accounting with chart of accounts management.' },
        { title: 'Accounts Payable & Receivable', description: 'Track what you owe and what\'s owed to you — with aging reports.' },
        { title: 'Bank Reconciliation', description: 'Match transactions automatically with AI-powered reconciliation.' },
        { title: 'Cash Flow Management', description: 'Real-time cash position across all accounts and entities.' },
        { title: 'Multi-Currency', description: 'Handle ZAR, USD, EUR and more with automatic rate updates.' },
        { title: 'Financial Reports', description: 'Balance sheet, income statement, trial balance — generated instantly.' },
      ],
      keyMetrics: ['Real-time financial position', 'Automated bank reconciliation', 'SARS-compliant VAT'],
    },
    {
      icon: <ShoppingCart size={32} />,
      title: 'Sales & CRM',
      tagline: 'Win More Deals. Invoice Faster. Know Your Customers.',
      businessBenefit: 'Quote-to-cash pipeline, customer management, invoicing, payment tracking',
      complianceBenefit: 'IFRS 15 revenue recognition, automated VAT on invoices, audit-ready sales records',
      color: '#00D4AA',
      features: [
        { title: 'Customer Management', description: 'Complete customer profiles with history, contacts, and notes.' },
        { title: 'Quotes & Proposals', description: 'Professional quotes that convert to invoices with one click.' },
        { title: 'Invoicing', description: 'Create, send, and track invoices with automatic payment reminders.' },
        { title: 'Pipeline Management', description: 'Visual deal pipeline to track opportunities from lead to close.' },
        { title: 'Payment Tracking', description: 'Record payments, partial payments, and credit notes.' },
        { title: 'Sales Reports', description: 'Revenue by customer, product, period — slice data any way you need.' },
      ],
      keyMetrics: ['Quote-to-invoice in one click', 'Automated payment reminders', 'Revenue analytics'],
    },
    {
      icon: <FolderKanban size={32} />,
      title: 'Projects Hub',
      tagline: 'Deliver On Time. On Budget. With Full Visibility.',
      businessBenefit: 'Project planning, task management, milestones, team collaboration — all integrated with your calendar and financials',
      complianceBenefit: 'Project cost tracking flows into GL automatically, time-based revenue recognition, budget vs actual reporting',
      color: '#7C3AED',
      features: [
        { title: 'Project Planning', description: 'Create projects with phases, milestones, and deadlines.' },
        { title: 'Task Management', description: 'Assign tasks, set priorities, track progress in real-time.' },
        { title: 'Calendar Integration', description: 'Tasks and milestones auto-populate your calendar — never miss a deadline.' },
        { title: 'Team Collaboration', description: 'Comments, file sharing, and status updates in one place.' },
        { title: 'Budget Tracking', description: 'Track project costs against budget with real-time variance alerts.' },
        { title: 'Progress Reporting', description: 'Gantt charts, status dashboards, and milestone tracking.' },
      ],
      keyMetrics: ['Auto-synced calendar', 'Real-time budget tracking', 'Milestone-driven delivery'],
    },
    {
      icon: <Users size={32} />,
      title: 'HR & Payroll',
      tagline: 'Manage Your People. Pay Accurately. Stay Protected.',
      businessBenefit: 'Employee lifecycle management, payroll processing, leave management, performance tracking',
      complianceBenefit: 'PAYE calculations, UIF compliance, SARS IRP5 submissions, labour law adherence',
      color: '#EC4899',
      features: [
        { title: 'Employee Management', description: 'Complete employee records — contracts, documents, history.' },
        { title: 'Payroll Processing', description: 'Run payroll with automatic tax calculations and deductions.' },
        { title: 'Leave Management', description: 'Apply, approve, and track leave balances digitally.' },
        { title: 'Tax Compliance', description: 'PAYE, UIF, SDL calculated automatically per SARS rules.' },
        { title: 'Payslip Generation', description: 'Professional payslips generated and distributed automatically.' },
        { title: 'Performance Reviews', description: 'Set KPIs, run reviews, track employee development.' },
      ],
      keyMetrics: ['Automated PAYE & UIF', 'Digital leave management', 'IRP5-ready payroll'],
    },
    {
      icon: <Package size={32} />,
      title: 'Inventory & Warehouse',
      tagline: 'Stock Smarter. Fulfil Faster. Never Run Out.',
      businessBenefit: 'Real-time stock visibility, multi-location management, reorder automation, warehouse operations',
      complianceBenefit: 'IAS 2 inventory valuation, FIFO/weighted average costing, shrinkage tracking, stocktake compliance',
      color: '#3B82F6',
      features: [
        { title: 'Stock Management', description: 'Real-time stock levels across all locations.' },
        { title: 'Multi-Warehouse', description: 'Manage multiple warehouses with inter-location transfers.' },
        { title: 'Reorder Points', description: 'Automatic reorder alerts based on minimum stock levels.' },
        { title: 'Picking & Packing', description: 'Warehouse pick lists and packing workflows for orders.' },
        { title: 'Stock Valuation', description: 'IAS 2 compliant valuation — FIFO, weighted average, or specific.' },
        { title: 'Stocktake Management', description: 'Cycle counts and full stocktakes with variance reporting.' },
      ],
      keyMetrics: ['Real-time stock visibility', 'IAS 2 compliant valuation', 'Multi-warehouse support'],
    },
    {
      icon: <Building2 size={32} />,
      title: 'Assets Hub',
      tagline: 'Track Every Asset. Depreciate Correctly. Stay IAS 16 Compliant.',
      businessBenefit: 'Full asset lifecycle — acquisition, depreciation, maintenance, disposal',
      complianceBenefit: 'IAS 16 compliant depreciation methods, revaluation, impairment testing, disposal accounting',
      color: '#F59E0B',
      features: [
        { title: 'Asset Register', description: 'Complete register of all company assets with details and location.' },
        { title: 'Depreciation Engine', description: 'IAS 16 compliant — straight-line, reducing balance, units of production.' },
        { title: 'Maintenance Tracking', description: 'Schedule and track maintenance for asset longevity.' },
        { title: 'Disposal Management', description: 'Record disposals with automatic gain/loss calculations.' },
        { title: 'Revaluation', description: 'Revalue assets per IAS 16 with full journal entry automation.' },
        { title: 'Asset Reports', description: 'Depreciation schedules, asset listings, movement reports.' },
      ],
      keyMetrics: ['IAS 16 compliant', 'Automated depreciation', 'Full asset lifecycle'],
    },
    {
      icon: <Briefcase size={32} />,
      title: 'Purchase Hub',
      tagline: 'Procure Smarter. Control Spending. Manage Suppliers.',
      businessBenefit: 'Purchase orders, supplier management, goods receiving, cost control',
      complianceBenefit: 'Procurement approval workflows, 3-way matching, supplier tax compliance, audit trails',
      color: '#EF4444',
      features: [
        { title: 'Purchase Orders', description: 'Create, approve, and track POs with multi-level approvals.' },
        { title: 'Supplier Management', description: 'Supplier profiles, performance tracking, and payment terms.' },
        { title: 'Goods Receiving', description: 'Record deliveries and match against POs automatically.' },
        { title: '3-Way Matching', description: 'PO, goods received, invoice — matched automatically.' },
        { title: 'Spend Analytics', description: 'Track spending by supplier, category, department.' },
        { title: 'Approval Workflows', description: 'Multi-level approval chains based on value thresholds.' },
      ],
      keyMetrics: ['Automated 3-way matching', 'Spend visibility', 'Approval workflows'],
    },
    {
      icon: <Factory size={32} />,
      title: 'Manufacturing',
      tagline: 'Build Better. Waste Less. Cost Accurately.',
      businessBenefit: 'Bills of materials, work orders, production scheduling, quality control',
      complianceBenefit: 'Production cost absorption, WIP valuation, scrap accounting, quality certifications',
      color: '#6366F1',
      features: [
        { title: 'Bill of Materials', description: 'Multi-level BOMs with version control and substitution rules.' },
        { title: 'Work Orders', description: 'Create, schedule, and track production work orders.' },
        { title: 'Production Planning', description: 'Schedule production runs across work centres.' },
        { title: 'Quality Control', description: 'Inspection checkpoints and defect tracking.' },
        { title: 'Cost Tracking', description: 'Track materials, labour, and overhead per production run.' },
        { title: 'Scrap Management', description: 'Record and account for production waste.' },
      ],
      keyMetrics: ['Multi-level BOMs', 'Production cost tracking', 'Quality workflows'],
    },
  ];

  const currentModule = modules[activeModule];

  return (
    <section className="modules" id="modules">
      <div className="container">
        {!hideHeader && (
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">Unified Platform</span>
            <h2>One Platform. Every Module You Need.</h2>
            <p className="section-subhead">Every module seamlessly integrates business operations with IFRS-compliant accounting — no more data silos, no more reconciliation nightmares.</p>
          </motion.div>
        )}

        <div className="modules-grid">
          <motion.div className="module-tabs" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {modules.map((module, i) => (
              <motion.button
                key={i}
                className={`module-tab ${activeModule === i ? 'active' : ''}`}
                onClick={() => { setActiveModule(i); setShowDetail(false); }}
                variants={fadeInUp}
                whileHover={{ x: 8 }}
                style={{ '--accent-color': module.color } as React.CSSProperties}
              >
                <div className="tab-icon">{module.icon}</div>
                <span>{module.title}</span>
                <ChevronRight size={18} />
              </motion.button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              className={`module-detail ${showDetail ? 'expanded' : ''}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{ '--accent-color': currentModule.color } as React.CSSProperties}
            >
              <div className="detail-header">
                <div className="detail-icon">{currentModule.icon}</div>
                <div className="detail-title-group">
                  <h3>{currentModule.title}</h3>
                  <p className="module-tagline">{currentModule.tagline}</p>
                </div>
              </div>

              <div className="detail-benefits">
                <div className="benefit-card business">
                  <div className="benefit-label"><TrendingUp size={16} /> Business Benefit</div>
                  <p>{currentModule.businessBenefit}</p>
                </div>
                <div className="benefit-card compliance">
                  <div className="benefit-label"><Shield size={16} /> Compliance Benefit</div>
                  <p>{currentModule.complianceBenefit}</p>
                </div>
              </div>

              <div className="module-metrics">
                {currentModule.keyMetrics.map((metric, i) => (
                  <div key={i} className="metric-badge"><Check size={14} />{metric}</div>
                ))}
              </div>

              <button className="btn-primary" onClick={() => setShowDetail(!showDetail)}>
                {showDetail ? 'Show Less' : `Learn More About ${currentModule.title}`}
                <ArrowRight size={16} className={showDetail ? 'rotate-up' : ''} />
              </button>

              <AnimatePresence>
                {showDetail && (
                  <motion.div
                    className="module-expanded"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="expanded-section">
                      <h4><Zap size={18} /> Key Features</h4>
                      <div className="features-grid">
                        {currentModule.features.map((feature, i) => (
                          <div key={i} className="feature-item">
                            <h5>{feature.title}</h5>
                            <p>{feature.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="expanded-cta">
                      <button className="btn-primary btn-large" onClick={() => navigate('/demo')}>
                        See {currentModule.title} in Action
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

// ─── Audit & Compliance Section — JSE Enterprise Grade ───
export const AuditComplianceSection: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const navigate = useNavigate();

  const auditCards = [
    {
      icon: <ClipboardCheck size={28} />,
      gradient: 'linear-gradient(135deg, #00D4AA, #00A884)',
      accentColor: '#00D4AA',
      title: 'Audit-Ready Hub',
      tagline: 'Walk into any audit with confidence — not anxiety',
      stat: { value: '< 2hrs', label: 'Audit Pack Generation' },
      features: [
        { bold: 'Complete Audit Trails', desc: 'Every transaction, every change, timestamped and attributed' },
        { bold: 'Document Management', desc: 'Supporting documents linked to every journal entry' },
        { bold: 'Segregation of Duties', desc: 'Configurable approval workflows that satisfy any external auditor' },
        { bold: 'Automated Reconciliations', desc: 'Bank, intercompany, and control account recs' },
        { bold: 'Audit Pack Generation', desc: 'One-click audit file preparation for external review' },
        { bold: 'Prior Period Tracking', desc: 'Adjustments tracked and disclosed per IAS 8' },
      ],
    },
    {
      icon: <Shield size={28} />,
      gradient: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
      accentColor: '#7C3AED',
      title: 'Regulatory Hub',
      tagline: 'Stay compliant without the complexity — built in, not bolted on',
      stat: { value: '12+', label: 'Regulatory Frameworks' },
      features: [
        { bold: 'SARS Integration', desc: 'VAT201, EMP201, ITR14 submissions from within the system' },
        { bold: 'IFRS Compliance', desc: 'IAS 2, IAS 16, IAS 37, IFRS 15, IFRS 16 built into every module' },
        { bold: 'B-BBEE Reporting', desc: 'Track and report on transformation compliance' },
        { bold: 'King IV Governance', desc: 'Approval chains aligned with governance principles' },
        { bold: 'Labour Compliance', desc: 'BCEA, LRA, EEA requirements monitored automatically' },
        { bold: 'Data Protection', desc: 'POPIA-compliant data handling and consent management' },
      ],
    },
    {
      icon: <Landmark size={28} />,
      gradient: 'linear-gradient(135deg, #F4B400, #E09200)',
      accentColor: '#F4B400',
      title: 'SARS Sentinel',
      tagline: 'Tax compliance on autopilot — never miss a filing deadline',
      stat: { value: '0', label: 'Missed Filing Deadlines' },
      features: [
        { bold: 'VAT Calculations', desc: 'Automatic VAT on every transaction, output and input' },
        { bold: 'PAYE Processing', desc: 'Tax tables updated, deductions calculated automatically' },
        { bold: 'Provisional Tax', desc: 'IRP6 estimates based on actual performance metrics' },
        { bold: 'Tax Calendar', desc: 'Proactive notifications for every filing deadline' },
        { bold: 'eFiling Integration', desc: 'Submit directly or export in SARS-accepted formats' },
        { bold: 'Tax Certificates', desc: 'IRP5, IT3(a), IT3(b) generation' },
      ],
    },
  ];

  const frameworks = [
    'IFRS / IAS', 'SARS eFiling', 'POPIA', 'B-BBEE', 'Companies Act (CIPC)',
    'BCEA / LRA', 'King IV', 'Companies Act',
  ];

  return (
    <section className="audit-compliance" id="audit-compliance">
      <div className="container">
        {!hideHeader && (
          <motion.div className="audit-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="audit-header-badge">
              <Eye size={14} />
              <span>Our Differentiator</span>
            </div>
            <h2 className="audit-headline">
              Audit-Ready & Regulatory Compliant —{' '}
              <span className="audit-headline-accent">By Design</span>
            </h2>
            <p className="audit-subhead">
              Most ERPs bolt compliance on as an afterthought. SiyaBusa was built with audit readiness and
              regulatory compliance at its core — so every transaction is audit-ready
              <strong>from the moment it's recorded</strong>.
            </p>
          </motion.div>
        )}

        <motion.div className="audit-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {auditCards.map((card, i) => (
            <motion.div key={i} className="audit-card" variants={fadeInUp}>
              <div className="audit-card-stripe" style={{ background: card.gradient }} />
              <div className="audit-card-body">
                <div className="audit-card-header">
                  <div className="audit-icon" style={{ background: card.gradient }}>
                    {card.icon}
                  </div>
                  <div>
                    <h3>{card.title}</h3>
                    <p className="audit-card-tagline">{card.tagline}</p>
                  </div>
                </div>

                <div className="audit-card-stat" style={{ borderLeftColor: card.accentColor }}>
                  <span className="audit-stat-value" style={{ color: card.accentColor }}>{card.stat.value}</span>
                  <span className="audit-stat-label">{card.stat.label}</span>
                </div>

                <ul className="audit-features">
                  {card.features.map((f, j) => (
                    <li key={j}><Check size={15} /> <span><strong>{f.bold}</strong> — {f.desc}</span></li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Regulatory framework badges */}
        <motion.div className="audit-frameworks" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <p className="audit-frameworks-label">Compliance frameworks supported</p>
          <div className="audit-frameworks-list">
            {frameworks.map((fw, i) => (
              <span key={i} className="audit-framework-badge">{fw}</span>
            ))}
          </div>
        </motion.div>

        <motion.div className="audit-bottom-cta" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <p><strong>This is what makes SiyaBusa different.</strong> While other systems give you the tools and leave compliance up to you, we ensure every single transaction is recorded, classified, and reported correctly — automatically.</p>
          <button className="btn-primary btn-large" onClick={() => navigate('/demo')}>
            See Our Compliance Suite in Action
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

// ─── Project Management Showcase ───
export const ProjectManagementShowcase: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  return (
    <section className="project-showcase" id="projects">
      <div className="container">
        {!hideHeader && (
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">Smart Project Management</span>
            <h2>Projects That Run Themselves</h2>
            <p className="section-subhead">Your calendar knows your deadlines. Your financials know your project costs. Everything is connected.</p>
          </motion.div>
        )}

        <motion.div className="project-features-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#7C3AED' }}><FolderKanban size={24} /></div>
            <h4>Integrated Task Management</h4>
            <p>Create tasks, assign team members, set priorities. Every task links to a project, a budget, and your calendar.</p>
          </motion.div>
          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#00D4AA' }}><Clock size={24} /></div>
            <h4>Auto-Populated Calendar</h4>
            <p>Tasks, milestones, invoice due dates, and project timelines automatically appear on your calendar.</p>
          </motion.div>
          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#F4B400' }}><CircleDollarSign size={24} /></div>
            <h4>Financial Integration</h4>
            <p>Project costs flow into your GL automatically. Budget vs actual reporting in real-time.</p>
          </motion.div>
          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#EF4444' }}><AlertTriangle size={24} /></div>
            <h4>Overdue Alerts</h4>
            <p>Overdue tasks and unpaid invoices are flagged immediately — on your dashboard, in your calendar, everywhere.</p>
          </motion.div>
          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#3B82F6' }}><FileText size={24} /></div>
            <h4>Proposals & Quotes</h4>
            <p>Create professional proposals that convert to projects. Quote, win, deliver, invoice — one seamless flow.</p>
          </motion.div>
          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#EC4899' }}><Eye size={24} /></div>
            <h4>Complete Visibility</h4>
            <p>See every project's status, budget health, team workload, and upcoming deadlines from one dashboard.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// ─── Comparison Table ───
export const ComparisonTable: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const navigate = useNavigate();
  const comparisons = [
    { feature: 'AI-Native Architecture', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'none' as const },
    { feature: 'Real-time Business/Accounting Sync', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'none' as const },
    { feature: 'Built-in Audit Readiness', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'partial' as const },
    { feature: 'SARS Integration', siyabusa: 'full' as const, traditional: 'none' as const, accounting: 'partial' as const },
    { feature: 'Automated Compliance Engine', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'partial' as const },
    { feature: 'Unified Platform (All Modules)', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'none' as const },
    { feature: 'Project-Calendar-Finance Integration', siyabusa: 'full' as const, traditional: 'none' as const, accounting: 'none' as const },
    { feature: 'Natural Language AI Assistant', siyabusa: 'full' as const, traditional: 'none' as const, accounting: 'none' as const },
    { feature: 'Multi-Entity & Consolidation', siyabusa: 'full' as const, traditional: 'full' as const, accounting: 'partial' as const },
    { feature: 'South African Tax Compliance', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'full' as const },
  ];

  const StatusIcon: React.FC<{ status: 'full' | 'partial' | 'none' }> = ({ status }) => {
    if (status === 'full') return <Check className="status-full" size={18} />;
    if (status === 'partial') return <div className="status-partial">~</div>;
    return <X className="status-none" size={18} />;
  };

  return (
    <section className="comparison" id="comparison">
      <div className="container">
        {!hideHeader && (
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">The Clear Choice</span>
            <h2>Why Businesses Choose SiyaBusa</h2>
            <p>See how we compare to alternative solutions</p>
          </motion.div>
        )}

        <motion.div className="comparison-table-wrapper" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th className="highlight"><div className="th-content"><Layers size={20} /> SiyaBusa</div></th>
                <th>Traditional ERPs</th>
                <th>Accounting Software</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, i) => (
                <motion.tr key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                  <td>{row.feature}</td>
                  <td className="highlight"><StatusIcon status={row.siyabusa} /></td>
                  <td><StatusIcon status={row.traditional} /></td>
                  <td><StatusIcon status={row.accounting} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.div className="comparison-cta" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
          <p>Ready to see the difference?</p>
          <button className="btn-primary" onClick={() => navigate('/demo')}>
            Schedule a Demo <ArrowRight size={16} />
          </button>
          <p className="comparison-disclaimer">Comparison based on general category capabilities. Individual product features may vary.</p>
        </motion.div>
      </div>
    </section>
  );
};

// ─── AI Demo Section ───
export const AIDemo: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  interface ConversationMessage {
    role: 'user' | 'ai';
    content: string;
    type?: 'processing' | 'confirmation' | 'success' | 'workflow';
  }

  const conversation: ConversationMessage[] = [
    { role: 'user', content: 'We just invoiced R50,000 to ABC Corp for the consulting project' },
    { role: 'ai', type: 'processing', content: '🔄 Processing invoice...' },
    {
      role: 'ai',
      type: 'confirmation',
      content: '⚠️ CONFIRMATION REQUIRED\n\nI\'ve analysed the transaction:\n\n• Customer: ABC Corp (Credit limit: R75,000 | Available: R42,500)\n• Project: Consulting Engagement — Phase 2\n• Amount: R50,000 (excl. VAT)\n• VAT @ 15%: R7,500\n• Total: R57,500\n• Payment terms: 30 days\n\nShall I proceed?',
    },
    { role: 'user', content: 'Yes, proceed' },
    {
      role: 'ai',
      type: 'success',
      content: '✅ INVOICE CREATED — INV-2026-0847\n\n━━━ ACCOUNTING ENTRIES ━━━\n• Dr. Accounts Receivable: R57,500\n• Cr. Revenue: R50,000 (IFRS 15 ✓)\n• Cr. VAT Output: R7,500 (15%)\n\n━━━ COMPLIANCE ━━━\n✓ Revenue recognition: IFRS 15\n✓ VAT calculation: SARS compliant\n✓ Audit trail: Complete\n✓ Project costs: Updated',
    },
    {
      role: 'ai',
      type: 'workflow',
      content: '📨 ACTIONS TRIGGERED\n\n🔔 Invoice emailed to ABC Corp\n📅 Due date added to calendar: 15 March 2026\n📊 Project P&L updated\n💰 Cash flow forecast adjusted\n\n💡 Say "Check project profitability" for a full breakdown.',
    },
  ];

  useEffect(() => {
    if (step < conversation.length - 1) {
      const nextMessage = conversation[step + 1];
      let delay = 1500;
      if (nextMessage?.role === 'user') delay = 2500;
      else if (conversation[step]?.type === 'processing') delay = 1000;

      const timer = setTimeout(() => {
        if (nextMessage?.role === 'ai') {
          setIsTyping(true);
          setTimeout(() => { setIsTyping(false); setStep(prev => prev + 1); }, 800);
        } else {
          setStep(prev => prev + 1);
        }
      }, delay);
      return () => clearTimeout(timer);
    } else {
      const resetTimer = setTimeout(() => setStep(0), 8000);
      return () => clearTimeout(resetTimer);
    }
  }, [step]);

  return (
    <section className="ai-demo">
      <div className="container">
        {!hideHeader && (
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">AI-Powered</span>
            <h2 className="ai-demo-title">See AI in Action</h2>
            <p className="ai-demo-subtitle">Natural language to complete business + accounting automation</p>
          </motion.div>
        )}

        <motion.div className="demo-container" variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div className="demo-header">
            <div className="demo-avatar"><Cpu size={20} /></div>
            <div>
              <h4>SiyaBusa AI Assistant</h4>
              <span className="online-status"><span className="status-dot"></span> Always online</span>
            </div>
          </div>

          <div className="demo-messages">
            {conversation.slice(0, step + 1).map((msg, i) => (
              <motion.div key={i} className={`demo-message ${msg.role} ${msg.type || ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                {msg.role === 'ai' && (<div className="message-header"><Sparkles size={14} /><span>SiyaBusa AI</span></div>)}
                <pre>{msg.content}</pre>
              </motion.div>
            ))}
            {isTyping && (<div className="typing-indicator"><span></span><span></span><span></span></div>)}
          </div>

          <div className="demo-input">
            <input type="text" placeholder="Try: 'Check project profitability' or 'Run payroll'" disabled />
            <button disabled><MessageSquare size={18} /></button>
          </div>

          <div className="demo-footer">
            <div className="compliance-badges">
              <span className="badge"><Shield size={12} /> Audit Ready</span>
              <span className="badge"><Lock size={12} /> POPIA Compliant</span>
              <span className="badge"><FileCheck size={12} /> IFRS/SARS</span>
            </div>
          </div>
        </motion.div>

        <motion.p className="demo-caption" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}>
          Every transaction creates a complete audit trail. Every entry is compliance-checked in real-time.
          <strong> Walk into any audit with confidence.</strong>
        </motion.p>
      </div>
    </section>
  );
};

// ─── Additional Modules ───
export const AdditionalModules: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const additionalModules = [
    { icon: <Landmark size={20} />, name: 'Banking Hub', desc: 'Bank reconciliation & cash management' },
    { icon: <Briefcase size={20} />, name: 'Practice Hub', desc: 'Professional services & time tracking' },
    { icon: <FileText size={20} />, name: 'Proposals', desc: 'Professional proposals & pitch decks' },
    { icon: <MessageSquare size={20} />, name: 'Communications', desc: 'Video meetings, messaging & collaboration' },
    { icon: <Settings size={20} />, name: 'Multi-Entity', desc: 'Consolidation & intercompany transactions' },
    { icon: <Sparkles size={20} />, name: 'AI Assistant', desc: 'Natural language queries & automation' },
  ];

  return (
    <section className="additional-modules">
      <div className="container">
        {!hideHeader && (
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">And More</span>
            <h2>Plus Everything Else You Need</h2>
          </motion.div>
        )}

        <motion.div className="additional-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {additionalModules.map((mod, i) => (
            <motion.div key={i} className="additional-item" variants={fadeInUp}>
              <div className="additional-icon">{mod.icon}</div>
              <div>
                <h4>{mod.name}</h4>
                <p>{mod.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ─── ROI Calculator ───
export const ROICalculator: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState(50);
  const [transactions, setTransactions] = useState(1000);

  const savings = Math.round(employees * 45000 + transactions * 8);
  const hours = Math.round(employees * 5 + transactions * 0.01);
  const roi = Math.round((savings / (employees * 3500)) * 100);

  return (
    <section className="roi-calculator" id="roi">
      <div className="container">
        {!hideHeader && (
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">Calculate Your ROI</span>
            <h2>Your Investment, Quantified</h2>
            <p>See how much time and money SiyaBusa can save your business</p>
          </motion.div>
        )}

        <motion.div className="calculator-container" variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div className="calculator-grid">
            <div className="calculator-inputs">
              <h4>Tell us about your business</h4>
              <div className="input-group">
                <label><Users size={18} /> Team Size</label>
                <input type="range" min="10" max="500" value={employees} onChange={(e) => setEmployees(Number(e.target.value))} />
                <div className="input-value-row">
                  <span className="input-hint">10</span>
                  <span className="input-value">{employees} employees</span>
                  <span className="input-hint">500+</span>
                </div>
              </div>
              <div className="input-group">
                <label><BarChart3 size={18} /> Monthly Transactions</label>
                <input type="range" min="100" max="50000" step="100" value={transactions} onChange={(e) => setTransactions(Number(e.target.value))} />
                <div className="input-value-row">
                  <span className="input-hint">100</span>
                  <span className="input-value">{transactions.toLocaleString()}</span>
                  <span className="input-hint">50K+</span>
                </div>
              </div>
            </div>

            <div className="calculator-results">
              <h4>Your Estimated Returns</h4>
              <div className="result-card highlight">
                <div className="result-icon"><CircleDollarSign size={28} /></div>
                <div className="result-value">R{savings.toLocaleString()}</div>
                <div className="result-label">Estimated Annual Savings*</div>
              </div>
              <div className="result-card">
                <div className="result-icon"><Clock size={28} /></div>
                <div className="result-value">{hours.toLocaleString()}</div>
                <div className="result-label">Estimated Hours Saved/Year*</div>
              </div>
              <div className="result-card">
                <div className="result-icon"><TrendingUp size={28} /></div>
                <div className="result-value">{roi}%</div>
                <div className="result-label">Estimated ROI*</div>
              </div>
            </div>
          </div>

          <div className="calculator-cta">
            <button className="btn-primary btn-large" onClick={() => navigate('/demo')}>
              Get Your Custom ROI Analysis <ArrowRight size={18} />
            </button>
            <p className="cta-note">Free consultation • No commitment • We'll be in touch promptly</p>
            <p className="roi-disclaimer">*These figures are illustrative estimates only and do not constitute a guarantee of actual savings.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ─── Demo Form ───
export const DemoForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', company: '', phone: '', employees: '', industry: '', message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const response = await fetch('/api/demo/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          companyName: formData.company,
          phone: formData.phone,
          industry: formData.industry,
          utmSource: urlParams.get('utm_source'),
          utmMedium: urlParams.get('utm_medium'),
          utmCampaign: urlParams.get('utm_campaign'),
          referrerUrl: document.referrer || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to connect. Please try again or email demo@siyabusaerp.co.za');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="demo-form-section" id="demo-form">
        <div className="container">
          <motion.div className="demo-success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <div className="success-icon"><Check size={48} /></div>
            <h2>Your Demo is Ready, {formData.name}!</h2>
            <p>We've sent your login credentials to <strong>{formData.email}</strong>. Check your inbox (and spam folder) for an email with your demo access details.</p>
            <p className="success-email">Go to <a href="https://demo.siyabusaerp.co.za" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', fontWeight: 600 }}>demo.siyabusaerp.co.za</a> to start exploring.</p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="demo-form-section" id="demo-form">
      <div className="container">
        <div className="demo-form-grid">
          <motion.div className="demo-form-content" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2>Schedule Your Personalised Demo</h2>
            <p>See how SiyaBusa can transform your business operations and compliance.</p>
            <ul className="demo-benefits">
              <li><Check size={18} /> 30-minute personalised walkthrough</li>
              <li><Check size={18} /> See modules relevant to your business</li>
              <li><Check size={18} /> Live AI assistant demonstration</li>
              <li><Check size={18} /> Audit & compliance deep-dive</li>
              <li><Check size={18} /> Custom ROI analysis</li>
            </ul>
            <div className="demo-guarantee">
              <Shield size={20} />
              <span>No credit card required. No obligation.</span>
            </div>
          </motion.div>

          <motion.form className="demo-form" onSubmit={handleSubmit} variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Thabo Mokoena" required />
            </div>
            <div className="form-group">
              <label>Work Email *</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="thabo@company.co.za" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Company Name *</label>
                <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Company (Pty) Ltd" required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+27 XX XXX XXXX" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Team Size</label>
                <select value={formData.employees} onChange={(e) => setFormData({ ...formData, employees: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="1-10">1–10</option>
                  <option value="11-50">11–50</option>
                  <option value="51-200">51–200</option>
                  <option value="201-500">201–500</option>
                  <option value="500+">500+</option>
                </select>
              </div>
              <div className="form-group">
                <label>Industry</label>
                <select value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="professional-services">Professional Services</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="retail-wholesale">Retail & Wholesale</option>
                  <option value="construction">Construction</option>
                  <option value="consulting">Consulting</option>
                  <option value="finance">Financial Services</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="technology">Technology</option>
                  <option value="non-profit">Non-Profit / NGO</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>What are your biggest challenges?</label>
              <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="e.g. Audit preparation takes too long, manual data entry between systems, SARS compliance concerns..." rows={3} />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn-primary large full-width" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : (<><Play size={18} /> Request Your Demo</>)}
            </button>

            <p className="form-note">
              By submitting, you agree to our <Link to="/privacy">Privacy Policy</Link>. We'll never share your information.
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
};
