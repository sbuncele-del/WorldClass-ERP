import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../../services/api.service';
import './GLExplorer.css';

interface Account {
  code: string;
  name: string;
  account_type: string;
}

interface AccountSummary {
  account_code: string;
  account_name: string;
  account_type: string;
  total_debits: number;
  total_credits: number;
  balance: number;
  entry_count: number;
}

interface AccountLedgerEntry {
  journal_entry_id: string;
  entry_number: string;
  journal_date: string;
  description: string;
  source_type: string;
  source_document_number: string;
  line_description: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
}

interface FilterOptions {
  accounts: Account[];
  cost_centers: string[];
  project_codes: string[];
  departments: string[];
  source_types: string[];
  statuses: string[];
}

interface JournalLine {
  id: string;
  line_number: number;
  account_code: string;
  account_name: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  cost_center?: string;
  project_code?: string;
  department?: string;
}

interface JournalEntry {
  id: string;
  journal_number: string;
  journal_date: string;
  description: string;
  source_type: string;
  status: string;
  lines: JournalLine[];
}

interface SearchFilters {
  account_codes: string[];
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
  search_text: string;
  source_types: string[];
  statuses: string[];
  cost_centers: string[];
  posted_only: boolean;
}

const GLExplorer: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'search' | 'tree' | 'drill'>('tree');
  const [filters, setFilters] = useState<SearchFilters>({
    account_codes: [],
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: '',
    search_text: '',
    source_types: [],
    statuses: [],
    cost_centers: [],
    posted_only: false
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 0 });

  // Account Tree state
  const [accountSummaries, setAccountSummaries] = useState<AccountSummary[]>([]);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['asset', 'liability', 'equity', 'revenue', 'expense']));
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null);
  const [accountLedger, setAccountLedger] = useState<AccountLedgerEntry[]>([]);
  const [accountLedgerInfo, setAccountLedgerInfo] = useState<{ opening_balance: number; closing_balance: number } | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
    fetchAccountSummaries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccountSummaries = async () => {
    setLoadingTree(true);
    try {
      const result = await apiGet<any>('/api/financial/gl-explorer/account-summary');
      if (result.success) {
        setAccountSummaries(result.data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching account summaries:', error);
    } finally {
      setLoadingTree(false);
    }
  };

  const fetchAccountLedger = async (accountCode: string) => {
    setLoadingLedger(true);
    try {
      const result = await apiGet<any>(`/api/financial/gl-explorer/account-ledger/${accountCode}`);
      if (result.success) {
        setAccountLedger(result.data.transactions || []);
        setAccountLedgerInfo({
          opening_balance: result.data.opening_balance || 0,
          closing_balance: result.data.closing_balance || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching account ledger:', error);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleAccountClick = (account: AccountSummary) => {
    setSelectedAccount(account);
    setView('drill');
    fetchAccountLedger(account.account_code);
  };

  const handleBackToTree = () => {
    setSelectedAccount(null);
    setAccountLedger([]);
    setAccountLedgerInfo(null);
    setView('tree');
  };

  const toggleAccountType = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const fetchFilterOptions = async () => {
    try {
      const result = await apiGet<any>('/api/financial/gl-explorer/filter-options');
      if (result.success) {
        setFilterOptions(result.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleSearch = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.account_codes.length > 0) {
        filters.account_codes.forEach(code => params.append('account_codes', code));
      }
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.amount_min) params.append('amount_min', filters.amount_min);
      if (filters.amount_max) params.append('amount_max', filters.amount_max);
      if (filters.search_text) params.append('search_text', filters.search_text);
      if (filters.source_types.length > 0) {
        filters.source_types.forEach(type => params.append('source_types', type));
      }
      if (filters.statuses.length > 0) {
        filters.statuses.forEach(status => params.append('statuses', status));
      }
      if (filters.cost_centers.length > 0) {
        filters.cost_centers.forEach(cc => params.append('cost_centers', cc));
      }
      if (filters.posted_only) params.append('posted_only', 'true');
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/financial/gl-explorer/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || '',
          'X-Entity-ID': localStorage.getItem('currentEntityId') || localStorage.getItem('entityId') || '',
        }
      });
      const result = await response.json();

      if (result.success) {
        setEntries(result.data.entries);
        setPagination(result.data.pagination);
      }
    } catch (error) {
      console.error('Error searching GL:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEntry = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const handleFilterChange = (field: keyof SearchFilters, value: string | string[] | boolean) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      account_codes: [],
      date_from: '',
      date_to: '',
      amount_min: '',
      amount_max: '',
      search_text: '',
      source_types: [],
      statuses: [],
      cost_centers: [],
      posted_only: false
    });
  };

  const exportToCSV = () => {
    let csv = 'Journal Number,Date,Account Code,Account Name,Description,Debit,Credit,Status\n';
    
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        csv += `"${entry.journal_number}","${entry.journal_date}","${line.account_code}","${line.account_name}","${line.description}",${line.debit_amount},${line.credit_amount},"${entry.status}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gl_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'POSTED': return 'status-posted';
      case 'APPROVED': return 'status-approved';
      case 'PENDING_APPROVAL': return 'status-pending';
      case 'DRAFT': return 'status-draft';
      case 'REJECTED': return 'status-rejected';
      default: return 'status-default';
    }
  };

  return (
    <div className="gl-explorer">
      {/* Header */}
      <div className="gle-header">
        <div>
          <h1>GL Explorer</h1>
          <p className="gle-subtitle">Advanced General Ledger search and analysis</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-toggle-filters">
            {showFilters ? '🔍 Hide Filters' : '🔍 Show Filters'}
          </button>
          <button onClick={exportToCSV} className="btn-export" disabled={entries.length === 0}>
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        <button 
          className={`tab ${view === 'search' ? 'active' : ''}`}
          onClick={() => setView('search')}
        >
          🔍 Search & Filter
        </button>
        <button 
          className={`tab ${view === 'tree' ? 'active' : ''}`}
          onClick={() => setView('tree')}
        >
          🌳 Account Tree
        </button>
      </div>

      {/* Search View */}
      {view === 'search' && (
        <div className="search-view">
          {/* Filters Panel */}
          {showFilters && (
            <div className="filters-panel">
              <div className="filters-header">
                <h3>Filters</h3>
                <button onClick={clearFilters} className="btn-clear">Clear All</button>
              </div>

              <div className="filters-grid">
                {/* Text Search */}
                <div className="filter-group full-width">
                  <label>Search Text</label>
                  <input
                    type="text"
                    placeholder="Search description, reference, notes..."
                    value={filters.search_text}
                    onChange={(e) => handleFilterChange('search_text', e.target.value)}
                  />
                </div>

                {/* Date Range */}
                <div className="filter-group">
                  <label>Date From</label>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label>Date To</label>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
                </div>

                {/* Amount Range */}
                <div className="filter-group">
                  <label>Amount Min</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filters.amount_min}
                    onChange={(e) => handleFilterChange('amount_min', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label>Amount Max</label>
                  <input
                    type="number"
                    placeholder="999999.99"
                    value={filters.amount_max}
                    onChange={(e) => handleFilterChange('amount_max', e.target.value)}
                  />
                </div>

                {/* Account Selection */}
                <div className="filter-group">
                  <label>Accounts</label>
                  <select
                    multiple
                    value={filters.account_codes}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('account_codes', selected);
                    }}
                    size={5}
                  >
                    {filterOptions?.accounts.map(acc => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Types */}
                <div className="filter-group">
                  <label>Source Type</label>
                  <select
                    multiple
                    value={filters.source_types}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('source_types', selected);
                    }}
                    size={5}
                  >
                    {filterOptions?.source_types.map(type => (
                      <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="filter-group">
                  <label>Status</label>
                  <select
                    multiple
                    value={filters.statuses}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('statuses', selected);
                    }}
                    size={5}
                  >
                    {filterOptions?.statuses.map(status => (
                      <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Cost Centers */}
                <div className="filter-group">
                  <label>Cost Centers</label>
                  <select
                    multiple
                    value={filters.cost_centers}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('cost_centers', selected);
                    }}
                    size={5}
                  >
                    {filterOptions?.cost_centers.map(cc => (
                      <option key={cc} value={cc}>{cc}</option>
                    ))}
                  </select>
                </div>

                {/* Posted Only */}
                <div className="filter-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.posted_only}
                      onChange={(e) => handleFilterChange('posted_only', e.target.checked)}
                    />
                    Posted entries only
                  </label>
                </div>
              </div>

              <div className="filters-actions">
                <button onClick={() => handleSearch(1)} className="btn-search" disabled={loading}>
                  {loading ? 'Searching...' : '🔍 Search'}
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="results-section">
            <div className="results-header">
              <h3>Results ({pagination.total} entries found)</h3>
              <div className="results-info">
                Page {pagination.page} of {pagination.total_pages}
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Searching...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No entries found</h3>
                <p>Try adjusting your filters to see results</p>
              </div>
            ) : (
              <>
                <div className="entries-list">
                  {entries.map(entry => (
                    <div key={entry.id} className="entry-card">
                      <div 
                        className="entry-header"
                        onClick={() => toggleEntry(entry.id)}
                      >
                        <div className="entry-main">
                          <span className="journal-number">{entry.journal_number}</span>
                          <span className="journal-date">{formatDate(entry.journal_date)}</span>
                          <span className={`status-badge ${getStatusBadgeClass(entry.status)}`}>
                            {entry.status}
                          </span>
                        </div>
                        <div className="entry-description">{entry.description}</div>
                        <div className="entry-meta">
                          <span>Source: {entry.source_type.replace(/_/g, ' ')}</span>
                          <span>{entry.lines.length} line{entry.lines.length !== 1 ? 's' : ''}</span>
                          <span className="expand-icon">
                            {expandedEntries.has(entry.id) ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>

                      {expandedEntries.has(entry.id) && (
                        <div className="entry-lines">
                          <table>
                            <thead>
                              <tr>
                                <th>Line</th>
                                <th>Account</th>
                                <th>Description</th>
                                <th className="amount-col">Debit</th>
                                <th className="amount-col">Credit</th>
                                <th>Dimensions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entry.lines.map(line => (
                                <tr key={line.id}>
                                  <td>{line.line_number}</td>
                                  <td>
                                    <div className="account-cell">
                                      <div className="account-code">{line.account_code}</div>
                                      <div className="account-name">{line.account_name}</div>
                                    </div>
                                  </td>
                                  <td>{line.description}</td>
                                  <td className="amount-col debit">
                                    {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                                  </td>
                                  <td className="amount-col credit">
                                    {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                                  </td>
                                  <td className="dimensions-cell">
                                    {line.cost_center && <span className="dim-badge">CC: {line.cost_center}</span>}
                                    {line.project_code && <span className="dim-badge">Proj: {line.project_code}</span>}
                                    {line.department && <span className="dim-badge">Dept: {line.department}</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="pagination">
                    <button 
                      onClick={() => handleSearch(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="btn-page"
                    >
                      ← Previous
                    </button>
                    <span className="page-info">
                      Page {pagination.page} of {pagination.total_pages}
                    </span>
                    <button 
                      onClick={() => handleSearch(pagination.page + 1)}
                      disabled={pagination.page === pagination.total_pages}
                      className="btn-page"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Account Tree View */}
      {view === 'tree' && (
        <div className="tree-view">
          {loadingTree ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading accounts...</p>
            </div>
          ) : (
            <div className="account-tree">
              <div className="tree-header">
                <h3>Chart of Accounts — General Ledger</h3>
                <p className="tree-subtitle">Click any account to view its detailed transaction ledger</p>
              </div>
              {['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => {
                const typeAccounts = accountSummaries.filter(a => 
                  a.account_type?.toLowerCase() === type
                );
                if (typeAccounts.length === 0) return null;
                
                const typeLabels: Record<string, string> = {
                  asset: '📊 ASSETS', liability: '📋 LIABILITIES', equity: '🏛️ EQUITY',
                  revenue: '💰 REVENUE', expense: '💳 EXPENSES'
                };
                const typeColors: Record<string, string> = {
                  asset: '#10b981', liability: '#ef4444', equity: '#3b82f6',
                  revenue: '#22c55e', expense: '#f59e0b'
                };
                const typeTotalBalance = typeAccounts.reduce((sum, a) => sum + parseFloat(String(a.balance || 0)), 0);

                return (
                  <div key={type} className="account-type-group">
                    <div className="type-header" onClick={() => toggleAccountType(type)}
                      style={{ borderLeftColor: typeColors[type] }}>
                      <div className="type-label">
                        <span className="expand-arrow">{expandedTypes.has(type) ? '▼' : '▶'}</span>
                        <span>{typeLabels[type] || type.toUpperCase()}</span>
                      </div>
                      <div className="type-balance" style={{ color: typeColors[type] }}>
                        {formatCurrency(typeTotalBalance)}
                      </div>
                    </div>
                    {expandedTypes.has(type) && (
                      <div className="type-accounts">
                        {typeAccounts.map(account => (
                          <div key={account.account_code} className="account-row"
                            onClick={() => handleAccountClick(account)}>
                            <div className="account-info">
                              <span className="acct-code">{account.account_code}</span>
                              <span className="acct-name">{account.account_name}</span>
                              {parseInt(String(account.entry_count)) > 0 && (
                                <span className="entry-count">{account.entry_count} entries</span>
                              )}
                            </div>
                            <div className="account-amounts">
                              <span className="acct-debit">Dr: {formatCurrency(parseFloat(String(account.total_debits || 0)))}</span>
                              <span className="acct-credit">Cr: {formatCurrency(parseFloat(String(account.total_credits || 0)))}</span>
                              <span className="acct-balance" style={{ 
                                color: parseFloat(String(account.balance || 0)) >= 0 ? '#10b981' : '#ef4444',
                                fontWeight: 'bold'
                              }}>
                                {formatCurrency(parseFloat(String(account.balance || 0)))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Drill-Down View (Account Ledger) */}
      {view === 'drill' && selectedAccount && (
        <div className="drill-view">
          <div className="drill-header">
            <button onClick={handleBackToTree} className="btn-back">← Back to Accounts</button>
            <div className="drill-account-info">
              <h2>{selectedAccount.account_code} — {selectedAccount.account_name}</h2>
              <span className="drill-type">{selectedAccount.account_type}</span>
            </div>
          </div>

          {accountLedgerInfo && (
            <div className="drill-summary">
              <div className="summary-card">
                <label>Opening Balance</label>
                <span>{formatCurrency(accountLedgerInfo.opening_balance)}</span>
              </div>
              <div className="summary-card">
                <label>Total Debits</label>
                <span style={{ color: '#10b981' }}>{formatCurrency(parseFloat(String(selectedAccount.total_debits || 0)))}</span>
              </div>
              <div className="summary-card">
                <label>Total Credits</label>
                <span style={{ color: '#ef4444' }}>{formatCurrency(parseFloat(String(selectedAccount.total_credits || 0)))}</span>
              </div>
              <div className="summary-card highlight">
                <label>Closing Balance</label>
                <span>{formatCurrency(accountLedgerInfo.closing_balance)}</span>
              </div>
            </div>
          )}

          {loadingLedger ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading transactions...</p>
            </div>
          ) : accountLedger.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No transactions</h3>
              <p>No posted journal entries found for this account</p>
            </div>
          ) : (
            <div className="drill-table-container">
              <table className="drill-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entry #</th>
                    <th>Description</th>
                    <th>Source</th>
                    <th className="amount-col">Debit</th>
                    <th className="amount-col">Credit</th>
                    <th className="amount-col">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accountLedger.map((entry, idx) => (
                    <tr key={`${entry.journal_entry_id}-${idx}`}>
                      <td>{formatDate(entry.journal_date)}</td>
                      <td className="entry-num">{entry.entry_number}</td>
                      <td>{entry.line_description || entry.description}</td>
                      <td><span className="source-badge">{(entry.source_type || '').replace(/_/g, ' ')}</span></td>
                      <td className="amount-col debit">
                        {parseFloat(String(entry.debit_amount || 0)) > 0 ? formatCurrency(parseFloat(String(entry.debit_amount))) : '-'}
                      </td>
                      <td className="amount-col credit">
                        {parseFloat(String(entry.credit_amount || 0)) > 0 ? formatCurrency(parseFloat(String(entry.credit_amount))) : '-'}
                      </td>
                      <td className="amount-col balance" style={{ 
                        color: parseFloat(String(entry.running_balance || 0)) >= 0 ? '#10b981' : '#ef4444',
                        fontWeight: 'bold'
                      }}>
                        {formatCurrency(parseFloat(String(entry.running_balance || 0)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GLExplorer;
