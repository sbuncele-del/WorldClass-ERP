/**
 * CEO Welcome Modal
 * Shown once on first login — personal message from Sibusiso Mavuso,
 * CEO & Founder of SiyaBusa ERP.
 * Dismissed state stored in localStorage so it never shows again.
 */

import { useEffect, useState } from 'react';
import './CeoWelcomeModal.css';

const CEO_WELCOME_KEY = 'siyabusa_ceo_welcome_v1';

const CeoWelcomeModal = () => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const alreadySeen = localStorage.getItem(CEO_WELCOME_KEY);
    if (!alreadySeen) {
      // Small delay so the dashboard fully loads first
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      localStorage.setItem(CEO_WELCOME_KEY, 'true');
      setVisible(false);
      setClosing(false);
    }, 350);
  };

  if (!visible) return null;

  return (
    <div className={`ceo-overlay${closing ? ' ceo-overlay--out' : ''}`} onClick={handleClose}>
      <div
        className={`ceo-modal${closing ? ' ceo-modal--out' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome message from our CEO"
      >
        {/* Decorative top bar */}
        <div className="ceo-modal__topbar" />

        {/* Close button */}
        <button className="ceo-modal__close" onClick={handleClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="ceo-modal__body">
          {/* CEO avatar */}
          <div className="ceo-modal__avatar-wrap">
            <div className="ceo-modal__avatar">
              <span className="ceo-modal__avatar-initials">SM</span>
            </div>
            <div className="ceo-modal__badge">CEO &amp; Founder</div>
          </div>

          {/* Message */}
          <div className="ceo-modal__content">
            <div className="ceo-modal__logo">
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="10" fill="url(#ceo-grad)" />
                <path d="M24 14L34 22V34H14V22L24 14Z" stroke="white" strokeWidth="2" fill="none" />
                <defs>
                  <linearGradient id="ceo-grad" x1="0" y1="0" x2="48" y2="48">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
              </svg>
              <span>SiyaBusa ERP</span>
            </div>

            <h2 className="ceo-modal__title">Welcome to the family!</h2>
            <p className="ceo-modal__greeting">A personal message from Sibusiso Mavuso</p>

            <div className="ceo-modal__message">
              <p>
                Thank you for trusting SiyaBusa ERP with your business. This platform was built
                out of a deep belief that African businesses deserve world-class software —
                without the world-class price tag.
              </p>
              <p>
                Every feature you see was designed with real South African businesses in mind:
                SARS compliance, EFT payments, ZAR accounting, and the unique challenges of
                running a business on this continent.
              </p>
              <p>
                We're here to grow with you. Your success is our success.
              </p>
              <p className="ceo-modal__signature">
                — <strong>Sibusiso Mavuso</strong><br />
                <em>CEO &amp; Founder, SiyaBusa ERP</em>
              </p>
            </div>

            <div className="ceo-modal__actions">
              <button className="ceo-modal__btn ceo-modal__btn--primary" onClick={handleClose}>
                Let's Get Started 🚀
              </button>
              <a
                href="mailto:sibusiso@siyabusaerp.co.za?subject=Hello from a new user"
                className="ceo-modal__btn ceo-modal__btn--ghost"
                onClick={handleClose}
              >
                Reply to Sibusiso
              </a>
            </div>
          </div>
        </div>

        {/* Quote strip */}
        <div className="ceo-modal__quote">
          "Your business is complex. Managing it shouldn't be."
        </div>
      </div>
    </div>
  );
};

export default CeoWelcomeModal;
