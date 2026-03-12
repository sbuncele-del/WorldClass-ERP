/**
 * PainSolution — Enterprise challenges → SiyaBusa solutions
 * Professional authority pattern: identify industry problems, present structured solutions
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Layers, ShieldCheck, BarChart3 } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../shared';

const challenges = [
  {
    icon: <Layers size={28} />,
    title: 'Fragmented Systems Create Risk',
    solution:
      'Disconnected tools lead to data inconsistencies, manual reconciliation errors, and audit exposure. SiyaBusa consolidates your financials, operations, and compliance into a single source of truth.',
  },
  {
    icon: <ShieldCheck size={28} />,
    title: 'Compliance Should Not Be an Afterthought',
    solution:
      'Every transaction in SiyaBusa generates a complete audit trail. VAT is calculated automatically, SARS submissions are prepared in real time, and your books are audit-ready from day one.',
  },
  {
    icon: <BarChart3 size={28} />,
    title: 'Decisions Require Real-Time Visibility',
    solution:
      'Board-level dashboards, AI-assisted analysis, and proactive alerts give your leadership team the information they need \u2014 when they need it, not weeks after month-end.',
  },
];

const PainSolution: React.FC = () => {
  return (
    <section className="pain-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <span className="section-badge">Why SiyaBusa</span>
          <h2>Built to solve the problems that hold businesses back</h2>
        </motion.div>

        <motion.div
          className="pain-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {challenges.map((card, i) => (
            <motion.div key={i} className="pain-card" variants={fadeInUp}>
              <div className="pain-card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.solution}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PainSolution;
