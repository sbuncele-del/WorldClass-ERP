/**
 * ProductShowcase — Interactive tabbed UI with dashboard screenshots
 * World-class pattern: show the product, not just tell about it
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Users, Package, ShoppingCart, FolderKanban, Check
} from 'lucide-react';
import { fadeInUp } from '../shared';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  stats: { label: string; value: string; color?: string }[];
  tableRows: { name: string; status: string; statusType: string; amount: string }[];
}

const tabs: Tab[] = [
  {
    id: 'finance',
    label: 'Finance',
    icon: <BarChart3 size={16} />,
    title: 'Full Financial Control',
    description:
      'General ledger, accounts payable, accounts receivable, cash flow management, and multi-currency support — fully IFRS-compliant with automated SARS submissions.',
    features: [
      'Real-time cash position across all bank accounts',
      'Automated bank reconciliation with intelligent matching',
      'VAT calculated and filed in compliance with SARS regulations',
      'Balance sheet and income statement generated on demand',
    ],
    stats: [
      { label: 'Revenue (MTD)', value: 'R 2.4M', color: 'teal' },
      { label: 'Cash Position', value: 'R 892K', color: 'gold' },
      { label: 'Overdue AR', value: 'R 145K' },
    ],
    tableRows: [
      { name: 'INV-2026-0842', status: 'Paid', statusType: 'green', amount: 'R 28,500' },
      { name: 'INV-2026-0843', status: 'Pending', statusType: 'yellow', amount: 'R 52,000' },
      { name: 'INV-2026-0844', status: 'Sent', statusType: 'blue', amount: 'R 18,750' },
    ],
  },
  {
    id: 'hr',
    label: 'HR & Payroll',
    icon: <Users size={16} />,
    title: 'Payroll & People Management',
    description:
      'Complete employee lifecycle management with automated PAYE, UIF, and SDL calculations — fully compliant with South African labour legislation.',
    features: [
      'Automated tax calculations per current SARS tax tables',
      'Digital leave management with accrual tracking',
      'IRP5 certificates and payslip generation',
      'Performance management and KPI tracking',
    ],
    stats: [
      { label: 'Employees', value: '48', color: 'teal' },
      { label: 'Next Payroll', value: '25 Mar' },
      { label: 'Leave Pending', value: '3' },
    ],
    tableRows: [
      { name: 'Thabo Mokoena', status: 'Active', statusType: 'green', amount: 'R 45,000' },
      { name: 'Naledi Dlamini', status: 'Active', statusType: 'green', amount: 'R 38,000' },
      { name: 'James Vorster', status: 'On Leave', statusType: 'yellow', amount: 'R 52,000' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: <Package size={16} />,
    title: 'Inventory & Warehouse Management',
    description:
      'Multi-location stock control with IAS 2 compliant valuation, automated reorder management, and full warehouse transfer capabilities.',
    features: [
      'Real-time stock visibility across all warehouses',
      'Configurable reorder points with automated alerts',
      'IAS 2 compliant valuation (FIFO, weighted average)',
      'Cycle count scheduling and full stocktake management',
    ],
    stats: [
      { label: 'Total SKUs', value: '1,248', color: 'teal' },
      { label: 'Low Stock', value: '12', color: 'gold' },
      { label: 'Warehouses', value: '3' },
    ],
    tableRows: [
      { name: 'Steel Brackets (100pk)', status: 'In Stock', statusType: 'green', amount: '2,450' },
      { name: 'Copper Wire (50m)', status: 'Low Stock', statusType: 'yellow', amount: '28' },
      { name: 'Safety Helmets', status: 'In Stock', statusType: 'green', amount: '340' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales & CRM',
    icon: <ShoppingCart size={16} />,
    title: 'Sales Pipeline & Revenue Management',
    description:
      'End-to-end quote-to-cash workflow with customer relationship management, automated invoicing, and IFRS 15 revenue recognition.',
    features: [
      'Quotes convert to invoices with a single approval',
      'Visual deal pipeline from opportunity to close',
      'Automated payment reminders and ageing analysis',
      'Revenue reporting by customer, product, and period',
    ],
    stats: [
      { label: 'Pipeline', value: 'R 1.8M', color: 'teal' },
      { label: 'Won (MTD)', value: 'R 620K', color: 'gold' },
      { label: 'Open Deals', value: '24' },
    ],
    tableRows: [
      { name: 'ABC Corp — Phase 2', status: 'Won', statusType: 'green', amount: 'R 180,000' },
      { name: 'XYZ Ltd — Consulting', status: 'Proposal', statusType: 'yellow', amount: 'R 95,000' },
      { name: 'DEF Inc — Support', status: 'Negotiating', statusType: 'blue', amount: 'R 45,000' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: <FolderKanban size={16} />,
    title: 'Project Delivery & Cost Control',
    description:
      'Integrated project planning with milestone tracking, resource allocation, and real-time budget variance reporting — linked directly to your general ledger.',
    features: [
      'Milestones and tasks integrated with your calendar',
      'Budget tracking with real-time variance alerts',
      'Resource allocation and team workload visibility',
      'Project costs posted to GL automatically',
    ],
    stats: [
      { label: 'Active Projects', value: '8', color: 'teal' },
      { label: 'On Track', value: '6', color: 'gold' },
      { label: 'Tasks Due', value: '14' },
    ],
    tableRows: [
      { name: 'Office Renovation', status: 'On Track', statusType: 'green', amount: 'R 450K' },
      { name: 'System Migration', status: 'At Risk', statusType: 'yellow', amount: 'R 280K' },
      { name: 'Marketing Campaign', status: 'On Track', statusType: 'green', amount: 'R 85K' },
    ],
  },
];

const ProductShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const current = tabs[activeTab];

  return (
    <section className="product-showcase">
      <div className="container">
        <motion.div
          className="section-header"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <span className="section-badge">Platform Overview</span>
          <h2>Purpose-built modules. Production-ready.</h2>
          <p className="section-subhead">
            Every module is fully integrated, IFRS-aligned, and designed for South African regulatory requirements.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="showcase-tabs">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              className={`showcase-tab ${activeTab === i ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            className="showcase-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {/* Left: Info */}
            <div className="showcase-info">
              <h3>{current.title}</h3>
              <p>{current.description}</p>
              <ul className="showcase-features">
                {current.features.map((f, i) => (
                  <li key={i}>
                    <Check size={16} /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Screen mockup */}
            <div className="showcase-visual">
              <div className="showcase-screen">
                <div className="showcase-screen-topbar">
                  <div className="showcase-screen-dot" />
                  <div className="showcase-screen-dot" />
                  <div className="showcase-screen-dot" />
                </div>
                <div className="showcase-screen-body">
                  <div className="screen-row">
                    {current.stats.map((s, i) => (
                      <div key={i} className="screen-stat-card">
                        <div className="screen-stat-label">{s.label}</div>
                        <div className={`screen-stat-value ${s.color || ''}`}>
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="screen-table">
                    <div className="screen-table-header">
                      <span>Item</span>
                      <span>Status</span>
                      <span>Amount</span>
                      <span></span>
                    </div>
                    {current.tableRows.map((row, i) => (
                      <div key={i} className="screen-table-row">
                        <span>{row.name}</span>
                        <span>
                          <span className={`screen-status ${row.statusType}`}>
                            {row.status}
                          </span>
                        </span>
                        <span>{row.amount}</span>
                        <span>...</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ProductShowcase;
