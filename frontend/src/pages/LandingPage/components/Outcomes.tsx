/**
 * Outcomes — "What you get" visual grid focused on business outcomes
 * World-class pattern: benefit-driven, not feature-listed
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Users, Package, ShoppingCart, FolderKanban, Cpu,
} from 'lucide-react';
import { fadeInUp, staggerContainer } from '../shared';

const outcomes = [
  {
    icon: <BarChart3 size={24} />,
    title: 'Financial clarity',
    desc: 'Real-time P&L, balance sheet, and cash flow — accurate to the minute, not the month-end',
    color: '#F4B400',
  },
  {
    icon: <Users size={24} />,
    title: 'Payroll compliance',
    desc: 'PAYE, UIF, SDL calculated automatically against current SARS tax tables with IRP5 generation',
    color: '#EC4899',
  },
  {
    icon: <Package size={24} />,
    title: 'Inventory intelligence',
    desc: 'Multi-warehouse stock control with IAS 2 compliant valuation and automated reorder management',
    color: '#3B82F6',
  },
  {
    icon: <ShoppingCart size={24} />,
    title: 'Revenue acceleration',
    desc: 'Quote-to-cash workflow with IFRS 15 recognition, automated invoicing, and debtor management',
    color: '#00D4AA',
  },
  {
    icon: <FolderKanban size={24} />,
    title: 'Project governance',
    desc: 'Budget tracking, milestone management, and resource allocation integrated with your ledger',
    color: '#7C3AED',
  },
  {
    icon: <Cpu size={24} />,
    title: 'AI-assisted operations',
    desc: 'Natural language queries, intelligent reconciliation, and predictive alerts across all modules',
    color: '#6366F1',
  },
];

const Outcomes: React.FC = () => {
  return (
    <section className="outcomes-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2>
            Every capability your organisation requires.{' '}
            <span className="text-teal">Integrated by design.</span>
          </h2>
        </motion.div>

        <motion.div
          className="outcomes-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {outcomes.map((item, i) => (
            <motion.div key={i} className="outcome-card" variants={fadeInUp}>
              <div
                className="outcome-icon"
                style={{
                  background: `${item.color}15`,
                  color: item.color,
                }}
              >
                {item.icon}
              </div>
              <div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Outcomes;
