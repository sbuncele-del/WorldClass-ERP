/**
 * Footer — Clean organized mega-footer
 * 5-column grid, office info, social proof
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Linkedin, Twitter, Facebook, Youtube, MapPin, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <footer className="footer">
      <div className="container">
        {/* Main footer grid */}
        <div className="footer-mega-grid">
          {/* Column 1: ERP Overview */}
          <div className="footer-col">
            <h4 className="footer-col-heading">Platform</h4>
            <Link to="/features">All Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/security">Security</Link>
            <Link to="/compliance">Compliance</Link>
            <Link to="/switch-to-siyabusa">Why Switch?</Link>
            <Link to="/data-migration">Data Migration</Link>
          </div>

          {/* Column 2: Solutions */}
          <div className="footer-col">
            <h4 className="footer-col-heading">Solutions</h4>
            <Link to="/features">Financial Accounting</Link>
            <Link to="/features">HR & Payroll</Link>
            <Link to="/features">Inventory & Warehouse</Link>
            <Link to="/features">Sales & CRM</Link>
            <Link to="/features">Manufacturing</Link>
            <Link to="/for-accountants">For Accountants</Link>
          </div>

          {/* Column 3: Company */}
          <div className="footer-col">
            <h4 className="footer-col-heading">Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/partners">Partners</Link>
            <Link to="/contact">Contact</Link>
          </div>

          {/* Column 4: Resources */}
          <div className="footer-col">
            <h4 className="footer-col-heading">Resources</h4>
            <Link to="/insights">Insights</Link>
            <Link to="/support">Support</Link>
            <Link to="/demo">Request a Demo</Link>
            <Link to="/try-demo">Free Trial</Link>
          </div>
        </div>

        {/* Office + Social Row */}
        <div className="footer-info-row">
          <div className="footer-offices">
            <h4 className="footer-col-heading">Our Office</h4>
            <div className="footer-office-item">
              <MapPin size={14} />
              <span>Centurion, Gauteng, South Africa</span>
            </div>
          </div>

          <div className="footer-contact-info">
            <h4 className="footer-col-heading">Get in Touch</h4>
            <div className="footer-contact-row">
              <a href="mailto:support@siyabusaerp.co.za"><Mail size={14} /> support@siyabusaerp.co.za</a>
              <a href="mailto:sales@siyabusaerp.co.za"><Mail size={14} /> sales@siyabusaerp.co.za</a>
            </div>
          </div>

          <div className="footer-social-section">
            <h4 className="footer-col-heading">Follow Us</h4>
            <div className="footer-social-icons">
              <a href="https://www.linkedin.com/company/siyabusa" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><Linkedin size={20} /></a>
              <a href="https://twitter.com/siyabusa_erp" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><Twitter size={20} /></a>
              <a href="https://facebook.com/siyabusaerp" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={20} /></a>
              <a href="https://youtube.com/@siyabusaerp" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube size={20} /></a>
            </div>
          </div>

          <div className="footer-newsletter-section">
            <h4 className="footer-col-heading">Stay Updated</h4>
            {subscribed ? (
              <p style={{ color: '#00D4AA', fontWeight: 600, fontSize: '0.85rem' }}>Thanks for subscribing!</p>
            ) : (
              <form className="newsletter-form" onSubmit={handleNewsletter}>
                <input
                  type="email"
                  placeholder="your@email.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit"><ArrowRight size={16} /></button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} SiyaBusa. All Rights Reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/security">Trust Center</Link>
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
          <p className="footer-company-credit">A product of Masaphokati Technologies (Pty) Ltd</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
