/**
 * WaitlistForm — Inline founding member signup form
 * Used in Hero section and CTA section for lead capture
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface WaitlistFormProps {
  variant?: 'hero' | 'cta' | 'standalone';
  className?: string;
}

const WaitlistForm: React.FC<WaitlistFormProps> = ({ variant = 'standalone', className = '' }) => {
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/api/v1/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: variant === 'hero' ? 'hero-form' : variant === 'cta' ? 'cta-form' : 'standalone',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <motion.div
        className={`waitlist-form waitlist-success ${variant} ${className}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <CheckCircle size={32} style={{ color: '#00D4AA' }} />
        <h3 style={{ margin: '12px 0 4px', color: variant === 'cta' ? '#fff' : 'inherit' }}>
          You're on the list!
        </h3>
        <p style={{ opacity: 0.8, color: variant === 'cta' ? '#ccc' : '#666' }}>
          Check your inbox — we've sent you a welcome email with what's next.
        </p>
      </motion.div>
    );
  }

  const isCompact = variant === 'hero';

  return (
    <motion.form
      className={`waitlist-form ${variant} ${className}`}
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {!isCompact && (
        <div className="waitlist-form-header">
          <h3>Join the Founding 50</h3>
          <p>R1,499/mo — all modules, 10 users. Price locked for 12 months.</p>
        </div>
      )}

      <div className={`waitlist-fields ${isCompact ? 'waitlist-fields-inline' : ''}`}>
        <input
          type="text"
          placeholder="Your name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          className="waitlist-input"
        />
        <input
          type="email"
          placeholder="Work email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
          className="waitlist-input"
        />
        {!isCompact && (
          <input
            type="text"
            placeholder="Company name (optional)"
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            className="waitlist-input"
          />
        )}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-primary waitlist-submit"
        >
          {status === 'loading' ? (
            <Loader2 size={18} className="spin-icon" />
          ) : (
            <>
              {isCompact ? 'Join Waitlist' : 'Claim Your Founding Spot'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {status === 'error' && (
          <motion.div
            className="waitlist-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AlertCircle size={14} /> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="waitlist-note">
        14-day free trial · No credit card · Cancel anytime
      </p>
    </motion.form>
  );
};

export default WaitlistForm;
