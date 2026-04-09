/**
 * ModulePricing — Bundled tier pricing (Starter / Professional / Enterprise)
 * Premium corporate design targeting SMEs
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { staggerContainer, fadeInUp } from '../shared';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNote: string;
  cta: string;
  ctaStyle: 'outline' | 'primary' | 'dark';
  highlighted?: boolean;
  badge?: string;
  features: { label: string; included: boolean }[];
}

const TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Everything a growing business needs to get organised and compliant.',
    price: 'R999',
    priceNote: '/month — up to 5 users',
    cta: 'Start Free Trial',
    ctaStyle: 'outline',
    features: [
      { label: 'Financial Accounting (GL, AP, AR)', included: true },
      { label: 'Sales & Invoicing', included: true },
      { label: 'HR & Payroll', included: true },
      { label: 'Inventory Management', included: true },
      { label: 'SARS e-Filing Integration', included: true },
      { label: 'Standard Reports & Dashboards', included: true },
      { label: 'Email Support', included: true },
      { label: 'Project Management', included: false },
      { label: 'Manufacturing & BOM', included: false },
      { label: 'AI Assistant', included: false },
      { label: 'Custom Integrations', included: false },
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'The complete platform for established businesses that need full visibility.',
    price: 'R1,999',
    priceNote: '/month — up to 15 users',
    cta: 'Start Free Trial',
    ctaStyle: 'primary',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      { label: 'Everything in Starter', included: true },
      { label: 'Project Management', included: true },
      { label: 'Warehouse Management', included: true },
      { label: 'Purchase Management', included: true },
      { label: 'Asset Management (IAS 16)', included: true },
      { label: 'Cash Management & Bank Recon', included: true },
      { label: 'Manufacturing & BOM', included: true },
      { label: 'AI Assistant', included: true },
      { label: 'Advanced Reports & Analytics', included: true },
      { label: 'Priority Support', included: true },
      { label: 'Custom Integrations', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For multi-entity operations that demand enterprise-grade control.',
    price: 'Custom',
    priceNote: 'Tailored to your organisation',
    cta: 'Contact Sales',
    ctaStyle: 'dark',
    features: [
      { label: 'Everything in Professional', included: true },
      { label: 'Unlimited Users', included: true },
      { label: 'Multi-Entity Consolidation', included: true },
      { label: 'Intercompany Transactions', included: true },
      { label: 'Custom Integrations & API Access', included: true },
      { label: 'Dedicated Account Manager', included: true },
      { label: 'SLA & Uptime Guarantee', included: true },
      { label: 'On-Boarding & Data Migration', included: true },
      { label: 'Audit Hub & Compliance Pack', included: true },
      { label: 'Custom Reporting', included: true },
      { label: 'Phone & Video Support', included: true },
    ],
  },
];

const ModulePricing: React.FC = () => {
  const navigate = useNavigate();

  const handleCTA = (tier: PricingTier) => {
    if (tier.id === 'enterprise') {
      navigate('/contact?interest=enterprise');
    } else {
      navigate(`/signup?plan=${tier.id}`);
    }
  };

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-section-inner">
        <motion.div
          className="pricing-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="pricing-eyebrow">Pricing</span>
          <h2 className="pricing-title">
            One platform, three plans.<br />
            Choose what fits your business.
          </h2>
          <p className="pricing-subtitle">
            Every plan includes a 14-day free trial. No credit card required.
            Cancel anytime.
          </p>
        </motion.div>

        <motion.div
          className="pricing-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {TIERS.map(tier => (
            <motion.div
              key={tier.id}
              className={`pricing-card ${tier.highlighted ? 'pricing-card-highlighted' : ''}`}
              variants={fadeInUp}
            >
              {tier.badge && (
                <div className="pricing-badge">{tier.badge}</div>
              )}

              <div className="pricing-card-top">
                <h3 className="pricing-card-name">{tier.name}</h3>
                <p className="pricing-card-desc">{tier.description}</p>

                <div className="pricing-card-price">
                  <span className="pricing-amount">{tier.price}</span>
                  <span className="pricing-note">{tier.priceNote}</span>
                </div>
              </div>

              <button
                className={`pricing-cta pricing-cta-${tier.ctaStyle}`}
                onClick={() => handleCTA(tier)}
              >
                {tier.cta} <ArrowRight size={16} />
              </button>

              <ul className="pricing-features">
                {tier.features.map((f, i) => (
                  <li key={i} className={f.included ? 'included' : 'excluded'}>
                    {f.included
                      ? <Check size={16} className="check-icon" />
                      : <Minus size={16} className="minus-icon" />
                    }
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          className="pricing-footer-note"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          All prices exclude VAT. Annual billing available at 15% discount.
          Need a custom configuration?{' '}
          <a href="/contact" className="pricing-footer-link">
            Talk to our team
          </a>
        </motion.p>
      </div>
    </section>
  );
};

export default ModulePricing;
