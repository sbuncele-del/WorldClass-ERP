import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Scale, Lock, FileCheck, BadgeCheck } from 'lucide-react';
import {
  WebsiteLayout,
  AuditComplianceSection,
  ComparisonTable,
  fadeInUp,
  staggerContainer,
} from '../LandingPage/LandingPage';

const trustStats = [
  { value: '100%', label: 'Audit Trail Coverage' },
  { value: '12+', label: 'Regulatory Frameworks' },
  { value: '0', label: 'Missed Filing Deadlines' },
  { value: '24/7', label: 'Audit Readiness' },
];

const CompliancePage: React.FC = () => {
  return (
    <WebsiteLayout title="Audit & Compliance — SiyaBusa ERP" description="SARS-compliant ERP with built-in audit trails. VAT 201, EMP501, IT14, IRP5 support. IFRS and B-BBEE reporting. Audit-ready from day one with SiyaBusa's Compliance Hub." canonical="https://siyabusaerp.co.za/compliance">
      {/* ── Enterprise Hero ── */}
      <section className="compliance-page-hero">
        <div className="compliance-hero-grid-overlay" />
        <div className="container">
          <motion.div
            className="compliance-hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="compliance-hero-badge">
              <Scale size={14} />
              <span>Our Differentiator</span>
            </div>
            <h1>
              Audit-Ready &<br />
              Regulatory Compliant —{' '}
              <span className="compliance-hero-accent">By Design</span>
            </h1>
            <p className="compliance-hero-subtitle">
              Most ERPs bolt compliance on as an afterthought. SiyaBusa was built with
              audit readiness, regulatory compliance, and SARS integration at its core —
              so every transaction is audit-ready <strong>from the moment it's recorded</strong>.
            </p>
            <div className="compliance-hero-actions">
              <Link to="/demo" className="btn-primary btn-large">
                Request a Compliance Demo <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>

          {/* Trust stats */}
          <motion.div
            className="compliance-hero-stats"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {trustStats.map((s, i) => (
              <motion.div key={i} className="compliance-hero-stat" variants={fadeInUp}>
                <div className="hero-stat-value">{s.value}</div>
                <div className="hero-stat-label">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <AuditComplianceSection hideHeader />
      <ComparisonTable hideHeader />

      {/* ── Bottom CTA ── */}
      <section className="compliance-page-cta">
        <div className="container">
          <motion.div
            className="compliance-page-cta-inner"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Shield size={40} className="cta-icon" />
            <h2>Walk Into Your Next Audit With Confidence</h2>
            <p>
              See how SiyaBusa keeps every transaction compliant — automatically.
              No last-minute scrambles. No missed deadlines. No audit anxiety.
            </p>
            <Link to="/demo" className="btn-primary btn-large">
              Request a Demo <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default CompliancePage;
