/**
 * SiyaBusa ERP — World-Class Landing Page
 *
 * Slim orchestrator that composes homepage sections and exports
 * the WebsiteLayout wrapper used by all website pages.
 */
import React, { useState, useEffect } from 'react';
import './LandingPage.css';

// Homepage section components
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import HeroConvert from './components/HeroConvert';
import LogoBar from './components/LogoBar';
import SocialProof from './components/SocialProof';
import ModulePricing from './components/ModulePricing';
import './components/ConvertStyles.css';

// Legacy components (kept for sub-pages that may use them)
import Hero from './components/Hero';
import ProductShowcase from './components/ProductShowcase';
import PainSolution from './components/PainSolution';
import HowItWorks from './components/HowItWorks';
import Outcomes from './components/Outcomes';
import Testimonials from './components/Testimonials';
import ComplianceStrip from './components/ComplianceStrip';
import CTASection from './components/CTASection';

// Re-export shared utilities & types so consumers can import from this file
export { fadeInUp, staggerContainer, scaleIn } from './shared';
export type { ModuleFeature, Module } from './shared';

// Re-export sub-page components for FeaturesPage, CompliancePage, DemoPage
export {
  ModuleShowcase,
  ProjectManagementShowcase,
  AdditionalModules,
  AuditComplianceSection,
  ComparisonTable,
  AIDemo,
  ROICalculator,
  DemoForm,
} from './components/SubPageComponents';

// Re-export nav & footer for any page that needs them directly
export { default as Navigation } from './components/Navigation';
export { default as Footer } from './components/Footer';

// ─── Website Layout — shared wrapper for all website pages ───
interface WebsiteLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  canonical?: string;
}

export const WebsiteLayout: React.FC<WebsiteLayoutProps> = ({ children, title, description, canonical }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-landing-theme', isDark ? 'dark' : 'light');
    return () => document.body.removeAttribute('data-landing-theme');
  }, [isDark]);

  useEffect(() => {
    if (title) document.title = title;
    window.scrollTo(0, 0);

    // Set per-page meta description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', description);
    }

    // Set per-page canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (link) link.href = canonical;

      // Also update OG URL
      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', canonical);
    }

    // Set OG title/description
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
    }
    if (description) {
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
    }
  }, [title, description, canonical]);

  return (
    // default header variant is 'enterprise' — other options: 'header-compact', 'header-marketing'
    <div className={`landing-page header-enterprise ${isDark ? 'dark' : 'light'}`}>
      <Navigation isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />
      {children}
      <Footer />
    </div>
  );
};

// ─── Homepage ───
const LandingPage: React.FC = () => {
  return (
    <WebsiteLayout title="SiyaBusa ERP — One Platform, One Price. R399/user/month." description="Stop paying for five disconnected tools. SiyaBusa ERP gives South African businesses accounting, payroll, HR, inventory, sales, and SARS compliance in one platform. R399/user/month. 7-day free trial." canonical="https://siyabusaerp.co.za/">
      <HeroConvert />
      <LogoBar />
      <SocialProof />
      <PainSolution />
      <HowItWorks />
      <ModulePricing />
      <ComplianceStrip />
      <CTASection />
    </WebsiteLayout>
  );
};

export default LandingPage;
