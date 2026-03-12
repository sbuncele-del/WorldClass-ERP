import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import {
  WebsiteLayout,
  ModuleShowcase,
  ProjectManagementShowcase,
  AdditionalModules,
  fadeInUp
} from '../LandingPage/LandingPage';

const FeaturesPage: React.FC = () => {
  return (
    <WebsiteLayout title="Features & Modules — SiyaBusa ERP" description="Explore 17 integrated ERP modules: Financial Accounting, HR & Payroll, Inventory, Sales & CRM, Manufacturing, Warehouse, Projects, SARS Compliance, and more. Built for South African businesses." canonical="https://siyabusaerp.co.za/features">
      <section className="page-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="section-badge">Platform Features</span>
            <h1>One Platform. Every Module You Need.</h1>
            <p className="page-hero-subtitle">
              Every module seamlessly integrates business operations with IFRS-compliant 
              accounting — no more data silos, no more reconciliation nightmares.
            </p>
          </motion.div>
        </div>
      </section>

      <ModuleShowcase hideHeader />
      <ProjectManagementShowcase hideHeader />
      <AdditionalModules hideHeader />

      <section className="page-cta">
        <div className="container">
          <motion.div className="page-cta-content" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2>See These Features in Action</h2>
            <p>Schedule a personalised demo and we'll show you the modules most relevant to your business.</p>
            <Link to="/demo" className="btn-primary btn-large">
              Request a Demo <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default FeaturesPage;
