/**
 * SiyaBusa ERP - Pricing Page
 * Competitive positioning against Xero, QuickBooks, Sage
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Check, X, Zap, Building2, Rocket, Crown,
  Phone, ArrowRight, Shield, Users,
  ChevronDown, Minus, TrendingDown, Globe2,
  Puzzle, HeartHandshake, Lock, BarChart3,
  Calculator, AlertTriangle, RefreshCw, Clock,
  DollarSign, Layers, FileCheck
} from 'lucide-react';
import { WebsiteLayout, fadeInUp, staggerContainer } from './LandingPage/LandingPage';
import './Pricing.css';

/* ── Animated counter hook ── */
function useCounter(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref as any, { once: true });

  useEffect(() => {
    if (!startOnView || !inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration, startOnView]);

  return { count, ref };
}

/* ── Pricing tiers ── */
interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  perUserPrice: number;
  maxUsers: number | 'unlimited';
  popular?: boolean;
  features: string[];
  notIncluded?: string[];
  cta: string;
  icon: React.ReactNode;
  gradient: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For small businesses getting started',
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    perUserPrice: 299,
    maxUsers: 10,
    icon: <Zap size={24} />,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    features: [
      'Financial Accounting (GL, AP, AR)',
      'Sales & Invoicing',
      'Basic Inventory',
      'HR Essentials',
      'Up to 10 users',
      '1 Warehouse',
      'Email support',
    ],
    notIncluded: ['Multi-Entity', 'Asset Management', 'API Access'],
    cta: 'Start Free Trial',
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'For growing companies that need more',
    monthlyPrice: 3999,
    yearlyPrice: 39990,
    perUserPrice: 449,
    maxUsers: 50,
    popular: true,
    icon: <Building2 size={24} />,
    gradient: 'linear-gradient(135deg, #00D4AA 0%, #00A884 100%)',
    features: [
      'Everything in Starter, plus:',
      'Purchase Management',
      'Full Inventory & Warehousing',
      'Complete HR & Payroll',
      'Cash Management & Banking',
      'Projects Hub',
      'Up to 50 users · 5 Warehouses',
      'Phone & email support',
    ],
    notIncluded: ['Multi-Entity', 'Custom Integrations'],
    cta: 'Start Free Trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Full power for established businesses',
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    perUserPrice: 599,
    maxUsers: 200,
    icon: <Rocket size={24} />,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    features: [
      'Everything in Professional, plus:',
      'All 25+ Modules Included',
      'Multi-Entity & Consolidation',
      'Asset Management (IAS 16)',
      'Audit-Ready Hub & SARS Sentinel',
      'Manufacturing · Practice Mgmt',
      'Up to 200 users · Unlimited WHs',
      'Priority support (4hr SLA)',
    ],
    cta: 'Contact Sales',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    tagline: 'Custom-tailored for large organisations',
    monthlyPrice: 24999,
    yearlyPrice: 249990,
    perUserPrice: 499,
    maxUsers: 'unlimited',
    icon: <Crown size={24} />,
    gradient: 'linear-gradient(135deg, #F6D242 0%, #FF6B6B 100%)',
    features: [
      'Everything in Enterprise, plus:',
      'Unlimited Users & Entities',
      'Custom Integrations & API',
      'White-labeling Available',
      'On-premise Option',
      '24/7 Support (2hr SLA)',
      'Dedicated Implementation Team',
      'Custom Development Hours',
    ],
    cta: 'Contact Sales',
  },
];

/* ── Competitor comparison data ── */
/* Competitor comparison based on publicly available information as of January 2026.
   Features and pricing may have changed. Xero®, QuickBooks®, and Sage® are registered
   trademarks of their respective owners. SiyaBusa is not affiliated with these companies. */
const competitorRows = [
  { feature: 'Accounting & GL', siyabusa: true, xero: true, quickbooks: true, sage: true },
  { feature: 'Invoicing & Quotes', siyabusa: true, xero: true, quickbooks: true, sage: true },
  { feature: 'HR & Payroll', siyabusa: true, xero: 'Add-on', quickbooks: 'Add-on', sage: 'Add-on' },
  { feature: 'Inventory Management', siyabusa: true, xero: 'Add-on', quickbooks: 'Limited', sage: 'Add-on' },
  { feature: 'Warehouse Management', siyabusa: true, xero: false, quickbooks: false, sage: 'Add-on' },
  { feature: 'Purchase Orders', siyabusa: true, xero: true, quickbooks: 'Plus only', sage: true },
  { feature: 'Project Management', siyabusa: true, xero: 'Add-on', quickbooks: false, sage: false },
  { feature: 'Cash & Bank Reconciliation', siyabusa: true, xero: true, quickbooks: true, sage: true },
  { feature: 'Manufacturing / BOM', siyabusa: true, xero: false, quickbooks: false, sage: 'Premium' },
  { feature: 'Asset Management (IAS 16)', siyabusa: true, xero: 'Add-on', quickbooks: false, sage: 'Add-on' },
  { feature: 'Multi-Entity Consolidation', siyabusa: true, xero: 'Add-on', quickbooks: false, sage: 'Premium' },
  { feature: 'SARS Integration', siyabusa: true, xero: 'Limited', quickbooks: false, sage: 'Partial' },
  { feature: 'Audit-Ready Reports', siyabusa: true, xero: false, quickbooks: false, sage: false },
  { feature: 'Built-in CRM', siyabusa: true, xero: 'Basic', quickbooks: false, sage: false },
  { feature: 'Proposals & Pitches', siyabusa: true, xero: false, quickbooks: false, sage: false },
  { feature: 'ZAR Pricing (no forex risk)', siyabusa: true, xero: false, quickbooks: false, sage: true },
  { feature: 'SA-Based Support', siyabusa: true, xero: 'Limited', quickbooks: false, sage: true },
];

/* ── Hidden cost data ── */
const hiddenCosts = [
  { tool: 'Typical Accounting Platform', base: '~R900', addons: ['Payroll add-on: ~R500+', 'Inventory add-on: ~R1,500+', 'Projects add-on: ~R350+', 'Receipt capture: ~R400+'], total: '~R3,650+' },
  { tool: 'Alternative Platform', base: '~R750', addons: ['Payroll add-on: ~R600+', 'Limited inventory', 'No project management', 'Third-party CRM: ~R500+'], total: '~R2,500+' },
  { tool: 'SiyaBusa Professional', base: 'R3,999', addons: ['Payroll: Included', 'Inventory & WH: Included', 'Projects: Included', 'CRM & Banking: Included'], total: 'R3,999', highlight: true },
];

/* ── FAQs ── */
const faqs = [
  { q: 'How do you compare to other accounting platforms?', a: 'SiyaBusa includes payroll, inventory, warehouse management, projects, and SARS compliance in one platform as standard. Many competing platforms require separate paid add-ons or third-party integrations for these features. We also price exclusively in Rands.' },
  { q: 'Is there a free trial?', a: 'Yes! All plans include a 14-day free trial with full access to every feature. No credit card required.' },
  { q: 'Can I migrate from another platform?', a: 'Yes. We provide guided migration support. Our team will help import your chart of accounts, customer/supplier data, and opening balances. Migration timelines vary depending on data volume and complexity.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, EFT, and debit orders for South African customers. All billing is in ZAR.' },
  { q: 'Is my data secure?', a: 'Yes. We use AES-256 encryption, and your data is hosted on secure AWS infrastructure with regular backups and high-availability architecture.' },
  { q: 'Can I change plans later?', a: 'Of course. Upgrade or downgrade at any time. Changes take effect on your next billing cycle with no penalties.' },
  { q: 'What modules are included?', a: 'Core modules (Financial, Sales, HR, Inventory) are in all plans. Advanced modules like Audit-Ready Hub, SARS Sentinel, Manufacturing, and Practice Management are available from Enterprise.' },
];

/* ── Component ── */
const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const stat1 = useCounter(25, 1500);
  const stat2 = useCounter(99, 2000);

  const getPrice = (tier: PricingTier) => billingCycle === 'monthly' ? tier.monthlyPrice : Math.round(tier.yearlyPrice / 12);
  const getSavings = (tier: PricingTier) => { const m = tier.monthlyPrice * 12; return Math.round(((m - tier.yearlyPrice) / m) * 100); };
  const handleSelectPlan = (id: string) => id === 'enterprise' || id === 'corporate' ? navigate('/demo') : navigate('/signup?plan=' + id);

  const renderCellValue = (val: boolean | string) => {
    if (val === true) return <Check size={16} className="tbl-check" />;
    if (val === false) return <X size={16} className="tbl-x" />;
    return <span className="tbl-text-val">{val}</span>;
  };

  return (
    <WebsiteLayout title="Pricing — SiyaBusa ERP | South Africa's Complete Business Platform">

      {/* ═══ HERO ═══ */}
      <section className="pricing-hero">
        <div className="pricing-hero-bg">
          <div className="pricing-hero-orb pricing-hero-orb-1" />
          <div className="pricing-hero-orb pricing-hero-orb-2" />
          <div className="pricing-hero-grid-lines" />
        </div>
        <div className="container">
          <motion.div className="pricing-hero-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="pricing-hero-badges">
              <span className="pricing-hero-badge">
                <Shield size={14} /> SARS Compliant
              </span>
              <span className="pricing-hero-badge accent">
                <TrendingDown size={14} /> Significant savings vs multiple add-ons*
              </span>
            </div>
            <h1>Stop Paying for<br /><span className="pricing-gradient-text">Multiple Tools</span> When You Need <span className="pricing-gradient-text">One</span></h1>
            <p className="pricing-hero-sub">
              Many accounting platforms charge extra for payroll, inventory, projects, and compliance.
              SiyaBusa gives you <strong>everything in one platform</strong> — built for South African businesses, priced in Rands.
            </p>

            {/* Billing Toggle */}
            <div className="pricing-billing-toggle">
              <span className={billingCycle === 'monthly' ? 'active' : ''}>Monthly</span>
              <button className={`pricing-toggle-switch ${billingCycle}`} onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}>
                <span className="pricing-toggle-indicator" />
              </button>
              <span className={billingCycle === 'yearly' ? 'active' : ''}>
                Yearly <span className="pricing-save-badge">Save up to 17%</span>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ TRUST BAR ═══ */}
      <section className="pricing-trust-bar">
        <div className="container">
          <motion.div className="pricing-trust-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div className="pricing-trust-stat" variants={fadeInUp}>
              <span className="pricing-trust-number" ref={stat1.ref}>{stat1.count}+</span>
              <span className="pricing-trust-label">Modules Included</span>
            </motion.div>
            <motion.div className="pricing-trust-stat" variants={fadeInUp}>
              <span className="pricing-trust-number" ref={stat2.ref}>{stat2.count}.9%</span>
              <span className="pricing-trust-label">Uptime Target</span>
            </motion.div>
            <motion.div className="pricing-trust-stat" variants={fadeInUp}>
              <span className="pricing-trust-number">Fast</span>
              <span className="pricing-trust-label">Guided Migration</span>
            </motion.div>
            <motion.div className="pricing-trust-stat" variants={fadeInUp}>
              <span className="pricing-trust-number">ZAR</span>
              <span className="pricing-trust-label">Rand-Based Pricing</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ PRICING CARDS ═══ */}
      <section className="pricing-cards-section">
        <div className="container">
          <motion.div className="pricing-cards-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {pricingTiers.map((tier) => (
              <motion.div key={tier.id} className={`pricing-card ${tier.popular ? 'popular' : ''}`} variants={fadeInUp}>
                {tier.popular && <div className="pricing-popular-badge">Most Popular</div>}
                <div className="pricing-card-icon-wrap" style={{ background: tier.gradient }}>
                  {tier.icon}
                </div>
                <div className="pricing-card-header">
                  <h3>{tier.name}</h3>
                  <p>{tier.tagline}</p>
                </div>
                <div className="pricing-card-price">
                  <div className="pricing-amount">
                    <span className="pricing-currency">R</span>
                    <span className="pricing-value">{getPrice(tier).toLocaleString()}</span>
                    <span className="pricing-period">/mo</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="pricing-yearly-note">
                      R{tier.yearlyPrice.toLocaleString()}/yr <span className="pricing-savings">Save {getSavings(tier)}%</span>
                    </p>
                  )}
                  <p className="pricing-per-user">+ R{tier.perUserPrice}/user/month</p>
                </div>
                <ul className="pricing-features-list">
                  {tier.features.map((f, i) => (
                    <li key={i}><Check size={14} className="pricing-check" />{f}</li>
                  ))}
                  {tier.notIncluded?.map((f, i) => (
                    <li key={`n-${i}`} className="pricing-not-included"><X size={14} className="pricing-x" />{f}</li>
                  ))}
                </ul>
                <button className={`pricing-cta-btn ${tier.popular ? 'primary' : 'secondary'}`} onClick={() => handleSelectPlan(tier.id)}>
                  {tier.cta} <ArrowRight size={16} />
                </button>
              </motion.div>
            ))}
          </motion.div>
          <p className="pricing-trial-note">
            <Lock size={14} /> All plans include a <strong>14-day free trial</strong>. No credit card required.
          </p>
          <p className="pricing-vat-note">All prices exclude VAT. Prices are subject to change. See <a href="/terms">Terms & Conditions</a> for full details.</p>
        </div>
      </section>

      {/* ═══ WHY SWITCH — THE REAL COST ═══ */}
      <section className="pricing-hidden-cost-section">
        <div className="container">
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">The Real Cost</span>
            <h2>What You're <em>Actually</em> Paying With Other Tools</h2>
            <p className="section-subtitle">
              Some platforms look affordable — until you add payroll, inventory, projects, and compliance modules separately.
            </p>
          </motion.div>

          <motion.div className="hidden-cost-cards" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {hiddenCosts.map((item, i) => (
              <motion.div key={i} className={`hidden-cost-card ${item.highlight ? 'highlight' : ''}`} variants={fadeInUp}>
                <div className="hidden-cost-header">
                  <h4>{item.tool}</h4>
                  {item.highlight && <span className="hidden-cost-winner">Best Value</span>}
                </div>
                <div className="hidden-cost-base">
                  <span className="hidden-cost-label">Base plan</span>
                  <span className="hidden-cost-price">{item.base}/mo</span>
                </div>
                <ul className="hidden-cost-addons">
                  {item.addons.map((addon, j) => (
                    <li key={j}>
                      {item.highlight ? <Check size={14} className="tbl-check" /> : <AlertTriangle size={14} className="hidden-cost-warn" />}
                      {addon}
                    </li>
                  ))}
                </ul>
                <div className="hidden-cost-total">
                  <span>Real monthly cost</span>
                  <span className={`hidden-cost-total-price ${item.highlight ? 'green' : 'red'}`}>{item.total}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ COMPETITOR COMPARISON TABLE ═══ */}
      <section className="pricing-versus-section">
        <div className="container">
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">Head-to-Head</span>
            <h2>SiyaBusa vs The Competition</h2>
            <p className="section-subtitle">
              Feature-by-feature comparison based on publicly available information as of January 2026.
            </p>
          </motion.div>

          <motion.div className="pricing-table-wrapper" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <table className="pricing-versus-table">
              <thead>
                <tr>
                  <th className="versus-feature-col">Feature</th>
                  <th className="versus-siyabusa-col">
                    <div className="versus-logo-cell">
                      <span className="versus-logo-badge">SiyaBusa</span>
                    </div>
                  </th>
                  <th>Xero</th>
                  <th>QuickBooks</th>
                  <th>Sage</th>
                </tr>
              </thead>
              <tbody>
                {competitorRows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.feature}</td>
                    <td className="versus-siyabusa-cell">{renderCellValue(row.siyabusa)}</td>
                    <td>{renderCellValue(row.xero)}</td>
                    <td>{renderCellValue(row.quickbooks)}</td>
                    <td>{renderCellValue(row.sage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pricing-table-disclaimer">
              Xero®, QuickBooks®, and Sage® are registered trademarks of their respective owners. Comparison based on publicly available feature lists as of January 2026. Features, availability, and pricing may vary by region and plan. SiyaBusa is not affiliated with or endorsed by these companies.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ SA ADVANTAGES ═══ */}
      <section className="pricing-sa-section">
        <div className="container">
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge sa-badge">🇿🇦 Built for South Africa</span>
            <h2>Why SA Businesses Choose SiyaBusa</h2>
          </motion.div>

          <motion.div className="pricing-sa-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { icon: <FileCheck size={28} />, title: 'SARS-Ready From Day 1', desc: 'VAT 201, EMP501, IT14, IRP5 — all built in. No third-party tax tools needed.', color: '#00D4AA' },
              { icon: <DollarSign size={28} />, title: 'Priced in Rands', desc: 'No USD invoices, no forex fluctuation. What you see is what you pay — always in ZAR.', color: '#667eea' },
              { icon: <HeartHandshake size={28} />, title: 'Local Support Team', desc: 'Real people in South Africa who understand BEE, CIPC, and how SA businesses operate.', color: '#f5576c' },
              { icon: <Layers size={28} />, title: 'One Platform, Not Five', desc: 'Consolidate your accounting, payroll, inventory, projects, and compliance tools into one integrated system.', color: '#F6D242' },
              { icon: <BarChart3 size={28} />, title: 'Audit-Ready Reports', desc: 'IAS/IFRS-compliant reports that your auditors will love. No more year-end panic.', color: '#00A884' },
              { icon: <RefreshCw size={28} />, title: 'Guided Migration Support', desc: 'We help you import your chart of accounts, customer and supplier data, and opening balances with dedicated support.', color: '#764ba2' },
            ].map((item, i) => (
              <motion.div key={i} className="pricing-sa-card" variants={fadeInUp}>
                <div className="pricing-sa-icon" style={{ background: `${item.color}15`, color: item.color }}>
                  {item.icon}
                </div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ PLAN COMPARISON TABLE ═══ */}
      <section className="pricing-comparison-section">
        <div className="container">
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">Compare Plans</span>
            <h2>Detailed Plan Comparison</h2>
          </motion.div>

          <motion.div className="pricing-table-wrapper" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <table className="pricing-comparison-table">
              <thead>
                <tr>
                  <th className="pricing-table-feature-col">Feature</th>
                  <th>Starter</th>
                  <th className="pricing-table-popular">Professional</th>
                  <th>Enterprise</th>
                  <th>Corporate</th>
                </tr>
              </thead>
              <tbody>
                <tr className="pricing-table-category"><td colSpan={5}>Core Modules</td></tr>
                <tr><td>Financial Accounting (GL, AP, AR)</td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>Sales & Invoicing</td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>Inventory Management</td><td>Basic</td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>HR Essentials</td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>Purchase Management</td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>

                <tr className="pricing-table-category"><td colSpan={5}>Operations</td></tr>
                <tr><td>Full Payroll Processing</td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>Warehouse Management</td><td>1 Location</td><td>5 Locations</td><td>Unlimited</td><td>Unlimited</td></tr>
                <tr><td>Cash Management & Banking</td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>Projects Hub</td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>Manufacturing (BOM, Work Orders)</td><td><Minus size={16} className="tbl-minus" /></td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>

                <tr className="pricing-table-category"><td colSpan={5}>Compliance & Audit</td></tr>
                <tr><td>Audit Trail</td><td>Basic</td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>Audit-Ready Hub</td><td><Minus size={16} className="tbl-minus" /></td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>SARS Sentinel (Regulatory)</td><td><Minus size={16} className="tbl-minus" /></td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>Asset Management (IAS 16)</td><td><Minus size={16} className="tbl-minus" /></td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>Multi-Entity & Consolidation</td><td><Minus size={16} className="tbl-minus" /></td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>

                <tr className="pricing-table-category"><td colSpan={5}>Support & Access</td></tr>
                <tr><td>Max Users</td><td>10</td><td>50</td><td>200</td><td>Unlimited</td></tr>
                <tr><td>Support Level</td><td>Email</td><td>Phone & Email</td><td>Priority (4hr SLA)</td><td>24/7 (2hr SLA)</td></tr>
                <tr><td>Account Manager</td><td><Minus size={16} className="tbl-minus" /></td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
                <tr><td>API Access</td><td><Minus size={16} className="tbl-minus" /></td><td><Minus size={16} className="tbl-minus" /></td><td><Check size={16} className="tbl-check" /></td><td><Check size={16} className="tbl-check" /></td></tr>
              </tbody>
              <tfoot>
                <tr>
                  <td></td>
                  <td><button className="pricing-table-btn secondary" onClick={() => navigate('/signup?plan=starter')}>Start Trial</button></td>
                  <td><button className="pricing-table-btn primary" onClick={() => navigate('/signup?plan=professional')}>Start Trial</button></td>
                  <td><button className="pricing-table-btn secondary" onClick={() => navigate('/demo')}>Contact Sales</button></td>
                  <td><button className="pricing-table-btn secondary" onClick={() => navigate('/demo')}>Contact Sales</button></td>
                </tr>
              </tfoot>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="pricing-faq-section">
        <div className="container">
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2>Frequently Asked Questions</h2>
          </motion.div>
          <motion.div className="pricing-faq-list" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {faqs.map((faq, idx) => (
              <motion.div key={idx} className={`pricing-faq-item ${expandedFaq === idx ? 'expanded' : ''}`} onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)} variants={fadeInUp}>
                <div className="pricing-faq-question">
                  <span>{faq.q}</span>
                  <ChevronDown size={20} className={`pricing-faq-chevron ${expandedFaq === idx ? 'rotated' : ''}`} />
                </div>
                {expandedFaq === idx && (
                  <motion.div className="pricing-faq-answer" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
                    {faq.a}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="pricing-final-cta">
        <div className="pricing-final-cta-bg">
          <div className="pricing-hero-orb pricing-hero-orb-1" />
          <div className="pricing-hero-orb pricing-hero-orb-2" />
        </div>
        <div className="container">
          <motion.div className="pricing-final-cta-content" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2>Ready to Simplify Your Business Operations?</h2>
            <p>Discover how SiyaBusa can streamline your operations with one integrated platform.</p>
            <div className="pricing-final-cta-buttons">
              <button className="pricing-cta-btn primary large" onClick={() => navigate('/signup')}>
                Start 14-Day Free Trial <ArrowRight size={18} />
              </button>
              <button className="pricing-cta-btn ghost large" onClick={() => navigate('/demo')}>
                <Phone size={18} /> Talk to Sales
              </button>
            </div>
            <div className="pricing-final-trust">
              <span><Lock size={14} /> No credit card required</span>
              <span><Clock size={14} /> Quick & easy setup</span>
              <span><RefreshCw size={14} /> Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </section>

    </WebsiteLayout>
  );
};

export default Pricing;
