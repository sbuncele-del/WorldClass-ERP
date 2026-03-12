import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cloud, Globe, RefreshCw, Lock, Shield, Database, HardDrive, Key, Users, FileText, ClipboardList, Code, FlaskConical, Rocket, BarChart3, GraduationCap, Search, DoorOpen, Smartphone } from 'lucide-react';
import { WebsiteLayout, fadeInUp } from './LandingPage/LandingPage';
import './FooterPages.css';

const SecurityIconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="contact-icon-wrapper">{children}</div>
);

const Security: React.FC = () => {
  return (
    <WebsiteLayout title="Security — SiyaBusa ERP" description="Enterprise-grade security for your business data. AES-256 encryption, SOC 2 practices, POPIA compliance, role-based access control, and 99.9% uptime SLA. Your data is safe with SiyaBusa." canonical="https://siyabusaerp.co.za/security">
      <section className="page-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="section-badge">Trust & Security</span>
            <h1>Security at SiyaBusa</h1>
            <p className="page-hero-subtitle">Enterprise-grade security for your most sensitive data</p>
          </motion.div>
        </div>
      </section>

      <section className="website-section">
        <div className="container">
          <motion.div variants={fadeInUp} initial="initial" whileInView="animate" viewport={{ once: true }}>

          <section className="content-section">
            <h2>Our Security Commitment</h2>
            <p>
              At SiyaBusa, security is not an afterthought—it's foundational to everything we build. 
              Your business data is critical, and we treat its protection with the utmost seriousness. 
              We implement industry-leading security practices to ensure your information remains 
              confidential, intact, and available when you need it.
            </p>
          </section>

          <section className="content-section">
            <h2>Infrastructure Security</h2>
            
            <div className="security-card">
              <SecurityIconWrapper><Cloud size={24} /></SecurityIconWrapper>
              <div className="security-content">
                <h3>Cloud Hosting</h3>
                <p>
                  SiyaBusa is hosted on dedicated infrastructure in Johannesburg, South Africa — 
                  meaning your data stays local. Our hosting provider maintains enterprise-grade 
                  data centre security, redundant power, and 24/7 physical security.
                </p>
              </div>
            </div>

            <div className="security-card">
              <SecurityIconWrapper><Globe size={24} /></SecurityIconWrapper>
              <div className="security-content">
                <h3>Data Residency</h3>
                <p>
                  Your data is hosted in Johannesburg, South Africa and never leaves the country 
                  without your explicit consent. This ensures full compliance with POPIA data 
                  residency requirements and keeps latency low for South African businesses.
                </p>
              </div>
            </div>

            <div className="security-card">
              <SecurityIconWrapper><RefreshCw size={24} /></SecurityIconWrapper>
              <div className="security-content">
                <h3>Redundancy & Availability</h3>
                <p>
                  Our infrastructure is designed for high availability with automatic failover, 
                  load balancing, and geographic redundancy. We maintain 99.9% uptime SLA for 
                  enterprise customers.
                </p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Data Protection</h2>

            <div className="security-grid">
              <div className="security-item">
                <Lock size={24} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h3>Encryption at Rest</h3>
                <p>All data stored in our databases is encrypted using AES-256 encryption, one of the strongest encryption standards available.</p>
              </div>
              <div className="security-item">
                <Shield size={24} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h3>Encryption in Transit</h3>
                <p>All data transmitted between your browser and our servers is protected using TLS 1.3, ensuring end-to-end encryption.</p>
              </div>
              <div className="security-item">
                <Database size={24} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h3>Database Security</h3>
                <p>Databases are isolated per tenant, access-controlled, and protected by network firewalls. Direct database access is strictly limited.</p>
              </div>
              <div className="security-item">
                <HardDrive size={24} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h3>Backup & Recovery</h3>
                <p>Automated daily backups with point-in-time recovery. Backups are encrypted and stored in geographically separate locations.</p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Application Security</h2>

            <div className="security-card">
              <SecurityIconWrapper><Key size={24} /></SecurityIconWrapper>
              <div className="security-content">
                <h3>Authentication</h3>
                <ul>
                  <li>Strong password requirements with breach detection</li>
                  <li>Multi-factor authentication (MFA) support</li>
                  <li>Single Sign-On (SSO) via SAML 2.0 and OAuth 2.0</li>
                  <li>Session management with automatic timeout</li>
                  <li>Brute force protection and account lockout</li>
                </ul>
              </div>
            </div>

            <div className="security-card">
              <SecurityIconWrapper><Users size={24} /></SecurityIconWrapper>
              <div className="security-content">
                <h3>Authorization & Access Control</h3>
                <ul>
                  <li>Role-based access control (RBAC) with granular permissions</li>
                  <li>Principle of least privilege enforced by default</li>
                  <li>Segregation of duties for sensitive operations</li>
                  <li>Admin controls for user management and access reviews</li>
                </ul>
              </div>
            </div>

            <div className="security-card">
              <SecurityIconWrapper><FileText size={24} /></SecurityIconWrapper>
              <div className="security-content">
                <h3>Audit Logging</h3>
                <ul>
                  <li>Comprehensive audit trails for all user actions</li>
                  <li>Immutable logs stored separately from application data</li>
                  <li>Real-time monitoring and alerting for suspicious activity</li>
                  <li>Log retention in accordance with regulatory requirements</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Security Development Lifecycle</h2>

            <div className="sdlc-process">
              <div className="sdlc-step">
                <div className="step-icon-wrapper"><ClipboardList size={24} /></div>
                <h3>Secure Design</h3>
                <p>Security requirements defined at the start of every project. Threat modeling for new features.</p>
              </div>
              <div className="sdlc-step">
                <div className="step-icon-wrapper"><Code size={24} /></div>
                <h3>Secure Coding</h3>
                <p>Developer security training. Code reviews with security focus. Static code analysis on every commit.</p>
              </div>
              <div className="sdlc-step">
                <div className="step-icon-wrapper"><FlaskConical size={24} /></div>
                <h3>Security Testing</h3>
                <p>Automated vulnerability scanning. Dynamic application security testing. Regular penetration testing by third parties.</p>
              </div>
              <div className="sdlc-step">
                <div className="step-icon-wrapper"><Rocket size={24} /></div>
                <h3>Secure Deployment</h3>
                <p>Automated deployment pipelines. Infrastructure as code. Configuration management and drift detection.</p>
              </div>
              <div className="sdlc-step">
                <div className="step-icon-wrapper"><BarChart3 size={24} /></div>
                <h3>Monitoring</h3>
                <p>24/7 security monitoring. Incident detection and response. Continuous vulnerability management.</p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Compliance & Certifications</h2>
            <p>
              We align our security practices with international standards and are working toward 
              formal certifications:
            </p>

            <div className="compliance-grid">
              <div className="compliance-item">
                <h3>POPIA</h3>
                <p>Full compliance with South Africa's Protection of Personal Information Act</p>
              </div>
              <div className="compliance-item">
                <h3>GDPR</h3>
                <p>Aligned with European General Data Protection Regulation requirements</p>
              </div>
              <div className="compliance-item">
                <h3>ISO 27001</h3>
                <p>Information security management practices based on ISO 27001 framework</p>
              </div>
              <div className="compliance-item">
                <h3>SOC 2</h3>
                <p>Security, availability, and confidentiality controls (certification in progress)</p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Incident Response</h2>
            <p>
              We maintain a comprehensive incident response program to quickly detect, contain, 
              and remediate security incidents:
            </p>
            <ul>
              <li><strong>Detection:</strong> 24/7 monitoring with automated alerting for security anomalies</li>
              <li><strong>Response:</strong> Dedicated incident response team with defined escalation procedures</li>
              <li><strong>Communication:</strong> Prompt notification to affected customers as required by law</li>
              <li><strong>Recovery:</strong> Documented procedures for service restoration and data recovery</li>
              <li><strong>Learning:</strong> Post-incident reviews to improve our defenses</li>
            </ul>
          </section>

          <section className="content-section">
            <h2>Employee Security</h2>
            <div className="security-grid">
              <div className="security-item">
                <GraduationCap size={24} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h3>Training</h3>
                <p>All employees complete security awareness training upon hiring and annually thereafter.</p>
              </div>
              <div className="security-item">
                <Search size={24} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h3>Background Checks</h3>
                <p>Background verification for all employees with access to customer data or systems.</p>
              </div>
              <div className="security-item">
                <DoorOpen size={24} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h3>Access Management</h3>
                <p>Strict need-to-know access. Regular access reviews. Immediate deprovisioning on departure.</p>
              </div>
              <div className="security-item">
                <Smartphone size={24} style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }} />
                <h3>Endpoint Security</h3>
                <p>Company devices protected with encryption, EDR, and mobile device management.</p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Vulnerability Disclosure</h2>
            <p>
              We value the security research community and welcome responsible disclosure of 
              potential vulnerabilities. If you discover a security issue:
            </p>
            <div className="info-block">
              <p><strong>Email:</strong> <a href="mailto:support@siyabusaerp.co.za">support@siyabusaerp.co.za</a></p>
              <p><strong>PGP Key:</strong> Available upon request</p>
            </div>
            <p>
              Please provide detailed information including steps to reproduce. We commit to:
            </p>
            <ul>
              <li>Acknowledging your report within 48 hours</li>
              <li>Keeping you informed of our progress</li>
              <li>Not pursuing legal action for good-faith research</li>
              <li>Recognizing your contribution (with your permission)</li>
            </ul>
          </section>

          <section className="content-section">
            <h2>Your Security Responsibilities</h2>
            <p>
              Security is a shared responsibility. We recommend that you:
            </p>
            <ul>
              <li>Use strong, unique passwords and enable multi-factor authentication</li>
              <li>Keep your devices and browsers up to date</li>
              <li>Review user access regularly and remove inactive accounts</li>
              <li>Train your team on security awareness and phishing prevention</li>
              <li>Report any suspicious activity to your administrator and our support team</li>
              <li>Follow the principle of least privilege when assigning permissions</li>
            </ul>
          </section>

          <section className="content-section cta-section">
            <h2>Questions About Security?</h2>
            <p>
              We're happy to discuss our security practices in more detail. Enterprise customers 
              can request our security documentation, penetration test summaries, and detailed 
              compliance information.
            </p>
            <div className="cta-buttons">
              <a href="mailto:support@siyabusaerp.co.za" className="btn-primary">Contact Security Team</a>
              <Link to="/privacy" className="btn-secondary">View Privacy Policy</Link>
            </div>
          </section>

          </motion.div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default Security;
