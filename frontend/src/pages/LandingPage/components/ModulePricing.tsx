/**
 * ModulePricing — One price, everything included.
 * Pain-driven simplicity: R299/user/month, no tiers, no confusion.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import { staggerContainer, fadeInUp } from '../shared';

const INCLUDED = [
  'Financial Accounting & GL',
  'Sales, Quotes & Invoicing',
  'HR & Payroll',
  'Inventory & Warehouse',
  'Purchase Management',
  'Project Management',
  'Asset Management (IAS 16)',
  'Cash Management & Bank Reconciliation',
  'Manufacturing & BOM',
  'SARS e-Filing Integration',
  'IFRS & POPIA Compliance',
  'AI Assistant',
  'Reports & Dashboards',
  'Priority Support',
];

const PAIN_COMPARISONS = [
  { old: 'Accounting software', cost: 'R300–R800/mo' },
  { old: 'Payroll system', cost: 'R200–R500/mo' },
  { old: 'Inventory tool', cost: 'R150–R400/mo' },
  { old: 'CRM / Sales tool', cost: 'R200–R600/mo' },
  { old: 'Project management app', cost: 'R150–R300/mo' },
];

const ModulePricing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-section-inner">

        {/* Pain-driven header */}
        <motion.div
          className="pricing-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="pricing-eyebrow">Simple Pricing</span>
          <h2 className="pricing-title">
            Stop paying for five tools<br />
            that don't talk to each other.
          </h2>
          <p className="pricing-subtitle">
            One platform. One price. Everything your business needs.
          </p>
        </motion.div>

        {/* Main pricing card */}
        <motion.div
          className="pricing-single-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="pricing-single-top">
            <div className="pricing-single-price-block">
              <span className="pricing-amount">R299</span>
              <div className="pricing-amount-detail">
                <span className="pricing-per">per user / month</span>
                <span className="pricing-annual">Save 15% with annual billing</span>
              </div>
            </div>

            <p className="pricing-single-tagline">
              Every module. Every feature. Every integration.<br />
              No hidden costs. No per-module charges.
            </p>

            <button
              className="pricing-cta-main"
              onClick={() => navigate('/signup')}
            >
              Get Started — No Risk, No Card <ArrowRight size={18} />
            </button>

            <p className="pricing-trial-note">
              7-day free trial · Full access · Cancel anytime
            </p>
          </div>

          {/* What's included grid */}
          <div className="pricing-included">
            <h4 className="pricing-included-title">Everything included:</h4>
            <motion.ul
              className="pricing-included-list"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {INCLUDED.map((item, i) => (
                <motion.li key={i} variants={fadeInUp}>
                  <Check size={16} className="check-icon" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.div>

        {/* Pain comparison - what you're currently paying */}
        <motion.div
          className="pricing-comparison"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="pricing-comparison-title">
            What you're probably paying today
          </h3>
          <div className="pricing-comparison-table">
            {PAIN_COMPARISONS.map((item, i) => (
              <div key={i} className="pricing-comparison-row">
                <div className="comparison-old">
                  <X size={14} className="comparison-x" />
                  <span>{item.old}</span>
                </div>
                <span className="comparison-cost">{item.cost}</span>
              </div>
            ))}
            <div className="pricing-comparison-total">
              <span>Total scattered cost</span>
              <span className="comparison-total-amount">R1,000–R2,600/mo</span>
            </div>
            <div className="pricing-comparison-vs">
              <span>SiyaBusa (per user)</span>
              <span className="comparison-siyabusa">R299/mo</span>
            </div>
          </div>
        </motion.div>

        <motion.p
          className="pricing-footer-note"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          All prices exclude VAT. Annual billing available at 15% discount.
          Need more than 50 users?{' '}
          <a href="/contact" className="pricing-footer-link">
            Talk to our team
          </a>
        </motion.p>
      </div>
    </section>
  );
};

export default ModulePricing;
