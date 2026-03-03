import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Shield, BarChart3, Users, Building2, Factory,
  ChevronRight, Check, X, Moon, Sun, Play, ArrowRight, Sparkles,
  Globe, Lock, Clock, TrendingUp, MessageSquare,
  Menu, ChevronDown, Award, Layers, Cpu,
  FileCheck, BadgeCheck, CircleDollarSign,
  ClipboardCheck, ShoppingCart, Package, Briefcase, FolderKanban,
  Landmark, FileText, Search, Eye, Scale, AlertTriangle,
  BookOpen, Settings, Wrench, Calculator
} from 'lucide-react';
import './LandingPage.css';

// Types
export interface ModuleFeature {
  title: string;
  description: string;
}

export interface Module {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  businessBenefit: string;
  complianceBenefit: string;
  color: string;
  features: ModuleFeature[];
  keyMetrics: string[];
}

// Animation variants
export const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
};

// Particle Background Component
export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Array<{
      x: number; y: number; vx: number; vy: number; size: number; opacity: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 170, ${p.opacity})`;
        ctx.fill();
        particles.slice(i + 1).forEach(p2 => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 212, 170, ${0.1 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        });
      });
      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
};

// Platform Visualization
export const PlatformVisualization: React.FC = () => {
  return (
    <div className="platform-viz">
      <div className="platform-core">
        <div className="core-ring ring-1" />
        <div className="core-ring ring-2" />
        <div className="core-ring ring-3" />
        <div className="core-center">
          <Cpu size={32} />
        </div>
      </div>
      <div className="platform-modules">
        {['Finance', 'Sales', 'HR', 'Projects', 'Audit', 'Assets'].map((module, i) => (
          <motion.div
            key={module}
            className={`floating-module module-${i + 1}`}
            animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span>{module}</span>
          </motion.div>
        ))}
      </div>
      <div className="data-streams">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`stream stream-${i + 1}`} />
        ))}
      </div>
    </div>
  );
};

// Navigation
export const Navigation: React.FC<{ isDark: boolean; toggleTheme: () => void }> = ({ isDark, toggleTheme }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className={`nav ${isScrolled ? 'scrolled' : ''} ${isDark ? 'dark' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="nav-container">
        <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
          <div className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs><linearGradient id="navGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00D4AA"/><stop offset="100%" stopColor="#0A1F3E"/></linearGradient></defs>
              <rect width="64" height="64" rx="14" fill="url(#navGrad)"/>
              <text x="32" y="45" fontFamily="system-ui,-apple-system,sans-serif" fontSize="34" fontWeight="800" fill="white" textAnchor="middle" letterSpacing="-1">SB</text>
            </svg>
          </div>
          <span className="logo-text">SiyaBusa</span>
        </Link>

        <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
          <Link to="/compliance" onClick={() => setMobileMenuOpen(false)}>Audit & Compliance</Link>
          <Link to="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
        </div>

        <div className="nav-actions">
          <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Light Mode' : 'Dark Mode'}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="btn-secondary" onClick={() => navigate('/login')}>
            Sign In
          </button>
          <button className="btn-primary" onClick={() => navigate('/demo')}>
            Request Demo
          </button>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu size={24} />
          </button>
        </div>
      </div>
    </motion.nav>
  );
};


// EmotionalHero — Solutions-focused, emotionally engaging hero
const EmotionalHero: React.FC = () => {
  const navigate = useNavigate();
  const [spotsLeft] = useState(50);

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #0A1F3E 0%, #0D2B4E 40%, #0A1F3E 100%)',
        overflow: 'hidden',
        padding: '120px 24px 80px',
      }}
    >
      <ParticleBackground />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Founding member badge */}
          <motion.div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0,212,170,0.12)',
              border: '1px solid rgba(0,212,170,0.3)',
              padding: '8px 20px',
              borderRadius: '50px',
              marginBottom: '2rem',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Sparkles size={16} style={{ color: '#00D4AA' }} />
            <span style={{ color: '#00D4AA', fontSize: '0.9rem', fontWeight: 600 }}>
              Founding Member — {spotsLeft} spots left
            </span>
          </motion.div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.15,
              marginBottom: '1.5rem',
              letterSpacing: '-0.02em',
            }}
          >
            Your business is complex.<br />
            <span style={{ color: '#00D4AA' }}>Managing it shouldn't be.</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.7,
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
            }}
          >
            Finances, people, inventory, projects, compliance — one platform that
            handles it all. So you can stop juggling and start growing.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <motion.button
              onClick={() => navigate('/pricing')}
              style={{
                padding: '16px 36px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #00D4AA, #00A884)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 32px rgba(0,212,170,0.3)',
              }}
              whileHover={{ scale: 1.04, boxShadow: '0 12px 40px rgba(0,212,170,0.4)' }}
              whileTap={{ scale: 0.97 }}
            >
              Become a Founding Member <ArrowRight size={20} />
            </motion.button>
            <motion.button
              onClick={() => navigate('/demo')}
              style={{
                padding: '16px 36px',
                borderRadius: '14px',
                border: '2px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1.1rem',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
              whileHover={{ scale: 1.04, borderColor: 'rgba(0,212,170,0.5)' }}
              whileTap={{ scale: 0.97 }}
            >
              See It in Action
            </motion.button>
          </div>

          {/* Trust strip */}
          <motion.div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '2rem',
              marginTop: '3rem',
              flexWrap: 'wrap' as const,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {['R1,499/mo — everything included', 'First 50 companies', '14-day free trial'].map((item, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.9rem',
                }}
              >
                <Check size={16} style={{ color: '#00D4AA' }} /> {item}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// PainToSolution — Emotional problem→solution cards
const PainToSolution: React.FC = () => {
  const painCards = [
    {
      emoji: '😩',
      pain: 'Tired of juggling 10 different systems?',
      solution: 'One platform. Everything connected. Your finances talk to your inventory, your projects talk to your calendar. No more copy-pasting between spreadsheets at midnight.',
      icon: <Layers size={24} />,
      color: '#00D4AA',
    },
    {
      emoji: '😰',
      pain: 'Audit season keeps you up at night?',
      solution: 'Every transaction automatically creates an audit trail. VAT calculated. SARS ready. Walk into any audit with confidence — not anxiety.',
      icon: <Shield size={24} />,
      color: '#7C3AED',
    },
    {
      emoji: '🏃',
      pain: 'Your business runs you — instead of the other way around?',
      solution: 'Real-time dashboards. AI that actually helps. Alerts before problems become crises. Finally feel in control of your numbers, your people, and your growth.',
      icon: <TrendingUp size={24} />,
      color: '#3B82F6',
    },
  ];

  return (
    <section style={{ padding: '100px 24px', background: '#fff' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <motion.div
          style={{ textAlign: 'center', marginBottom: '4rem' }}
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
              fontWeight: 800,
              color: '#0A1F3E',
              marginBottom: '0.75rem',
            }}
          >
            Sound familiar?
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
            You're not alone. Every business owner feels this.
          </p>
        </motion.div>

        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
          }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {painCards.map((card, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              style={{
                background: '#f8fafc',
                borderRadius: '20px',
                padding: '2.5rem 2rem',
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s ease',
              }}
              whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{card.emoji}</div>
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: '#0A1F3E',
                  marginBottom: '1rem',
                  lineHeight: 1.3,
                }}
              >
                {card.pain}
              </h3>
              <p
                style={{
                  color: '#475569',
                  lineHeight: 1.7,
                  fontSize: '1rem',
                }}
              >
                {card.solution}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// TrustStrip — Quick credibility signals
const TrustStrip: React.FC = () => {
  const signals = [
    { icon: <Shield size={20} />, label: 'SARS Compliant' },
    { icon: <FileCheck size={20} />, label: 'IFRS Aligned' },
    { icon: <Lock size={20} />, label: 'POPIA Ready' },
    { icon: <Cpu size={20} />, label: 'AI-Powered' },
    { icon: <Globe size={20} />, label: 'Cloud-Based' },
  ];

  return (
    <section
      style={{
        padding: '40px 24px',
        background: 'linear-gradient(135deg, #0A1F3E, #0D2B4E)',
      }}
    >
      <motion.div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          gap: '2.5rem',
          flexWrap: 'wrap' as const,
        }}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {signals.map((s, i) => (
          <motion.div
            key={i}
            variants={fadeInUp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            <span style={{ color: '#00D4AA' }}>{s.icon}</span>
            {s.label}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

// SimpleSteps — Clean 3-step onboarding
const SimpleSteps: React.FC = () => {
  const steps = [
    { num: '01', title: 'Sign up', desc: 'Takes 60 seconds. No credit card.', icon: <Zap size={28} /> },
    { num: '02', title: 'Set up your business', desc: 'Import your data or start fresh. We help.', icon: <Settings size={28} /> },
    { num: '03', title: 'Run everything from one place', desc: 'Every module. One dashboard. Total clarity.', icon: <TrendingUp size={28} /> },
  ];

  return (
    <section style={{ padding: '100px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <motion.div
          style={{ textAlign: 'center', marginBottom: '3.5rem' }}
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', fontWeight: 800, color: '#0A1F3E' }}>
            Up and running in minutes
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.05rem', marginTop: '0.5rem' }}>
            No consultants. No 6-month implementation. Just start.
          </p>
        </motion.div>

        <motion.div
          style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' as const }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <motion.div
                variants={fadeInUp}
                style={{ textAlign: 'center', flex: '1 1 220px', maxWidth: '280px', padding: '2rem 1.5rem' }}
              >
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(0,212,170,0.12), rgba(0,212,170,0.04))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    color: '#00D4AA',
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#00D4AA',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '2px',
                    marginBottom: '0.5rem',
                  }}
                >
                  Step {step.num}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0A1F3E', marginBottom: '0.5rem' }}>
                  {step.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>{step.desc}</p>
              </motion.div>
              {i < steps.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1', alignSelf: 'center', fontSize: '1.5rem' }}>
                  <ArrowRight size={24} />
                </div>
              )}
            </React.Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// WhatYouGet — Quick visual of what's included (not module names, outcomes)
const WhatYouGet: React.FC = () => {
  const outcomes = [
    { icon: <BarChart3 size={24} />, title: 'Know your numbers', desc: 'Real-time financials, cash flow, and profitability — always up to date', color: '#F4B400' },
    { icon: <Users size={24} />, title: 'Pay your people right', desc: 'Payroll, leave, PAYE, UIF — calculated and compliant automatically', color: '#EC4899' },
    { icon: <Package size={24} />, title: 'Never run out of stock', desc: 'Track inventory across locations with smart reorder alerts', color: '#3B82F6' },
    { icon: <ShoppingCart size={24} />, title: 'Win more business', desc: 'Quotes, invoices, CRM — from first contact to payment received', color: '#00D4AA' },
    { icon: <FolderKanban size={24} />, title: 'Deliver on time', desc: 'Projects, tasks, deadlines — all synced to your calendar and budget', color: '#7C3AED' },
    { icon: <Cpu size={24} />, title: 'Ask your AI anything', desc: '"Create an invoice" "Run payroll" "Show me cash flow" — just type it', color: '#6366F1' },
  ];

  return (
    <section style={{ padding: '100px 24px', background: '#fff' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <motion.div
          style={{ textAlign: 'center', marginBottom: '3.5rem' }}
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', fontWeight: 800, color: '#0A1F3E' }}>
            Everything your business needs.<br />
            <span style={{ color: '#00D4AA' }}>Nothing it doesn't.</span>
          </h2>
        </motion.div>

        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {outcomes.map((item, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid #f1f5f9',
                transition: 'all 0.3s ease',
              }}
              whileHover={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${item.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0A1F3E', marginBottom: '0.25rem' }}>
                  {item.title}
                </h4>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// FoundingMemberCTA — Urgency-driven closing CTA
const FoundingMemberCTA: React.FC = () => {
  const navigate = useNavigate();
  const [spotsLeft] = useState(50);

  return (
    <section
      style={{
        padding: '100px 24px',
        background: 'linear-gradient(160deg, #0A1F3E 0%, #0D2B4E 40%, #0A1F3E 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ParticleBackground />
      <motion.div
        style={{
          maxWidth: '700px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
        }}
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,212,170,0.12)',
            border: '1px solid rgba(0,212,170,0.3)',
            padding: '8px 20px',
            borderRadius: '50px',
            marginBottom: '2rem',
          }}
        >
          <Award size={16} style={{ color: '#00D4AA' }} />
          <span style={{ color: '#00D4AA', fontSize: '0.9rem', fontWeight: 600 }}>
            Only {spotsLeft} founding spots available
          </span>
        </motion.div>

        <h2
          style={{
            fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '1rem',
            lineHeight: 1.2,
          }}
        >
          Stop paying for potential.<br />
          <span style={{ color: '#00D4AA' }}>Pay for everything. R1,499/mo.</span>
        </h2>

        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '1.1rem',
            lineHeight: 1.7,
            maxWidth: '550px',
            margin: '0 auto 2.5rem',
          }}
        >
          Every module. 10 users. Price locked for 12 months.
          No surprises. No upgrades needed. Just everything you need to run your business.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' as const }}>
          <motion.button
            onClick={() => navigate('/pricing')}
            style={{
              padding: '18px 40px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #00D4AA, #00A884)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 32px rgba(0,212,170,0.3)',
            }}
            whileHover={{ scale: 1.04, boxShadow: '0 12px 40px rgba(0,212,170,0.4)' }}
            whileTap={{ scale: 0.97 }}
          >
            Claim Your Founding Spot <ArrowRight size={20} />
          </motion.button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
          14-day free trial · No credit card required · Cancel anytime
        </p>
      </motion.div>
    </section>
  );
};

// QuickShowcase removed — replaced by PainToSolution and WhatYouGet on homepage

// Module Showcase — Real modules only
export const ModuleShowcase: React.FC = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  const modules: Module[] = [
    {
      icon: <BarChart3 size={32} />,
      title: 'Financial Hub',
      tagline: 'Complete Financial Visibility. Close Faster. Stay Compliant.',
      businessBenefit: 'Real-time dashboards, cash flow management, multi-currency support, GL, AP, AR — all in one place',
      complianceBenefit: 'IFRS-compliant reporting, automated VAT calculations, SARS-ready submissions, complete audit trails',
      color: '#F4B400',
      features: [
        { title: 'General Ledger', description: 'Full double-entry accounting with chart of accounts management.' },
        { title: 'Accounts Payable & Receivable', description: 'Track what you owe and what\'s owed to you — with aging reports.' },
        { title: 'Bank Reconciliation', description: 'Match transactions automatically with AI-powered reconciliation.' },
        { title: 'Cash Flow Management', description: 'Real-time cash position across all accounts and entities.' },
        { title: 'Multi-Currency', description: 'Handle ZAR, USD, EUR and more with automatic rate updates.' },
        { title: 'Financial Reports', description: 'Balance sheet, income statement, trial balance — generated instantly.' }
      ],
      keyMetrics: ['Real-time financial position', 'Automated bank reconciliation', 'SARS-compliant VAT']
    },
    {
      icon: <ShoppingCart size={32} />,
      title: 'Sales & CRM',
      tagline: 'Win More Deals. Invoice Faster. Know Your Customers.',
      businessBenefit: 'Quote-to-cash pipeline, customer management, invoicing, payment tracking',
      complianceBenefit: 'IFRS 15 revenue recognition, automated VAT on invoices, audit-ready sales records',
      color: '#00D4AA',
      features: [
        { title: 'Customer Management', description: 'Complete customer profiles with history, contacts, and notes.' },
        { title: 'Quotes & Proposals', description: 'Professional quotes that convert to invoices with one click.' },
        { title: 'Invoicing', description: 'Create, send, and track invoices with automatic payment reminders.' },
        { title: 'Pipeline Management', description: 'Visual deal pipeline to track opportunities from lead to close.' },
        { title: 'Payment Tracking', description: 'Record payments, partial payments, and credit notes.' },
        { title: 'Sales Reports', description: 'Revenue by customer, product, period — slice data any way you need.' }
      ],
      keyMetrics: ['Quote-to-invoice in one click', 'Automated payment reminders', 'Revenue analytics']
    },
    {
      icon: <FolderKanban size={32} />,
      title: 'Projects Hub',
      tagline: 'Deliver On Time. On Budget. With Full Visibility.',
      businessBenefit: 'Project planning, task management, milestones, team collaboration — all integrated with your calendar and financials',
      complianceBenefit: 'Project cost tracking flows into GL automatically, time-based revenue recognition, budget vs actual reporting',
      color: '#7C3AED',
      features: [
        { title: 'Project Planning', description: 'Create projects with phases, milestones, and deadlines.' },
        { title: 'Task Management', description: 'Assign tasks, set priorities, track progress in real-time.' },
        { title: 'Calendar Integration', description: 'Tasks and milestones auto-populate your calendar — never miss a deadline.' },
        { title: 'Team Collaboration', description: 'Comments, file sharing, and status updates in one place.' },
        { title: 'Budget Tracking', description: 'Track project costs against budget with real-time variance alerts.' },
        { title: 'Progress Reporting', description: 'Gantt charts, status dashboards, and milestone tracking.' }
      ],
      keyMetrics: ['Auto-synced calendar', 'Real-time budget tracking', 'Milestone-driven delivery']
    },
    {
      icon: <Users size={32} />,
      title: 'HR & Payroll',
      tagline: 'Manage Your People. Pay Accurately. Stay Protected.',
      businessBenefit: 'Employee lifecycle management, payroll processing, leave management, performance tracking',
      complianceBenefit: 'PAYE calculations, UIF compliance, SARS IRP5 submissions, labour law adherence',
      color: '#EC4899',
      features: [
        { title: 'Employee Management', description: 'Complete employee records — contracts, documents, history.' },
        { title: 'Payroll Processing', description: 'Run payroll with automatic tax calculations and deductions.' },
        { title: 'Leave Management', description: 'Apply, approve, and track leave balances digitally.' },
        { title: 'Tax Compliance', description: 'PAYE, UIF, SDL calculated automatically per SARS rules.' },
        { title: 'Payslip Generation', description: 'Professional payslips generated and distributed automatically.' },
        { title: 'Performance Reviews', description: 'Set KPIs, run reviews, track employee development.' }
      ],
      keyMetrics: ['Automated PAYE & UIF', 'Digital leave management', 'IRP5-ready payroll']
    },
    {
      icon: <Package size={32} />,
      title: 'Inventory & Warehouse',
      tagline: 'Stock Smarter. Fulfil Faster. Never Run Out.',
      businessBenefit: 'Real-time stock visibility, multi-location management, reorder automation, warehouse operations',
      complianceBenefit: 'IAS 2 inventory valuation, FIFO/weighted average costing, shrinkage tracking, stocktake compliance',
      color: '#3B82F6',
      features: [
        { title: 'Stock Management', description: 'Real-time stock levels across all locations.' },
        { title: 'Multi-Warehouse', description: 'Manage multiple warehouses with inter-location transfers.' },
        { title: 'Reorder Points', description: 'Automatic reorder alerts based on minimum stock levels.' },
        { title: 'Picking & Packing', description: 'Warehouse pick lists and packing workflows for orders.' },
        { title: 'Stock Valuation', description: 'IAS 2 compliant valuation — FIFO, weighted average, or specific.' },
        { title: 'Stocktake Management', description: 'Cycle counts and full stocktakes with variance reporting.' }
      ],
      keyMetrics: ['Real-time stock visibility', 'IAS 2 compliant valuation', 'Multi-warehouse support']
    },
    {
      icon: <Building2 size={32} />,
      title: 'Assets Hub',
      tagline: 'Track Every Asset. Depreciate Correctly. Stay IAS 16 Compliant.',
      businessBenefit: 'Full asset lifecycle — acquisition, depreciation, maintenance, disposal',
      complianceBenefit: 'IAS 16 compliant depreciation methods, revaluation, impairment testing, disposal accounting',
      color: '#F59E0B',
      features: [
        { title: 'Asset Register', description: 'Complete register of all company assets with details and location.' },
        { title: 'Depreciation Engine', description: 'IAS 16 compliant — straight-line, reducing balance, units of production.' },
        { title: 'Maintenance Tracking', description: 'Schedule and track maintenance for asset longevity.' },
        { title: 'Disposal Management', description: 'Record disposals with automatic gain/loss calculations.' },
        { title: 'Revaluation', description: 'Revalue assets per IAS 16 with full journal entry automation.' },
        { title: 'Asset Reports', description: 'Depreciation schedules, asset listings, movement reports.' }
      ],
      keyMetrics: ['IAS 16 compliant', 'Automated depreciation', 'Full asset lifecycle']
    },
    {
      icon: <Briefcase size={32} />,
      title: 'Purchase Hub',
      tagline: 'Procure Smarter. Control Spending. Manage Suppliers.',
      businessBenefit: 'Purchase orders, supplier management, goods receiving, cost control',
      complianceBenefit: 'Procurement approval workflows, 3-way matching, supplier tax compliance, audit trails',
      color: '#EF4444',
      features: [
        { title: 'Purchase Orders', description: 'Create, approve, and track POs with multi-level approvals.' },
        { title: 'Supplier Management', description: 'Supplier profiles, performance tracking, and payment terms.' },
        { title: 'Goods Receiving', description: 'Record deliveries and match against POs automatically.' },
        { title: '3-Way Matching', description: 'PO, goods received, invoice — matched automatically.' },
        { title: 'Spend Analytics', description: 'Track spending by supplier, category, department.' },
        { title: 'Approval Workflows', description: 'Multi-level approval chains based on value thresholds.' }
      ],
      keyMetrics: ['Automated 3-way matching', 'Spend visibility', 'Approval workflows']
    },
    {
      icon: <Factory size={32} />,
      title: 'Manufacturing',
      tagline: 'Build Better. Waste Less. Cost Accurately.',
      businessBenefit: 'Bills of materials, work orders, production scheduling, quality control',
      complianceBenefit: 'Production cost absorption, WIP valuation, scrap accounting, quality certifications',
      color: '#6366F1',
      features: [
        { title: 'Bill of Materials', description: 'Multi-level BOMs with version control and substitution rules.' },
        { title: 'Work Orders', description: 'Create, schedule, and track production work orders.' },
        { title: 'Production Planning', description: 'Schedule production runs across work centres.' },
        { title: 'Quality Control', description: 'Inspection checkpoints and defect tracking.' },
        { title: 'Cost Tracking', description: 'Track materials, labour, and overhead per production run.' },
        { title: 'Scrap Management', description: 'Record and account for production waste.' }
      ],
      keyMetrics: ['Multi-level BOMs', 'Production cost tracking', 'Quality workflows']
    }
  ];

  const currentModule = modules[activeModule];

  return (
    <section className="modules" id="modules">
      <div className="container">
        <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <span className="section-badge">Unified Platform</span>
          <h2>One Platform. Every Module You Need.</h2>
          <p className="section-subhead">Every module seamlessly integrates business operations with IFRS-compliant accounting — no more data silos, no more reconciliation nightmares.</p>
        </motion.div>

        <div className="modules-grid">
          <motion.div className="module-tabs" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {modules.map((module, i) => (
              <motion.button
                key={i}
                className={`module-tab ${activeModule === i ? 'active' : ''}`}
                onClick={() => { setActiveModule(i); setShowDetail(false); }}
                variants={fadeInUp}
                whileHover={{ x: 8 }}
                style={{ '--accent-color': module.color } as React.CSSProperties}
              >
                <div className="tab-icon">{module.icon}</div>
                <span>{module.title}</span>
                <ChevronRight size={18} />
              </motion.button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              className={`module-detail ${showDetail ? 'expanded' : ''}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={{ '--accent-color': currentModule.color } as React.CSSProperties}
            >
              <div className="detail-header">
                <div className="detail-icon">{currentModule.icon}</div>
                <div className="detail-title-group">
                  <h3>{currentModule.title}</h3>
                  <p className="module-tagline">{currentModule.tagline}</p>
                </div>
              </div>

              <div className="detail-benefits">
                <div className="benefit-card business">
                  <div className="benefit-label"><TrendingUp size={16} /> Business Benefit</div>
                  <p>{currentModule.businessBenefit}</p>
                </div>
                <div className="benefit-card compliance">
                  <div className="benefit-label"><Shield size={16} /> Compliance Benefit</div>
                  <p>{currentModule.complianceBenefit}</p>
                </div>
              </div>

              <div className="module-metrics">
                {currentModule.keyMetrics.map((metric, i) => (
                  <div key={i} className="metric-badge"><Check size={14} />{metric}</div>
                ))}
              </div>

              <button className="btn-primary" onClick={() => setShowDetail(!showDetail)}>
                {showDetail ? 'Show Less' : `Learn More About ${currentModule.title}`}
                <ArrowRight size={16} className={showDetail ? 'rotate-up' : ''} />
              </button>

              <AnimatePresence>
                {showDetail && (
                  <motion.div
                    className="module-expanded"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="expanded-section">
                      <h4><Zap size={18} /> Key Features</h4>
                      <div className="features-grid">
                        {currentModule.features.map((feature, i) => (
                          <div key={i} className="feature-item">
                            <h5>{feature.title}</h5>
                            <p>{feature.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="expanded-cta">
                      <button className="btn-primary btn-large" onClick={() => navigate('/demo')}>
                        See {currentModule.title} in Action
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

// Audit & Compliance — DIFFERENTIATOR SECTION
export const AuditComplianceSection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="audit-compliance" id="audit-compliance">
      <div className="container">
        <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <span className="section-badge">Our Differentiator</span>
          <h2>Audit-Ready & Regulatory Compliant — By Design</h2>
          <p className="section-subhead">Most ERPs bolt compliance on as an afterthought. SiyaBusa was built with audit readiness and regulatory compliance at its core. This is what makes us different.</p>
        </motion.div>

        <motion.div className="audit-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {/* Audit-Ready Hub */}
          <motion.div className="audit-card audit-hub" variants={fadeInUp}>
            <div className="audit-card-header">
              <div className="audit-icon" style={{ background: 'linear-gradient(135deg, #00D4AA, #00A884)' }}>
                <ClipboardCheck size={32} />
              </div>
              <div>
                <h3>Audit-Ready Hub</h3>
                <p className="audit-card-tagline">Walk into any audit with confidence</p>
              </div>
            </div>
            <ul className="audit-features">
              <li><Check size={16} /> <strong>Complete Audit Trails</strong> — Every transaction, every change, timestamped and attributed</li>
              <li><Check size={16} /> <strong>Document Management</strong> — Supporting documents linked to every entry</li>
              <li><Check size={16} /> <strong>Segregation of Duties</strong> — Approval workflows that satisfy auditors</li>
              <li><Check size={16} /> <strong>Automated Reconciliations</strong> — Bank, intercompany, and control account recs</li>
              <li><Check size={16} /> <strong>Audit Pack Generation</strong> — One-click audit file preparation</li>
              <li><Check size={16} /> <strong>Prior Period Tracking</strong> — Adjustments tracked and disclosed correctly</li>
            </ul>
          </motion.div>

          {/* Regulatory Hub */}
          <motion.div className="audit-card regulatory-hub" variants={fadeInUp}>
            <div className="audit-card-header">
              <div className="audit-icon" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
                <Shield size={32} />
              </div>
              <div>
                <h3>Regulatory Hub</h3>
                <p className="audit-card-tagline">Stay compliant without the complexity</p>
              </div>
            </div>
            <ul className="audit-features">
              <li><Check size={16} /> <strong>SARS Integration</strong> — VAT201, EMP201, ITR14 submissions from within the system</li>
              <li><Check size={16} /> <strong>IFRS Compliance</strong> — IAS 2, IAS 16, IAS 37, IFRS 15, IFRS 16 built into every module</li>
              <li><Check size={16} /> <strong>B-BBEE Reporting</strong> — Track and report on transformation compliance</li>
              <li><Check size={16} /> <strong>CIPC Compliance</strong> — Annual return reminders and tracking</li>
              <li><Check size={16} /> <strong>Labour Compliance</strong> — BCEA, LRA, EEA requirements monitored</li>
              <li><Check size={16} /> <strong>Data Protection</strong> — POPIA-compliant data handling and consent management</li>
            </ul>
          </motion.div>

          {/* SARS Sentinel */}
          <motion.div className="audit-card sars-card" variants={fadeInUp}>
            <div className="audit-card-header">
              <div className="audit-icon" style={{ background: 'linear-gradient(135deg, #F4B400, #E09200)' }}>
                <Landmark size={32} />
              </div>
              <div>
                <h3>SARS Sentinel</h3>
                <p className="audit-card-tagline">Tax compliance on autopilot</p>
              </div>
            </div>
            <ul className="audit-features">
              <li><Check size={16} /> <strong>VAT Calculations</strong> — Automatic VAT on every transaction, output and input</li>
              <li><Check size={16} /> <strong>PAYE Processing</strong> — Tax tables updated, deductions calculated automatically</li>
              <li><Check size={16} /> <strong>Provisional Tax</strong> — IRP6 estimates based on actual performance</li>
              <li><Check size={16} /> <strong>Tax Calendar</strong> — Never miss a filing deadline with automated reminders</li>
              <li><Check size={16} /> <strong>eFiling Integration</strong> — Submit directly or export in SARS-accepted formats</li>
              <li><Check size={16} /> <strong>Tax Certificates</strong> — IRP5, IT3(a), IT3(b) generation</li>
            </ul>
          </motion.div>
        </motion.div>

        <motion.div className="audit-bottom-cta" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <p><strong>This is what makes SiyaBusa different.</strong> While other systems give you the tools and leave compliance up to you, we ensure every single transaction is recorded, classified, and reported correctly — automatically.</p>
          <button className="btn-primary btn-large" onClick={() => navigate('/demo')}>
            See Our Compliance Suite in Action
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

// Project Management — DIFFERENTIATOR SECTION
export const ProjectManagementShowcase: React.FC = () => {
  return (
    <section className="project-showcase" id="projects">
      <div className="container">
        <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <span className="section-badge">Smart Project Management</span>
          <h2>Projects That Run Themselves</h2>
          <p className="section-subhead">Your calendar knows your deadlines. Your financials know your project costs. Everything is connected — because it should be.</p>
        </motion.div>

        <motion.div className="project-features-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#7C3AED' }}><FolderKanban size={24} /></div>
            <h4>Integrated Task Management</h4>
            <p>Create tasks, assign team members, set priorities. Every task links to a project, a budget, and your calendar.</p>
          </motion.div>

          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#00D4AA' }}><Clock size={24} /></div>
            <h4>Auto-Populated Calendar</h4>
            <p>Tasks, milestones, invoice due dates, and project timelines automatically appear on your calendar. No double-entry.</p>
          </motion.div>

          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#F4B400' }}><CircleDollarSign size={24} /></div>
            <h4>Financial Integration</h4>
            <p>Project costs flow into your GL automatically. Budget vs actual reporting in real-time. No month-end surprises.</p>
          </motion.div>

          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#EF4444' }}><AlertTriangle size={24} /></div>
            <h4>Overdue Alerts</h4>
            <p>Overdue tasks and unpaid invoices are flagged immediately — on your dashboard, in your calendar, everywhere.</p>
          </motion.div>

          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#3B82F6' }}><FileText size={24} /></div>
            <h4>Proposals & Quotes</h4>
            <p>Create professional proposals that convert to projects. Quote, win, deliver, invoice — one seamless flow.</p>
          </motion.div>

          <motion.div className="project-feature" variants={fadeInUp}>
            <div className="pf-icon" style={{ background: '#EC4899' }}><Eye size={24} /></div>
            <h4>Complete Visibility</h4>
            <p>See every project's status, budget health, team workload, and upcoming deadlines from one dashboard.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Comparison Table
export const ComparisonTable: React.FC = () => {
  const navigate = useNavigate();
  const comparisons = [
    { feature: 'AI-Native Architecture', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'none' as const },
    { feature: 'Real-time Business/Accounting Sync', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'none' as const },
    { feature: 'Built-in Audit Readiness', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'partial' as const },
    { feature: 'SARS Integration', siyabusa: 'full' as const, traditional: 'none' as const, accounting: 'partial' as const },
    { feature: 'Automated Compliance Engine', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'partial' as const },
    { feature: 'Unified Platform (All Modules)', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'none' as const },
    { feature: 'Project-Calendar-Finance Integration', siyabusa: 'full' as const, traditional: 'none' as const, accounting: 'none' as const },
    { feature: 'Natural Language AI Assistant', siyabusa: 'full' as const, traditional: 'none' as const, accounting: 'none' as const },
    { feature: 'Multi-Entity & Consolidation', siyabusa: 'full' as const, traditional: 'full' as const, accounting: 'partial' as const },
    { feature: 'South African Tax Compliance', siyabusa: 'full' as const, traditional: 'partial' as const, accounting: 'full' as const }
  ];

  const StatusIcon: React.FC<{ status: 'full' | 'partial' | 'none' }> = ({ status }) => {
    if (status === 'full') return <Check className="status-full" size={18} />;
    if (status === 'partial') return <div className="status-partial">~</div>;
    return <X className="status-none" size={18} />;
  };

  return (
    <section className="comparison" id="comparison">
      <div className="container">
        <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <span className="section-badge">The Clear Choice</span>
          <h2>Why Businesses Choose SiyaBusa</h2>
          <p>See how we compare to alternative solutions</p>
        </motion.div>

        <motion.div className="comparison-table-wrapper" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th className="highlight"><div className="th-content"><Layers size={20} /> SiyaBusa</div></th>
                <th>Traditional ERPs</th>
                <th>Accounting Software</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, i) => (
                <motion.tr key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                  <td>{row.feature}</td>
                  <td className="highlight"><StatusIcon status={row.siyabusa} /></td>
                  <td><StatusIcon status={row.traditional} /></td>
                  <td><StatusIcon status={row.accounting} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.div className="comparison-cta" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
          <p>Ready to see the difference?</p>
          <button className="btn-primary" onClick={() => navigate('/demo')}>
            Schedule a Demo <ArrowRight size={16} />
          </button>
          <p className="comparison-disclaimer">Comparison based on general category capabilities. Individual product features may vary. "Traditional ERPs" and "Accounting Software" represent typical solutions in their category.</p>
        </motion.div>
      </div>
    </section>
  );
};

// AI Demo Section
export const AIDemo: React.FC = () => {
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  interface ConversationMessage {
    role: 'user' | 'ai';
    content: string;
    type?: 'processing' | 'confirmation' | 'success' | 'workflow';
  }

  const conversation: ConversationMessage[] = [
    {
      role: 'user',
      content: 'We just invoiced R50,000 to ABC Corp for the consulting project'
    },
    {
      role: 'ai',
      type: 'processing',
      content: '🔄 Processing invoice...'
    },
    {
      role: 'ai',
      type: 'confirmation',
      content: '⚠️ CONFIRMATION REQUIRED\n\nI\'ve analysed the transaction:\n\n• Customer: ABC Corp (Credit limit: R75,000 | Available: R42,500)\n• Project: Consulting Engagement — Phase 2\n• Amount: R50,000 (excl. VAT)\n• VAT @ 15%: R7,500\n• Total: R57,500\n• Payment terms: 30 days\n\nShall I proceed?'
    },
    {
      role: 'user',
      content: 'Yes, proceed'
    },
    {
      role: 'ai',
      type: 'success',
      content: '✅ INVOICE CREATED — INV-2026-0847\n\n━━━ ACCOUNTING ENTRIES ━━━\n• Dr. Accounts Receivable: R57,500\n• Cr. Revenue: R50,000 (IFRS 15 ✓)\n• Cr. VAT Output: R7,500 (15%)\n\n━━━ COMPLIANCE ━━━\n✓ Revenue recognition: IFRS 15\n✓ VAT calculation: SARS compliant\n✓ Audit trail: Complete\n✓ Project costs: Updated'
    },
    {
      role: 'ai',
      type: 'workflow',
      content: '📨 ACTIONS TRIGGERED\n\n🔔 Invoice emailed to ABC Corp\n📅 Due date added to calendar: 15 March 2026\n📊 Project P&L updated\n💰 Cash flow forecast adjusted\n\n💡 Say "Check project profitability" for a full breakdown.'
    }
  ];

  useEffect(() => {
    if (step < conversation.length - 1) {
      const nextMessage = conversation[step + 1];
      let delay = 1500;
      if (nextMessage?.role === 'user') delay = 2500;
      else if (conversation[step]?.type === 'processing') delay = 1000;

      const timer = setTimeout(() => {
        if (nextMessage?.role === 'ai') {
          setIsTyping(true);
          setTimeout(() => { setIsTyping(false); setStep(prev => prev + 1); }, 800);
        } else {
          setStep(prev => prev + 1);
        }
      }, delay);
      return () => clearTimeout(timer);
    } else {
      const resetTimer = setTimeout(() => setStep(0), 8000);
      return () => clearTimeout(resetTimer);
    }
  }, [step]);

  return (
    <section className="ai-demo">
      <div className="container">
        <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <span className="section-badge">AI-Powered</span>
          <h2 className="ai-demo-title">See AI in Action</h2>
          <p className="ai-demo-subtitle">Natural language to complete business + accounting automation</p>
        </motion.div>

        <motion.div className="demo-container" variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div className="demo-header">
            <div className="demo-avatar"><Cpu size={20} /></div>
            <div>
              <h4>SiyaBusa AI Assistant</h4>
              <span className="online-status"><span className="status-dot"></span> Always online</span>
            </div>
          </div>

          <div className="demo-messages">
            {conversation.slice(0, step + 1).map((msg, i) => (
              <motion.div key={i} className={`demo-message ${msg.role} ${msg.type || ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                {msg.role === 'ai' && (<div className="message-header"><Sparkles size={14} /><span>SiyaBusa AI</span></div>)}
                <pre>{msg.content}</pre>
              </motion.div>
            ))}
            {isTyping && (<div className="typing-indicator"><span></span><span></span><span></span></div>)}
          </div>

          <div className="demo-input">
            <input type="text" placeholder="Try: 'Check project profitability' or 'Run payroll'" disabled />
            <button disabled><MessageSquare size={18} /></button>
          </div>

          <div className="demo-footer">
            <div className="compliance-badges">
              <span className="badge"><Shield size={12} /> Audit Ready</span>
              <span className="badge"><Lock size={12} /> POPIA Compliant</span>
              <span className="badge"><FileCheck size={12} /> IFRS/SARS</span>
            </div>
          </div>
        </motion.div>

        <motion.p className="demo-caption" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}>
          Every transaction creates a complete audit trail. Every entry is compliance-checked in real-time.
          <strong> Walk into any audit with confidence.</strong>
        </motion.p>
      </div>
    </section>
  );
};

// Additional Modules Bar
export const AdditionalModules: React.FC = () => {
  const additionalModules = [
    { icon: <Landmark size={20} />, name: 'Banking Hub', desc: 'Bank reconciliation & cash management' },
    { icon: <Briefcase size={20} />, name: 'Practice Hub', desc: 'Professional services & time tracking' },
    { icon: <FileText size={20} />, name: 'Proposals', desc: 'Professional proposals & pitch decks' },
    { icon: <MessageSquare size={20} />, name: 'Communications', desc: 'Video meetings, messaging & collaboration' },
    { icon: <Settings size={20} />, name: 'Multi-Entity', desc: 'Consolidation & intercompany transactions' },
    { icon: <Sparkles size={20} />, name: 'AI Assistant', desc: 'Natural language queries & automation' }
  ];

  return (
    <section className="additional-modules">
      <div className="container">
        <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <span className="section-badge">And More</span>
          <h2>Plus Everything Else You Need</h2>
        </motion.div>

        <motion.div className="additional-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {additionalModules.map((mod, i) => (
            <motion.div key={i} className="additional-item" variants={fadeInUp}>
              <div className="additional-icon">{mod.icon}</div>
              <div>
                <h4>{mod.name}</h4>
                <p>{mod.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ROI Calculator — ZAR
export const ROICalculator: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState(50);
  const [transactions, setTransactions] = useState(1000);

  // Values are illustrative estimates for demonstration purposes only
  const savings = Math.round(employees * 45000 + transactions * 8);
  const hours = Math.round(employees * 5 + transactions * 0.01);
  const roi = Math.round((savings / (employees * 3500)) * 100);

  return (
    <section className="roi-calculator" id="roi">
      <div className="container">
        <motion.div className="section-header" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <span className="section-badge">Calculate Your ROI</span>
          <h2>Your Investment, Quantified</h2>
          <p>See how much time and money SiyaBusa can save your business</p>
        </motion.div>
        <motion.div className="roi-image-accent" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <img
            src="https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=500&q=80&auto=format&fit=crop"
            alt="Business growth analytics and financial insights"
            loading="lazy"
          />
        </motion.div>

        <motion.div className="calculator-container" variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div className="calculator-grid">
            <div className="calculator-inputs">
              <h4>Tell us about your business</h4>
              <div className="input-group">
                <label><Users size={18} /> Team Size</label>
                <input type="range" min="10" max="500" value={employees} onChange={(e) => setEmployees(Number(e.target.value))} />
                <div className="input-value-row">
                  <span className="input-hint">10</span>
                  <span className="input-value">{employees} employees</span>
                  <span className="input-hint">500+</span>
                </div>
              </div>
              <div className="input-group">
                <label><BarChart3 size={18} /> Monthly Transactions</label>
                <input type="range" min="100" max="50000" step="100" value={transactions} onChange={(e) => setTransactions(Number(e.target.value))} />
                <div className="input-value-row">
                  <span className="input-hint">100</span>
                  <span className="input-value">{transactions.toLocaleString()}</span>
                  <span className="input-hint">50K+</span>
                </div>
              </div>
            </div>

            <div className="calculator-results">
              <h4>Your Estimated Returns</h4>
              <div className="result-card highlight">
                <div className="result-icon"><CircleDollarSign size={28} /></div>
                <div className="result-value">R{savings.toLocaleString()}</div>
                <div className="result-label">Estimated Annual Savings*</div>
              </div>
              <div className="result-card">
                <div className="result-icon"><Clock size={28} /></div>
                <div className="result-value">{hours.toLocaleString()}</div>
                <div className="result-label">Estimated Hours Saved/Year*</div>
              </div>
              <div className="result-card">
                <div className="result-icon"><TrendingUp size={28} /></div>
                <div className="result-value">{roi}%</div>
                <div className="result-label">Estimated ROI*</div>
              </div>
            </div>
          </div>

          <div className="calculator-cta">
            <button className="btn-primary btn-large" onClick={() => navigate('/demo')}>
              Get Your Custom ROI Analysis <ArrowRight size={18} />
            </button>
            <p className="cta-note">Free consultation • No commitment • We'll be in touch promptly</p>
            <p className="roi-disclaimer">*These figures are illustrative estimates only and do not constitute a guarantee of actual savings. Results vary based on business size, industry, and current processes.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Demo Form — REAL, sends email
export const DemoForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', company: '', phone: '', employees: '', industry: '', message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Capture UTM params from URL
      const urlParams = new URLSearchParams(window.location.search);

      // Send to demo lead API — creates user account + sends credentials email
      const response = await fetch('/api/demo/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          companyName: formData.company,
          phone: formData.phone,
          industry: formData.industry,
          utmSource: urlParams.get('utm_source'),
          utmMedium: urlParams.get('utm_medium'),
          utmCampaign: urlParams.get('utm_campaign'),
          referrerUrl: document.referrer || null,
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to connect. Please try again or email demo@siyabusaerp.co.za');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="demo-form-section" id="demo-form">
        <div className="container">
          <motion.div className="demo-success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <div className="success-icon"><Check size={48} /></div>
            <h2>Your Demo is Ready, {formData.name}!</h2>
            <p>We've sent your login credentials to <strong>{formData.email}</strong>. Check your inbox (and spam folder) for an email with your demo access details.</p>
            <p className="success-email">Go to <a href="https://demo.siyabusaerp.co.za" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', fontWeight: 600 }}>demo.siyabusaerp.co.za</a> to start exploring.</p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="demo-form-section" id="demo-form">
      <div className="container">
        <div className="demo-form-grid">
          <motion.div className="demo-form-content" variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2>Schedule Your Personalised Demo</h2>
            <p>See how SiyaBusa can transform your business operations and compliance.</p>
            <div className="demo-content-image">
              <img
                src="https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=500&q=80&auto=format&fit=crop"
                alt="Business presentation and consultation"
                loading="lazy"
              />
            </div>
            <ul className="demo-benefits">
              <li><Check size={18} /> 30-minute personalised walkthrough</li>
              <li><Check size={18} /> See modules relevant to your business</li>
              <li><Check size={18} /> Live AI assistant demonstration</li>
              <li><Check size={18} /> Audit & compliance deep-dive</li>
              <li><Check size={18} /> Custom ROI analysis</li>
            </ul>
            <div className="demo-guarantee">
              <Shield size={20} />
              <span>No credit card required. No obligation.</span>
            </div>
          </motion.div>

          <motion.form className="demo-form" onSubmit={handleSubmit} variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Thabo Mokoena" required />
            </div>
            <div className="form-group">
              <label>Work Email *</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="thabo@company.co.za" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Company Name *</label>
                <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Company (Pty) Ltd" required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+27 XX XXX XXXX" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Team Size</label>
                <select value={formData.employees} onChange={(e) => setFormData({ ...formData, employees: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="1-10">1–10</option>
                  <option value="11-50">11–50</option>
                  <option value="51-200">51–200</option>
                  <option value="201-500">201–500</option>
                  <option value="500+">500+</option>
                </select>
              </div>
              <div className="form-group">
                <label>Industry</label>
                <select value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="professional-services">Professional Services</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="retail-wholesale">Retail & Wholesale</option>
                  <option value="construction">Construction</option>
                  <option value="consulting">Consulting</option>
                  <option value="finance">Financial Services</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="technology">Technology</option>
                  <option value="non-profit">Non-Profit / NGO</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>What are your biggest challenges?</label>
              <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="e.g. Audit preparation takes too long, manual data entry between systems, SARS compliance concerns..." rows={3} />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn-primary large full-width" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : (<><Play size={18} /> Request Your Demo</>)}
            </button>

            <p className="form-note">
              By submitting, you agree to our <Link to="/privacy">Privacy Policy</Link>. We'll never share your information.
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
};

// Footer — multi-page navigation
export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="footGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00D4AA"/><stop offset="100%" stopColor="#0A1F3E"/></linearGradient></defs>
                <rect width="64" height="64" rx="14" fill="url(#footGrad)"/>
                <text x="32" y="45" fontFamily="system-ui,-apple-system,sans-serif" fontSize="34" fontWeight="800" fill="white" textAnchor="middle" letterSpacing="-1">SB</text>
              </svg>
              <span>SiyaBusa</span>
            </div>
            <p>The AI-native business operating system built for South African enterprises.</p>
            <p className="footer-company">A product of Masaphokati Technologies (Pty) Ltd</p>
          </div>

          <div className="footer-links">
            <h4>Platform</h4>
            <Link to="/features">Features</Link>
            <Link to="/compliance">Audit & Compliance</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/demo">Request a Demo</Link>
          </div>

          <div className="footer-links">
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>

          <div className="footer-links">
            <h4>Get in Touch</h4>
            <a href="mailto:demo@siyabusaerp.co.za">demo@siyabusaerp.co.za</a>
            <a href="mailto:hello@siyabusaerp.co.za">hello@siyabusaerp.co.za</a>
            <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>Centurion, Gauteng, South Africa</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} SiyaBusa by Masaphokati Technologies (Pty) Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Website Layout — shared wrapper for all website pages
export const WebsiteLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
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
  }, [title]);

  return (
    <div className={`landing-page ${isDark ? 'dark' : 'light'}`}>
      <Navigation isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />
      {children}
      <Footer />
    </div>
  );
};


// Home Page — emotional, solutions-focused design
const LandingPage: React.FC = () => {
  return (
    <WebsiteLayout title="SiyaBusa ERP — Your Business is Complex. Managing It Shouldn't Be.">
      <EmotionalHero />
      <PainToSolution />
      <TrustStrip />
      <WhatYouGet />
      <SimpleSteps />
      <FoundingMemberCTA />
    </WebsiteLayout>
  );
};

export default LandingPage;
