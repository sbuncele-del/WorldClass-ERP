/**
 * Payment Checkout Modal
 * Lets the user choose PayPal, Direct EFT, or Crypto
 * then handles the flow for each.
 */

import { useState, useEffect } from 'react';
import type { SubscriptionPlan } from '../../services/billing.service';
import billingService from '../../services/billing.service';
import './PaymentCheckoutModal.css';

interface PaymentCheckoutModalProps {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  onClose: () => void;
  onSuccess: () => void;
}

type Gateway = 'paypal' | 'eft' | 'crypto';

interface SupportedCoin {
  id: string;
  name: string;
  symbol: string;
  icon: string;
}

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  swiftCode: string;
  paymentReference: string;
  expiresAt: string;
}

interface CheckoutResult {
  gateway: Gateway;
  paymentUrl?: string;
  transactionReference: string;
  amount: number;
  currency: string;
  bankDetails?: BankDetails;
  orderId?: string;
  paymentId?: string;
  payCurrency?: string;
}

const formatZAR = (amount: number) =>
  `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

const GATEWAY_INFO = {
  paypal: {
    label: 'PayPal',
    description: 'Pay securely with your PayPal account or any card',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="#003087">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.26-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.477z" />
      </svg>
    ),
  },
  eft: {
    label: 'Direct EFT',
    description: 'Bank transfer to our SA bank account (manual confirmation within 1 business day)',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#16a34a" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4M14 15h4" strokeLinecap="round" />
      </svg>
    ),
  },
  crypto: {
    label: 'Cryptocurrency',
    description: 'Pay with Bitcoin, Ethereum, USDT, or 200+ other coins via NOWPayments',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#f59e0b" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9 9h4.5a2.5 2.5 0 0 1 0 5H9m0-5v10m0-5h5.5a2.5 2.5 0 0 1 0 5H9" strokeLinecap="round" />
      </svg>
    ),
  },
};

const PaymentCheckoutModal = ({ plan, billingCycle, onClose, onSuccess }: PaymentCheckoutModalProps) => {
  const [step, setStep] = useState<'select' | 'eft-details' | 'eft-proof' | 'crypto-coin' | 'processing'>('select');
  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [coins, setCoins] = useState<SupportedCoin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<string>('usdt');
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [popRef, setPopRef] = useState('');
  const [popNotes, setPopNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const cycleKey = billingCycle === 'yearly' ? 'annual' : 'monthly';
  const amount = billingCycle === 'yearly' ? plan.price * 10 : plan.price; // yearly = 10 months

  useEffect(() => {
    // Load supported coins
    billingService.getSupportedCryptos().then(setCoins).catch(() => {});
  }, []);

  const handleSelectGateway = async (gw: Gateway) => {
    setGateway(gw);
    setError('');

    if (gw === 'crypto') {
      setStep('crypto-coin');
      return;
    }

    if (gw === 'eft') {
      await startCheckout(gw);
      return;
    }

    // PayPal – redirect immediately
    await startCheckout(gw);
  };

  const startCheckout = async (gw: Gateway, payCurrency?: string) => {
    setLoading(true);
    setError('');
    setStep('processing');
    try {
      const data = await billingService.createPaymentSession({
        plan: plan.id,
        billingCycle: cycleKey,
        paymentMethod: gw,
        ...(payCurrency ? { payCurrency } : {}),
      });

      setResult(data);

      if (gw === 'paypal' && data.paymentUrl) {
        // Redirect to PayPal
        window.location.href = data.paymentUrl;
        return;
      }

      if (gw === 'eft') {
        setStep('eft-details');
        return;
      }

      if (gw === 'crypto' && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Payment setup failed');
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const handleCoinSelect = async () => {
    await startCheckout('crypto', selectedCoin);
  };

  const handleSubmitProof = async () => {
    if (!result) return;
    setLoading(true);
    setError('');
    try {
      await billingService.submitEFTProof({
        transactionReference: result.transactionReference,
        popReference: popRef,
        notes: popNotes,
      });
      setStep('eft-proof');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit proof');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const bank = result?.bankDetails;

  return (
    <div className="pco-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pco-modal">
        <div className="pco-header">
          <div>
            <h2>Complete Payment</h2>
            <p className="pco-subtitle">
              {plan.name} Plan · {billingCycle === 'yearly' ? 'Annual' : 'Monthly'} ·{' '}
              <strong>{formatZAR(amount)}</strong>
            </p>
          </div>
          <button className="pco-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="pco-error">{error}</div>}

        {/* Step: Select gateway */}
        {step === 'select' && (
          <div className="pco-step">
            <p className="pco-step-label">Choose a payment method:</p>
            <div className="pco-gateways">
              {(Object.keys(GATEWAY_INFO) as Gateway[]).map((gw) => (
                <button
                  key={gw}
                  className={`pco-gateway-btn ${gateway === gw ? 'selected' : ''}`}
                  onClick={() => handleSelectGateway(gw)}
                  disabled={loading}
                >
                  <span className="pco-gw-icon">{GATEWAY_INFO[gw].icon}</span>
                  <span className="pco-gw-info">
                    <strong>{GATEWAY_INFO[gw].label}</strong>
                    <span>{GATEWAY_INFO[gw].description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Select crypto coin */}
        {step === 'crypto-coin' && (
          <div className="pco-step">
            <p className="pco-step-label">Select cryptocurrency:</p>
            <div className="pco-coins">
              {coins.map((coin) => (
                <button
                  key={coin.id}
                  className={`pco-coin-btn ${selectedCoin === coin.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCoin(coin.id)}
                >
                  <span className="pco-coin-icon">{coin.icon}</span>
                  <span>{coin.name}</span>
                  <span className="pco-coin-symbol">{coin.symbol}</span>
                </button>
              ))}
            </div>
            <div className="pco-actions">
              <button className="pco-btn-secondary" onClick={() => setStep('select')}>Back</button>
              <button className="pco-btn-primary" onClick={handleCoinSelect} disabled={loading}>
                {loading ? 'Creating payment…' : `Pay with ${selectedCoin.toUpperCase()}`}
              </button>
            </div>
          </div>
        )}

        {/* Step: Processing / redirecting */}
        {step === 'processing' && (
          <div className="pco-step pco-center">
            <div className="pco-spinner" />
            <p>Setting up your payment, please wait…</p>
          </div>
        )}

        {/* Step: EFT bank details */}
        {step === 'eft-details' && bank && (
          <div className="pco-step">
            <div className="pco-eft-notice">
              Make an EFT to the account below using the reference shown. Once done, enter your bank's
              reference number and click <strong>Submit Proof</strong>. We'll confirm within 1 business day.
            </div>

            <div className="pco-bank-details">
              {[
                ['Bank', bank.bankName],
                ['Account Name', bank.accountName],
                ['Account Number', bank.accountNumber],
                ['Branch Code', bank.branchCode],
                ['Account Type', bank.accountType],
                ['SWIFT Code', bank.swiftCode],
                ['Your Reference', bank.paymentReference],
                ['Amount', formatZAR(result!.amount)],
              ].map(([label, value]) => (
                <div key={label} className="pco-bank-row">
                  <span className="pco-bank-label">{label}</span>
                  <span className="pco-bank-value">
                    {value}
                    <button
                      className="pco-copy-btn"
                      onClick={() => copyToClipboard(value, label)}
                      title="Copy"
                    >
                      {copied === label ? '✓' : '⎘'}
                    </button>
                  </span>
                </div>
              ))}
            </div>

            <div className="pco-proof-section">
              <label>Your bank's transaction / reference number <span className="pco-optional">(optional)</span></label>
              <input
                className="pco-input"
                placeholder="e.g. FNB20250507123456"
                value={popRef}
                onChange={(e) => setPopRef(e.target.value)}
              />
              <label style={{ marginTop: '0.5rem' }}>Notes</label>
              <textarea
                className="pco-input"
                placeholder="Any additional info for our team"
                rows={2}
                value={popNotes}
                onChange={(e) => setPopNotes(e.target.value)}
              />
            </div>

            <div className="pco-actions">
              <button className="pco-btn-secondary" onClick={onClose}>I'll do this later</button>
              <button className="pco-btn-primary" onClick={handleSubmitProof} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Proof of Payment'}
              </button>
            </div>
          </div>
        )}

        {/* Step: EFT proof submitted confirmation */}
        {step === 'eft-proof' && (
          <div className="pco-step pco-center">
            <div className="pco-success-icon">✓</div>
            <h3>Proof Submitted!</h3>
            <p>
              We've received your proof of payment for reference{' '}
              <strong>{result?.transactionReference}</strong>.
              <br />
              Your subscription will be activated within 1 business day after we confirm receipt.
            </p>
            <button className="pco-btn-primary" onClick={() => { onSuccess(); onClose(); }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCheckoutModal;
