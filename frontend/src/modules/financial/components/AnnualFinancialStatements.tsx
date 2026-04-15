import React, { useState, useCallback } from 'react';
import { apiGet } from '../../../services/api.service';
import './AnnualFinancialStatements.css';

/* ───────── Types ───────── */

interface CompanyInfo {
  name: string;
  registration: string;
  nature: string;
  director: string;
  registered_office: string;
  bankers: string;
  preparer: string;
  year_end: string;
}

interface AFSData {
  company: CompanyInfo;
  year: number;
  prior_year: number;
  statements: {
    financial_position: any;
    comprehensive_income: any;
    changes_in_equity: any;
    cash_flows: any;
  };
  notes: any;
  detailed_income_statement: any;
}

/* ───────── Helpers ───────── */

const fmt = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(n)) return '-';
  if (n === 0) return '-';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `(${formatted})` : formatted;
};

const fmtNote = (ref: string) => <span className="afs-note-ref">{ref}</span>;

/* ───────── Component ───────── */

export default function AnnualFinancialStatements() {
  const [data, setData] = useState<AFSData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [year, setYear] = useState(2025);
  const [activeTab, setActiveTab] = useState<string>('position');

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiGet<any>(`/api/financial/afs/generate?year=${year}`);
      if (result?.data) {
        setData(result.data);
      } else if (result?.success && result?.data) {
        setData(result.data);
      } else {
        setError('No data returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  }, [year]);

  const handlePrint = () => window.print();

  if (!data && !loading) {
    return (
      <div className="afs-container">
        <div className="afs-generate-panel">
          <h1>Annual Financial Statements</h1>
          <p>Generate IFRS for SMEs compliant financial statements</p>
          <div className="afs-generate-controls">
            <label>Financial Year Ending:</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}>
              <option value={2025}>31 December 2025</option>
              <option value={2024}>31 December 2024</option>
            </select>
            <button className="afs-btn-primary" onClick={generate}>
              Generate Financial Statements
            </button>
          </div>
          {error && <div className="afs-error">{error}</div>}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="afs-container">
        <div className="afs-loading">
          <div className="afs-spinner" />
          <p>Generating Annual Financial Statements...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { company, statements } = data;
  const { financial_position: fp, comprehensive_income: ci, changes_in_equity: eq, cash_flows: cf } = statements;

  const tabs = [
    { id: 'position', label: 'Statement of Financial Position' },
    { id: 'income', label: 'Statement of Comprehensive Income' },
    { id: 'equity', label: 'Statement of Changes in Equity' },
    { id: 'cashflow', label: 'Statement of Cash Flows' },
    { id: 'notes', label: 'Notes' },
    { id: 'detailed', label: 'Detailed Income Statement' },
  ];

  return (
    <div className="afs-container">
      {/* Header */}
      <div className="afs-header no-print">
        <div className="afs-header-left">
          <h1>Annual Financial Statements</h1>
          <p>{company.name} — Year ended {company.year_end}</p>
        </div>
        <div className="afs-header-right">
          <select value={year} onChange={e => { setYear(Number(e.target.value)); }}>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
          <button className="afs-btn" onClick={generate}>Regenerate</button>
          <button className="afs-btn-primary" onClick={handlePrint}>Print / PDF</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="afs-tabs no-print">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`afs-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Print cover page */}
      <div className="afs-print-cover print-only">
        <div className="afs-print-title">
          <h1>{company.name}</h1>
          <p className="afs-reg">Registration number: {company.registration}</p>
          <h2>Annual Financial Statements</h2>
          <h3>for the year ended {company.year_end}</h3>
        </div>
        <div className="afs-print-meta">
          <table>
            <tbody>
              <tr><td>Nature of business:</td><td>{company.nature}</td></tr>
              <tr><td>Director:</td><td>{company.director}</td></tr>
              <tr><td>Registered office:</td><td>{company.registered_office}</td></tr>
              <tr><td>Bankers:</td><td>{company.bankers}</td></tr>
              <tr><td>Preparer:</td><td>{company.preparer}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════ STATEMENT OF FINANCIAL POSITION ════════ */}
      {(activeTab === 'position') && (
        <div className="afs-statement">
          <div className="afs-statement-header">
            <h2>Statement of Financial Position</h2>
            <p>as at 31 December {data.year}</p>
          </div>
          <table className="afs-table">
            <thead>
              <tr>
                <th></th>
                <th className="afs-note-col">Note</th>
                <th className="afs-amount">{data.year}<br/><small>R</small></th>
              </tr>
            </thead>
            <tbody>
              {/* ASSETS */}
              <tr className="afs-section-header"><td colSpan={3}>ASSETS</td></tr>

              <tr className="afs-subsection"><td colSpan={3}>Non-Current Assets</td></tr>
              <tr>
                <td className="afs-indent">Property, plant and equipment</td>
                <td className="afs-note-col">{fmtNote('3')}</td>
                <td className="afs-amount">{fmt(fp.current.assets.non_current.ppe)}</td>
              </tr>
              <tr className="afs-subtotal">
                <td></td><td></td>
                <td className="afs-amount">{fmt(fp.current.assets.non_current.total)}</td>
              </tr>

              <tr className="afs-subsection"><td colSpan={3}>Current Assets</td></tr>
              <tr>
                <td className="afs-indent">Trade and other receivables</td>
                <td className="afs-note-col">{fmtNote('4')}</td>
                <td className="afs-amount">{fmt(fp.current.assets.current.trade_receivables)}</td>
              </tr>
              <tr>
                <td className="afs-indent">VAT receivable</td>
                <td></td>
                <td className="afs-amount">{fmt(fp.current.assets.current.vat_receivable)}</td>
              </tr>
              <tr>
                <td className="afs-indent">Other receivables</td>
                <td></td>
                <td className="afs-amount">{fmt(fp.current.assets.current.other_receivables)}</td>
              </tr>
              <tr>
                <td className="afs-indent">Cash and cash equivalents</td>
                <td className="afs-note-col">{fmtNote('5')}</td>
                <td className="afs-amount">{fmt(fp.current.assets.current.cash)}</td>
              </tr>
              <tr className="afs-subtotal">
                <td></td><td></td>
                <td className="afs-amount">{fmt(fp.current.assets.current.total)}</td>
              </tr>

              <tr className="afs-total">
                <td>Total Assets</td><td></td>
                <td className="afs-amount">{fmt(fp.current.assets.total)}</td>
              </tr>

              {/* EQUITY */}
              <tr className="afs-section-header"><td colSpan={3}>EQUITY AND LIABILITIES</td></tr>

              <tr className="afs-subsection"><td colSpan={3}>Equity</td></tr>
              <tr>
                <td className="afs-indent">Retained income / (Accumulated loss)</td>
                <td></td>
                <td className="afs-amount">{fmt(fp.current.equity.accumulated_loss)}</td>
              </tr>
              <tr className="afs-subtotal">
                <td></td><td></td>
                <td className="afs-amount">{fmt(fp.current.equity.total)}</td>
              </tr>

              {/* NON-CURRENT LIABILITIES */}
              <tr className="afs-subsection"><td colSpan={3}>Non-Current Liabilities</td></tr>
              <tr>
                <td className="afs-indent">Shareholders loan</td>
                <td className="afs-note-col">{fmtNote('6')}</td>
                <td className="afs-amount">{fmt(fp.current.liabilities.non_current.shareholders_loan)}</td>
              </tr>
              {fp.current.liabilities.non_current.vehicle_finance !== 0 && (
                <tr>
                  <td className="afs-indent">Vehicle finance</td>
                  <td></td>
                  <td className="afs-amount">{fmt(fp.current.liabilities.non_current.vehicle_finance)}</td>
                </tr>
              )}
              <tr className="afs-subtotal">
                <td></td><td></td>
                <td className="afs-amount">{fmt(fp.current.liabilities.non_current.total)}</td>
              </tr>

              {/* CURRENT LIABILITIES */}
              <tr className="afs-subsection"><td colSpan={3}>Current Liabilities</td></tr>
              <tr>
                <td className="afs-indent">Trade and other payables</td>
                <td></td>
                <td className="afs-amount">{fmt(fp.current.liabilities.current.trade_payables)}</td>
              </tr>
              {fp.current.liabilities.current.vat_payable !== 0 && (
                <tr>
                  <td className="afs-indent">VAT payable</td>
                  <td></td>
                  <td className="afs-amount">{fmt(fp.current.liabilities.current.vat_payable)}</td>
                </tr>
              )}
              {fp.current.liabilities.current.bank_overdraft !== 0 && (
                <tr>
                  <td className="afs-indent">Bank overdraft</td>
                  <td className="afs-note-col">{fmtNote('5')}</td>
                  <td className="afs-amount">{fmt(fp.current.liabilities.current.bank_overdraft)}</td>
                </tr>
              )}
              <tr className="afs-subtotal">
                <td></td><td></td>
                <td className="afs-amount">{fmt(fp.current.liabilities.current.total)}</td>
              </tr>

              <tr className="afs-subtotal">
                <td>Total Liabilities</td><td></td>
                <td className="afs-amount">{fmt(fp.current.liabilities.total)}</td>
              </tr>

              <tr className="afs-total">
                <td>Total Equity and Liabilities</td><td></td>
                <td className="afs-amount">{fmt(fp.current.total_equity_and_liabilities)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ════════ STATEMENT OF COMPREHENSIVE INCOME ════════ */}
      {(activeTab === 'income') && (
        <div className="afs-statement">
          <div className="afs-statement-header">
            <h2>Statement of Comprehensive Income</h2>
            <p>for the year ended 31 December {data.year}</p>
          </div>
          <table className="afs-table">
            <thead>
              <tr>
                <th></th>
                <th className="afs-note-col">Note</th>
                <th className="afs-amount">{data.year}<br/><small>R</small></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Revenue</td>
                <td className="afs-note-col">{fmtNote('7')}</td>
                <td className="afs-amount">{fmt(ci.revenue)}</td>
              </tr>
              <tr>
                <td>Cost of sales</td>
                <td className="afs-note-col">{fmtNote('8')}</td>
                <td className="afs-amount">({fmt(ci.cost_of_sales)})</td>
              </tr>
              <tr className="afs-total">
                <td>Gross {ci.gross_profit >= 0 ? 'profit' : 'loss'}</td>
                <td></td>
                <td className="afs-amount">{fmt(ci.gross_profit)}</td>
              </tr>
              {ci.other_income !== 0 && (
                <tr>
                  <td>Other income</td><td></td>
                  <td className="afs-amount">{fmt(ci.other_income)}</td>
                </tr>
              )}
              <tr>
                <td>Distribution costs</td>
                <td></td>
                <td className="afs-amount">({fmt(Math.abs(ci.distribution_costs))})</td>
              </tr>
              <tr>
                <td>Administrative expenses</td>
                <td className="afs-note-col">{fmtNote('9')}</td>
                <td className="afs-amount">({fmt(Math.abs(ci.administrative_expenses))})</td>
              </tr>
              <tr>
                <td>Other expenses</td>
                <td className="afs-note-col">{fmtNote('10')}</td>
                <td className="afs-amount">({fmt(Math.abs(ci.other_expenses))})</td>
              </tr>
              {ci.finance_costs !== 0 && (
                <tr>
                  <td>Finance costs</td><td></td>
                  <td className="afs-amount">({fmt(Math.abs(ci.finance_costs))})</td>
                </tr>
              )}
              <tr className="afs-total afs-total-final">
                <td>{ci.loss_for_the_year >= 0 ? 'Profit' : 'Loss'} for the year</td>
                <td></td>
                <td className="afs-amount">{fmt(ci.loss_for_the_year)}</td>
              </tr>
              <tr className="afs-total afs-total-final">
                <td>Total comprehensive {ci.loss_for_the_year >= 0 ? 'income' : 'loss'} for the year</td>
                <td></td>
                <td className="afs-amount">{fmt(ci.loss_for_the_year)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ════════ STATEMENT OF CHANGES IN EQUITY ════════ */}
      {(activeTab === 'equity') && (
        <div className="afs-statement">
          <div className="afs-statement-header">
            <h2>Statement of Changes in Equity</h2>
            <p>for the year ended 31 December {data.year}</p>
          </div>
          <table className="afs-table afs-equity-table">
            <thead>
              <tr>
                <th></th>
                <th className="afs-amount">Retained earnings<br/><small>R</small></th>
                <th className="afs-amount">Total<br/><small>R</small></th>
              </tr>
            </thead>
            <tbody>
              <tr className="afs-subtotal">
                <td>Balance at 1 January {data.year}</td>
                <td className="afs-amount">{fmt(eq.retained_earnings.opening)}</td>
                <td className="afs-amount">{fmt(eq.total.opening)}</td>
              </tr>
              <tr>
                <td className="afs-indent">Total comprehensive {eq.retained_earnings.profit_loss >= 0 ? 'income' : 'loss'} for the year</td>
                <td className="afs-amount">{fmt(eq.retained_earnings.profit_loss)}</td>
                <td className="afs-amount">{fmt(eq.total.profit_loss)}</td>
              </tr>
              <tr className="afs-total afs-total-final">
                <td>Balance at 31 December {data.year}</td>
                <td className="afs-amount">{fmt(eq.retained_earnings.closing)}</td>
                <td className="afs-amount">{fmt(eq.total.closing)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ════════ STATEMENT OF CASH FLOWS ════════ */}
      {(activeTab === 'cashflow') && (
        <div className="afs-statement">
          <div className="afs-statement-header">
            <h2>Statement of Cash Flows</h2>
            <p>for the year ended 31 December {data.year}</p>
          </div>
          <table className="afs-table">
            <thead>
              <tr>
                <th></th>
                <th className="afs-note-col">Note</th>
                <th className="afs-amount">{data.year}<br/><small>R</small></th>
              </tr>
            </thead>
            <tbody>
              <tr className="afs-section-header"><td colSpan={3}>Cash flows from operating activities</td></tr>
              <tr>
                <td className="afs-indent">{cf.operating.profit_loss >= 0 ? 'Profit' : 'Loss'} for the year</td>
                <td></td>
                <td className="afs-amount">{fmt(cf.operating.profit_loss)}</td>
              </tr>
              <tr className="afs-subsection"><td colSpan={3} className="afs-indent">Adjustments for working capital changes:</td></tr>
              <tr>
                <td className="afs-indent-2">(Increase)/decrease in trade receivables</td>
                <td></td>
                <td className="afs-amount">{fmt(cf.operating.adjustments.change_trade_receivables)}</td>
              </tr>
              <tr>
                <td className="afs-indent-2">(Increase)/decrease in VAT</td>
                <td></td>
                <td className="afs-amount">{fmt(cf.operating.adjustments.change_vat)}</td>
              </tr>
              <tr>
                <td className="afs-indent-2">(Increase)/decrease in other receivables</td>
                <td></td>
                <td className="afs-amount">{fmt(cf.operating.adjustments.change_other_receivables)}</td>
              </tr>
              <tr>
                <td className="afs-indent-2">Increase/(decrease) in trade payables</td>
                <td></td>
                <td className="afs-amount">{fmt(cf.operating.adjustments.change_trade_payables)}</td>
              </tr>
              <tr className="afs-subtotal">
                <td>Net cash {cf.operating.net >= 0 ? 'generated by' : 'used in'} operating activities</td>
                <td></td>
                <td className="afs-amount">{fmt(cf.operating.net)}</td>
              </tr>

              {cf.investing.net !== 0 && (<>
                <tr className="afs-section-header"><td colSpan={3}>Cash flows from investing activities</td></tr>
                <tr>
                  <td className="afs-indent">Purchase of property, plant and equipment</td>
                  <td></td>
                  <td className="afs-amount">{fmt(cf.investing.ppe_additions)}</td>
                </tr>
                <tr className="afs-subtotal">
                  <td>Net cash {cf.investing.net >= 0 ? 'from' : 'used in'} investing activities</td>
                  <td></td>
                  <td className="afs-amount">{fmt(cf.investing.net)}</td>
                </tr>
              </>)}

              <tr className="afs-section-header"><td colSpan={3}>Cash flows from financing activities</td></tr>
              {cf.financing.loan_proceeds !== 0 && (
                <tr>
                  <td className="afs-indent">Shareholders loan {cf.financing.loan_proceeds > 0 ? 'advanced' : 'repaid'}</td>
                  <td></td>
                  <td className="afs-amount">{fmt(cf.financing.loan_proceeds)}</td>
                </tr>
              )}
              {cf.financing.vehicle_finance !== 0 && (
                <tr>
                  <td className="afs-indent">Vehicle finance</td>
                  <td></td>
                  <td className="afs-amount">{fmt(cf.financing.vehicle_finance)}</td>
                </tr>
              )}
              <tr className="afs-subtotal">
                <td>Net cash from financing activities</td>
                <td></td>
                <td className="afs-amount">{fmt(cf.financing.net)}</td>
              </tr>

              <tr className="afs-total">
                <td>Net {cf.net_change >= 0 ? 'increase' : 'decrease'} in cash and cash equivalents</td>
                <td></td>
                <td className="afs-amount">{fmt(cf.net_change)}</td>
              </tr>
              <tr>
                <td>Cash and cash equivalents at beginning of the year</td>
                <td></td>
                <td className="afs-amount">{fmt(cf.opening_cash)}</td>
              </tr>
              <tr className="afs-total afs-total-final">
                <td>Cash and cash equivalents at end of the year</td>
                <td className="afs-note-col">{fmtNote('5')}</td>
                <td className="afs-amount">{fmt(cf.closing_cash)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ════════ NOTES ════════ */}
      {(activeTab === 'notes') && (
        <div className="afs-statement afs-notes">
          <div className="afs-statement-header">
            <h2>Notes to the Annual Financial Statements</h2>
            <p>for the year ended 31 December {data.year}</p>
          </div>

          {/* Note 1: Basis */}
          <div className="afs-note">
            <h3>1. Basis of preparation</h3>
            <p>The annual financial statements have been prepared on the going concern basis in accordance with the International Financial Reporting Standard for Small and Medium-sized Entities (IFRS for SMEs).</p>
          </div>

          {/* Note 2: Accounting policies */}
          <div className="afs-note">
            <h3>2. Significant accounting policies</h3>
            <p><strong>Revenue recognition</strong> — Revenue from rendering of services is recognised when the service has been delivered and the amount can be measured reliably.</p>
            <p><strong>Financial instruments</strong> — Trade receivables and payables are measured at their transaction price less any impairment losses. Cash and cash equivalents comprise bank balances.</p>
            <p><strong>Property, plant and equipment</strong> — Carried at cost less accumulated depreciation and impairment losses. Depreciation is on a straight-line basis over the asset's useful life.</p>
          </div>

          {/* Note 3: PPE */}
          <div className="afs-note">
            <h3>3. Property, plant and equipment</h3>
            <table className="afs-table afs-note-table">
              <thead><tr><th></th><th className="afs-amount">{data.year} R</th></tr></thead>
              <tbody>
                <tr>
                  <td>Computer equipment — cost</td>
                  <td className="afs-amount">{fmt(fp.current.assets.non_current.ppe)}</td>
                </tr>
                <tr className="afs-total">
                  <td>Net carrying amount</td>
                  <td className="afs-amount">{fmt(fp.current.assets.non_current.ppe)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Note 4: Trade receivables */}
          <div className="afs-note">
            <h3>4. Trade and other receivables</h3>
            <table className="afs-table afs-note-table">
              <thead><tr><th></th><th className="afs-amount">{data.year} R</th></tr></thead>
              <tbody>
                <tr><td>Trade receivables</td><td className="afs-amount">{fmt(data.notes.note_4_receivables.trade_receivables)}</td></tr>
                <tr><td>VAT receivable</td><td className="afs-amount">{fmt(data.notes.note_4_receivables.vat_receivable)}</td></tr>
                <tr><td>Other receivables</td><td className="afs-amount">{fmt(data.notes.note_4_receivables.other_receivables)}</td></tr>
                <tr className="afs-total"><td></td><td className="afs-amount">{fmt(data.notes.note_4_receivables.total)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Note 5: Cash */}
          <div className="afs-note">
            <h3>5. Cash and cash equivalents</h3>
            <table className="afs-table afs-note-table">
              <thead><tr><th></th><th className="afs-amount">{data.year} R</th></tr></thead>
              <tbody>
                {data.notes.note_5_cash.accounts.map((a: any, i: number) => (
                  <tr key={i}><td>{a.name}</td><td className="afs-amount">{fmt(a.balance)}</td></tr>
                ))}
                <tr className="afs-total"><td></td><td className="afs-amount">{fmt(data.notes.note_5_cash.total)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Note 6: Shareholders loan */}
          <div className="afs-note">
            <h3>6. Shareholders loan</h3>
            <table className="afs-table afs-note-table">
              <thead><tr><th></th><th className="afs-amount">{data.year} R</th></tr></thead>
              <tbody>
                <tr><td>Loan — unsecured, interest-free, no fixed repayment terms</td>
                  <td className="afs-amount">{fmt(data.notes.note_6_shareholders_loan)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Note 7: Revenue */}
          <div className="afs-note">
            <h3>7. Revenue</h3>
            <table className="afs-table afs-note-table">
              <thead><tr><th></th><th className="afs-amount">{data.year} R</th></tr></thead>
              <tbody>
                {data.notes.note_7_revenue.breakdown.map((item: any, i: number) => (
                  <tr key={i}><td>{item.name}</td><td className="afs-amount">{fmt(item.amount)}</td></tr>
                ))}
                <tr className="afs-total"><td></td><td className="afs-amount">{fmt(data.notes.note_7_revenue.total)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Note 8: Cost of sales */}
          <div className="afs-note">
            <h3>8. Cost of sales</h3>
            <table className="afs-table afs-note-table">
              <thead><tr><th></th><th className="afs-amount">{data.year} R</th></tr></thead>
              <tbody>
                {data.notes.note_8_cost_of_sales.breakdown.map((item: any, i: number) => (
                  <tr key={i}><td>{item.name}</td><td className="afs-amount">{fmt(item.amount)}</td></tr>
                ))}
                <tr className="afs-total"><td></td><td className="afs-amount">{fmt(data.notes.note_8_cost_of_sales.total)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Note 9: Admin expenses */}
          <div className="afs-note">
            <h3>9. Administrative expenses</h3>
            <table className="afs-table afs-note-table">
              <thead><tr><th></th><th className="afs-amount">{data.year} R</th></tr></thead>
              <tbody>
                {data.notes.note_9_admin_expenses.breakdown.map((item: any, i: number) => (
                  <tr key={i}><td>{item.name}</td><td className="afs-amount">{fmt(item.amount)}</td></tr>
                ))}
                <tr className="afs-total"><td></td><td className="afs-amount">{fmt(data.notes.note_9_admin_expenses.total)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Note 10: Other expenses */}
          <div className="afs-note">
            <h3>10. Other expenses</h3>
            <table className="afs-table afs-note-table">
              <thead><tr><th></th><th className="afs-amount">{data.year} R</th></tr></thead>
              <tbody>
                {data.notes.note_10_other_expenses.breakdown.map((item: any, i: number) => (
                  <tr key={i}><td>{item.name}</td><td className="afs-amount">{fmt(item.amount)}</td></tr>
                ))}
                <tr className="afs-total"><td></td><td className="afs-amount">{fmt(data.notes.note_10_other_expenses.total)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════ DETAILED INCOME STATEMENT ════════ */}
      {(activeTab === 'detailed') && (
        <div className="afs-statement">
          <div className="afs-statement-header">
            <h2>Detailed Income Statement</h2>
            <p>for the year ended 31 December {data.year}</p>
          </div>
          <table className="afs-table">
            <thead>
              <tr><th></th><th className="afs-note-col">Note</th><th className="afs-amount">{data.year}<br/><small>R</small></th></tr>
            </thead>
            <tbody>
              {/* Revenue */}
              <tr className="afs-section-header"><td colSpan={3}>Revenue</td></tr>
              {data.detailed_income_statement.revenue.items.map((item: any, i: number) => (
                <tr key={`r${i}`}>
                  <td className="afs-indent">{item.name}</td>
                  <td></td>
                  <td className="afs-amount">{fmt(item.amount)}</td>
                </tr>
              ))}
              <tr className="afs-subtotal">
                <td></td><td></td>
                <td className="afs-amount">{fmt(data.detailed_income_statement.revenue.total)}</td>
              </tr>

              {/* COS */}
              <tr className="afs-section-header"><td colSpan={3}>Cost of Sales</td></tr>
              {data.detailed_income_statement.cost_of_sales.items.map((item: any, i: number) => (
                <tr key={`c${i}`}>
                  <td className="afs-indent">{item.name}</td>
                  <td></td>
                  <td className="afs-amount">({fmt(item.amount)})</td>
                </tr>
              ))}
              <tr className="afs-subtotal">
                <td></td><td></td>
                <td className="afs-amount">({fmt(data.detailed_income_statement.cost_of_sales.total)})</td>
              </tr>

              <tr className="afs-total">
                <td>Gross {data.detailed_income_statement.gross_profit >= 0 ? 'Profit' : 'Loss'}</td>
                <td></td>
                <td className="afs-amount">{fmt(data.detailed_income_statement.gross_profit)}</td>
              </tr>

              {/* Operating Expenses */}
              <tr className="afs-section-header"><td colSpan={3}>Operating Expenses</td></tr>
              {data.detailed_income_statement.operating_expenses.items.map((item: any, i: number) => (
                <tr key={`o${i}`}>
                  <td className="afs-indent">{item.name}</td>
                  <td></td>
                  <td className="afs-amount">({fmt(item.amount)})</td>
                </tr>
              ))}
              <tr className="afs-subtotal">
                <td></td><td></td>
                <td className="afs-amount">({fmt(data.detailed_income_statement.operating_expenses.total)})</td>
              </tr>

              <tr className="afs-total afs-total-final">
                <td>{data.detailed_income_statement.loss_for_the_year >= 0 ? 'Profit' : 'Loss'} for the year</td>
                <td></td>
                <td className="afs-amount">{fmt(data.detailed_income_statement.loss_for_the_year)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="afs-footer print-only">
        <p>Prepared by: {company.preparer}</p>
        <p>These annual financial statements have been prepared by an independent accounting professional.</p>
      </div>
    </div>
  );
}
