/**
 * Email Verification Banner
 * Shown in the app when user's email is not yet verified.
 */

import { useState } from 'react';
import apiClient from '../services/api';
import './EmailVerificationBanner.css';

const BANNER_DISMISSED_KEY = 'siyabusa_verify_banner_dismissed';

const EmailVerificationBanner = () => {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISSED_KEY) === 'true'
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Only show when email_verified is explicitly false
  if (user?.emailVerified !== false && user?.email_verified !== false) return null;
  if (dismissed) return null;

  const handleResend = async () => {
    if (!user?.email) return;
    setSending(true);
    setError('');
    try {
      await apiClient.post('/api/auth/resend-verification', { email: user.email });
      setSent(true);
    } catch {
      setError('Could not send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="ev-banner" role="alert">
      <div className="ev-banner__inner">
        <span className="ev-banner__icon">📧</span>
        <div className="ev-banner__text">
          {sent ? (
            <span>
              <strong>Verification email sent!</strong> Check your inbox at{' '}
              <strong>{user.email}</strong> and click the link to activate all features.
            </span>
          ) : (
            <span>
              <strong>Please verify your email</strong> — Check your inbox at{' '}
              <strong>{user.email}</strong> for the verification link.{' '}
              {error && <span className="ev-banner__error">{error}</span>}
            </span>
          )}
        </div>
        <div className="ev-banner__actions">
          {!sent && (
            <button
              className="ev-banner__btn ev-banner__btn--resend"
              onClick={handleResend}
              disabled={sending}
            >
              {sending ? 'Sending…' : 'Resend email'}
            </button>
          )}
          <button
            className="ev-banner__btn ev-banner__btn--dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
