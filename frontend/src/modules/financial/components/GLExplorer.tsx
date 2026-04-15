import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet } from '../../../services/api.service';
import './GLExplorer.css';

/* ───────── Types ───────── */

interface GLTransaction {
  date: string;
  transaction_type: string;
  number: string;
  name: string;
  description: string;
  debit: number;
  credit: number;
  amount: number;
  balance: number;
}

interface GLAccount {
  account_code: string;
  account_name: string;
  account_type: string;
  is_debit_normal: boolean;
  beginning_balance: number;
  transactions: GLTransaction[];
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  transaction_count: number;
}

interface GLReportData {
  date_from: string;
  date_to: string;
  total_accounts: number;
  total_transactions: number;
  accounts: GLAccount[];
}

/* ───────── Component ───────── */

const GLExplorer: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState('2025-12-31');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<GLReportData | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);

  /* ── Data Fetching ── */

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const result = await apiGet<any>('/api/financial/gl-explorer/report?' + params);
      if (result.success && result.data) {
        setReportData(result.data);
        setExpandedAccounts(new Set(result.data.accounts.map((a: GLAccount) => a.account_code)));
      } else {
        setError('Failed to load report data');
      }
    } catch (err) {
      console.error('Error fetching GL report:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchReport(); }, []);

  /* ── Interactions ── */

  const toggleAccount = (code: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    if (!reportData) return;
    setExpandedAccounts(new Set(reportData.accounts.map(a => a.account_code)));
  };

  const collapseAll = () => setExpandedAccounts(new Set());

  /* ── Filtered list ── */

  const filteredAccounts = useMemo(() => {
    if (!reportData) return [];
    if (!searchText.trim()) return reportData.accounts;
    const lower = searchText.toLowerCase();
    return reportData.accounts.filter(a =>
      a.account_code.toLowerCase().includes(lower) ||
      a.account_name.toLowerCase().includes(lower)
    );
  }, [reportData, searchText]);

  /* ── Formatting helpers ── */

  const fmtCurrency = (amount: number) => {
    const abs = Math.abs(amount);
    const formatted = abs.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount < 0 ? '-R' + formatted : 'R' + formatted;
  };

  const fmtDate = (dateStr: string) => {
    if (!dateStr) return '\u2013';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fmtPeriod = () => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    if (from.getFullYear() === to.getFullYear() && from.getMonth() === 0 && to.getMonth() === 11) {
      return 'January \u2013 December, ' + from.getFullYear();
    }
    return months[from.getMonth()] + ' ' + from.getFullYear() + ' \u2013 ' + months[to.getMonth()] + ' ' + to.getFullYear();
  };

  const fmtTypeLabel = (type: string) => {
    return (type || 'Journal')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const getTypeColor = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('asset')) return '#10b981';
    if (t.includes('liab')) return '#ef4444';
    if (t.includes('equity')) return '#3b82f6';
    if (t.includes('revenue') || t.includes('income')) return '#22c55e';
    if (t.includes('expense') || t.includes('cost')) return '#f59e0b';
    return '#6b7280';
  };

  /* ── CSV Export ── */

  const exportCSV = () => {
    if (!reportData) return;
    const rows: string[] = [
      'Distribution Account,Transaction Date,Transaction Type,Number,Name,Memo/Description,Debit,Credit,Amount,Balance'
    ];

    reportData.accounts.forEach(acct => {
      rows.push('"' + acct.account_code + ' - ' + acct.account_name + '",,,,,"Beginning Balance",,,,' + acct.beginning_balance.toFixed(2));
      acct.transactions.forEach(txn => {
        rows.push(
          '"' + acct.account_name + '","' + txn.date + '","' + txn.transaction_type + '","' + txn.number + '","' + txn.name + '","' + txn.description + '",' + txn.debit.toFixed(2) + ',' + txn.credit.toFixed(2) + ',' + txn.amount.toFixed(2) + ',' + txn.balance.toFixed(2)
        );
      });
      rows.push('"Total for ' + acct.account_name + '",,,,,,' + acct.total_debits.toFixed(2) + ',' + acct.total_credits.toFixed(2) + ',,' + acct.closing_balance.toFixed(2));
      rows.push('');
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'general_ledger_' + dateFrom + '_to_' + dateTo + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  /* ───────── Render ───────── */

  return (
    <div className="gl-report">

      {/* Report Header */}
      <div className="gl-report-header">
        <div className="gl-report-title">
          <h1>General Ledger</h1>
          <p className="gl-company">Koinage Engineering (PTY) LTD</p>
          {reportData && <p className="gl-period">{fmtPeriod()}</p>}
        </div>
        <div className="gl-report-actions">
          <button className="gl-btn gl-btn-secondary" onClick={exportCSV} disabled={!reportData || loading}>
            Export CSV
          </button>
          <button className="gl-btn gl-btn-secondary" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="gl-controls">
        <div className="gl-date-controls">
          <div className="gl-date-group">
            <label>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="gl-date-group">
            <label>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button className="gl-btn gl-btn-primary" onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading...' : 'Run Report'}
          </button>
        </div>
        <div className="gl-filter-controls">
          <input
            type="text"
            placeholder="Filter accounts..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="gl-search-input"
          />
          <button className="gl-btn-link" onClick={expandAll}>Expand All</button>
          <button className="gl-btn-link" onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      {/* Summary Bar */}
      {reportData && !loading && (
        <div className="gl-summary-bar">
          <span><strong>{reportData.total_accounts}</strong> accounts</span>
          <span className="gl-dot">&bull;</span>
          <span><strong>{reportData.total_transactions.toLocaleString()}</strong> transactions</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="gl-error">
          <p>{error}</p>
          <button className="gl-btn gl-btn-primary" onClick={fetchReport}>Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="gl-loading">
          <div className="gl-spinner"></div>
          <p>Generating General Ledger...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && reportData && filteredAccounts.length === 0 && (
        <div className="gl-empty">
          <p>{searchText ? 'No accounts match your search.' : 'No posted transactions found in this period.'}</p>
        </div>
      )}

      {/* The GL Report Table */}
      {!loading && reportData && filteredAccounts.length > 0 && (
        <div className="gl-table-wrapper">
          <table className="gl-table">
            <thead>
              <tr>
                <th className="gl-col-account">Distribution Account</th>
                <th className="gl-col-date">Transaction Date</th>
                <th className="gl-col-type">Transaction Type</th>
                <th className="gl-col-number">Number</th>
                <th className="gl-col-name">Name</th>
                <th className="gl-col-desc">Memo / Description</th>
                <th className="gl-col-amount">Amount</th>
                <th className="gl-col-balance">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(account => {
                const isExpanded = expandedAccounts.has(account.account_code);
                return (
                  <React.Fragment key={account.account_code}>

                    {/* Account Group Header */}
                    <tr
                      className="gl-row-account-header"
                      onClick={() => toggleAccount(account.account_code)}
                    >
                      <td colSpan={8}>
                        <span className="gl-chevron">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                        <span
                          className="gl-type-dot"
                          style={{ background: getTypeColor(account.account_type) }}
                        />
                        <strong>{account.account_name}</strong>
                        <span className="gl-txn-count">
                          &nbsp;({account.transaction_count})
                        </span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <>
                        {/* Beginning Balance */}
                        <tr className="gl-row-beginning">
                          <td className="gl-indent-cell"></td>
                          <td colSpan={5} className="gl-bb-label">Beginning Balance</td>
                          <td className="gl-col-amount">&ndash;</td>
                          <td className="gl-col-balance gl-val">
                            {fmtCurrency(account.beginning_balance)}
                          </td>
                        </tr>

                        {/* Transactions */}
                        {account.transactions.map((txn, idx) => (
                          <tr
                            key={idx}
                            className={'gl-row-txn ' + (idx % 2 === 0 ? 'gl-row-even' : 'gl-row-odd')}
                          >
                            <td className="gl-col-account gl-indent-text">
                              {account.account_name}
                            </td>
                            <td className="gl-col-date">{fmtDate(txn.date)}</td>
                            <td className="gl-col-type">
                              <span className="gl-type-tag">{fmtTypeLabel(txn.transaction_type)}</span>
                            </td>
                            <td className="gl-col-number">{txn.number || '\u2013'}</td>
                            <td className="gl-col-name">{txn.name || '\u2013'}</td>
                            <td className="gl-col-desc" title={txn.description}>
                              {txn.description}
                            </td>
                            <td className={'gl-col-amount gl-val ' + (txn.amount < 0 ? 'gl-negative' : '')}>
                              {fmtCurrency(txn.amount)}
                            </td>
                            <td className="gl-col-balance gl-val">
                              {fmtCurrency(txn.balance)}
                            </td>
                          </tr>
                        ))}

                        {/* Account Total */}
                        <tr className="gl-row-total">
                          <td colSpan={6} className="gl-total-label">
                            <strong>Total for {account.account_name}</strong>
                          </td>
                          <td className="gl-col-amount gl-val">
                            <strong>{fmtCurrency(account.closing_balance - account.beginning_balance)}</strong>
                          </td>
                          <td className="gl-col-balance gl-val">
                            <strong>{fmtCurrency(account.closing_balance)}</strong>
                          </td>
                        </tr>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {reportData && !loading && (
        <div className="gl-footer">
          Accrual Basis &bull; {new Date().toLocaleDateString('en-ZA', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })} {new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
};

export default GLExplorer;
