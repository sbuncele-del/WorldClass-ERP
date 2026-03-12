/**
 * Data Migration — Dedicated page for data migration information
 * Helps get indexed for "data migration ERP" queries
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Upload, CheckCircle, Shield, Zap, Clock,
  FileSpreadsheet, Database, Users, Receipt, BarChart3,
  Package, Building2, Wallet, Briefcase, ArrowRightLeft
} from 'lucide-react';
import { WebsiteLayout, fadeInUp, staggerContainer } from '../LandingPage/LandingPage';

const migrationItems = [
  { icon: <BarChart3 size={22} />, title: 'Chart of Accounts', desc: 'GL structure, categories, types, and tax codes — mapped automatically.' },
  { icon: <Users size={22} />, title: 'Customers & Suppliers', desc: 'All contacts with addresses, tax numbers, payment terms, and history.' },
  { icon: <Receipt size={22} />, title: 'Invoices & Bills', desc: 'Open and paid invoices, credit notes, bills, and purchase orders.' },
  { icon: <Wallet size={22} />, title: 'Bank Transactions', desc: 'Bank feeds, reconciled transactions, and bank account balances.' },
  { icon: <Package size={22} />, title: 'Products & Inventory', desc: 'Items, pricing, stock levels, categories, and cost tracking.' },
  { icon: <Briefcase size={22} />, title: 'Employees & Payroll', desc: 'Employee records, salary info, leave balances, and tax details.' },
  { icon: <Building2 size={22} />, title: 'Fixed Assets', desc: 'Asset register with depreciation schedules and IAS 16 details.' },
  { icon: <Database size={22} />, title: 'Historical Data', desc: 'Opening balances, trial balance, and up to 5 years of historical data.' },
];

const steps = [
  { num: '01', title: 'Export Your Data', desc: 'Download CSV or Excel exports from your current platform. We provide step-by-step export guides for every major accounting package.', icon: <FileSpreadsheet size={28} /> },
  { num: '02', title: 'Upload & Auto-Map', desc: 'Upload your files to SiyaBusa. Our AI automatically matches columns, detects data types, and validates everything — no manual mapping required.', icon: <Upload size={28} /> },
  { num: '03', title: 'Review & Confirm', desc: 'Preview all imported data before it goes live. Fix any warnings, review mappings, and approve with one click.', icon: <CheckCircle size={28} /> },
  { num: '04', title: 'Go Live', desc: 'Your data is in SiyaBusa. Start working immediately with all your financial history, customer records, and inventory intact.', icon: <Zap size={28} /> },
];

const platforms = [
  { name: 'Sage Pastel', color: '#00DC00' },
  { name: 'Sage Business Cloud', color: '#00DC00' },
  { name: 'Xero', color: '#13B5EA' },
  { name: 'QuickBooks', color: '#2CA01C' },
  { name: 'FreshBooks', color: '#0075DD' },
  { name: 'Wave', color: '#1C6BFF' },
  { name: 'Excel / CSV', color: '#217346' },
  { name: 'Any Other Platform', color: '#6B7280' },
];

const DataMigration: React.FC = () => {
  const navigate = useNavigate();

  return (
    <WebsiteLayout title="Data Migration to SiyaBusa ERP — Seamless Import from Sage, Xero, QuickBooks" description="Migrate your business data to SiyaBusa ERP in days, not months. AI-powered import from Sage, Xero, QuickBooks, Pastel. Chart of accounts, customers, invoices, inventory — all validated automatically." canonical="https://siyabusaerp.co.za/data-migration">
      {/* Hero */}
      <section style={{ padding: '140px 24px 80px', background: 'linear-gradient(135deg, #0A1F3E 0%, #1a3a5c 50%, #0A1F3E 100%)', color: '#fff', textAlign: 'center' }}>
        <motion.div style={{ maxWidth: 800, margin: '0 auto' }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 20, padding: '6px 16px', marginBottom: 24 }}>
            <ArrowRightLeft size={16} style={{ color: '#00D4AA' }} />
            <span style={{ fontSize: '0.85rem', color: '#00D4AA', fontWeight: 600 }}>DATA MIGRATION</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
            Move Your Business Data to SiyaBusa<br />
            <span style={{ color: '#00D4AA' }}>In Days, Not Months</span>
          </h1>
          <p style={{ fontSize: '1.15rem', opacity: 0.85, maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
            AI-powered data migration from any accounting platform. Your chart of accounts, customers, invoices, inventory, and financial history — imported and validated automatically.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/demo')} style={{ fontSize: '1rem', padding: '14px 32px' }}>
              Start Migration <ArrowRight size={18} />
            </button>
            <button className="btn-secondary" onClick={() => navigate('/switch-to-siyabusa')} style={{ fontSize: '1rem', padding: '14px 32px', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
              Switch to SiyaBusa
            </button>
          </div>
        </motion.div>
      </section>

      {/* Supported Platforms */}
      <section style={{ padding: '60px 24px', background: 'var(--sb-gray-50, #f8fafc)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', marginBottom: 20 }}>Migrate From Any Platform</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            {platforms.map((p) => (
              <span key={p.name} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.85rem', fontWeight: 600, background: '#fff' }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* What We Migrate */}
      <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div style={{ textAlign: 'center', marginBottom: 48 }} variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 700, marginBottom: 12 }}>
            What Gets Migrated
          </h2>
          <p style={{ fontSize: '1rem', opacity: 0.7, maxWidth: 600, margin: '0 auto' }}>
            We bring over everything you need — nothing left behind.
          </p>
        </motion.div>

        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
        >
          {migrationItems.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeInUp}
              style={{
                padding: 24,
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.06)',
                background: 'var(--sb-white, #fff)',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(0,212,170,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D4AA', flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{item.title}</h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Steps */}
      <section style={{ padding: '80px 24px', background: 'var(--sb-gray-50, #f8fafc)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <motion.div style={{ textAlign: 'center', marginBottom: 48 }} variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 700, marginBottom: 12 }}>
              4-Step Migration Process
            </h2>
            <p style={{ fontSize: '1rem', opacity: 0.7 }}>Simple, guided, AI-assisted — from start to finish.</p>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {steps.map((step) => (
              <motion.div
                key={step.num}
                variants={fadeInUp}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                style={{
                  display: 'flex', gap: 24, alignItems: 'flex-start',
                  padding: 28, borderRadius: 12, background: 'var(--sb-white, #fff)',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #00D4AA, #0A1F3E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  {step.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00D4AA', marginBottom: 4 }}>STEP {step.num}</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>{step.title}</h3>
                  <p style={{ fontSize: '0.9rem', opacity: 0.7, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section style={{ padding: '80px 24px', maxWidth: 800, margin: '0 auto' }}>
        <motion.div style={{ textAlign: 'center', marginBottom: 40 }} variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 700, marginBottom: 12 }}>
            Migration Guarantees
          </h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {[
            { icon: <Shield size={24} />, label: 'Zero Data Loss' },
            { icon: <Clock size={24} />, label: 'Complete in Days' },
            { icon: <CheckCircle size={24} />, label: 'Validated & Verified' },
            { icon: <Zap size={24} />, label: 'AI-Powered Mapping' },
          ].map((g) => (
            <div key={g.label} style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ color: '#00D4AA', marginBottom: 12 }}>{g.icon}</div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{g.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #0A1F3E, #1a3a5c)', color: '#fff', textAlign: 'center' }}>
        <motion.div style={{ maxWidth: 600, margin: '0 auto' }} variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 700, marginBottom: 16 }}>
            Ready to Migrate?
          </h2>
          <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: 32, lineHeight: 1.6 }}>
            Our migration team will guide you through every step. Book a call and we'll build a custom migration plan for your business.
          </p>
          <button className="btn-primary" onClick={() => navigate('/demo')} style={{ fontSize: '1rem', padding: '14px 32px' }}>
            Book Migration Call <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>
    </WebsiteLayout>
  );
};

export default DataMigration;
