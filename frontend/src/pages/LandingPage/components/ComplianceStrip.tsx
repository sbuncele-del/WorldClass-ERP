/**
 * ComplianceStrip — JSE-Grade Compliance & Governance Section
 * Designed to convey institutional trust, regulatory authority,
 * and enterprise-grade compliance infrastructure.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Shield, Landmark, Check, ArrowRight,
  FileCheck, Scale, BadgeCheck, AlertTriangle, Lock, Eye,
} from 'lucide-react';
import { fadeInUp, staggerContainer } from '../shared';

/* ─── Compliance stats bar ─── */
const stats = [
  { value: '100%', label: 'Audit Trail Coverage', sublabel: 'Every transaction tracked' },
  { value: 'IFRS', label: 'Full Compliance', sublabel: 'IAS 2, 16, 37 · IFRS 15, 16' },
  { value: 'SARS', label: 'Direct Integration', sublabel: 'VAT201, EMP201, ITR14' },
  { value: 'POPIA', label: 'Data Protection', sublabel: 'Built-in consent management' },
];

/* ─── Regulatory framework badges ─── */
const frameworks = [
  'IFRS / IAS', 'SARS eFiling', 'POPIA', 'B-BBEE', 'Companies Act (CIPC)',
  'BCEA / LRA', 'King IV', 'Companies Act',
];

/* ─── Card content ─── */
const cards = [
  {
    icon: <ClipboardCheck size={26} />,
    accentColor: '#00D4AA',
    gradient: 'linear-gradient(135deg, #00D4AA, #00A884)',
    glowColor: 'rgba(0, 212, 170, 0.12)',
    title: 'Audit-Ready Hub',
    tagline: 'Walk into any audit with confidence — not anxiety',
    stat: { value: '< 2hrs', label: 'audit pack generation' },
    features: [
      { text: 'Complete audit trail — every transaction timestamped and attributed', bold: 'Complete audit trail' },
      { text: 'Segregation of duties enforced through configurable approval workflows', bold: 'Segregation of duties' },
      { text: 'One-click audit pack generation for external auditors', bold: 'One-click audit pack' },
      { text: 'Supporting documents linked to every journal entry', bold: 'Document linkage' },
      { text: 'Prior period adjustments tracked and disclosed per IAS 8', bold: 'Prior period tracking' },
    ],
  },
  {
    icon: <Shield size={26} />,
    accentColor: '#7C3AED',
    gradient: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
    glowColor: 'rgba(124, 58, 237, 0.12)',
    title: 'Regulatory Compliance',
    tagline: 'Standards-based from architecture — not bolted on',
    stat: { value: '12+', label: 'regulatory frameworks' },
    features: [
      { text: 'Full IFRS compliance — IAS 2, IAS 16, IAS 37, IFRS 15, IFRS 16', bold: 'Full IFRS compliance' },
      { text: 'POPIA-compliant data handling and consent management', bold: 'POPIA compliance' },
      { text: 'B-BBEE scorecard reporting and verification tracking', bold: 'B-BBEE reporting' },
      { text: 'King IV governance principles embedded in approval chains', bold: 'King IV governance' },
      { text: 'Labour law compliance — BCEA, LRA, EEA, sectoral determinations', bold: 'Labour compliance' },
    ],
  },
  {
    icon: <Landmark size={26} />,
    accentColor: '#F4B400',
    gradient: 'linear-gradient(135deg, #F4B400, #E09200)',
    glowColor: 'rgba(244, 180, 0, 0.12)',
    title: 'SARS Integration',
    tagline: 'Tax compliance on autopilot — not a quarterly scramble',
    stat: { value: '0', label: 'missed filing deadlines' },
    features: [
      { text: 'VAT calculated and applied on every transaction automatically', bold: 'Automatic VAT' },
      { text: 'PAYE, UIF, SDL computed per current SARS tax tables', bold: 'Payroll tax engine' },
      { text: 'Filing deadline calendar with proactive notifications', bold: 'Filing calendar' },
      { text: 'IRP5, IT3(a), IT3(b), IT14 certificate generation', bold: 'Tax certificates' },
      { text: 'Direct eFiling integration or SARS-accepted export formats', bold: 'eFiling ready' },
    ],
  },
];

const ComplianceStrip: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="compliance-section">
      {/* Decorative grid pattern overlay */}
      <div className="compliance-grid-overlay" />

      <div className="container">
        {/* ── Header with authority ── */}
        <motion.div
          className="compliance-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="compliance-header-badge">
            <Scale size={14} />
            <span>Compliance & Governance</span>
          </div>
          <h2 className="compliance-headline">
            Audit-Ready and Compliant —{' '}
            <span className="headline-accent">By Architecture</span>
          </h2>
          <p className="compliance-subhead">
            Compliance is not an add-on. SiyaBusa embeds regulatory requirements into every
            workflow, every transaction, and every report — so you're always audit-ready,
            <strong> not scrambling at year-end</strong>.
          </p>
        </motion.div>

        {/* ── Stats bar — institutional feel ── */}
        <motion.div
          className="compliance-stats-bar"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {stats.map((s, i) => (
            <motion.div key={i} className="compliance-stat" variants={fadeInUp}>
              <div className="compliance-stat-value">{s.value}</div>
              <div className="compliance-stat-label">{s.label}</div>
              <div className="compliance-stat-sublabel">{s.sublabel}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Premium cards ── */}
        <motion.div
          className="compliance-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {cards.map((card, i) => (
            <motion.div
              key={i}
              className="compliance-card"
              variants={fadeInUp}
              style={{ '--card-accent': card.accentColor, '--card-glow': card.glowColor } as React.CSSProperties}
            >
              {/* Card top accent line */}
              <div className="compliance-card-accent" style={{ background: card.gradient }} />

              <div className="compliance-card-inner">
                <div className="compliance-card-head">
                  <div className="compliance-card-icon" style={{ background: card.gradient }}>
                    {card.icon}
                  </div>
                  <div>
                    <h3>{card.title}</h3>
                    <p className="card-tagline">{card.tagline}</p>
                  </div>
                </div>

                {/* Inline metric */}
                <div className="compliance-card-metric" style={{ borderColor: card.accentColor }}>
                  <span className="metric-value" style={{ color: card.accentColor }}>{card.stat.value}</span>
                  <span className="metric-label">{card.stat.label}</span>
                </div>

                <ul className="compliance-features">
                  {card.features.map((f, j) => (
                    <li key={j}>
                      <Check size={14} />
                      <span><strong>{f.bold}</strong> — {f.text.split('—')[1] || f.text.split(f.bold)[1]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Regulatory framework badges ── */}
        <motion.div
          className="compliance-frameworks"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <p className="frameworks-label">
            <Lock size={14} /> Built for compliance with
          </p>
          <div className="frameworks-list">
            {frameworks.map((fw, i) => (
              <span key={i} className="framework-badge">{fw}</span>
            ))}
          </div>
        </motion.div>

        {/* ── Bottom CTA ── */}
        <motion.div
          className="compliance-cta"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <p>
            <strong>This is what sets SiyaBusa apart.</strong> While other systems leave compliance up to you,
            we ensure every transaction is recorded, classified, and reported correctly — automatically.
          </p>
          <button className="btn-primary btn-large" onClick={() => navigate('/compliance')}>
            Explore Our Compliance Suite <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default ComplianceStrip;
