/**
 * For Accountants — Dedicated landing page for accounting professionals
 * Targets: accounting firms, bookkeepers, tax practitioners
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Building2, BarChart3, Shield, FileCheck, Clock,
  Briefcase, CheckCircle, ArrowRight, Zap, BookOpen,
  Calculator, Landmark, UserCheck, Award
} from 'lucide-react';
import { WebsiteLayout, fadeInUp, staggerContainer } from '../LandingPage/LandingPage';

const benefits = [
  { icon: <Users size={24} />, title: 'Multi-Client Management', desc: 'Manage all your clients from one dashboard. Switch between entities in one click — no logging in and out.' },
  { icon: <Building2 size={24} />, title: 'Multi-Entity Consolidation', desc: 'Group reporting, intercompany transactions, and consolidated financial statements across all client entities.' },
  { icon: <BarChart3 size={24} />, title: 'Real-Time Financials', desc: 'Live access to every client\'s GL, trial balance, income statement, and balance sheet. No more waiting for month-end.' },
  { icon: <Shield size={24} />, title: 'SARS Compliance Built In', desc: 'VAT 201, EMP501, IT14, IRP5 — generated in minutes. SARS Sentinel monitors compliance risk in real-time.' },
  { icon: <FileCheck size={24} />, title: 'Audit-Ready Hub', desc: 'Digital audit trail for every transaction. Supporting documents attached. Audit file exports with one click.' },
  { icon: <Clock size={24} />, title: 'Practice Management', desc: 'Time tracking, engagement letters, billing, WIP management — everything you need to run a profitable practice.' },
];

const comparisonFeatures = [
  { feature: 'Multi-client dashboard', siyabusa: true, sage: false, xero: true, quickbooks: false },
  { feature: 'SARS submission integration', siyabusa: true, sage: true, xero: false, quickbooks: false },
  { feature: 'Payroll (included)', siyabusa: true, sage: false, xero: false, quickbooks: false },
  { feature: 'Inventory management', siyabusa: true, sage: true, xero: false, quickbooks: true },
  { feature: 'Manufacturing & BOM', siyabusa: true, sage: false, xero: false, quickbooks: false },
  { feature: 'Practice management', siyabusa: true, sage: false, xero: false, quickbooks: false },
  { feature: 'Fixed asset register (IAS 16)', siyabusa: true, sage: true, xero: false, quickbooks: false },
  { feature: 'AI assistant', siyabusa: true, sage: false, xero: false, quickbooks: false },
  { feature: 'Price (per client/mo)', siyabusa: 'Free', sage: 'R599+', xero: 'R599+', quickbooks: 'R499+' },
];

const ForAccountants: React.FC = () => {
  const navigate = useNavigate();

  return (
    <WebsiteLayout title="SiyaBusa ERP for Accountants — Free Practice Management Platform" description="Free ERP platform for accounting firms. Multi-client management, SARS compliance, practice management, payroll — all included. The Sage & Xero alternative built for South African accountants." canonical="https://siyabusaerp.co.za/for-accountants">
      {/* Hero */}
      <section style={{ padding: '140px 24px 80px', background: 'linear-gradient(135deg, #0A1F3E 0%, #1a3a5c 50%, #0A1F3E 100%)', color: '#fff', textAlign: 'center' }}>
        <motion.div style={{ maxWidth: 800, margin: '0 auto' }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 20, padding: '6px 16px', marginBottom: 24 }}>
            <Landmark size={16} style={{ color: '#00D4AA' }} />
            <span style={{ fontSize: '0.85rem', color: '#00D4AA', fontWeight: 600 }}>FOR ACCOUNTING PROFESSIONALS</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
            The All-in-One ERP Platform<br />
            <span style={{ color: '#00D4AA' }}>Free for Accounting Firms</span>
          </h1>
          <p style={{ fontSize: '1.15rem', opacity: 0.85, maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Manage every client from one dashboard. Financial accounting, payroll, tax compliance, practice management — all included. No per-client fees.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/demo')} style={{ fontSize: '1rem', padding: '14px 32px' }}>
              Book a Demo <ArrowRight size={18} />
            </button>
            <button className="btn-secondary" onClick={() => navigate('/pricing')} style={{ fontSize: '1rem', padding: '14px 32px', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
              View Pricing
            </button>
          </div>
        </motion.div>
      </section>

      {/* Benefits Grid */}
      <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div style={{ textAlign: 'center', marginBottom: 48 }} variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 700, marginBottom: 12 }}>
            Why Accounting Firms Choose SiyaBusa
          </h2>
          <p style={{ fontSize: '1.05rem', opacity: 0.7, maxWidth: 600, margin: '0 auto' }}>
            Purpose-built for South African accountants, bookkeepers, and tax practitioners.
          </p>
        </motion.div>

        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
        >
          {benefits.map((b) => (
            <motion.div
              key={b.title}
              variants={fadeInUp}
              style={{
                padding: 28,
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.06)',
                background: 'var(--sb-white, #fff)',
                transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(0,212,170,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D4AA', marginBottom: 16 }}>
                {b.icon}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{b.title}</h3>
              <p style={{ fontSize: '0.9rem', opacity: 0.7, lineHeight: 1.6 }}>{b.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Comparison Table */}
      <section style={{ padding: '80px 24px', background: 'var(--sb-gray-50, #f8fafc)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.div style={{ textAlign: 'center', marginBottom: 40 }} variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 700, marginBottom: 12 }}>
              SiyaBusa vs the Competition
            </h2>
            <p style={{ fontSize: '1rem', opacity: 0.7 }}>See how SiyaBusa stacks up for accounting firms.</p>
          </motion.div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Feature</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: '#00D4AA' }}>SiyaBusa</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, opacity: 0.6 }}>Sage</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, opacity: 0.6 }}>Xero</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, opacity: 0.6 }}>QuickBooks</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.feature} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{row.feature}</td>
                    {(['siyabusa', 'sage', 'xero', 'quickbooks'] as const).map((col) => (
                      <td key={col} style={{ textAlign: 'center', padding: '12px 16px' }}>
                        {typeof row[col] === 'boolean'
                          ? row[col]
                            ? <CheckCircle size={18} style={{ color: '#00D4AA' }} />
                            : <span style={{ opacity: 0.3 }}>—</span>
                          : <span style={{ fontWeight: col === 'siyabusa' ? 700 : 400, color: col === 'siyabusa' ? '#00D4AA' : undefined }}>{row[col]}</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <motion.div style={{ maxWidth: 600, margin: '0 auto' }} variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Award size={40} style={{ color: '#00D4AA', marginBottom: 16 }} />
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 700, marginBottom: 16 }}>
            Join the SiyaBusa Partner Programme
          </h2>
          <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: 32, lineHeight: 1.6 }}>
            Free access for your firm. Manage unlimited clients. Earn referral commissions. Get priority support and co-marketing opportunities.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/demo')} style={{ fontSize: '1rem', padding: '14px 32px' }}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <button className="btn-secondary" onClick={() => navigate('/partners')} style={{ fontSize: '1rem', padding: '14px 32px' }}>
              Learn About Partners
            </button>
          </div>
        </motion.div>
      </section>
    </WebsiteLayout>
  );
};

export default ForAccountants;
