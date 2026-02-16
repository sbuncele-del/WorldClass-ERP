import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import {
  WebsiteLayout,
  AuditComplianceSection,
  ComparisonTable,
  fadeInUp
} from '../LandingPage/LandingPage';

const CompliancePage: React.FC = () => {
  useEffect(() => {
    document.title = 'Audit & Compliance — SiyaBusa ERP';
  }, []);

  return (
    <WebsiteLayout title="Audit & Compliance — SiyaBusa ERP">
      <section className="page-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="section-badge">Our Differentiator</span>
            <h1>Audit-Ready & Regulatory Compliant</h1>
            <p className="page-hero-subtitle">
              Most ERPs bolt compliance on as an afterthought. SiyaBusa was built with 
              audit readiness, regulatory compliance, and SARS integration at its core.
            </p>
          </motion.div>
        </div>
      </section>

      <AuditComplianceSection />
      <ComparisonTable />

      <section className="page-cta">
        <div className="container">
          <motion.div className="page-cta-content" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2>Walk Into Your Next Audit With Confidence</h2>
            <p>See how SiyaBusa keeps every transaction compliant — automatically.</p>
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
