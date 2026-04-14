/**
 * Financial Statements Viewer - Renders generated financial statements
 * 
 * Each statement is rendered in print-ready format with:
 * - Professional layout matching SA financial reporting standards
 * - Note references that link to the Notes tab
 * - Draft watermark for unpublished statements
 * - Export to PDF functionality
 */

import { useState, useEffect } from 'react';
import { statementsApi } from '../services/reporting.api';

interface Props {
  engagementId: string;
  entityName: string;
  registrationNumber?: string;
}

type StatementTab = 'sofp' | 'soci' | 'soce' | 'scf' | 'detailed_is' | 'tax';

interface LineItem {
  label: string;
  note_ref?: number;
  current_year: number;
  prior_year?: number;
  indent: number;
  is_bold: boolean;
  is_total: boolean;
  is_subtotal: boolean;
  is_blank_line: boolean;
}

interface Section {
  title: string;
  items: LineItem[];
  subtotal?: number;
  prior_subtotal?: number;
}

export default function FinancialStatements({ engagementId, entityName, registrationNumber }: Props) {
  const [activeStatement, setActiveStatement] = useState<StatementTab>('sofp');
  const [statementData, setStatementData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatement(activeStatement);
  }, [activeStatement, engagementId]);

  const fetchStatement = async (type: StatementTab) => {
    setLoading(true);
    try {
      let result;
      switch (type) {
        case 'sofp': result = await statementsApi.sofp(engagementId); break;
        case 'soci': result = await statementsApi.soci(engagementId); break;
        case 'soce': result = await statementsApi.soce(engagementId); break;
        case 'scf': result = await statementsApi.scf(engagementId); break;
        case 'detailed_is': result = await statementsApi.detailedIS(engagementId); break;
        case 'tax': result = await statementsApi.taxComputation(engagementId); break;
      }
      if (result?.success) {
        setStatementData(result.data as Record<string, unknown>);
      }
    } catch (error) {
      console.error('Error fetching statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return '';
    if (Math.abs(amount) < 0.01) return '—';
    const abs = Math.abs(amount);
    const formatted = abs.toLocaleString('en-ZA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return amount < 0 ? `(${formatted})` : formatted;
  };

  const statementTabs: { id: StatementTab; label: string; shortLabel: string }[] = [
    { id: 'sofp', label: 'Statement of Financial Position', shortLabel: 'SoFP' },
    { id: 'soci', label: 'Statement of Comprehensive Income', shortLabel: 'SoCI' },
    { id: 'soce', label: 'Statement of Changes in Equity', shortLabel: 'SoCE' },
    { id: 'scf', label: 'Statement of Cash Flows', shortLabel: 'CashFlow' },
    { id: 'detailed_is', label: 'Detailed Income Statement', shortLabel: 'DetailedIS' },
    { id: 'tax', label: 'Income Tax Computation', shortLabel: 'Tax' },
  ];

  const renderSection = (section: Section, showPrior: boolean = true) => {
    if (!section || !section.items || section.items.length === 0) return null;

    return (
      <div className="fs-section">
        <div className="fs-section-title">{section.title}</div>
        {section.items.map((item, i) => (
          <div
            key={i}
            className={`fs-line ${item.is_bold ? 'bold' : ''} ${item.is_total ? 'total' : ''} ${item.is_subtotal ? 'subtotal' : ''}`}
            style={{ paddingLeft: `${(item.indent || 0) * 1.5 + 1}rem` }}
          >
            <span className="fs-line-label">
              {item.label}
              {item.note_ref && <sup className="fs-note-ref">{item.note_ref}</sup>}
            </span>
            <span className="fs-line-amount">{formatAmount(item.current_year)}</span>
            {showPrior && (
              <span className="fs-line-amount prior">{formatAmount(item.prior_year)}</span>
            )}
          </div>
        ))}
        {section.subtotal !== undefined && (
          <div className="fs-line bold subtotal">
            <span className="fs-line-label">Total {section.title.toLowerCase()}</span>
            <span className="fs-line-amount">{formatAmount(section.subtotal)}</span>
            {showPrior && (
              <span className="fs-line-amount prior">{formatAmount(section.prior_subtotal)}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSoFP = () => {
    const data = statementData as Record<string, unknown>;
    if (!data) return null;

    return (
      <div className="fs-statement">
        <div className="fs-header">
          <h2 className="fs-entity-name">{entityName}</h2>
          <p className="fs-reg-number">{registrationNumber && `(Registration Number ${registrationNumber})`}</p>
          <p className="fs-subtitle">Financial Statements for the year ended {data.period_end as string}</p>
          <h3 className="fs-statement-title">Statement of Financial Position</h3>
          <div className="fs-column-headers">
            <span className="fs-col-label">Figures in R</span>
            <span className="fs-col-header">Notes</span>
            <span className="fs-col-header">2024</span>
          </div>
        </div>

        <div className="fs-body">
          <div className="fs-group-title">Assets</div>
          {renderSection(data.non_current_assets as Section, false)}
          {renderSection(data.current_assets as Section, false)}
          
          <div className="fs-line bold total grand-total">
            <span className="fs-line-label">Total assets</span>
            <span className="fs-line-amount">{formatAmount(data.total_assets as number)}</span>
          </div>

          <div className="fs-group-title" style={{ marginTop: '1.5rem' }}>Equity and liabilities</div>
          {renderSection(data.equity as Section, false)}
          {renderSection(data.non_current_liabilities as Section, false)}
          {renderSection(data.current_liabilities as Section, false)}

          <div className="fs-line bold total grand-total">
            <span className="fs-line-label">Total equity and liabilities</span>
            <span className="fs-line-amount">{formatAmount(data.total_equity_and_liabilities as number)}</span>
          </div>
        </div>

        <div className="fs-watermark">Draft</div>
      </div>
    );
  };

  const renderSoCI = () => {
    const data = statementData as Record<string, unknown>;
    if (!data) return null;

    return (
      <div className="fs-statement">
        <div className="fs-header">
          <h2 className="fs-entity-name">{entityName}</h2>
          <p className="fs-reg-number">{registrationNumber && `(Registration Number ${registrationNumber})`}</p>
          <h3 className="fs-statement-title">Statement of Comprehensive Income</h3>
          <div className="fs-column-headers">
            <span className="fs-col-label">Figures in R</span>
            <span className="fs-col-header">Notes</span>
            <span className="fs-col-header">2024</span>
          </div>
        </div>

        <div className="fs-body">
          {renderSection(data.revenue as Section, false)}
          {renderSection(data.cost_of_sales as Section, false)}
          
          <div className="fs-line bold subtotal">
            <span className="fs-line-label">Gross profit</span>
            <span className="fs-line-amount">{formatAmount(data.gross_profit as number)}</span>
          </div>

          {renderSection(data.operating_expenses as Section, false)}

          <div className="fs-line bold subtotal">
            <span className="fs-line-label">Profit from operating activities</span>
            <span className="fs-line-amount">{formatAmount(data.operating_profit as number)}</span>
          </div>

          <div className="fs-line bold subtotal">
            <span className="fs-line-label">Profit before tax</span>
            <span className="fs-line-amount">{formatAmount(data.profit_before_tax as number)}</span>
          </div>

          {renderSection(data.taxation as Section, false)}

          <div className="fs-line bold total grand-total">
            <span className="fs-line-label">Profit for the year</span>
            <span className="fs-line-amount">{formatAmount(data.profit_for_year as number)}</span>
          </div>
        </div>

        <div className="fs-watermark">Draft</div>
      </div>
    );
  };

  const renderSoCE = () => {
    const data = statementData as { columns?: string[]; rows?: Array<{ label: string; values: number[]; is_bold: boolean; is_total: boolean }> };
    if (!data?.columns || !data?.rows) return null;

    return (
      <div className="fs-statement">
        <div className="fs-header">
          <h2 className="fs-entity-name">{entityName}</h2>
          <h3 className="fs-statement-title">Statement of Changes in Equity</h3>
        </div>
        <div className="fs-body">
          <table className="fs-equity-table">
            <thead>
              <tr>
                <th>Figures in R</th>
                {data.columns.map((col, i) => (
                  <th key={i}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className={`${row.is_bold ? 'bold' : ''} ${row.is_total ? 'total' : ''}`}>
                  <td>{row.label}</td>
                  {row.values.map((val, j) => (
                    <td key={j} className="fs-amount-cell">{formatAmount(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="fs-watermark">Draft</div>
      </div>
    );
  };

  const renderGenericStatement = () => {
    if (!statementData) return null;

    return (
      <div className="fs-statement">
        <div className="fs-header">
          <h2 className="fs-entity-name">{entityName}</h2>
          <h3 className="fs-statement-title">
            {statementTabs.find(t => t.id === activeStatement)?.label}
          </h3>
        </div>
        <div className="fs-body">
          <pre className="fs-json-preview">
            {JSON.stringify(statementData, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="financial-statements">
      {/* Statement Tabs */}
      <div className="fs-tabs">
        {statementTabs.map(tab => (
          <button
            key={tab.id}
            className={`fs-tab ${activeStatement === tab.id ? 'active' : ''}`}
            onClick={() => setActiveStatement(tab.id)}
          >
            {tab.shortLabel}
          </button>
        ))}
      </div>

      {/* Statement Content */}
      <div className="fs-content">
        {loading ? (
          <div className="reporting-loading">
            <div className="reporting-spinner" />
            <p>Generating statement...</p>
          </div>
        ) : (
          <div className="fs-paper">
            {activeStatement === 'sofp' && renderSoFP()}
            {activeStatement === 'soci' && renderSoCI()}
            {activeStatement === 'soce' && renderSoCE()}
            {activeStatement === 'scf' && renderGenericStatement()}
            {activeStatement === 'detailed_is' && renderGenericStatement()}
            {activeStatement === 'tax' && renderGenericStatement()}
          </div>
        )}
      </div>
    </div>
  );
}
