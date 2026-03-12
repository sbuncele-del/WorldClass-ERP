/**
 * Navigation — SYSPRO-style mega-menu with organized dropdowns
 * Clean hierarchy, prominent CTA, mobile-responsive
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, Sun, Menu, X, ChevronDown,
  BarChart3, Users, Package, ShoppingCart, Factory, Truck,
  Building2, Briefcase, Landmark,
  Shield, FileCheck, BookOpen, Headphones, ArrowRightLeft,
  Building, UserCheck, Newspaper, Award, Phone, Heart
} from 'lucide-react';

interface NavigationProps {
  isDark: boolean;
  toggleTheme: () => void;
}

interface MegaMenuItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  desc?: string;
}

interface MegaMenuGroup {
  title: string;
  items: MegaMenuItem[];
}

interface NavDropdown {
  label: string;
  groups: MegaMenuGroup[];
  featured?: { title: string; desc: string; to: string; cta: string };
}

const NAV_ITEMS: NavDropdown[] = [
  {
    label: 'Solutions',
    groups: [
      {
        title: 'Core Business',
        items: [
          { label: 'Financial Accounting', to: '/features', icon: <BarChart3 size={18} />, desc: 'GL, AP, AR, Chart of Accounts' },
          { label: 'HR & Payroll', to: '/features', icon: <Users size={18} />, desc: 'Employee management, payroll processing' },
          { label: 'Inventory Management', to: '/features', icon: <Package size={18} />, desc: 'Stock control, warehousing' },
          { label: 'Sales & CRM', to: '/features', icon: <ShoppingCart size={18} />, desc: 'Invoicing, quotes, customer management' },
        ],
      },
      {
        title: 'Operations',
        items: [
          { label: 'Manufacturing', to: '/features', icon: <Factory size={18} />, desc: 'BOM, work orders, production' },
          { label: 'Warehouse Management', to: '/features', icon: <Building2 size={18} />, desc: 'Locations, transfers, picking' },
          { label: 'Project Management', to: '/features', icon: <Briefcase size={18} />, desc: 'Tasks, timelines, resources' },
          { label: 'For Accountants', to: '/for-accountants', icon: <Landmark size={18} />, desc: 'Multi-client practice management' },
        ],
      },
    ],
    featured: { title: 'SiyaBusa ERP', desc: 'One platform. 17 modules. Built for South Africa.', to: '/features', cta: 'Explore All Features' },
  },
  {
    label: 'Product',
    groups: [
      {
        title: 'Product Overview',
        items: [
          { label: 'All Features', to: '/features', icon: <Package size={18} />, desc: '17 integrated ERP modules' },
          { label: 'Pricing', to: '/pricing', icon: <BarChart3 size={18} />, desc: 'From R299/user per month' },
          { label: 'Audit & Compliance', to: '/compliance', icon: <Shield size={18} />, desc: 'SARS, IFRS, B-BBEE ready' },
          { label: 'Security', to: '/security', icon: <FileCheck size={18} />, desc: 'Enterprise-grade data protection' },
        ],
      },
      {
        title: 'Get Started',
        items: [
          { label: 'Request a Demo', to: '/demo', icon: <BookOpen size={18} />, desc: 'See SiyaBusa in action' },
          { label: 'Switch to SiyaBusa', to: '/switch-to-siyabusa', icon: <ArrowRightLeft size={18} />, desc: 'Migrate your data seamlessly' },
          { label: 'Data Migration', to: '/data-migration', icon: <ArrowRightLeft size={18} />, desc: 'Seamless data import & setup' },
        ],
      },
    ],
  },
  {
    label: 'Company',
    groups: [
      {
        title: 'About SiyaBusa',
        items: [
          { label: 'About Us', to: '/about', icon: <Building size={18} />, desc: 'Our story & mission' },
          { label: 'Insights', to: '/insights', icon: <Newspaper size={18} />, desc: 'Insights & thought leadership' },
        ],
      },
      {
        title: 'Connect',
        items: [
          { label: 'Contact Us', to: '/contact', icon: <Phone size={18} />, desc: 'Get in touch' },
          { label: 'Partners', to: '/partners', icon: <Heart size={18} />, desc: 'Technology & reseller partners' },
          { label: 'Support', to: '/support', icon: <Headphones size={18} />, desc: 'Help center & resources' },
        ],
      },
    ],
  },
];

const Navigation: React.FC<NavigationProps> = ({ isDark, toggleTheme }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on route change
  const closeAll = useCallback(() => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  }, []);

  const handleDropdownEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(label);
  };

  const handleDropdownLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 200);
  };

  return (
    <motion.nav
      ref={navRef}
      className={`nav ${isScrolled ? 'scrolled' : ''} ${isDark ? 'dark' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Top utility bar */}
      <div className="nav-topbar">
        <div className="nav-topbar-inner">
          <div className="nav-topbar-left">
            <a href="mailto:support@siyabusaerp.co.za">support@siyabusaerp.co.za</a>
            <span className="nav-topbar-sep">|</span>
            <span>South Africa</span>
          </div>
          <div className="nav-topbar-right">
            <Link to="/support" onClick={closeAll}>Support</Link>
            <Link to="/insights" onClick={closeAll}>Insights</Link>
            <Link to="/login" onClick={closeAll}>Customer Login</Link>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="nav-container">
        <Link to="/" className="nav-brand" onClick={closeAll}>
          <div className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="navGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D4AA" />
                  <stop offset="100%" stopColor="#0A1F3E" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="14" fill="url(#navGrad)" />
              <text x="32" y="45" fontFamily="system-ui,-apple-system,sans-serif" fontSize="34" fontWeight="800" fill="white" textAnchor="middle" letterSpacing="-1">SB</text>
            </svg>
          </div>
          <span className="logo-text">SiyaBusa</span>
        </Link>

        {/* Desktop mega-menu */}
        <div className="nav-links-mega">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`nav-dropdown-trigger ${activeDropdown === item.label ? 'active' : ''}`}
              onMouseEnter={() => handleDropdownEnter(item.label)}
              onMouseLeave={handleDropdownLeave}
            >
              <button className="nav-dropdown-btn">
                {item.label}
                <ChevronDown size={14} className={`chevron ${activeDropdown === item.label ? 'open' : ''}`} />
              </button>

              <AnimatePresence>
                {activeDropdown === item.label && (
                  <motion.div
                    className="mega-menu"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    onMouseEnter={() => handleDropdownEnter(item.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <div className="mega-menu-content">
                      {item.groups.map((group) => (
                        <div key={group.title} className="mega-menu-group">
                          <h4 className="mega-menu-group-title">{group.title}</h4>
                          <ul className="mega-menu-list">
                            {group.items.map((menuItem) => (
                              <li key={menuItem.to}>
                                <Link to={menuItem.to} className="mega-menu-item" onClick={closeAll}>
                                  <span className="mega-menu-icon">{menuItem.icon}</span>
                                  <div className="mega-menu-text">
                                    <span className="mega-menu-label">{menuItem.label}</span>
                                    {menuItem.desc && <span className="mega-menu-desc">{menuItem.desc}</span>}
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {item.featured && (
                        <div className="mega-menu-featured">
                          <div className="mega-menu-featured-card">
                            <h5>{item.featured.title}</h5>
                            <p>{item.featured.desc}</p>
                            <Link to={item.featured.to} className="mega-menu-featured-cta" onClick={closeAll}>
                              {item.featured.cta} →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="nav-actions">
          <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Light Mode' : 'Dark Mode'}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="btn-secondary" onClick={() => { closeAll(); navigate('/login'); }}>
            Sign In
          </button>
          <button className="btn-primary" onClick={() => { closeAll(); navigate('/demo'); }}>
            Request Demo
          </button>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="mobile-nav-section">
                <button
                  className="mobile-nav-heading"
                  onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                >
                  {item.label}
                  <ChevronDown size={16} className={activeDropdown === item.label ? 'open' : ''} />
                </button>
                {activeDropdown === item.label && (
                  <div className="mobile-nav-items">
                    {item.groups.map((group) =>
                      group.items.map((menuItem) => (
                        <Link key={menuItem.to} to={menuItem.to} className="mobile-nav-link" onClick={closeAll}>
                          {menuItem.icon}
                          <span>{menuItem.label}</span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="mobile-nav-actions">
              <Link to="/login" className="btn-secondary" onClick={closeAll}>Sign In</Link>
              <Link to="/demo" className="btn-primary" onClick={closeAll}>Request Demo</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navigation;
