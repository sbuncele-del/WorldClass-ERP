/**
 * ModulePricing — Pick individual modules or full platform
 * Conversion-focused: each module has its own CTA
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calculator, Users, Package, FolderKanban, Truck, Building2,
  Briefcase, Heart, HardHat, Tractor, Factory, BarChart3,
  ArrowRight, Check, Star, Crown
} from 'lucide-react';
import { staggerContainer, fadeInUp } from '../shared';

interface ModuleTier {
  id: string;
  name: string;
  icon: React.ReactNode;
  price: string;
  period: string;
  description: string;
  highlights: string[];
  popular?: boolean;
  color: string;
}

const MODULES: ModuleTier[] = [
  {
    id: 'project-management',
    name: 'Project Management',
    icon: <FolderKanban size={24} />,
    price: 'R299',
    period: '/mo per 5 users',
    description: 'Tasks, timelines, resources, Gantt charts, and team collaboration.',
    highlights: ['Unlimited projects', 'Gantt & Kanban views', 'Time tracking', 'Resource allocation'],
    popular: true,
    color: '#8B5CF6',
  },
  {
    id: 'financial-accounting',
    name: 'Accounting & Finance',
    icon: <Calculator size={24} />,
    price: 'R499',
    period: '/mo per 5 users',
    description: 'General ledger, AP/AR, SARS-ready tax, bank reconciliation.',
    highlights: ['Chart of Accounts', 'SARS e-Filing', 'Bank reconciliation', 'Financial reports'],
    color: '#00D4AA',
  },
  {
    id: 'hr-payroll',
    name: 'HR & Payroll',
    icon: <Users size={24} />,
    price: 'R399',
    period: '/mo per 5 users',
    description: 'Employee management, payroll processing, leave, and compliance.',
    highlights: ['Payroll processing', 'Leave management', 'Employee self-service', 'UIF/PAYE compliance'],
    color: '#3B82F6',
  },
  {
    id: 'inventory',
    name: 'Inventory & Warehouse',
    icon: <Package size={24} />,
    price: 'R349',
    period: '/mo per 5 users',
    description: 'Stock control, warehousing, transfers, and picking.',
    highlights: ['Multi-warehouse', 'Stock alerts', 'Barcode scanning', 'Transfer management'],
    color: '#F59E0B',
  },
  {
    id: 'sales-crm',
    name: 'Sales & CRM',
    icon: <Briefcase size={24} />,
    price: 'R349',
    period: '/mo per 5 users',
    description: 'Quotes, invoicing, customer management, and sales pipeline.',
    highlights: ['Quote → Invoice flow', 'Customer portal', 'Pipeline tracking', 'Delivery notes'],
    color: '#EF4444',
  },
  {
    id: 'logistics',
    name: 'Logistics & Fleet',
    icon: <Truck size={24} />,
    price: 'R399',
    period: '/mo per 5 users',
    description: 'Fleet management, route planning, driver tracking, and delivery.',
    highlights: ['Fleet tracking', 'Route optimization', 'Driver management', 'Delivery verification'],
    color: '#06B6D4',
  },
];

const INDUSTRY_MODULES: ModuleTier[] = [
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: <Heart size={24} />,
    price: 'R499',
    period: '/mo',
    description: 'Patient management, medical inventory, and healthcare compliance.',
    highlights: ['Patient records', 'Medical inventory', 'Appointment scheduling'],
    color: '#EC4899',
  },
  {
    id: 'construction',
    name: 'Construction',
    icon: <HardHat size={24} />,
    price: 'R499',
    period: '/mo',
    description: 'Project costing, progress billing, and subcontractor management.',
    highlights: ['Cost tracking', 'Progress billing', 'Subcontractor management'],
    color: '#F97316',
  },
  {
    id: 'property',
    name: 'Property Management',
    icon: <Building2 size={24} />,
    price: 'R449',
    period: '/mo',
    description: 'Lease management, tenant billing, and property maintenance.',
    highlights: ['Lease tracking', 'Tenant billing', 'Maintenance requests'],
    color: '#14B8A6',
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    icon: <Tractor size={24} />,
    price: 'R449',
    period: '/mo',
    description: 'Crop management, farm operations, and agricultural compliance.',
    highlights: ['Crop tracking', 'Farm operations', 'Yield analytics'],
    color: '#22C55E',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: <Factory size={24} />,
    price: 'R499',
    period: '/mo',
    description: 'BOM, work orders, production planning, and quality control.',
    highlights: ['Bill of Materials', 'Work orders', 'Production scheduling'],
    color: '#6366F1',
  },
  {
    id: 'analytics',
    name: 'Reports & Analytics',
    icon: <BarChart3 size={24} />,
    price: 'R199',
    period: '/mo',
    description: 'Custom dashboards, KPIs, automated reports, and AI insights.',
    highlights: ['Custom dashboards', 'Scheduled reports', 'AI-powered insights'],
    color: '#A855F7',
  },
];

const ModulePricing: React.FC = () => {
  const navigate = useNavigate();

  const handleModuleSignup = (moduleId: string) => {
    navigate(`/signup?module=${moduleId}`);
  };

  return (
    <section className="module-pricing">
      <div className="module-pricing-inner">
        {/* Full platform banner */}
        <motion.div
          className="platform-banner"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="platform-banner-content">
            <div className="platform-banner-badge">
              <Crown size={16} />
              <span>Best Value — Save 60%+</span>
            </div>
            <h2>Full Platform</h2>
            <p className="platform-banner-desc">
              All 17+ modules, all integrations, all future updates.
              One price for your entire business.
            </p>
            <div className="platform-banner-price">
              <span className="price-amount">R1,499</span>
              <span className="price-period">/mo for 10 users</span>
            </div>
            <ul className="platform-banner-perks">
              <li><Check size={16} /> Every module included</li>
              <li><Check size={16} /> SARS integration</li>
              <li><Check size={16} /> AI assistant</li>
              <li><Check size={16} /> Priority support</li>
            </ul>
            <button className="btn-primary platform-cta" onClick={() => navigate('/signup?plan=founding-member')}>
              Start Free Trial — Full Platform <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* OR divider */}
        <div className="pricing-divider">
          <span>or pick individual modules</span>
        </div>

        {/* Core modules */}
        <h3 className="module-section-title">Core Business Modules</h3>
        <motion.div
          className="module-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {MODULES.map(mod => (
            <motion.div
              key={mod.id}
              className={`module-card ${mod.popular ? 'module-popular' : ''}`}
              variants={fadeInUp}
            >
              {mod.popular && (
                <div className="module-popular-badge">
                  <Star size={12} /> Most Popular
                </div>
              )}
              <div className="module-card-icon" style={{ color: mod.color }}>
                {mod.icon}
              </div>
              <h4>{mod.name}</h4>
              <p className="module-card-desc">{mod.description}</p>
              <div className="module-card-price">
                <span className="module-price">{mod.price}</span>
                <span className="module-period">{mod.period}</span>
              </div>
              <ul className="module-card-features">
                {mod.highlights.map((h, i) => (
                  <li key={i}><Check size={14} /> {h}</li>
                ))}
              </ul>
              <button
                className="module-card-cta"
                onClick={() => handleModuleSignup(mod.id)}
              >
                Start Free <ArrowRight size={16} />
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* Industry modules */}
        <h3 className="module-section-title">Industry-Specific Add-ons</h3>
        <motion.div
          className="module-grid module-grid-sm"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {INDUSTRY_MODULES.map(mod => (
            <motion.div key={mod.id} className="module-card module-card-sm" variants={fadeInUp}>
              <div className="module-card-icon" style={{ color: mod.color }}>
                {mod.icon}
              </div>
              <h4>{mod.name}</h4>
              <p className="module-card-desc">{mod.description}</p>
              <div className="module-card-price">
                <span className="module-price">{mod.price}</span>
                <span className="module-period">{mod.period}</span>
              </div>
              <button
                className="module-card-cta"
                onClick={() => handleModuleSignup(mod.id)}
              >
                Start Free <ArrowRight size={16} />
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ModulePricing;
