import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  WebsiteLayout,
  AIDemo,
  ROICalculator,
  DemoForm,
  fadeInUp
} from '../LandingPage/LandingPage';

const DemoPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Request a Demo — SiyaBusa ERP';
  }, []);

  return (
    <WebsiteLayout title="Request a Demo — SiyaBusa ERP">
      <section className="page-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="section-badge">Experience SiyaBusa</span>
            <h1>See SiyaBusa in Action</h1>
            <p className="page-hero-subtitle">
              Experience the power of a truly integrated, AI-native ERP built for South African business.
              Schedule a personalised walkthrough tailored to your industry.
            </p>
          </motion.div>
        </div>
      </section>

      <AIDemo />
      <ROICalculator />
      <DemoForm />
    </WebsiteLayout>
  );
};

export default DemoPage;
