/**
 * Disclosure Checklist - Track IFRS compliance requirements
 */

import { useState, useEffect } from 'react';
import { disclosureApi } from '../services/reporting.api';

interface Disclosure {
  id: string;
  standard_ref: string;
  section: string;
  detail: string | null;
  is_applicable: boolean;
  is_compliant: boolean | null;
  comments: string | null;
  sign_off: string | null;
}

interface Props {
  engagementId: string;
  isLocked: boolean;
}

export default function DisclosureChecklist({ engagementId, isLocked }: Props) {
  const [items, setItems] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisclosures();
  }, [engagementId]);

  const fetchDisclosures = async () => {
    try {
      setLoading(true);
      const result = await disclosureApi.list(engagementId);
      if (result.success) {
        setItems(result.data as Disclosure[]);
      }
    } catch (error) {
      console.error('Error fetching disclosures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, field: string, value: unknown) => {
    try {
      await disclosureApi.update(engagementId, id, { [field]: value });
      await fetchDisclosures();
    } catch (error) {
      console.error('Error updating disclosure:', error);
    }
  };

  if (loading) {
    return <div className="reporting-loading"><div className="reporting-spinner" /><p>Loading checklist...</p></div>;
  }

  const applicableCount = items.filter(i => i.is_applicable).length;
  const compliantCount = items.filter(i => i.is_applicable && i.is_compliant).length;

  return (
    <div className="disclosure-checklist">
      <div className="disclosure-header">
        <h3>Disclosure Checklist</h3>
        <div className="disclosure-summary">
          <span className="disclosure-stat">
            {compliantCount}/{applicableCount} compliant
          </span>
          <div className="disclosure-progress">
            <div
              className="disclosure-progress-bar"
              style={{ width: applicableCount > 0 ? `${(compliantCount / applicableCount) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      <table className="disclosure-table">
        <thead>
          <tr>
            <th>Statement</th>
            <th>Ref</th>
            <th>Detail</th>
            <th>Applicable</th>
            <th>Compliant</th>
            <th>Comments</th>
            <th>Sign-off</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className={item.is_applicable ? '' : 'not-applicable'}>
              <td>{item.section}</td>
              <td className="disclosure-ref">{item.standard_ref}</td>
              <td>{item.detail || '—'}</td>
              <td className="disclosure-check">
                <input
                  type="checkbox"
                  checked={item.is_applicable}
                  onChange={e => handleUpdate(item.id, 'is_applicable', e.target.checked)}
                  disabled={isLocked}
                />
              </td>
              <td className="disclosure-check">
                {item.is_applicable && (
                  <input
                    type="checkbox"
                    checked={item.is_compliant || false}
                    onChange={e => handleUpdate(item.id, 'is_compliant', e.target.checked)}
                    disabled={isLocked}
                  />
                )}
              </td>
              <td>
                <input
                  type="text"
                  className="disclosure-comment-input"
                  value={item.comments || ''}
                  onChange={e => handleUpdate(item.id, 'comments', e.target.value)}
                  disabled={isLocked}
                  placeholder="..."
                />
              </td>
              <td>
                <input
                  type="text"
                  className="disclosure-signoff-input"
                  value={item.sign_off || ''}
                  onChange={e => handleUpdate(item.id, 'sign_off', e.target.value)}
                  disabled={isLocked}
                  placeholder="Initials"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
