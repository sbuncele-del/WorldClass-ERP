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
          Still running your business on spreadsheets?
        </h2>

        <p>
          Try SiyaBusa free for 7 days. R299/user/month after that — everything included.
          No credit card. No commitment. No surprises.
        </p>

        <div className="cta-actions">
          <button className="cta-primary-btn" onClick={() => navigate('/signup')}>
            Get Started — No Risk, No Card <ArrowRight size={18} />
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
