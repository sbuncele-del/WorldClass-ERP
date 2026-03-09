import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Mail, BookOpen, GraduationCap, CheckCircle } from 'lucide-react';
import { WebsiteLayout, fadeInUp } from './LandingPage/LandingPage';
import './FooterPages.css';

const Support: React.FC = () => {
  return (
    <WebsiteLayout title="Support Center — SiyaBusa ERP">
      <section className="page-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="section-badge">Help & Support</span>
            <h1>Support Center</h1>
            <p className="page-hero-subtitle">We're here to help you succeed</p>
          </motion.div>
        </div>
      </section>

      <section className="website-section">
        <div className="container">
          <motion.div variants={fadeInUp} initial="initial" whileInView="animate" viewport={{ once: true }}>

          <section className="content-section">
            <div className="support-options">
              <div className="support-card primary">
                <MessageCircle size={32} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h2>Live Chat</h2>
                <p>Get instant help from our support team during business hours.</p>
                <p className="availability">Mon-Fri, 8:00 - 17:00 SAST</p>
                <button className="btn-primary">Start Chat</button>
              </div>

              <div className="support-card">
                <Mail size={32} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h2>Email Support</h2>
                <p>Send us a detailed message and we'll respond within 24 hours.</p>
                <a href="mailto:hello@siyabusaerp.co.za" className="btn-secondary">
                  hello@siyabusaerp.co.za
                </a>
              </div>

              <div className="support-card">
                <BookOpen size={32} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h2>Documentation</h2>
                <p>Browse our comprehensive guides, tutorials, and FAQs.</p>
                <Link to="/documentation" className="btn-secondary">
                  Browse Docs
                </Link>
              </div>

              <div className="support-card">
                <GraduationCap size={32} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h2>Training</h2>
                <p>Schedule a training session for you and your team.</p>
                <a href="mailto:hello@siyabusaerp.co.za" className="btn-secondary">
                  Request Training
                </a>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              <details className="faq-item">
                <summary>How do I reset my password?</summary>
                <p>
                  Click "Forgot Password" on the login page and enter your email address. 
                  You'll receive a password reset link within a few minutes. If you don't 
                  receive the email, check your spam folder or contact support.
                </p>
              </details>

              <details className="faq-item">
                <summary>Can I import data from my existing system?</summary>
                <p>
                  Yes! SiyaBusa supports importing data from Excel, CSV files, and many 
                  popular accounting systems. Our implementation team can assist with 
                  complex migrations. Contact us to discuss your specific requirements.
                </p>
              </details>

              <details className="faq-item">
                <summary>What payment methods do you accept?</summary>
                <p>
                  We accept credit cards, debit cards, and EFT (bank transfer) for South 
                  African customers. Enterprise customers can request invoicing with 
                  payment terms.
                </p>
              </details>

              <details className="faq-item">
                <summary>Is my data backed up?</summary>
                <p>
                  Yes, we perform automated daily backups of all customer data. Backups 
                  are encrypted and stored in geographically separate locations. We 
                  retain backups for 30 days, and enterprise customers can request 
                  longer retention periods.
                </p>
              </details>

              <details className="faq-item">
                <summary>Can I cancel my subscription?</summary>
                <p>
                  You can cancel your subscription at any time from your account settings. 
                  Your access continues until the end of your current billing period. 
                  You can export your data within 30 days of cancellation.
                </p>
              </details>

              <details className="faq-item">
                <summary>How do I add more users?</summary>
                <p>
                  Account administrators can add users from the Settings → User Management 
                  section. Additional users may incur extra charges depending on your 
                  subscription plan. Each user receives their own login credentials.
                </p>
              </details>

              <details className="faq-item">
                <summary>Do you offer implementation assistance?</summary>
                <p>
                  Yes, we offer implementation packages to help you get started quickly. 
                  Our team will help configure the system, import your data, and train 
                  your staff. Contact sales for a custom quote.
                </p>
              </details>

              <details className="faq-item">
                <summary>What browsers are supported?</summary>
                <p>
                  SiyaBusa works best on the latest versions of Chrome, Firefox, Safari, 
                  and Edge. We recommend using Chrome for the best experience. Internet 
                  Explorer is not supported.
                </p>
              </details>
            </div>
          </section>

          <section className="content-section">
            <h2>Support Plans</h2>
            <div className="support-plans">
              <div className="plan-card">
                <h3>Standard</h3>
                <p className="plan-included">Included with all plans</p>
                <ul>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Email support (24-hour response)</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Documentation access</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Community forums</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />System status updates</li>
                </ul>
              </div>

              <div className="plan-card featured">
                <h3>Priority</h3>
                <p className="plan-price">From R2,500/month</p>
                <ul>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Everything in Standard</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Live chat support</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />4-hour response time</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Phone support</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Quarterly business reviews</li>
                </ul>
              </div>

              <div className="plan-card">
                <h3>Enterprise</h3>
                <p className="plan-price">Custom pricing</p>
                <ul>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Everything in Priority</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Dedicated account manager</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />1-hour response time</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />24/7 emergency support</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />On-site training</li>
                  <li><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />Custom SLA</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>System Status</h2>
            <div className="status-box operational">
              <div className="status-indicator"></div>
              <span>All Systems Operational</span>
            </div>
          </section>

          <section className="content-section cta-section">
            <h2>Still Need Help?</h2>
            <p>Our team is ready to assist you with any questions or issues.</p>
            <div className="cta-buttons">
              <a href="mailto:hello@siyabusaerp.co.za" className="btn-primary">Email Support</a>
              <Link to="/contact" className="btn-secondary">Contact Us</Link>
            </div>
          </section>

          </motion.div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default Support;
