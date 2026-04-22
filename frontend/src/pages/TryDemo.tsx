/**
 * Try Demo Page
 * Instant, no-friction access to the SiyaBusa ERP demo environment.
 * Auto-logs in as the shared demo user and redirects to the dashboard.
 * Falls back to lead-capture form if auto-login fails.
 */

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api.service';
import './Login.css';

const TryDemo = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'launching' | 'form' | 'form-success'>('launching');
  const [launchError, setLaunchError] = useState('');
  const [formData, setFormData] = useState({ fullName: '', email: '', companyName: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Auto-login on mount
  useEffect(() => {
    let cancelled = false;
    const launchDemo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'demo@siyabusaerp.co.za', password: 'Demo123!' }),
        });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const tokens = data?.data?.tokens;
        const user = data?.data?.user;
        const tenant = data?.data?.tenant;
        if (!tokens?.accessToken) throw new Error('No token in response');

        localStorage.setItem('token', tokens.accessToken);
        localStorage.setItem('authToken', tokens.accessToken);
        if (tokens.refreshToken) localStorage.setItem('refreshToken', tokens.refreshToken);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        if (tenant) {
          localStorage.setItem('tenant', JSON.stringify(tenant));
          if (tenant.id) {
            localStorage.setItem('tenantId', tenant.id);
            localStorage.setItem('workspaceId', tenant.id);
          }
        }
        localStorage.setItem('isDemoSession', 'true');

        if (!cancelled) navigate('/app/dashboard', { replace: true });
      } catch (err) {
        console.error('[TryDemo] instant launch failed:', err);
        if (!cancelled) {
          setLaunchError('Instant demo temporarily unavailable.');
          setPhase('form');
        }
      }
    };
    launchDemo();
    return () => { cancelled = true; };
  }, [navigate]);

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim()) e.fullName = 'Your name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email format';
    if (!formData.companyName.trim()) e.companyName = 'Company name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const res = await fetch(`${API_BASE_URL}/api/demo/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          utmSource: urlParams.get('utm_source'),
          utmMedium: urlParams.get('utm_medium'),
          utmCampaign: urlParams.get('utm_campaign'),
          referrerUrl: document.referrer || null,
        }),
      });
      const data = await res.json();
      if (data.success) setPhase('form-success');
      else setApiError(data.message || 'Something went wrong. Please try again.');
    } catch {
      setApiError('Unable to connect. Please try again or email support@siyabusaerp.co.za');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
    if (apiError) setApiError('');
  };

  if (phase === 'launching') {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ margin: '0 auto 1.25rem', display: 'block' }}>
            <rect width="56" height="56" rx="14" fill="url(#gd-launch)" />
            <path d="M28 16L40 24V40H16V24L28 16Z" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
            <circle cx="28" cy="30" r="4" fill="white" fillOpacity="0.85" />
            <defs>
              <linearGradient id="gd-launch" x1="0" y1="0" x2="56" y2="56">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <h1 className="auth-title" style={{ marginBottom: '0.5rem' }}>Launching Your Demo</h1>
          <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
            Loading Ndaba Engineering (Pty) Ltd — your sample company
          </p>
          <div style={{ width: '100%', height: 4, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg,#6366F1,#8B5CF6)',
              borderRadius: 99,
              animation: 'demo-progress 2.5s ease-in-out infinite',
            }} />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '1rem' }}>
            No sign-up required. You will be inside in seconds.
          </p>
          <style>{`
            @keyframes demo-progress {
              0%   { width: 0%;  margin-left: 0;    }
              50%  { width: 70%; margin-left: 0;    }
              100% { width: 0%;  margin-left: 100%; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (phase === 'form-success') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Check Your Email</h1>
            <p className="auth-subtitle">
              Demo credentials sent to <strong>{formData.email}</strong>
            </p>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.7 }}>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#166534' }}>What is next:</p>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#15803d' }}>
              <li>Check inbox (also spam / promotions tab)</li>
              <li>Or launch the instant demo right now</li>
            </ol>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => setPhase('launching')}>
            Launch Instant Demo
          </button>
          <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
            <Link to="/login" className="link-text">Back to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Try SiyaBusa ERP</h1>
          <p className="auth-subtitle">
            {launchError
              ? 'Instant demo temporarily unavailable. Enter your details for personalised access.'
              : 'Get instant access — no credit card required.'}
          </p>
        </div>

        <button
          className="btn btn-primary btn-full"
          style={{ marginBottom: '1.25rem' }}
          onClick={() => { setLaunchError(''); setPhase('launching'); }}
        >
          Try Instant Demo (no sign-up)
        </button>

        <div className="auth-divider"><span>or get personalised access</span></div>

        {apiError && (
          <div className="alert alert-error">
            <span>{apiError}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">Full Name</label>
            <input type="text" id="fullName" name="fullName"
              className={`form-input ${errors.fullName ? 'input-error' : ''}`}
              placeholder="Thandi Nkosi" value={formData.fullName}
              onChange={handleChange} disabled={isSubmitting} autoComplete="name" />
            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Work Email</label>
            <input type="email" id="email" name="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="thandi@yourcompany.co.za" value={formData.email}
              onChange={handleChange} disabled={isSubmitting} autoComplete="email" />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="companyName" className="form-label">Company Name</label>
            <input type="text" id="companyName" name="companyName"
              className={`form-input ${errors.companyName ? 'input-error' : ''}`}
              placeholder="Nkosi Construction (Pty) Ltd" value={formData.companyName}
              onChange={handleChange} disabled={isSubmitting} autoComplete="organization" />
            {errors.companyName && <span className="error-message">{errors.companyName}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              WhatsApp / Phone <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="tel" id="phone" name="phone" className="form-input"
              placeholder="082 123 4567" value={formData.phone}
              onChange={handleChange} disabled={isSubmitting} autoComplete="tel" />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending access...' : 'Email Me Demo Access'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          <Link to="/login" className="link-text">Already have an account? Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default TryDemo;
