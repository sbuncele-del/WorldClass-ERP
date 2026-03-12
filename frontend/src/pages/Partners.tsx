import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Wrench, Handshake, BarChart3 } from 'lucide-react';
import { WebsiteLayout, fadeInUp } from './LandingPage/LandingPage';
import './FooterPages.css';

const Partners: React.FC = () => {
  const partnerTypes = [
    {
      type: 'Technology Partners',
      icon: <Settings size={28} />,
      description: 'Integrate your software with SiyaBusa to create seamless workflows for shared customers.',
      benefits: [
        'API access and technical documentation',
        'Co-marketing opportunities',
        'Joint customer success initiatives',
        'Partner portal access',
      ]
    },
    {
      type: 'Implementation Partners',
      icon: <Wrench size={28} />,
      description: 'Help businesses implement and customize SiyaBusa while growing your consulting practice.',
      benefits: [
        'Implementation certification training',
        'Lead referrals from our sales team',
        'Commission on referred subscriptions',
        'Technical support for partner projects',
      ]
    },
    {
      type: 'Reseller Partners',
      icon: <Handshake size={28} />,
      description: 'Sell SiyaBusa to your client base and earn recurring revenue on subscriptions.',
      benefits: [
        'Competitive partner pricing',
        'Sales and product training',
        'Marketing materials and collateral',
        'Dedicated partner account manager',
      ]
    },
    {
      type: 'Accounting Firms',
      icon: <BarChart3 size={28} />,
      description: 'Recommend SiyaBusa to your clients and benefit from streamlined collaboration.',
      benefits: [
        'Free accountant portal access',
        'Multi-client management dashboard',
        'Referral commissions',
        'Priority support for client issues',
      ]
    },
  ];

  return (
    <WebsiteLayout title="Partner Program — SiyaBusa ERP" description="Join the SiyaBusa Partner Programme. Technology partners, reseller partners, and accounting firm partners. Earn commissions, get priority support, and grow your business with South Africa's ERP platform." canonical="https://siyabusaerp.co.za/partners">
      <section className="page-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="section-badge">Partnerships</span>
            <h1>Partner Program</h1>
            <p className="page-hero-subtitle">Grow your business with SiyaBusa</p>
          </motion.div>
        </div>
      </section>

      <section className="website-section">
        <div className="container">
          <motion.div variants={fadeInUp} initial="initial" whileInView="animate" viewport={{ once: true }}>

          <section className="content-section">
            <h2>Why Partner With Us?</h2>
            <p>
              The SiyaBusa Partner Program is designed to help you grow your business while 
              delivering exceptional value to your clients. Whether you're a technology company, 
              consulting firm, or accounting practice, we have a partnership model that fits 
              your business.
            </p>


          </section>

          <section className="content-section">
            <h2>Partnership Types</h2>
            <div className="partner-types">
              {partnerTypes.map((partner, index) => (
                <div key={index} className="partner-type-card">
                  <div className="partner-icon-wrapper" style={{ color: 'var(--accent-teal, #00D4AA)', marginBottom: '0.75rem' }}>{partner.icon}</div>
                  <h3>{partner.type}</h3>
                  <p>{partner.description}</p>
                  <h4>Benefits:</h4>
                  <ul>
                    {partner.benefits.map((benefit, i) => (
                      <li key={i}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="content-section">
            <h2>Partner Tiers</h2>
            <div className="tier-table">
              <div className="tier registered">
                <h3>Registered</h3>
                <p>Starting tier for new partners</p>
                <ul>
                  <li>Partner portal access</li>
                  <li>Basic training materials</li>
                  <li>10% referral commission</li>
                </ul>
              </div>
              <div className="tier silver">
                <h3>Silver</h3>
                <p>For established partners</p>
                <ul>
                  <li>All Registered benefits</li>
                  <li>Co-marketing funds</li>
                  <li>15% referral commission</li>
                  <li>Lead sharing</li>
                </ul>
              </div>
              <div className="tier gold">
                <h3>Gold</h3>
                <p>Top-performing partners</p>
                <ul>
                  <li>All Silver benefits</li>
                  <li>Dedicated partner manager</li>
                  <li>20% referral commission</li>
                  <li>Priority support</li>
                  <li>Conference invitations</li>
                </ul>
              </div>
            </div>
          </section>



          <section className="content-section cta-section">
            <h2>Ready to Partner?</h2>
            <p>
              Join our growing partner ecosystem and help businesses across Africa 
              transform their operations.
            </p>
            <div className="cta-buttons">
              <a href="mailto:hello@siyabusaerp.co.za?subject=Partnership Inquiry" className="btn-primary">
                Apply Now
              </a>
              <a href="mailto:hello@siyabusaerp.co.za" className="btn-secondary">
                Contact Partner Team
              </a>
            </div>
          </section>

          </motion.div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default Partners;
