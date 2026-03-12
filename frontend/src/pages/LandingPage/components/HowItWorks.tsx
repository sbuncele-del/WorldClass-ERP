/**
 * HowItWorks — Clean 3-step onboarding
 * World-class pattern: reduce perceived complexity
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Settings, TrendingUp, ArrowRight } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../shared';

const steps = [
  {
    num: '01',
    title: 'Configure your environment',
    desc: 'Set up your chart of accounts, tax profiles, and organisational structure in minutes — not months.',
    icon: <Zap size={28} />,
  },
  {
    num: '02',
    title: 'Import and connect',
    desc: 'Migrate existing data seamlessly. Connect your bank feeds, integrate your systems, and go live with confidence.',
    icon: <Settings size={28} />,
  },
  {
    num: '03',
    title: 'Operate from a single platform',
    desc: 'Finance, HR, inventory, projects, and compliance — unified in one dashboard with role-based access controls.',
    icon: <TrendingUp size={28} />,
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section className="steps-section">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <span className="section-badge">Implementation</span>
          <h2>Operational in days, not months</h2>
          <p className="section-subhead">
            Designed for rapid deployment with guided onboarding and dedicated implementation support.
          </p>
        </motion.div>

        <motion.div
          className="steps-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <motion.div className="step-card" variants={fadeInUp}>
                <div className="step-icon">{step.icon}</div>
                <div className="step-number">Step {step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.div>
              {i < steps.length - 1 && (
                <div className="step-arrow">
                  <ArrowRight size={24} />
                </div>
              )}
            </React.Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
