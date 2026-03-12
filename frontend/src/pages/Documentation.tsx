import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Rocket, DollarSign, Package, TrendingUp, ShoppingCart, Users, Link2, Settings } from 'lucide-react';
import { WebsiteLayout, fadeInUp, staggerContainer } from './LandingPage/LandingPage';
import './FooterPages.css';

const Documentation: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const docCategories = [
    {
      title: 'Getting Started',
      icon: <Rocket size={22} />,
      color: '#00D4AA',
      docs: [
        { title: 'Quick Start Guide', description: 'Set up your SiyaBusa account in minutes' },
        { title: 'System Requirements', description: 'Browser and device compatibility' },
        { title: 'First-Time Setup', description: 'Configure your company and preferences' },
        { title: 'User Management', description: 'Add team members and set permissions' },
      ]
    },
    {
      title: 'Financial Management',
      icon: <DollarSign size={22} />,
      color: '#667eea',
      docs: [
        { title: 'Chart of Accounts', description: 'Set up your accounting structure' },
        { title: 'General Ledger', description: 'Record and manage journal entries' },
        { title: 'Accounts Receivable', description: 'Invoice customers and track payments' },
        { title: 'Accounts Payable', description: 'Manage supplier invoices and payments' },
        { title: 'Bank Reconciliation', description: 'Match transactions and reconcile accounts' },
        { title: 'Financial Reports', description: 'Generate statements and analytics' },
      ]
    },
    {
      title: 'Inventory & Warehouse',
      icon: <Package size={22} />,
      color: '#f5576c',
      docs: [
        { title: 'Product Management', description: 'Create and manage your product catalog' },
        { title: 'Stock Control', description: 'Track inventory levels and movements' },
        { title: 'Warehouse Setup', description: 'Configure locations and bins' },
        { title: 'Stock Valuation', description: 'FIFO, LIFO, and weighted average methods' },
        { title: 'Inventory Reports', description: 'Stock aging, movement, and variance reports' },
      ]
    },
    {
      title: 'Sales & CRM',
      icon: <TrendingUp size={22} />,
      color: '#F6D242',
      docs: [
        { title: 'Customer Management', description: 'Manage customer records and history' },
        { title: 'Quotes & Proposals', description: 'Create and send professional quotes' },
        { title: 'Sales Orders', description: 'Process orders from quote to delivery' },
        { title: 'Invoice Generation', description: 'Create and send customer invoices' },
        { title: 'Sales Analytics', description: 'Track performance and trends' },
      ]
    },
    {
      title: 'Procurement',
      icon: <ShoppingCart size={22} />,
      color: '#00A884',
      docs: [
        { title: 'Supplier Management', description: 'Manage vendor information and terms' },
        { title: 'Purchase Orders', description: 'Create and track purchase orders' },
        { title: 'Goods Receipt', description: 'Process incoming deliveries' },
        { title: 'Supplier Invoices', description: 'Match invoices to orders and receipts' },
        { title: 'Procurement Reports', description: 'Analyze spending and supplier performance' },
      ]
    },
    {
      title: 'Human Resources',
      icon: <Users size={22} />,
      color: '#764ba2',
      docs: [
        { title: 'Employee Records', description: 'Manage employee information' },
        { title: 'Leave Management', description: 'Configure and track leave balances' },
        { title: 'Payroll Setup', description: 'Configure pay structures and deductions' },
        { title: 'Payroll Processing', description: 'Run payroll and generate payslips' },
        { title: 'HR Reports', description: 'Headcount, turnover, and compliance reports' },
      ]
    },
    {
      title: 'Integrations',
      icon: <Link2 size={22} />,
      color: '#36d1dc',
      docs: [
        { title: 'API Overview', description: 'Introduction to the SiyaBusa API' },
        { title: 'Authentication', description: 'OAuth 2.0 and API key setup' },
        { title: 'Bank Feeds', description: 'Connect your bank accounts' },
        { title: 'Third-Party Apps', description: 'Available integrations and setup' },
        { title: 'Webhooks', description: 'Real-time event notifications' },
      ]
    },
    {
      title: 'Administration',
      icon: <Settings size={22} />,
      color: '#ff6b6b',
      docs: [
        { title: 'Company Settings', description: 'Configure company-wide preferences' },
        { title: 'Security Settings', description: 'MFA, SSO, and password policies' },
        { title: 'Audit Logs', description: 'View system activity and changes' },
        { title: 'Data Export', description: 'Export your data in various formats' },
        { title: 'Backup & Recovery', description: 'Understand our backup policies' },
      ]
    },
  ];

  const filteredCategories = searchTerm
    ? docCategories.map(cat => ({
        ...cat,
        docs: cat.docs.filter(d =>
          d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(cat => cat.docs.length > 0)
    : docCategories;

  return (
    <WebsiteLayout title="Documentation — SiyaBusa ERP" description="Complete documentation for SiyaBusa ERP. Guides for financial management, inventory, HR, payroll, sales, procurement, integrations, and administration." canonical="https://siyabusaerp.co.za/documentation">

      {/* Hero */}
      <section className="docs-hero">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1>Documentation</h1>
            <p className="docs-hero-sub">Everything you need to master SiyaBusa ERP</p>
            <div className="docs-search-wrap">
              <Search size={20} />
              <input
                type="search"
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Doc Categories Grid */}
      <section className="docs-categories-section">
        <div className="container">
          <motion.div className="docs-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {filteredCategories.map((category, index) => (
              <motion.div key={index} className="docs-category-card" variants={fadeInUp}>
                <div className="docs-category-header">
                  <div className="docs-category-icon" style={{ background: `${category.color}18`, color: category.color }}>
                    {category.icon}
                  </div>
                  <h2>{category.title}</h2>
                </div>
                <ul className="docs-list">
                  {category.docs.map((doc, docIndex) => (
                    <li key={docIndex}>
                      <strong>{doc.title}</strong>
                      <span>{doc.description}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="docs-cta-section">
        <div className="container">
          <motion.div className="docs-cta" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2>Can't find what you need?</h2>
            <p>Our support team is ready to help you with any questions.</p>
            <div className="docs-cta-buttons">
              <Link to="/support" className="docs-cta-btn primary">Contact Support</Link>
              <Link to="/contact" className="docs-cta-btn secondary">Request Feature</Link>
            </div>
          </motion.div>
        </div>
      </section>

    </WebsiteLayout>
  );
};

export default Documentation;
