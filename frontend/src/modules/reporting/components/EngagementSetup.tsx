/**
 * Engagement Setup - Edit client details within the workspace
 */

import { useState } from 'react';
import { engagementApi } from '../services/reporting.api';

interface Props {
  engagement: Record<string, unknown>;
  isLocked: boolean;
  onUpdated: () => void;
}

export default function EngagementSetup({ engagement, isLocked, onUpdated }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...engagement });

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await engagementApi.update(engagement.id as string, form as Record<string, unknown>);
      onUpdated();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="engagement-setup">
      <div className="setup-section">
        <h3>Quick Settings</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Entity Name</label>
            <input
              type="text"
              value={(form.entity_name as string) || ''}
              onChange={e => updateField('entity_name', e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="form-group">
            <label>Engagement Label</label>
            <input
              type="text"
              value={(form.engagement_label as string) || ''}
              onChange={e => updateField('engagement_label', e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="form-group">
            <label>Registration Number</label>
            <input
              type="text"
              value={(form.registration_number as string) || ''}
              onChange={e => updateField('registration_number', e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="form-group">
            <label>Legal Form</label>
            <select
              value={(form.legal_form as string) || 'private_company'}
              onChange={e => updateField('legal_form', e.target.value)}
              disabled={isLocked}
            >
              <option value="private_company">Private Company</option>
              <option value="close_corporation">Close Corporation</option>
              <option value="sole_proprietor">Sole Proprietor</option>
              <option value="trust">Trust</option>
              <option value="npo">NPO</option>
              <option value="npc">NPC</option>
              <option value="partnership">Partnership</option>
              <option value="body_corporate">Body Corporate</option>
            </select>
          </div>
          <div className="form-group">
            <label>Financial Year End</label>
            <input
              type="date"
              value={(form.financial_year_end as string)?.split('T')[0] || ''}
              onChange={e => updateField('financial_year_end', e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="form-group">
            <label>FS Approval Date</label>
            <input
              type="date"
              value={(form.financial_statements_approval_date as string)?.split('T')[0] || ''}
              onChange={e => updateField('financial_statements_approval_date', e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="form-group">
            <label>Bankers</label>
            <input
              type="text"
              value={(form.bankers as string) || ''}
              onChange={e => updateField('bankers', e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className="form-group full-width">
            <label>Nature of Business</label>
            <textarea
              value={(form.nature_of_business as string) || ''}
              onChange={e => updateField('nature_of_business', e.target.value)}
              disabled={isLocked}
              rows={3}
            />
          </div>
        </div>

        {!isLocked && (
          <div className="setup-save">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
