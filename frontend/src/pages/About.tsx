/**
 * SiyaBusa ERP — About Page
 * Professional about page with WebsiteLayout navigation & images
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, Search, Globe2, Handshake, Users, ArrowRight, Shield,
  Building2, Layers, Heart, Sparkles, MapPin, Award, Briefcase
} from 'lucide-react';
import { WebsiteLayout, fadeInUp, staggerContainer } from './LandingPage/LandingPage';
import './About.css';

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <WebsiteLayout title="About — SiyaBusa ERP | Built for South African Business">

      {/* ═══ HERO ═══ */}
      <section className="about-hero">
        <div className="about-hero-bg">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80&auto=format&fit=crop"
            alt="Modern business skyline"
            className="about-hero-img"
          />
          <div className="about-hero-overlay" />
        </div>
        <div className="container">
          <motion.div
            className="about-hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="about-badge"><Building2 size={14} /> Our Story</span>
            <h1>Built by a Business Owner,<br /><span className="about-gradient-text">For Business Owners</span></h1>
            <p>
              SiyaBusa was born from the frustration of running a business on fragmented tools.
              We set out to build the platform we wished existed.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ STORY ═══ */}
      <section className="about-story">
        <div className="container">
          <motion.div
            className="about-split"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div className="about-split-text" variants={fadeInUp}>
              <span className="section-badge"><Heart size={14} /> The Beginning</span>
              <h2>Why We Built SiyaBusa</h2>
              <p>
                SiyaBusa is the flagship enterprise resource planning platform developed by
                <strong> Masaphokati Technologies</strong>, a South African company dedicated to
                transforming the fintech and enterprise software landscape.
              </p>
              <p>
                We believe that business management systems should serve business owners — not just
                accountants. Our mission is to bridge the gap between operational excellence and
                financial clarity, empowering businesses across Africa to make informed decisions
                with real-time, accurate data.
              </p>
              <p>
                Traditional ERPs were designed for multinational corporations with dedicated IT teams.
                Small and medium businesses in South Africa were left with fragmented tools — one for
                invoicing, another for payroll, a third for inventory — none of them talking to each
                other. We knew there had to be a better way.
              </p>
            </motion.div>
            <motion.div className="about-split-image" variants={fadeInUp}>
              <img
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80&auto=format&fit=crop"
                alt="Diverse team collaborating on business strategy"
                loading="lazy"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOUNDER ═══ */}
      <section className="about-founder">
        <div className="container">
          <motion.div
            className="about-split reverse"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div className="about-split-image founder-img-wrap" variants={fadeInUp}>
              <div className="founder-placeholder-large">
                <span>SM</span>
              </div>
              <div className="founder-name-overlay">
                <strong>Sibusiso Mavuso</strong>
                <span>Founder & CEO</span>
              </div>
            </motion.div>
            <motion.div className="about-split-text" variants={fadeInUp}>
              <span className="section-badge"><Award size={14} /> The Founder</span>
              <h2>Sibusiso Mavuso</h2>
              <p className="founder-title-text">Founder & CEO, Masaphokati Technologies</p>
              <p>
                Sibusiso Mavuso is a qualified accountant and the founder of a thriving
                accounting practice based in Centurion, South Africa. Through years of
                hands-on experience serving businesses across multiple industries, he
                witnessed a recurring pain point: traditional business systems were built
                for accountants, not for business owners.
              </p>
              <p>
                This fundamental disconnect resulted in chronic challenges — document backlogs,
                failed audits, fragmented data across multiple platforms, and business owners
                unable to gauge whether their ventures were growing or stagnating.
              </p>
              <p>
                Driven by a passion to solve these problems, Sibusiso embarked on a journey
                to study systems architecture and software development. SiyaBusa is the
                culmination of that vision — a system designed from the ground up to serve the
                people who run businesses, not just the people who audit them.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ VISION ═══ */}
      <section className="about-vision">
        <div className="about-vision-bg">
          <img
            src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1400&q=80&auto=format&fit=crop"
            alt="Modern technology workspace"
            className="about-vision-img"
            loading="lazy"
          />
          <div className="about-vision-overlay" />
        </div>
        <div className="container">
          <motion.div
            className="about-vision-content"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Sparkles size={32} className="about-vision-icon" />
            <h2>Our Vision</h2>
            <p className="about-vision-statement">
              To become Africa's leading enterprise operating system, enabling businesses of
              all sizes to operate with the same efficiency, insight, and compliance capabilities
              as Fortune 500 companies — at a fraction of the cost and complexity.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ VALUES ═══ */}
      <section className="about-values">
        <div className="container">
          <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="section-badge">What Drives Us</span>
            <h2>Our Values</h2>
          </motion.div>

          <motion.div
            className="about-values-grid"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: <Target size={28} />, title: 'Owner-First Design', desc: 'Every feature is built with business owners in mind, not just accountants.', color: '#00D4AA' },
              { icon: <Search size={28} />, title: 'Radical Transparency', desc: 'Real-time data and honest insights — no hidden fees, no surprises.', color: '#667eea' },
              { icon: <Globe2 size={28} />, title: 'African Innovation', desc: 'Built in Africa, for Africa, with global standards and local understanding.', color: '#F6D242' },
              { icon: <Handshake size={28} />, title: 'Compliance as Care', desc: 'We believe compliance isn\'t a burden — it\'s how we protect our clients.', color: '#f5576c' },
              { icon: <Shield size={28} />, title: 'Data Sovereignty', desc: 'Your data belongs to you. We protect it with enterprise-grade security.', color: '#764ba2' },
              { icon: <Users size={28} />, title: 'Customer Partnership', desc: 'We grow with our clients. Your feedback shapes our roadmap.', color: '#00A884' },
            ].map((value, i) => (
              <motion.div key={i} className="about-value-card" variants={fadeInUp}>
                <div className="about-value-icon" style={{ background: `${value.color}15`, color: value.color }}>
                  {value.icon}
                </div>
                <h4>{value.title}</h4>
                <p>{value.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ COMPANY INFO ═══ */}
      <section className="about-company">
        <div className="container">
          <motion.div
            className="about-split"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div className="about-split-text" variants={fadeInUp}>
              <span className="section-badge"><Briefcase size={14} /> The Company</span>
              <h2>Masaphokati Technologies</h2>
              <p>
                Masaphokati Technologies (Pty) Ltd is a South African technology company
                specializing in enterprise software solutions, fintech innovation, and
                digital transformation services.
              </p>
              <p>
                The name "Masaphokati" reflects our mission — to position ourselves at the
                centre of business operations, connecting all aspects of an organisation
                into one cohesive, intelligent system.
              </p>
              <div className="about-company-details">
                <div className="about-detail-row">
                  <Building2 size={18} />
                  <div>
                    <strong>Masaphokati Technologies (Pty) Ltd</strong>
                    <span>Registered in South Africa</span>
                  </div>
                </div>
                <div className="about-detail-row">
                  <MapPin size={18} />
                  <div>
                    <strong>Centurion, Gauteng</strong>
                    <span>South Africa</span>
                  </div>
                </div>
                <div className="about-detail-row">
                  <Layers size={18} />
                  <div>
                    <strong>Enterprise Software & FinTech</strong>
                    <span>Industry Focus</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div className="about-split-image" variants={fadeInUp}>
              <img
                src="https://images.unsplash.com/photo-1573164713988-8665fc963095?w=600&q=80&auto=format&fit=crop"
                alt="Technology innovation workspace"
                loading="lazy"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="about-cta">
        <div className="container">
          <motion.div
            className="about-cta-content"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2>Join Us on This Journey</h2>
            <p>
              Whether you're a business owner seeking clarity, an accountant looking for
              better tools, or a professional wanting to join our team — we'd love to
              connect with you.
            </p>
            <div className="about-cta-buttons">
              <button className="btn-primary large" onClick={() => navigate('/demo')}>
                Request a Demo <ArrowRight size={18} />
              </button>
              <button className="btn-ghost large" onClick={() => navigate('/pricing')}>
                View Pricing
              </button>
            </div>
          </motion.div>
        </div>
      </section>

    </WebsiteLayout>
  );
};

export default About;
