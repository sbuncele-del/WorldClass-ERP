/**
 * LogoBar — "Trusted by" technology & partner logos
 * World-class pattern: social proof above the fold
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Cloud, Cpu, Database, Lock } from 'lucide-react';
import { staggerContainer, fadeInUp } from '../shared';

const LogoBar: React.FC = () => {
  const logos = [
    { icon: <Shield size={20} />, name: 'SARS Integrated' },
    { icon: <Cloud size={20} />, name: 'Cloud Hosted' },
    { icon: <Lock size={20} />, name: 'POPIA Compliant' },
    { icon: <Database size={20} />, name: 'Enterprise PostgreSQL' },
    { icon: <Cpu size={20} />, name: 'AI-Assisted' },
  ];

  return (
    <section className="logo-bar">
      <div className="logo-bar-inner">
        <div className="logo-bar-label">Built on Enterprise-Grade Infrastructure</div>
        <motion.div
          className="logo-bar-logos"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {logos.map((logo, i) => (
            <motion.div key={i} className="logo-bar-item" variants={fadeInUp}>
              {logo.icon}
              <span>{logo.name}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default LogoBar;
