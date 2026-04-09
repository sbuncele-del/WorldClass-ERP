/**
 * CTASection — Strong closing CTA with free trial signup
 * Premium corporate pattern: clear value prop, trust, direct signup
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { fadeInUp } from '../shared';

const CTASection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="cta-section">
      <motion.div
        className="cta-inner"
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <h2>
          Ready to streamline your business?
        </h2>

        <p>
          Start your free 14-day trial today. Full access to every module,
          no credit card required. See why South African businesses choose SiyaBusa.
        </p>

        <div className="cta-actions">
          <button className="cta-primary-btn" onClick={() => navigate('/signup')}>
            Start Free Trial <ArrowRight size={18} />
          </button>
          <button className="cta-secondary-btn" onClick={() => navigate('/contact')}>
            Talk to Sales
          </button>
        </div>

        <div className="cta-trust">
          <ShieldCheck size={16} style={{ color: 'var(--sb-navy)' }} />
          <span>SARS integrated · IFRS compliant · Audit-ready · POPIA certified</span>
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
