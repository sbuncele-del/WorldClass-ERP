import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Upload, CheckCircle, Shield, Zap, Clock, FileSpreadsheet,
  Database, Users, Receipt, Building2, ArrowLeftRight, BarChart3,
  BookOpen, Wallet, Package, TrendingUp, Briefcase, HeadphonesIcon
} from 'lucide-react';
import { WebsiteLayout, fadeInUp, staggerContainer } from '../LandingPage/LandingPage';
import './SwitchToSiyaBusa.css';

// Platforms we support migration from
const platforms = [
  { id: 'quickbooks', name: 'QuickBooks', logo: 'QB', color: '#2CA01C', desc: 'QuickBooks Online & Desktop' },
  { id: 'xero', name: 'Xero', logo: 'Xo', color: '#13B5EA', desc: 'Xero accounting software' },
  { id: 'sage', name: 'Sage', logo: 'Sa', color: '#00DC00', desc: 'Sage Business Cloud & Pastel' },
  { id: 'pastel', name: 'Pastel', logo: 'Pa', color: '#E4002B', desc: 'Sage Pastel Partner & Xpress' },
  { id: 'freshbooks', name: 'FreshBooks', logo: 'FB', color: '#0075DD', desc: 'FreshBooks invoicing & accounting' },
  { id: 'wave', name: 'Wave', logo: 'Wv', color: '#1C6BFF', desc: 'Wave financial software' },
];

// What we migrate
const migrationItems = [
  { icon: <BookOpen size={22} />, title: 'Chart of Accounts', desc: 'GL account structure with categories, types, and tax codes mapped automatically' },
  { icon: <Users size={22} />, title: 'Customers & Suppliers', desc: 'All contacts with addresses, tax numbers, payment terms, and history' },
  { icon: <Receipt size={22} />, title: 'Invoices & Bills', desc: 'Open and paid invoices, credit notes, bills, and purchase orders' },
  { icon: <Wallet size={22} />, title: 'Bank Transactions', desc: 'Bank feeds, reconciled transactions, and bank account balances' },
  { icon: <Package size={22} />, title: 'Products & Inventory', desc: 'Items, pricing, stock levels, categories, and cost tracking' },
  { icon: <BarChart3 size={22} />, title: 'Financial Reports', desc: 'Opening balances, trial balance, and historical reporting data' },
  { icon: <Briefcase size={22} />, title: 'Employees & Payroll', desc: 'Employee records, salary info, leave balances, and tax details' },
  { icon: <Building2 size={22} />, title: 'Fixed Assets', desc: 'Asset register with depreciation schedules and IAS 16 details' },
];

// Migration process steps
const steps = [
  { num: '01', title: 'Export your data', desc: 'Download CSV/Excel exports from your current platform. We provide step-by-step guides for each.', icon: <FileSpreadsheet size={28} /> },
  { num: '02', title: 'Upload & map', desc: 'Upload your files. Our AI automatically matches columns and validates data — no manual mapping.', icon: <Upload size={28} /> },
  { num: '03', title: 'Review & confirm', desc: 'Preview everything before import. Fix any warnings. Approve with one click.', icon: <CheckCircle size={28} /> },
  { num: '04', title: 'Go live', desc: 'Your data is in SiyaBusa. Start working immediately — nothing left behind.', icon: <Zap size={28} /> },
];

// Why switch
const benefits = [
  { icon: <TrendingUp size={22} />, title: 'All-in-one platform', desc: 'Stop paying for 5 different tools. Every module included from day one.' },
  { icon: <Shield size={22} />, title: 'SA compliance built-in', desc: 'SARS eFiling, PAYE, UIF, SDL, VAT201 — automated, not bolted on.' },
  { icon: <Clock size={22} />, title: 'Migrate in hours, not months', desc: 'No consultants, no R50K implementation fees. Upload and go.' },
  { icon: <Database size={22} />, title: 'Your data, locally hosted', desc: 'Hosted in Johannesburg on South African infrastructure. POPIA compliant.' },
  { icon: <ArrowLeftRight size={22} />, title: 'Real-time bank feeds', desc: 'AI-powered reconciliation with automatic matching and categorisation.' },
  { icon: <HeadphonesIcon size={22} />, title: 'Free migration support', desc: 'Our team helps you migrate for free — we want you up and running fast.' },
];

// FAQ
const faqs = [
  { q: 'How long does migration take?', a: 'Most businesses are fully migrated within 1-3 hours. Large datasets (10,000+ transactions) may take a few hours more while we validate everything.' },
  { q: 'Will I lose any data?', a: 'No. We import all historical transactions, contacts, and balances. You can also keep your old platform running in parallel until you\'re confident.' },
  { q: 'What file formats do you accept?', a: 'CSV, Excel (.xlsx), QIF, OFX, and MT940. We also support direct exports from QuickBooks Online, Xero, and Sage via their standard export tools.' },
  { q: 'Do you handle multi-currency data?', a: 'Yes. We import transactions in their original currency and map exchange rates. Your ZAR reporting currency is maintained automatically.' },
  { q: 'What about my bank feeds?', a: 'After migration, you connect bank feeds directly in SiyaBusa. We support all major SA banks — FNB, Standard Bank, Nedbank, ABSA, Capitec, and more.' },
  { q: 'Is there a cost for migration?', a: 'Migration is completely free for all SiyaBusa plans. We want switching to be effortless.' },
  { q: 'Can I migrate from Pastel Partner/Xpress?', a: 'Yes. Export your data from Pastel to CSV using the built-in export tools, then upload to SiyaBusa. We have specific column mappings for Pastel formats.' },
];

const SwitchToSiyaBusa: React.FC = () => {
  const navigate = useNavigate();
  const [activePlatform, setActivePlatform] = useState('quickbooks');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Switch to SiyaBusa — Migrate from QuickBooks, Xero, Sage & More';
  }, []);

  return (
    <WebsiteLayout title="Switch to SiyaBusa — Migrate from QuickBooks, Xero, Sage & More" description="Switch from QuickBooks, Xero, Sage, or Pastel to SiyaBusa ERP. AI-powered migration, zero data loss, complete in days. South Africa's affordable all-in-one ERP alternative." canonical="https://siyabusaerp.co.za/switch-to-siyabusa">
      {/* Hero */}
      <section className="switch-hero">
        <div className="container">
          <motion.div 
            className="switch-hero-content"
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
          >
            <span className="section-badge">Switch to SiyaBusa</span>
            <h1>Outgrowing your accounting software?<br />We make switching painless.</h1>
            <p className="switch-hero-subtitle">
              Migrate from QuickBooks, Xero, Sage, or Pastel in hours — not months. 
              Your chart of accounts, customers, invoices, bank data, and inventory come with you. 
              Free migration support included.
            </p>
            <div className="switch-hero-actions">
              <button className="btn-primary btn-large" onClick={() => navigate('/demo')}>
                Start Free Migration <ArrowRight size={18} />
              </button>
              <button className="btn-secondary btn-large" onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                See How It Works
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform selector */}
      <section className="switch-platforms">
        <div className="container">
          <motion.div 
            className="section-header"
            variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <span className="section-badge">Supported Platforms</span>
            <h2>Switching from any of these? We've got you.</h2>
            <p className="section-subhead">Select your current platform to see what we migrate.</p>
          </motion.div>

          <motion.div 
            className="platform-grid"
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            {platforms.map((p) => (
              <motion.button
                key={p.id}
                variants={fadeInUp}
                className={`platform-card ${activePlatform === p.id ? 'active' : ''}`}
                onClick={() => setActivePlatform(p.id)}
              >
                <div className="platform-logo" style={{ background: p.color }}>{p.logo}</div>
                <div className="platform-info">
                  <strong>{p.name}</strong>
                  <span>{p.desc}</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* What we migrate */}
      <section className="switch-what-migrates">
        <div className="container">
          <motion.div 
            className="section-header"
            variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <span className="section-badge">Complete Data Transfer</span>
            <h2>Everything moves. Nothing gets left behind.</h2>
            <p className="section-subhead">
              We don't just import your chart of accounts — we bring your entire business history.
            </p>
          </motion.div>

          <motion.div 
            className="migrate-grid"
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            {migrationItems.map((item, i) => (
              <motion.div key={i} variants={fadeInUp} className="migrate-card">
                <div className="migrate-icon">{item.icon}</div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="switch-steps" id="how-it-works">
        <div className="container">
          <motion.div 
            className="section-header"
            variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <span className="section-badge">How It Works</span>
            <h2>Four steps. That's it.</h2>
            <p className="section-subhead">No consultants, no 6-month project plans, no surprises.</p>
          </motion.div>

          <motion.div 
            className="steps-grid"
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeInUp} className="step-card">
                <div className="step-number">{step.num}</div>
                <div className="step-icon-wrap">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why switch */}
      <section className="switch-benefits">
        <div className="container">
          <motion.div 
            className="section-header"
            variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <span className="section-badge">Why Switch</span>
            <h2>Why 200+ SA businesses chose SiyaBusa</h2>
            <p className="section-subhead">It's not just about features — it's about running your entire business from one place.</p>
          </motion.div>

          <motion.div 
            className="benefits-grid"
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            {benefits.map((b, i) => (
              <motion.div key={i} variants={fadeInUp} className="benefit-card">
                <div className="benefit-icon">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Comparison */}
      <section className="switch-comparison">
        <div className="container">
          <motion.div 
            className="section-header"
            variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <span className="section-badge">The Real Comparison</span>
            <h2>What you're actually paying vs what you could be paying</h2>
          </motion.div>

          <motion.div 
            className="comparison-table-wrap"
            variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>QuickBooks + Add-ons</th>
                  <th>Xero + Add-ons</th>
                  <th className="highlight">SiyaBusa ERP</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Accounting & GL</td><td>R900/mo</td><td>R750/mo</td><td className="highlight">Included</td></tr>
                <tr><td>Payroll</td><td>+R500/mo</td><td>+R400/mo</td><td className="highlight">Included</td></tr>
                <tr><td>Inventory</td><td>+R1,500/mo</td><td>+R800/mo</td><td className="highlight">Included</td></tr>
                <tr><td>Projects</td><td>+R350/mo</td><td>+R350/mo</td><td className="highlight">Included</td></tr>
                <tr><td>CRM & Sales</td><td>+R600/mo</td><td>+R400/mo</td><td className="highlight">Included</td></tr>
                <tr><td>Manufacturing</td><td>N/A</td><td>N/A</td><td className="highlight">Included</td></tr>
                <tr><td>SARS Compliance</td><td>Basic</td><td>Basic</td><td className="highlight">Full eFiling</td></tr>
                <tr><td>AI Assistant</td><td>N/A</td><td>N/A</td><td className="highlight">Included</td></tr>
                <tr className="total-row">
                  <td><strong>Real monthly cost</strong></td>
                  <td><strong className="text-danger">~R3,850</strong></td>
                  <td><strong className="text-danger">~R2,700</strong></td>
                  <td className="highlight"><strong className="text-success">R299/user</strong></td>
                </tr>
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="switch-faq">
        <div className="container">
          <motion.div 
            className="section-header"
            variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <span className="section-badge">Migration FAQ</span>
            <h2>Common questions about switching</h2>
          </motion.div>

          <motion.div className="faq-list" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {faqs.map((faq, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className={`faq-item ${expandedFaq === i ? 'open' : ''}`}
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <div className="faq-question">
                  <span>{faq.q}</span>
                  <span className="faq-toggle">{expandedFaq === i ? '−' : '+'}</span>
                </div>
                {expandedFaq === i && (
                  <motion.div 
                    className="faq-answer"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="page-cta">
        <div className="container">
          <motion.div className="page-cta-content" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2>Ready to switch? We'll migrate your data for free.</h2>
            <p>
              Book a migration call and our team will walk you through the entire process — 
              or start yourself in minutes.
            </p>
            <div className="switch-cta-buttons">
              <Link to="/demo" className="btn-primary btn-large">
                Book Free Migration Call <ArrowRight size={18} />
              </Link>
              <Link to="/signup" className="btn-secondary btn-large">
                Start Self-Service Migration
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default SwitchToSiyaBusa;
