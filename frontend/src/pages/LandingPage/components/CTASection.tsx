/**
 * CTASection — Strong closing with waitlist capture
 * World-class pattern: clear value prop, founding member urgency, inline signup
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Award, ShieldCheck } from 'lucide-react';
import { fadeInUp } from '../shared';
import WaitlistForm from './WaitlistForm';

const CTASection: React.FC = () => {
  return (
    <section className="cta-section">
      <motion.div
        className="cta-inner"
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="cta-badge">
          <Award size={16} style={{ color: '#00D4AA' }} />
          <span>Founding Member — limited spots</span>
        </div>

        <h2>
          Complete ERP access.
          <br />
          <span className="text-gradient">R1,499 per month. All modules included.</span>
        </h2>

        <p>
          Full platform access for up to 10 users. All modules, all integrations,
          all future updates. Price guaranteed for 12 months with no hidden fees.
        </p>

        <WaitlistForm variant="cta" />

        <div className="cta-trust">
          <ShieldCheck size={16} style={{ color: 'var(--sb-navy)' }} />
          <span>JSE-ready security & governance · IFRS & SARS integrations</span>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
