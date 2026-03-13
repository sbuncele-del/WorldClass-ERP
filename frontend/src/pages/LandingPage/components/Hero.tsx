/**
 * Hero — Single powerful headline with dashboard mockup
 * World-class pattern: one clear value prop → primary CTA → trust metrics
 * No persona gate — reduce friction, show value immediately
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Play } from 'lucide-react';
import WaitlistForm from './WaitlistForm';

/* Animated counter hook — starts at target value so content is never blank */
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(end);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          setCount(0);
          let start = 0;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return { count, ref };
}

/* Dashboard Mockup — Visual product preview */
const DashboardMockup: React.FC = () => {
  const barHeights = [45, 62, 38, 78, 55, 85, 48, 72, 60, 90, 52, 68];

  return (
    <motion.div
      className="dashboard-mockup"
      initial={{ opacity: 0, y: 30, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <div className="dashboard-glow" />
      <div className="mockup-topbar">
        <div className="mockup-dot red" />
        <div className="mockup-dot yellow" />
        <div className="mockup-dot green" />
        <div className="mockup-search">siyabusa.app/dashboard</div>
      </div>
      <div className="mockup-content">
        <div className="mockup-card">
          <div className="mockup-card-label">Revenue (MTD)</div>
          <div className="mockup-card-value teal">R 2.4M</div>
        </div>
        <div className="mockup-card">
          <div className="mockup-card-label">Cash Position</div>
          <div className="mockup-card-value gold">R 892K</div>
        </div>
        <div className="mockup-card">
          <div className="mockup-card-label">Invoices Due</div>
          <div className="mockup-card-value">14</div>
        </div>
        <div className="mockup-card">
          <div className="mockup-card-label">Compliance</div>
          <div className="mockup-card-value teal">98%</div>
        </div>
        <div className="mockup-chart">
          <div className="mockup-card-label">Monthly Revenue Trend</div>
          <div className="mockup-bars">
            {barHeights.map((h, i) => (
              <motion.div
                key={i}
                className="mockup-bar"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.05 }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const m1 = useCounter(500, 1800);
  const m2 = useCounter(99, 1600);
  const m3 = useCounter(17, 1400);

  return (
    <section className="hero">
      <div className="hero-inner">
        {/* ─── Left: Copy ─── */}
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} style={{ color: '#00D4AA' }} />
            <span>Enterprise Resource Planning for Africa</span>
          </div>

          <h1>
            The operating system{' '}
            <span className="text-gradient">behind better-run businesses.</span>
          </h1>

          <p className="hero-subtitle">
            Unified financials, HR, inventory, and compliance — IFRS-aligned,
            SARS-integrated, and built for the way South African businesses
            actually operate.
          </p>

          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => navigate('/pricing')}>
              Get Started <ArrowRight size={18} />
            </button>
            <button className="btn-ghost" onClick={() => navigate('/demo')}>
              <Play size={16} /> See It in Action
            </button>
          </div>

          {/* Inline Waitlist Form */}
          <WaitlistForm variant="hero" />

          {/* Trust Metrics */}
          <div className="hero-metrics">
            <div className="hero-metric" ref={m1.ref}>
              <div className="hero-metric-value">
                <span className="metric-accent">{m1.count}+</span>
              </div>
              <div className="hero-metric-label">Active Organisations</div>
            </div>
            <div className="hero-metric" ref={m2.ref}>
              <div className="hero-metric-value">
                <span className="metric-accent">{m2.count}%</span>
              </div>
              <div className="hero-metric-label">Uptime Guaranteed</div>
            </div>
            <div className="hero-metric" ref={m3.ref}>
              <div className="hero-metric-value">
                <span className="metric-accent">{m3.count}+</span>
              </div>
              <div className="hero-metric-label">Modules Included</div>
            </div>
          </div>
        </div>

        {/* ─── Right: Dashboard Mockup ─── */}
        <div className="hero-visual">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
};

export default Hero;
