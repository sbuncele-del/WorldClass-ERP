/**
 * SiyaBusa ERP - Pricing Page
 * Founding Member Launch Pricing — R1,499/mo, everything included
 * First 50 companies only, price locked for 12 months
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
  DollarSign, Layers, FileCheck, Star, Gift, Flame
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

/* ── What's included (every module) ── */
const allModules = [
  { category: 'Financial', items: ['General Ledger (GL)', 'Accounts Payable (AP)', 'Accounts Receivable (AR)', 'Cash Management & Banking', 'Asset Management (IAS 16)', 'Multi-Entity & Consolidation'] },
  { category: 'Sales & CRM', items: ['Invoicing & Quotes', 'Customer Management', 'Sales Pipeline', 'Proposals & Pitch Builder'] },
  { category: 'Operations', items: ['Purchase Management', 'Inventory Management', 'Warehouse Management', 'Manufacturing (BOM, Work Orders)'] },
  { category: 'People', items: ['HR Management', 'Full Payroll Processing', 'Leave & Attendance', 'Employee Self-Service'] },
  { category: 'Projects', items: ['Projects Hub', 'Practice Management', 'Time Tracking', 'Resource Allocation'] },
  { category: 'Compliance & Audit', items: ['SARS Sentinel (VAT, EMP501, IT14)', 'Audit-Ready Hub', 'Audit Trail', 'IFRS/IAS Compliant Reports'] },
  { category: 'Platform', items: ['AI Assistant', 'Communications Hub (Video, Chat)', 'Dashboard & Analytics', 'API Access'] },
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
  { tool: 'SiyaBusa (Founding Member)', base: 'R299/user', addons: ['Payroll: Included', 'Inventory & WH: Included', 'Projects: Included', 'Every module: Included'], total: 'R1,499 (10 users)', highlight: true },
];

/* ── FAQs ── */
const faqs = [
  { q: 'What is Founding Member pricing?', a: 'Our Founding Member offer gives early customers full access to every SiyaBusa module at R299/user/month, or R1,499/month for 10 users. This rate is locked for 12 months from your sign-up date. After 12 months, you\'ll transition to standard pricing (with advance notice); founding members will receive priority support.' },
  { q: 'What\'s included?', a: 'Everything. Every module — Financial Accounting, Sales & CRM, HR & Payroll, Inventory, Warehouse Management, Manufacturing, Projects, Cash Management, Asset Management, Audit-Ready Hub, SARS Sentinel, AI Assistant, and more. No gated features. No premium tiers.' },
  { q: 'Is there a free trial?', a: 'Yes! Every Founding Member gets a 14-day free trial with full access to all features. No credit card required to start.' },
  { q: 'How do you compare to other accounting platforms?', a: 'Many platforms charge R900+ for basic accounting, then R500+ for payroll, R1,500+ for inventory, R350+ for projects — totalling R3,650+/month. SiyaBusa gives you everything from R299/user/month, or R1,499/mo for 10 users. That\'s a potential saving of over R2,000/month.' },
  { q: 'Can I migrate from Xero, Sage, or QuickBooks?', a: 'Yes. We provide guided migration support. Our team will help import your chart of accounts, customer/supplier data, and opening balances. For Founding Members, migration assistance is included at no extra charge.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, EFT, and debit orders for South African customers. All billing is in ZAR — no forex surprises.' },
  { q: 'Is my data secure?', a: 'Yes. We use AES-256 encryption, and your data is hosted on secure infrastructure in South Africa with regular backups and high-availability architecture.' },
  { q: 'What happens after the 12-month lock-in?', a: 'After your Founding Member period, we\'ll transition you to our standard pricing with at least 30 days\' notice. Founding Members will always receive preferential rates and priority support as a thank-you for believing in us early.' },
  { q: 'How many spots are left?', a: 'Founding Member pricing is limited to 45 spots. Once all spots are taken, standard pricing will apply for new sign-ups. Secure your spot now.' },
];

/* ── Founding Member spots ── */
const TOTAL_FOUNDING_SPOTS = 45;
const SPOTS_CLAIMED = 0; // Update as customers sign up

/* ── Component ── */
const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const stat1 = useCounter(15, 1500);
  const stat2 = useCounter(99, 2000);
  const spotsLeft = TOTAL_FOUNDING_SPOTS - SPOTS_CLAIMED;

  const monthlyPrice = 299;
  const yearlyPrice = 2990; // ~R249/mo — save 17%
  const tenUserPrice = 1500;
  const tenUserYearly = 14990; // save ~17%
  const getDisplayPrice = () => billingCycle === 'monthly' ? monthlyPrice : Math.round(yearlyPrice / 12);
  const getTenUserPrice = () => billingCycle === 'monthly' ? tenUserPrice : Math.round(tenUserYearly / 12);
  const getYearlySavings = () => Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);

  const renderCellValue = (val: boolean | string) => {
    if (val === true) return <Check size={16} className="tbl-check" />;
    if (val === false) return <X size={16} className="tbl-x" />;
    return <span className="tbl-text-val">{val}</span>;
  };

  return (
    <WebsiteLayout title="Founding Member Pricing — SiyaBusa ERP | R299/user/mo" description="SiyaBusa ERP Founding Member pricing: R299/user/mo or R1,499/mo for 10 users. All 17 modules included — Financial Accounting, HR & Payroll, Inventory, CRM, Manufacturing, SARS Compliance." canonical="https://siyabusaerp.co.za/pricing">

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
              <span className="pricing-hero-badge accent">
                <Flame size={14} /> Founding Member Pricing — Limited availability (45 spots)
              </span>
              <span className="pricing-hero-badge">
                <Shield size={14} /> SARS Compliant
              </span>
            </div>
            <h1>One Price.<br /><span className="pricing-gradient-text">Per User, Per Month.</span><br />No Hidden Fees.</h1>
            <p className="pricing-hero-sub">
              Get <strong>every module</strong> — Financial Accounting, HR & Payroll, Inventory, CRM, Manufacturing,
              Compliance, AI Assistant, and more — from just <strong>R299/user/mo</strong>. Or get 10 users for <strong>R1,499/mo</strong>. Built for South African businesses, priced in Rands.
            </p>

            {/* Billing Toggle */}
            <div className="pricing-billing-toggle">
              <span className={billingCycle === 'monthly' ? 'active' : ''}>Monthly</span>
              <button className={`pricing-toggle-switch ${billingCycle}`} onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}>
                <span className="pricing-toggle-indicator" />
              </button>
              <span className={billingCycle === 'yearly' ? 'active' : ''}>
                Yearly <span className="pricing-save-badge">Save {getYearlySavings()}%</span>
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
              <span className="pricing-trust-number">{spotsLeft}</span>
              <span className="pricing-trust-label">Founding Spots Left</span>
            </motion.div>
            <motion.div className="pricing-trust-stat" variants={fadeInUp}>
              <span className="pricing-trust-number">ZAR</span>
              <span className="pricing-trust-label">Rand-Based Pricing</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ SINGLE PRICING CARD ═══ */}
      <section className="pricing-cards-section">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="pricing-card popular" style={{ position: 'relative' }}>
              <div className="pricing-popular-badge" style={{ background: 'linear-gradient(135deg, #F6D242 0%, #FF6B6B 100%)' }}>
                <Star size={14} style={{ marginRight: 6 }} /> Founding Member — {spotsLeft} of {TOTAL_FOUNDING_SPOTS} Spots Left
              </div>
              <div className="pricing-card-icon-wrap" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #00A884 100%)' }}>
                <Crown size={24} />
              </div>
              <div className="pricing-card-header">
                <h3>SiyaBusa ERP — Complete Platform</h3>
                <p>Every module. Every feature. Founders pricing. Locked for 12 months.</p>
              </div>
              <div className="pricing-card-price">
                <div className="pricing-amount">
                  <span className="pricing-currency">R</span>
                  <span className="pricing-value">{getDisplayPrice().toLocaleString()}</span>
                  <span className="pricing-period">/user/mo</span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="pricing-yearly-note">
                    R{yearlyPrice.toLocaleString()}/user/yr <span className="pricing-savings">Save {getYearlySavings()}%</span>
                  </p>
                )}
                <div style={{ marginTop: 16, padding: '16px 20px', background: 'rgba(0,212,170,0.08)', borderRadius: 12, border: '1px solid rgba(0,212,170,0.2)' }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#00D4AA' }}>
                    <Users size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    10-User Bundle: R{getTenUserPrice().toLocaleString()}/mo
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.7 }}>Save R{((getDisplayPrice() * 10) - getTenUserPrice()).toLocaleString()}/mo vs individual pricing</p>
                </div>
              </div>

              {/* Key highlights */}
              <ul className="pricing-features-list">
                <li><Check size={14} className="pricing-check" /><strong>Every Module Included</strong> — nothing gated or locked</li>
                <li><Check size={14} className="pricing-check" />Financial Accounting, Sales & CRM, HR & Payroll</li>
                <li><Check size={14} className="pricing-check" />Inventory, Warehouse, Manufacturing, Projects</li>
                <li><Check size={14} className="pricing-check" />Cash Management, Asset Management (IAS 16)</li>
                <li><Check size={14} className="pricing-check" />Audit-Ready Hub, SARS Sentinel, Compliance</li>
                <li><Check size={14} className="pricing-check" />AI Assistant, Communications Hub, API Access</li>
                <li><Check size={14} className="pricing-check" />Multi-Entity & Consolidation</li>
                <li><Check size={14} className="pricing-check" />10-user bundle: R1,499/mo (save 50%)</li>
                <li><Check size={14} className="pricing-check" />Phone & email support · Guided migration</li>
                <li><Check size={14} className="pricing-check" /><strong>Price locked for 12 months</strong></li>
              </ul>

              <button className="pricing-cta-btn primary" onClick={() => navigate('/signup?plan=founding-member')} style={{ width: '100%', fontSize: '1.1rem', padding: '16px 24px' }}>
                Claim Your Founding Member Spot <ArrowRight size={18} />
              </button>

              <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', opacity: 0.7, fontSize: '0.85rem' }}>
                <span><Lock size={12} /> No credit card required</span>
                <span><Gift size={12} /> 14-day free trial</span>
                <span><RefreshCw size={12} /> Cancel anytime</span>
              </div>
            </div>
          </motion.div>

          <p className="pricing-vat-note" style={{ marginTop: 24 }}>
            All prices exclude VAT. Founding Member rate is locked for 12 months from signup.
            After 12 months, standard pricing applies with 30 days' notice. See <a href="/terms">Terms & Conditions</a>.
          </p>

          {/* Need more? */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            style={{ maxWidth: 600, margin: '32px auto 0', padding: '24px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Need more than 10 users or custom requirements?</h4>
            <p style={{ margin: '0 0 16px', opacity: 0.7, fontSize: '0.9rem' }}>
              For 50+ users, dedicated infrastructure, white-labelling, or on-premise deployment — let's talk.
            </p>
            <button className="pricing-cta-btn secondary" onClick={() => navigate('/demo')}>
              <Phone size={16} /> Talk to Sales
            </button>
          </motion.div>
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

      {/* ═══ WHAT'S INCLUDED — ALL MODULES ═══ */}
      <section className="pricing-sa-section">
        <div className="container">
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge sa-badge">Everything Included</span>
            <h2>Every Module — From R299/user/mo</h2>
            <p className="section-subtitle">No premium tiers. No locked features. Every Founding Member gets the full platform.</p>
          </motion.div>

          <motion.div className="pricing-sa-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {allModules.map((group, i) => (
              <motion.div key={i} className="pricing-sa-card" variants={fadeInUp}>
                <h4>{group.category}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {group.items.map((item, j) => (
                    <li key={j} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                      <Check size={14} className="pricing-check" />{item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ SA ADVANTAGES ═══ */}
      <section className="pricing-comparison-section">
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
              { icon: <RefreshCw size={28} />, title: 'Free Migration Support', desc: 'Founding Members get guided migration at no extra charge — we import your data for you.', color: '#764ba2' },
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
            <h2>Join the First 50. Shape the Future.</h2>
            <p>Founding Members get every module from R299/user/mo — or R1,499/mo for 10 users. Locked for 12 months. Only {spotsLeft} spots remaining.</p>
            <div className="pricing-final-cta-buttons">
              <button className="pricing-cta-btn primary large" onClick={() => navigate('/signup?plan=founding-member')}>
                Claim Your Founding Member Spot <ArrowRight size={18} />
              </button>
              <button className="pricing-cta-btn ghost large" onClick={() => navigate('/demo')}>
                <Phone size={18} /> Talk to Sales
              </button>
            </div>
            <div className="pricing-final-trust">
              <span><Lock size={14} /> No credit card required</span>
              <span><Gift size={14} /> 14-day free trial</span>
              <span><Star size={14} /> Price locked 12 months</span>
              <span><RefreshCw size={14} /> Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </section>

    </WebsiteLayout>
  );
};

export default Pricing;
