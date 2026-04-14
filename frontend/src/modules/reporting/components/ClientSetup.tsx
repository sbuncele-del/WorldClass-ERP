/**
 * Client Setup - Create new engagement wizard
 * Step 1: Company details → Step 2: Framework & dates → Step 3: Review
 */

import { useState, useEffect } from 'react';
import { engagementApi, referenceApi } from '../services/reporting.api';

interface Props {
  onCreated: (id: string) => void;
}

interface Framework {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface WPType {
  id: string;
  name: string;
  price: number;
}

export default function ClientSetup({ onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [wpTypes, setWPTypes] = useState<WPType[]>([]);

  const [form, setForm] = useState({
    entity_name: '',
    trading_as: '',
    registration_number: '',
    tax_number: '',
    vat_number: '',
    legal_form: 'private_company',
    nature_of_business: '',
    financial_year_end: '',
    reporting_framework: 'ifrs_sme',
    working_paper_type: 'compilation',
    bankers: '',
    currency: 'ZAR',
    currency_rounding: 'decimals',
    cash_flow_method: 'indirect',
    soci_presentation: 'function',
    directors: [{ name: '', designation: '', is_active: true }],
  });

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [fwResult, wpResult] = await Promise.all([
        referenceApi.frameworks(),
        referenceApi.workingPaperTypes(),
      ]);
      if (fwResult.success) setFrameworks(fwResult.data as Framework[]);
      if (wpResult.success) setWPTypes(wpResult.data as WPType[]);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addDirector = () => {
    setForm(prev => ({
      ...prev,
      directors: [...prev.directors, { name: '', designation: '', is_active: true }],
    }));
  };

  const updateDirector = (index: number, field: string, value: string) => {
    setForm(prev => {
      const dirs = [...prev.directors];
      dirs[index] = { ...dirs[index], [field]: value };
      return { ...prev, directors: dirs };
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const result = await engagementApi.create(form as unknown as Record<string, unknown>);
      if (result.success && result.data) {
        onCreated((result.data as { id: string }).id);
      }
    } catch (error) {
      console.error('Error creating engagement:', error);
      alert('Failed to create client file. Please check all required fields.');
    } finally {
      setSaving(false);
    }
  };

  const legalFormOptions = [
    { value: 'private_company', label: 'Private Company' },
    { value: 'close_corporation', label: 'Close Corporation' },
    { value: 'sole_proprietor', label: 'Sole Proprietor' },
    { value: 'trust', label: 'Trust' },
    { value: 'npo', label: 'Non-Profit Organisation' },
    { value: 'npc', label: 'Non-Profit Company' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'body_corporate', label: 'Body Corporate' },
  ];

  return (
    <div className="client-setup">
      <div className="client-setup-header">
        <h2>New Client File</h2>
        <div className="setup-steps">
          <div className={`setup-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span> Company Details
          </div>
          <div className={`setup-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span> Framework & Dates
          </div>
          <div className={`setup-step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span> Review & Create
          </div>
        </div>
      </div>

      <div className="client-setup-body">
        {/* STEP 1: Company Details */}
        {step === 1 && (
          <div className="setup-section">
            <h3>Company Details</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Entity Name *</label>
                <input
                  type="text"
                  value={form.entity_name}
                  onChange={e => updateField('entity_name', e.target.value)}
                  placeholder="e.g. Koinage Engineering (PTY) LTD"
                />
              </div>

              <div className="form-group">
                <label>Trading As</label>
                <input
                  type="text"
                  value={form.trading_as}
                  onChange={e => updateField('trading_as', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Registration Number</label>
                <input
                  type="text"
                  value={form.registration_number}
                  onChange={e => updateField('registration_number', e.target.value)}
                  placeholder="e.g. 2019/596292/07"
                />
              </div>

              <div className="form-group">
                <label>Legal Form</label>
                <select
                  value={form.legal_form}
                  onChange={e => updateField('legal_form', e.target.value)}
                >
                  {legalFormOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tax Number</label>
                <input
                  type="text"
                  value={form.tax_number}
                  onChange={e => updateField('tax_number', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>VAT Number</label>
                <input
                  type="text"
                  value={form.vat_number}
                  onChange={e => updateField('vat_number', e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label>Nature of Business</label>
                <textarea
                  value={form.nature_of_business}
                  onChange={e => updateField('nature_of_business', e.target.value)}
                  placeholder="e.g. Provides operational experience in a mining production environment"
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>Bankers</label>
                <input
                  type="text"
                  value={form.bankers}
                  onChange={e => updateField('bankers', e.target.value)}
                  placeholder="e.g. FNB"
                />
              </div>
            </div>

            {/* Directors */}
            <h3 style={{ marginTop: '2rem' }}>Director(s) / Member(s)</h3>
            {form.directors.map((dir, i) => (
              <div key={i} className="form-grid director-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={dir.name}
                    onChange={e => updateDirector(i, 'name', e.target.value)}
                    placeholder="e.g. Jonathan Chama"
                  />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    value={dir.designation}
                    onChange={e => updateDirector(i, 'designation', e.target.value)}
                    placeholder="e.g. CFA"
                  />
                </div>
              </div>
            ))}
            <button className="btn-secondary" onClick={addDirector}>+ Add Director</button>

            <div className="setup-nav">
              <div />
              <button
                className="btn-primary"
                onClick={() => setStep(2)}
                disabled={!form.entity_name}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Framework & Dates */}
        {step === 2 && (
          <div className="setup-section">
            <h3>Reporting Framework</h3>
            <div className="framework-grid">
              {frameworks.map(fw => (
                <div
                  key={fw.id}
                  className={`framework-card ${form.reporting_framework === fw.id ? 'selected' : ''}`}
                  onClick={() => updateField('reporting_framework', fw.id)}
                >
                  <div className="framework-name">{fw.name}</div>
                  <div className="framework-desc">{fw.description}</div>
                </div>
              ))}
            </div>

            <h3>Working Paper Type</h3>
            <div className="framework-grid">
              {wpTypes.map(wp => (
                <div
                  key={wp.id}
                  className={`framework-card ${form.working_paper_type === wp.id ? 'selected' : ''}`}
                  onClick={() => updateField('working_paper_type', wp.id)}
                >
                  <div className="framework-name">{wp.name}</div>
                </div>
              ))}
            </div>

            <h3>Financial Year</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Financial Year End *</label>
                <input
                  type="date"
                  value={form.financial_year_end}
                  onChange={e => updateField('financial_year_end', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select
                  value={form.currency}
                  onChange={e => updateField('currency', e.target.value)}
                >
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cash Flow Method</label>
                <select
                  value={form.cash_flow_method}
                  onChange={e => updateField('cash_flow_method', e.target.value)}
                >
                  <option value="indirect">Indirect</option>
                  <option value="direct">Direct</option>
                </select>
              </div>
              <div className="form-group">
                <label>SoCI Presentation</label>
                <select
                  value={form.soci_presentation}
                  onChange={e => updateField('soci_presentation', e.target.value)}
                >
                  <option value="function">By Function</option>
                  <option value="nature">By Nature</option>
                </select>
              </div>
            </div>

            <div className="setup-nav">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button
                className="btn-primary"
                onClick={() => setStep(3)}
                disabled={!form.financial_year_end}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Create */}
        {step === 3 && (
          <div className="setup-section">
            <h3>Review & Create</h3>
            <div className="review-card">
              <div className="review-row">
                <span className="review-label">Entity:</span>
                <span className="review-value">{form.entity_name}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Registration:</span>
                <span className="review-value">{form.registration_number || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Legal Form:</span>
                <span className="review-value">
                  {legalFormOptions.find(o => o.value === form.legal_form)?.label}
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Year End:</span>
                <span className="review-value">{form.financial_year_end}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Framework:</span>
                <span className="review-value">
                  {frameworks.find(f => f.id === form.reporting_framework)?.name || form.reporting_framework}
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Working Paper:</span>
                <span className="review-value">
                  {wpTypes.find(w => w.id === form.working_paper_type)?.name || form.working_paper_type}
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Director(s):</span>
                <span className="review-value">
                  {form.directors.filter(d => d.name).map(d => `${d.name}${d.designation ? ` (${d.designation})` : ''}`).join(', ') || '—'}
                </span>
              </div>
            </div>

            <div className="setup-nav">
              <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button
                className="btn-primary btn-large"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Client File'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
