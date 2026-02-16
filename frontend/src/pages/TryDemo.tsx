/**
 * Try Demo Page
 * Lead capture form for demo requests
 * Collects name, email, company, phone → creates demo account → sends credentials email
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api.service';
import './Login.css';

const DEMO_URL = 'https://demo.siyabusaerp.co.za';

const TryDemo = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Your name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Capture UTM params from URL if present
      const urlParams = new URLSearchParams(window.location.search);

      const response = await fetch(`${API_BASE_URL}/api/demo/request`, {
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

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setAlreadyExists(data.alreadyExists || false);
      } else {
        setApiError(data.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Demo request error:', error);
      setApiError('Unable to connect. Please try again or contact support@siyabusaerp.co.za');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  // Success state — after form submission
  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="12" fill="url(#gradient-success)" />
                <path d="M20 24L23 27L29 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <defs>
                  <linearGradient id="gradient-success" x1="0" y1="0" x2="48" y2="48">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="auth-title">
              {alreadyExists ? 'Credentials Resent!' : 'Check Your Email!'}
            </h1>
            <p className="auth-subtitle" style={{ marginTop: '0.5rem', lineHeight: 1.6 }}>
              {alreadyExists
                ? `We've resent your demo login details to ${formData.email}`
                : `We've sent your demo login credentials to ${formData.email}`
              }
            </p>
          </div>

          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            lineHeight: 1.6,
          }}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 600, color: '#166534' }}>
              What happens next:
            </p>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#15803d' }}>
              <li>Check your email (also check spam/promotions)</li>
              <li>Click the link or go to <strong>{DEMO_URL}</strong></li>
              <li>Log in with the credentials in the email</li>
              <li>Explore the full ERP — invoicing, payroll, bank recon, and more</li>
            </ol>
          </div>

          <a
            href={DEMO_URL}
            className="btn btn-primary btn-full"
            style={{ textAlign: 'center', display: 'block', textDecoration: 'none', padding: '0.75rem' }}
          >
            Go to Demo →
          </a>

          <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
            <p>
              Already have an account?{' '}
              <Link to="/login" className="link-text link-bold">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#gradient-demo)" />
              <path d="M24 14L34 22V34H14V22L24 14Z" stroke="white" strokeWidth="2" fill="none" />
              <defs>
                <linearGradient id="gradient-demo" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="auth-title">Try SiyaBusa ERP</h1>
          <p className="auth-subtitle">
            Get instant access to a fully loaded demo environment — no credit card required
          </p>
        </div>

        {apiError && (
          <div className="alert alert-error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{apiError}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">Full Name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              className={`form-input ${errors.fullName ? 'input-error' : ''}`}
              placeholder="Thandi Nkosi"
              value={formData.fullName}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="name"
            />
            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="thandi@yourcompany.co.za"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="companyName" className="form-label">Company Name</label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              className={`form-input ${errors.companyName ? 'input-error' : ''}`}
              placeholder="Nkosi Construction (Pty) Ltd"
              value={formData.companyName}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="organization"
            />
            {errors.companyName && <span className="error-message">{errors.companyName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Phone / WhatsApp <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="form-input"
              placeholder="082 123 4567"
              value={formData.phone}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="tel"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="50" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
                Setting up your demo...
              </>
            ) : (
              'Get My Free Demo →'
            )}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#9ca3af',
          marginTop: '1rem',
          lineHeight: 1.6,
        }}>
          Your demo is valid for 7 days. We'll send login credentials to your email. 
          No spam, just your demo access.
        </p>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="link-text link-bold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TryDemo;
