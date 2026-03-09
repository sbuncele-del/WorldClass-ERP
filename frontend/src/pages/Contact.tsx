import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Briefcase, Wrench, MapPin, CheckCircle, Building } from 'lucide-react';
import { WebsiteLayout, fadeInUp } from './LandingPage/LandingPage';
import './FooterPages.css';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
  };

  return (
    <WebsiteLayout title="Contact Us — SiyaBusa ERP">
      <section className="page-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="section-badge">Get in Touch</span>
            <h1>Contact Us</h1>
            <p className="page-hero-subtitle">
              Have questions about SiyaBusa? Want to schedule a demo? Our team is here to help.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="website-section">
        <div className="container">
          <div className="contact-grid">
            <motion.section className="contact-info" variants={fadeInUp} initial="initial" whileInView="animate" viewport={{ once: true }}>
              <h2>Get in Touch</h2>

              <div className="contact-methods">
                <div className="contact-method">
                  <div className="contact-icon-wrapper"><Mail size={24} /></div>
                  <div>
                    <h3>General Inquiries</h3>
                    <a href="mailto:hello@siyabusaerp.co.za">hello@siyabusaerp.co.za</a>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="contact-icon-wrapper"><Briefcase size={24} /></div>
                  <div>
                    <h3>Sales</h3>
                    <a href="mailto:demo@siyabusaerp.co.za">demo@siyabusaerp.co.za</a>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="contact-icon-wrapper"><Wrench size={24} /></div>
                  <div>
                    <h3>Support</h3>
                    <a href="mailto:hello@siyabusaerp.co.za">hello@siyabusaerp.co.za</a>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="contact-icon-wrapper"><MapPin size={24} /></div>
                  <div>
                    <h3>Office</h3>
                    <p>Centurion, Gauteng<br />South Africa</p>
                  </div>
                </div>
              </div>

              <div className="company-info-box">
                <Building size={20} style={{ marginBottom: '0.5rem', opacity: 0.7 }} />
                <h3>Masaphokati Technologies (Pty) Ltd</h3>
                <p>
                  The company behind SiyaBusa, dedicated to transforming how African 
                  businesses manage their operations.
                </p>
              </div>
            </motion.section>

            <motion.section className="contact-form-section" variants={fadeInUp} initial="initial" whileInView="animate" viewport={{ once: true }}>
              {submitted ? (
                <div className="form-success">
                  <CheckCircle size={48} style={{ color: 'var(--accent-teal, #00D4AA)' }} />
                  <h2>Message Sent!</h2>
                  <p>Thank you for reaching out. We'll get back to you within 24 hours.</p>
                  <button onClick={() => setSubmitted(false)} className="btn-secondary">
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h2>Send us a Message</h2>
                  <form onSubmit={handleSubmit} className="contact-form">
                    <div className="form-group">
                      <label htmlFor="name">Full Name *</label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email Address *</label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="company">Company</label>
                      <input
                        type="text"
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="subject">Subject *</label>
                      <select
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        required
                      >
                        <option value="">Select a topic</option>
                        <option value="demo">Request a Demo</option>
                        <option value="pricing">Pricing Information</option>
                        <option value="support">Technical Support</option>
                        <option value="partnership">Partnership Inquiry</option>
                        <option value="media">Media & Press</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="message">Message *</label>
                      <textarea
                        id="message"
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        required
                      />
                    </div>

                    <button type="submit" className="btn-primary">
                      Send Message
                    </button>
                  </form>
                </>
              )}
            </motion.section>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default Contact;
