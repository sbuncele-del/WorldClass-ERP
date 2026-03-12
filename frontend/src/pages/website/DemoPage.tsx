import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Check, Shield, ArrowRight, Play, Users, BarChart3, Package,
  Factory, Truck, Building2, Briefcase, Star, Clock,
  Zap, Award, TrendingUp, Globe, Lock, ChevronRight,
  DollarSign, FileText, Settings, Layers
} from 'lucide-react';
import { WebsiteLayout, fadeInUp } from '../LandingPage/LandingPage';
import './DemoPage.css';

/* ─── Animated counter hook ─── */
function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });

  useEffect(() => {
    if (!startOnView || !inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, inView, startOnView]);

  return { count, ref };
}

const industries = [
  { icon: <Factory size={20} />, name: 'Manufacturing' },
  { icon: <Building2 size={20} />, name: 'Construction' },
  { icon: <Briefcase size={20} />, name: 'Professional Services' },
  { icon: <Package size={20} />, name: 'Retail & Distribution' },
  { icon: <TrendingUp size={20} />, name: 'Financial Services' },
  { icon: <Globe size={20} />, name: 'Agriculture' },
];

const modules = [
  { icon: <DollarSign size={16} />, name: 'Financial Accounting' },
  { icon: <Users size={16} />, name: 'HR & Payroll' },
  { icon: <Package size={16} />, name: 'Inventory & Warehouse' },
  { icon: <Factory size={16} />, name: 'Manufacturing' },
  { icon: <Truck size={16} />, name: 'Sales & CRM' },
  { icon: <FileText size={16} />, name: 'Compliance & Tax' },
  { icon: <Settings size={16} />, name: 'Project Management' },
  { icon: <Layers size={16} />, name: 'Multi-Entity' },
];

const testimonials = [
  {
    quote: "SiyaBusa replaced 4 separate systems we were paying for. Everything just works together now.",
    name: "Thabo M.",
    role: "CFO, Manufacturing Co.",
    rating: 5,
  },
  {
    quote: "SARS compliance was a nightmare before. Now VAT, PAYE, everything is automated. We sleep easy.",
    name: "Naledi K.",
    role: "Finance Director, Consulting",
    rating: 5,
  },
  {
    quote: "We went live in 3 days. Not 3 months. The onboarding experience was incredible.",
    name: "James V.",
    role: "Operations Manager, Construction",
    rating: 5,
  },
];

const DemoPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    company: '', jobTitle: '', industry: '', employees: '',
    helpWith: '', message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);

  const counter1 = useCountUp(25, 1500);
  const counter2 = useCountUp(99, 2000);
  const counter3 = useCountUp(60, 1800);

  useEffect(() => {
    document.title = 'Request a Demo — SiyaBusa ERP';
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const response = await fetch('/api/demo/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          companyName: formData.company,
          phone: formData.phone,
          industry: formData.industry,
          jobTitle: formData.jobTitle,
          employees: formData.employees,
          helpWith: formData.helpWith,
          message: formData.message,
          utmSource: urlParams.get('utm_source'),
          utmMedium: urlParams.get('utm_medium'),
          utmCampaign: urlParams.get('utm_campaign'),
          referrerUrl: document.referrer || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to connect. Please try again or email support@siyabusaerp.co.za');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WebsiteLayout title="Request a Demo — SiyaBusa ERP" description="See SiyaBusa ERP in action. Book a free personalised demo to explore 17 integrated modules built for South African businesses." canonical="https://siyabusaerp.co.za/demo">

      {/* ═══ HERO SECTION ═══ */}
      <section className="dp-hero">
        <div className="dp-hero-bg">
          <div className="dp-hero-gradient" />
          <div className="dp-hero-pattern" />
        </div>
        <div className="dp-hero-inner">
          <motion.div
            className="dp-hero-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="dp-badge">
              <Zap size={14} /> Free Personalised Demo
            </div>
            <h1>
              See Why Leading SA Businesses
              <span className="dp-hero-accent"> Choose SiyaBusa</span>
            </h1>
            <p className="dp-hero-sub">
              Get a personalised walkthrough of our complete ERP platform — 17 integrated 
              modules, built-in SARS compliance, and everything your business needs. 
              No commitment, no pressure.
            </p>

            {/* Quick stats */}
            <div className="dp-hero-metrics">
              <div className="dp-metric" ref={counter1.ref}>
                <span className="dp-metric-val">{counter1.count}+</span>
                <span className="dp-metric-label">Modules</span>
              </div>
              <div className="dp-metric-divider" />
              <div className="dp-metric" ref={counter2.ref}>
                <span className="dp-metric-val">{counter2.count}%</span>
                <span className="dp-metric-label">Uptime</span>
              </div>
              <div className="dp-metric-divider" />
              <div className="dp-metric" ref={counter3.ref}>
                <span className="dp-metric-val">{counter3.count}%</span>
                <span className="dp-metric-label">Cost Savings</span>
              </div>
            </div>

            {/* Trust row */}
            <div className="dp-hero-trust">
              <Lock size={14} />
              <span>POPIA Compliant</span>
              <span className="dp-trust-dot">·</span>
              <Shield size={14} />
              <span>SARS Integrated</span>
              <span className="dp-trust-dot">·</span>
              <Globe size={14} />
              <span>Hosted in Johannesburg</span>
            </div>
          </motion.div>

          {/* ─── FORM ─── */}
          <motion.div
            className="dp-form-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {submitted ? (
              <div className="dp-success">
                <div className="dp-success-ring">
                  <Check size={36} strokeWidth={3} />
                </div>
                <h2>You're All Set, {formData.firstName}!</h2>
                <p>
                  Our team will reach out within <strong>24 hours</strong> to schedule 
                  your personalised demo.
                </p>
                <p className="dp-success-email">
                  Confirmation sent to <strong>{formData.email}</strong>
                </p>
                <Link to="/" className="dp-success-cta">
                  Back to Home <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <>
                <div className="dp-form-top">
                  <h2>Request Your Free Demo</h2>
                  <p>See SiyaBusa ERP tailored to your business</p>
                </div>

                <form className="dp-form" onSubmit={handleSubmit}>
                  <div className="dp-form-grid">
                    <div className="dp-field">
                      <label>First Name <span>*</span></label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="e.g. Thabo" required />
                    </div>
                    <div className="dp-field">
                      <label>Last Name <span>*</span></label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="e.g. Nkosi" required />
                    </div>
                  </div>

                  <div className="dp-field">
                    <label>Business Email <span>*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@company.co.za" required />
                  </div>

                  <div className="dp-form-grid">
                    <div className="dp-field">
                      <label>Phone <span>*</span></label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+27 XX XXX XXXX" required />
                    </div>
                    <div className="dp-field">
                      <label>Company <span>*</span></label>
                      <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Company (Pty) Ltd" required />
                    </div>
                  </div>

                  <div className="dp-form-grid">
                    <div className="dp-field">
                      <label>Industry <span>*</span></label>
                      <select name="industry" value={formData.industry} onChange={handleChange} required>
                        <option value="">Select Industry</option>
                        <option value="professional-services">Professional Services</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="retail-wholesale">Retail & Distribution</option>
                        <option value="construction">Construction</option>
                        <option value="consulting">Consulting</option>
                        <option value="finance">Financial Services</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="agriculture">Agriculture</option>
                        <option value="mining">Mining</option>
                        <option value="technology">Technology</option>
                        <option value="non-profit">Non-Profit / NGO</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="dp-field">
                      <label>Employees</label>
                      <select name="employees" value={formData.employees} onChange={handleChange}>
                        <option value="">Select Size</option>
                        <option value="1-10">1–10</option>
                        <option value="11-50">11–50</option>
                        <option value="51-200">51–200</option>
                        <option value="201-500">201–500</option>
                        <option value="500+">500+</option>
                      </select>
                    </div>
                  </div>

                  <div className="dp-field">
                    <label>What interests you most?</label>
                    <select name="helpWith" value={formData.helpWith} onChange={handleChange}>
                      <option value="">I'd like to...</option>
                      <option value="demo">See a Full Product Demo</option>
                      <option value="migration">Discuss Migration</option>
                      <option value="pricing">Talk About Pricing</option>
                      <option value="compliance">Review Compliance Features</option>
                      <option value="general">General Enquiry</option>
                    </select>
                  </div>

                  <div className="dp-consent">
                    <label>
                      <input type="checkbox" required />
                      <span>I agree to receive communications from SiyaBusa and accept the <Link to="/privacy">Privacy Policy</Link>.</span>
                    </label>
                  </div>

                  {error && <div className="dp-error">{error}</div>}

                  <button type="submit" className="dp-submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Scheduling...' : 'Get My Free Demo'}
                    {!isSubmitting && <ArrowRight size={18} />}
                  </button>

                  <p className="dp-form-note">
                    <Lock size={12} /> Your information is secure. No spam, ever.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ═══ LIVE DASHBOARD PREVIEW ═══ */}
      <section className="dp-preview-section">
        <div className="dp-container">
          <motion.div
            className="dp-section-header"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="dp-section-tag">Platform Preview</span>
            <h2>One Platform. Every Module You Need.</h2>
            <p>From financials to manufacturing — everything works together, out of the box.</p>
          </motion.div>

          <motion.div
            className="dp-dashboard"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Browser chrome */}
            <div className="dp-browser-chrome">
              <div className="dp-browser-dots">
                <span className="dot r" /><span className="dot y" /><span className="dot g" />
              </div>
              <div className="dp-browser-url">
                <Lock size={11} />
                <span>app.siyabusaerp.co.za/dashboard</span>
              </div>
            </div>

            {/* Dashboard body */}
            <div className="dp-dashboard-body">
              {/* Sidebar */}
              <div className="dp-dash-sidebar">
                <div className="dp-dash-logo">S</div>
                {['Dashboard', 'Finance', 'Inventory', 'HR', 'Sales', 'Reports'].map((item, i) => (
                  <div key={i} className={`dp-dash-nav ${i === 0 ? 'active' : ''}`}>
                    <div className="dp-nav-dot" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div className="dp-dash-main">
                <div className="dp-dash-topbar">
                  <span className="dp-dash-greeting">Good morning, Ncele</span>
                  <span className="dp-dash-date">12 Mar 2026</span>
                </div>

                {/* KPI Cards */}
                <div className="dp-dash-kpis">
                  <div className="dp-kpi teal">
                    <div className="dp-kpi-label">Revenue (MTD)</div>
                    <div className="dp-kpi-value">R 2.4M</div>
                    <div className="dp-kpi-change positive">+12.3%</div>
                  </div>
                  <div className="dp-kpi navy">
                    <div className="dp-kpi-label">Outstanding AR</div>
                    <div className="dp-kpi-value">R 847K</div>
                    <div className="dp-kpi-change neutral">−2.1%</div>
                  </div>
                  <div className="dp-kpi gold">
                    <div className="dp-kpi-label">Inventory Value</div>
                    <div className="dp-kpi-value">R 1.8M</div>
                    <div className="dp-kpi-change positive">+5.7%</div>
                  </div>
                  <div className="dp-kpi green">
                    <div className="dp-kpi-label">Payroll This Month</div>
                    <div className="dp-kpi-value">R 620K</div>
                    <div className="dp-kpi-change neutral">On track</div>
                  </div>
                </div>

                {/* Charts area */}
                <div className="dp-dash-charts">
                  <div className="dp-chart-block">
                    <div className="dp-chart-title">Revenue vs Expenses</div>
                    <div className="dp-chart-bars">
                      {[65, 80, 55, 90, 70, 85, 75, 92, 68, 88, 78, 95].map((h, i) => (
                        <div key={i} className="dp-bar-group">
                          <div className="dp-bar revenue" style={{ height: `${h}%` }} />
                          <div className="dp-bar expense" style={{ height: `${h * 0.6}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="dp-chart-block small">
                    <div className="dp-chart-title">Cash Flow</div>
                    <div className="dp-chart-donut">
                      <svg viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#00D4AA" strokeWidth="3" strokeDasharray="72, 100" />
                      </svg>
                      <div className="dp-donut-label">72%</div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="dp-dash-table">
                  <div className="dp-table-title">Recent Transactions</div>
                  <div className="dp-table-header">
                    <span>Date</span><span>Description</span><span>Amount</span><span>Status</span>
                  </div>
                  {[
                    { date: '12 Mar', desc: 'Invoice #1247 — Motswedi Group', amount: 'R 45,200', status: 'Paid' },
                    { date: '11 Mar', desc: 'PO #892 — Steel Supplies', amount: 'R 18,750', status: 'Pending' },
                    { date: '10 Mar', desc: 'Payroll Run — March 2026', amount: 'R 620,000', status: 'Complete' },
                  ].map((row, i) => (
                    <div key={i} className="dp-table-row">
                      <span>{row.date}</span>
                      <span>{row.desc}</span>
                      <span className="dp-amount">{row.amount}</span>
                      <span className={`dp-status ${row.status.toLowerCase()}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ MODULES GRID ═══ */}
      <section className="dp-modules-section">
        <div className="dp-container">
          <motion.div
            className="dp-section-header"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="dp-section-tag">Complete ERP Suite</span>
            <h2>Everything You Need. Nothing You Don't.</h2>
            <p>All modules included from day one — no add-ons, no hidden fees.</p>
          </motion.div>

          <div className="dp-modules-grid">
            {modules.map((mod, i) => (
              <motion.div
                key={i}
                className="dp-module-chip"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="dp-module-icon">{mod.icon}</span>
                <span>{mod.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ INDUSTRIES ═══ */}
      <section className="dp-industries">
        <div className="dp-container">
          <motion.div
            className="dp-section-header"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="dp-section-tag">Industry Solutions</span>
            <h2>Built for Your Industry</h2>
            <p>Purpose-built features for the sectors that drive South Africa's economy.</p>
          </motion.div>
          <div className="dp-industry-grid">
            {industries.map((ind, i) => (
              <motion.div
                key={i}
                className="dp-industry-card"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="dp-industry-icon">{ind.icon}</div>
                <span>{ind.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="dp-testimonials">
        <div className="dp-container">
          <motion.div
            className="dp-section-header"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="dp-section-tag">What Our Clients Say</span>
            <h2>Trusted by Growing Businesses</h2>
          </motion.div>

          <div className="dp-testimonial-carousel">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                className={`dp-testimonial-card ${i === activeStep ? 'active' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: i === activeStep ? 1 : 0.4 }}
                transition={{ duration: 0.5 }}
              >
                <div className="dp-stars">
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <Star key={si} size={16} fill="#F4B400" color="#F4B400" />
                  ))}
                </div>
                <blockquote>"{t.quote}"</blockquote>
                <div className="dp-testimonial-author">
                  <div className="dp-author-avatar">{t.name[0]}</div>
                  <div>
                    <div className="dp-author-name">{t.name}</div>
                    <div className="dp-author-role">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="dp-carousel-dots">
            {testimonials.map((_, i) => (
              <button
                key={i}
                className={`dp-dot ${i === activeStep ? 'active' : ''}`}
                onClick={() => setActiveStep(i)}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY SIYABUSA ═══ */}
      <section className="dp-why">
        <div className="dp-container">
          <motion.div
            className="dp-section-header light"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="dp-section-tag light">The SiyaBusa Difference</span>
            <h2>Why Switch to SiyaBusa ERP?</h2>
          </motion.div>

          <div className="dp-why-grid">
            {[
              { icon: <Zap size={28} />, title: 'All-Inclusive Platform', desc: '17 modules from day one. Financials, HR, inventory, manufacturing, compliance — one price, everything included.' },
              { icon: <Shield size={28} />, title: 'SARS & IFRS Ready', desc: 'eFiling, PAYE, UIF, SDL, VAT201, IAS 16 — built-in compliance, not bolted on. Audit-ready from day one.' },
              { icon: <Clock size={28} />, title: 'Go Live in Days', desc: 'No R50K implementation projects. No army of consultants. Import your data and start working immediately.' },
              { icon: <Award size={28} />, title: 'Built for South Africa', desc: 'Hosted in Johannesburg. POPIA compliant. Multi-currency with ZAR-first design. By South Africans, for South Africans.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="dp-why-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="dp-why-icon">{item.icon}</div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BOTTOM CTA ═══ */}
      <section className="dp-bottom-cta">
        <div className="dp-container">
          <motion.div
            className="dp-cta-inner"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2>Ready to Transform Your Business?</h2>
            <p>Join hundreds of South African businesses already running on SiyaBusa ERP.</p>
            <div className="dp-cta-actions">
              <a href="#top" className="dp-cta-btn primary" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                Request Your Demo <ChevronRight size={18} />
              </a>
              <Link to="/pricing" className="dp-cta-btn secondary">
                View Pricing
              </Link>
            </div>
            <div className="dp-cta-assurance">
              <Check size={14} /> No credit card required
              <span className="dp-trust-dot">·</span>
              <Check size={14} /> Free personalised walkthrough
              <span className="dp-trust-dot">·</span>
              <Check size={14} /> Setup in under 5 minutes
            </div>
          </motion.div>
        </div>
      </section>

    </WebsiteLayout>
  );
};

export default DemoPage;
