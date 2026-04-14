/**
 * Working Trial Balance - Core grid component
 * 
 * Inspired by Draftworx's trial balance grid but enhanced with:
 * - Inline link number editing with smart search
 * - Visual link status indicators  
 * - One-click import from Siyabusa GL, CSV, Sage, Xero
 * - Auto-link with smart matching
 * - Real-time balance validation
 */

import { useState, useEffect, useCallback } from 'react';
import { trialBalanceApi } from '../services/reporting.api';

interface AccountRow {
  id: string;
  account_code: string;
  account_name: string;
  link_number: string | null;
  link_description: string | null;
  category: string;
  fs_type: string;
  lead_schedule: string | null;
  wp_ref: string | null;
  opening_balance: number;
  transactions: number;
  adjustments: number;
  closing_balance: number;
  prior_year_balance: number;
  computed_closing: number;
  variance: number;
  is_linked: boolean;
  is_active: boolean;
}

interface Summary {
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  difference: number;
  account_count: number;
  linked_count: number;
  unlinked_count: number;
}

interface LinkOption {
  link_number: string;
  description: string;
  statement: string;
  section: string;
}

interface Props {
  engagementId: string;
  isLocked: boolean;
}

export default function WorkingTrialBalance({ engagementId, isLocked }: Props) {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([]);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);
  const [activeYear, setActiveYear] = useState<'current' | 'prior'>('current');

  const fetchTrialBalance = useCallback(async () => {
    try {
      setLoading(true);
      const result = await trialBalanceApi.get(engagementId);
      if (result.success && result.data) {
        const data = result.data as { rows: AccountRow[]; summary: Summary };
        setRows(data.rows);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching trial balance:', error);
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    fetchTrialBalance();
  }, [fetchTrialBalance]);

  const handleImportFromGL = async () => {
    setImporting(true);
    try {
      await trialBalanceApi.importFromGL(engagementId);
      await fetchTrialBalance();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import from GL failed. Ensure the entity has posted journal entries.');
    } finally {
      setImporting(false);
    }
  };

  const handleAutoLink = async () => {
    setAutoLinking(true);
    try {
      const result = await trialBalanceApi.autoLink(engagementId);
      if (result.success && result.data) {
        const data = result.data as { matched: number; total: number };
        alert(`Auto-linked ${data.matched} of ${data.total} unlinked accounts`);
        await fetchTrialBalance();
      }
    } catch (error) {
      console.error('Auto-link failed:', error);
    } finally {
      setAutoLinking(false);
    }
  };

  const handleLinkSearch = async (search: string) => {
    setLinkSearch(search);
    if (search.length < 2) {
      setLinkOptions([]);
      return;
    }
    try {
      const result = await trialBalanceApi.getAvailableLinks(engagementId, search);
      if (result.success) {
        setLinkOptions(result.data as LinkOption[]);
      }
    } catch (error) {
      console.error('Error searching links:', error);
    }
  };

  const handleSelectLink = async (accountCode: string, linkNumber: string) => {
    try {
      await trialBalanceApi.linkAccount(engagementId, accountCode, linkNumber);
      setEditingLink(null);
      setLinkSearch('');
      setLinkOptions([]);
      await fetchTrialBalance();
    } catch (error) {
      console.error('Error linking account:', error);
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());

      const codeIdx = header.findIndex(h => h.includes('code') || h.includes('account'));
      const nameIdx = header.findIndex(h => h.includes('name') || h.includes('description'));
      const balanceIdx = header.findIndex(h => h.includes('balance') || h.includes('closing') || h.includes('amount'));

      if (codeIdx === -1 || nameIdx === -1) {
        alert('CSV must have columns: account code, account name, and balance');
        return;
      }

      const accounts = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
        return {
          account_code: cols[codeIdx],
          account_name: cols[nameIdx],
          closing_balance: parseFloat(cols[balanceIdx]) || 0,
        };
      }).filter(a => a.account_code && a.account_name);

      await trialBalanceApi.bulkImport(engagementId, accounts, 'csv');
      await fetchTrialBalance();
    } catch (error) {
      console.error('CSV import failed:', error);
      alert('Failed to import CSV file');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const formatAmount = (amount: number): string => {
    if (Math.abs(amount) < 0.01) return '0.00';
    const formatted = Math.abs(amount).toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return amount < 0 ? `(${formatted})` : formatted;
  };

  if (loading) {
    return (
      <div className="reporting-loading">
        <div className="reporting-spinner" />
        <p>Loading trial balance...</p>
      </div>
    );
  }

  return (
    <div className="working-trial-balance">
      {/* Toolbar */}
      <div className="tb-toolbar">
        <div className="tb-toolbar-left">
          <div className="tb-year-toggle">
            <button
              className={`tb-year-btn ${activeYear === 'current' ? 'active' : ''}`}
              onClick={() => setActiveYear('current')}
            >
              Current Year
            </button>
            <button
              className={`tb-year-btn ${activeYear === 'prior' ? 'active' : ''}`}
              onClick={() => setActiveYear('prior')}
            >
              Prior Year
            </button>
          </div>
        </div>

        <div className="tb-toolbar-right">
          {!isLocked && (
            <>
              <button
                className="btn-action"
                onClick={handleImportFromGL}
                disabled={importing}
              >
                {importing ? 'Importing...' : '📥 Import from GL'}
              </button>

              <label className="btn-action">
                📁 Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  style={{ display: 'none' }}
                  disabled={importing}
                />
              </label>

              <button
                className="btn-action btn-smart"
                onClick={handleAutoLink}
                disabled={autoLinking}
              >
                {autoLinking ? 'Linking...' : '🔗 Smart Link'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      {summary && (
        <div className={`tb-summary ${summary.is_balanced ? 'balanced' : 'unbalanced'}`}>
          <div className="tb-summary-item">
            <span className="tb-summary-label">Total Debits</span>
            <span className="tb-summary-value">{formatAmount(summary.total_debits)}</span>
          </div>
          <div className="tb-summary-item">
            <span className="tb-summary-label">Total Credits</span>
            <span className="tb-summary-value">{formatAmount(summary.total_credits)}</span>
          </div>
          <div className="tb-summary-item">
            <span className="tb-summary-label">Difference</span>
            <span className={`tb-summary-value ${summary.is_balanced ? 'green' : 'red'}`}>
              {formatAmount(summary.difference)}
            </span>
          </div>
          <div className="tb-summary-item">
            <span className="tb-summary-label">Linked</span>
            <span className="tb-summary-value">
              {summary.linked_count}/{summary.account_count}
            </span>
          </div>
          <div className="tb-summary-item">
            <span className={`tb-balance-indicator ${summary.is_balanced ? 'balanced' : ''}`}>
              {summary.is_balanced ? '✓ Balanced' : '✗ Out of Balance'}
            </span>
          </div>
        </div>
      )}

      {/* Grid */}
      {rows.length === 0 ? (
        <div className="tb-empty">
          <div className="tb-empty-icon">📊</div>
          <h3>No accounts in trial balance</h3>
          <p>Import from Siyabusa GL, upload a CSV, or add accounts manually</p>
          <div className="tb-empty-actions">
            <button className="btn-primary" onClick={handleImportFromGL} disabled={importing}>
              📥 Import from Siyabusa GL
            </button>
            <label className="btn-secondary">
              📁 Upload CSV
              <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      ) : (
        <div className="tb-grid-container">
          <table className="tb-grid">
            <thead>
              <tr>
                <th className="tb-col-check" />
                <th className="tb-col-code">Account</th>
                <th className="tb-col-name">Name</th>
                <th className="tb-col-link">Link</th>
                <th className="tb-col-link-desc">Link Description</th>
                <th className="tb-col-category">Category</th>
                <th className="tb-col-type">Type</th>
                <th className="tb-col-wp">WP Ref</th>
                <th className="tb-col-amount">Opening Bal.</th>
                <th className="tb-col-amount">Transactions</th>
                <th className="tb-col-amount">Adjustments</th>
                <th className="tb-col-amount tb-col-closing">
                  {activeYear === 'current' ? 'Closing' : 'Prior Year'}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className={`tb-row ${row.is_linked ? '' : 'unlinked'}`}>
                  <td className="tb-col-check">
                    <span className={`link-indicator ${row.is_linked ? 'linked' : 'unlinked'}`}>
                      {row.is_linked ? '✓' : '○'}
                    </span>
                  </td>
                  <td className="tb-col-code">{row.account_code}</td>
                  <td className="tb-col-name">{row.account_name}</td>
                  <td className="tb-col-link">
                    {editingLink === row.account_code ? (
                      <div className="link-search-container">
                        <input
                          type="text"
                          className="link-search-input"
                          value={linkSearch}
                          onChange={e => handleLinkSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setEditingLink(null), 200)}
                          placeholder="Search link..."
                          autoFocus
                        />
                        {linkOptions.length > 0 && (
                          <div className="link-dropdown">
                            {linkOptions.map(opt => (
                              <div
                                key={opt.link_number}
                                className="link-option"
                                onMouseDown={() => handleSelectLink(row.account_code, opt.link_number)}
                              >
                                <span className="link-opt-number">{opt.link_number}</span>
                                <span className="link-opt-desc">{opt.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span
                        className={`link-cell ${!isLocked ? 'clickable' : ''}`}
                        onClick={() => !isLocked && setEditingLink(row.account_code)}
                      >
                        {row.link_number || '—'}
                      </span>
                    )}
                  </td>
                  <td className="tb-col-link-desc">{row.link_description || '—'}</td>
                  <td className="tb-col-category">
                    <span className={`category-badge cat-${row.fs_type}`}>
                      {row.fs_type === 'balance_sheet' ? 'BS' : 'IS'}
                    </span>
                  </td>
                  <td className="tb-col-type">{row.category.replace(/_/g, ' ')}</td>
                  <td className="tb-col-wp">{row.wp_ref || '—'}</td>
                  <td className="tb-col-amount">{formatAmount(row.opening_balance)}</td>
                  <td className="tb-col-amount">{formatAmount(row.transactions)}</td>
                  <td className="tb-col-amount">{formatAmount(row.adjustments)}</td>
                  <td className="tb-col-amount tb-col-closing">
                    {activeYear === 'current'
                      ? formatAmount(row.computed_closing)
                      : formatAmount(row.prior_year_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tb-totals-row">
                <td colSpan={8} className="tb-totals-label">Totals</td>
                <td className="tb-col-amount">
                  {formatAmount(rows.reduce((s, r) => s + r.opening_balance, 0))}
                </td>
                <td className="tb-col-amount">
                  {formatAmount(rows.reduce((s, r) => s + r.transactions, 0))}
                </td>
                <td className="tb-col-amount">
                  {formatAmount(rows.reduce((s, r) => s + r.adjustments, 0))}
                </td>
                <td className="tb-col-amount tb-col-closing">
                  {formatAmount(rows.reduce((s, r) => s + r.computed_closing, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
