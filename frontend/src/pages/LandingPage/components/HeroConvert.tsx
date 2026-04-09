/**
 * HeroConvert — Premium corporate hero with embedded signup
 * Clean, authoritative design. Free trial signup as primary CTA.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, CheckCircle, Eye, EyeOff, Shield, BarChart3, Globe } from 'lucide-react';
import authService from '../../../services/auth.service';

const HeroConvert: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', email: '', password: '', firstName: '', lastName: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.companyName) return;

    // If name fields not filled, expand form
    if (!expanded && (!form.firstName || !form.lastName)) {
      setExpanded(true);
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await authService.signup({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        companyName: form.companyName,
        country: 'ZA',
        plan: 'professional',
      });

      if (response.success) {
        setStatus('success');
        setTimeout(() => navigate('/app'), 1500);
      }
    } catch (error: any) {
      setStatus('error');
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Something went wrong. Please try again.';
      setErrorMsg(msg);
    }
  };

  if (status === 'success') {
    return (
      <section className="hero-convert">
        <div className="hero-convert-inner">
          <motion.div
            className="hero-convert-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle size={48} strokeWidth={1.5} />
            <h2>Welcome to SiyaBusa</h2>
            <p>Your account is ready. Taking you to your dashboard...</p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero-convert">
      <div className="hero-convert-inner">
        {/* Left: Value prop */}
        <motion.div
          className="hero-convert-content"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="hero-eyebrow">Enterprise Resource Planning for South Africa</span>

          <h1>
            The business platform
            <br />
            <span className="text-gradient">built for South African SMEs.</span>
          </h1>

          <p className="hero-convert-sub">
            Finance, HR, payroll, inventory, sales, and compliance — integrated
            in one platform. SARS-ready, IFRS-aligned, and audit-compliant from day one.
          </p>

          <div className="hero-convert-points">
            <div className="hero-convert-point">
              <BarChart3 size={18} />
              <span>17+ integrated modules — one source of truth</span>
            </div>
            <div className="hero-convert-point">
              <Shield size={18} />
              <span>SARS e-Filing, IFRS, POPIA & B-BBEE compliant</span>
            </div>
            <div className="hero-convert-point">
              <Globe size={18} />
              <span>Cloud-hosted — access your data from anywhere</span>
            </div>
          </div>

          <div className="hero-trust-line">
            Trusted by South African businesses across industries
          </div>
        </motion.div>

        {/* Right: Signup form */}
        <motion.div
          className="hero-convert-form-wrap"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <form className="hero-convert-form" onSubmit={handleSubmit}>
            <div className="hcf-header">
              <h3>Start your free 14-day trial</h3>
              <p>Full access. No credit card required.</p>
            </div>

            {errorMsg && (
              <div className="hcf-error">{errorMsg}</div>
            )}

            <div className="hcf-fields">
              <input
                type="text"
                placeholder="Company name"
                value={form.companyName}
                onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                required
                className="hcf-input"
                autoComplete="organization"
              />
              <input
                type="email"
                placeholder="Work email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                className="hcf-input"
                autoComplete="email"
              />
              <div className="hcf-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  minLength={8}
                  className="hcf-input"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="hcf-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {expanded && (
                <motion.div
                  className="hcf-name-row"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <input
                    type="text"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                    required
                    className="hcf-input hcf-half"
                    autoComplete="given-name"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                    required
                    className="hcf-input hcf-half"
                    autoComplete="family-name"
                  />
                </motion.div>
              )}
            </div>

            <button
              type="submit"
              className="hcf-submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <Loader2 size={18} className="spin-icon" />
              ) : (
                <>
                  {expanded ? 'Create My Account' : 'Start Free Trial'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="hcf-terms">
              By signing up you agree to our{' '}
              <a href="/terms">Terms</a> and{' '}
              <a href="/privacy">Privacy Policy</a>
            </p>

            <div className="hcf-divider">
              <span>Already have an account?</span>
            </div>

            <button
              type="button"
              className="hcf-signin"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroConvert;
