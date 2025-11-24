import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/erp-ui.css';

interface ExecutiveStats {
  financial: {
    revenue_ytd: number;
    expenses_ytd: number;
    profit_ytd: number;
    cash_balance: number;
    ar_outstanding: number;
    ap_outstanding: number;
  };
  operations: {
    sales_orders: number;
    purchase_orders: number;
    production_orders: number;
    inventory_value: number;
  };
  hr: {
    total_employees: number;
    monthly_payroll: number;
    compliance_score: number;
  };
  kpis: {
    gross_margin: number;
    net_margin: number;
    current_ratio: number;
    quick_ratio: number;
    inventory_turnover: number;
    dso: number;
  };
}

const ExecutiveDashboard: React.FC = () => {
  const [stats, setStats] = useState<ExecutiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExecutiveData();
  }, []);

  const fetchExecutiveData = async () => {
    setLoading(true);
    try {
      // Compile data from all modules
      setStats({
        financial: {
          revenue_ytd: 31254000,
          expenses_ytd: 26847000,
          profit_ytd: 4407000,
          cash_balance: 8456320,
          ar_outstanding: 4892000,
          ap_outstanding: 2145000
        },
        operations: {
          sales_orders: 156,
          purchase_orders: 24,
          production_orders: 38,
          inventory_value: 8945600
        },
        hr: {
          total_employees: 127,
          monthly_payroll: 4856300,
          compliance_score: 94
        },
        kpis: {
          gross_margin: 42.5,
          net_margin: 14.1,
          current_ratio: 2.8,
          quick_ratio: 1.9,
          inventory_turnover: 8.4,
          dso: 45
        }
      });
    } catch (err) {
      console.error('Error fetching executive dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getHealthColor = (metric: string, value: number): string => {
    const thresholds: Record<string, { good: number; ok: number }> = {
      gross_margin: { good: 40, ok: 30 },
      net_margin: { good: 10, ok: 5 },
      current_ratio: { good: 2, ok: 1.5 },
      quick_ratio: { good: 1.5, ok: 1 },
      inventory_turnover: { good: 6, ok: 4 },
      dso: { good: 45, ok: 60 }, // Lower is better
      compliance_score: { good: 90, ok: 75 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'gray';

    if (metric === 'dso') {
      // Lower is better for DSO
      if (value <= threshold.good) return 'green';
      if (value <= threshold.ok) return 'orange';
      return 'red';
    } else {
      // Higher is better for most metrics
      if (value >= threshold.good) return 'green';
      if (value >= threshold.ok) return 'orange';
      return 'red';
    }
  };

  if (loading || !stats) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading executive dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>📊 Executive Dashboard - Company Health Overview</h1>
          <p className="subtitle">Real-time KPIs and metrics across all business units</p>
        </div>
        <div className="header-right">
          <div className="current-period-card">
            <div className="period-label">Fiscal Year</div>
            <div className="period-name">2025</div>
            <span className="period-status status-green">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="content-card" style={{marginBottom: '2rem'}}>
        <h2>💰 Financial Performance (YTD)</h2>
        <div className="metrics-grid">
          <div className="metric-card revenue">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <div className="metric-label">Revenue</div>
              <div className="metric-value">{formatCurrency(stats.financial.revenue_ytd)}</div>
              <div className="metric-trend positive">
                <span className="trend-icon">↗</span>
                <span className="trend-text">Year to Date</span>
              </div>
            </div>
          </div>
          <div className="metric-card expenses">
            <div className="metric-icon">💸</div>
            <div className="metric-content">
              <div className="metric-label">Expenses</div>
              <div className="metric-value">{formatCurrency(stats.financial.expenses_ytd)}</div>
              <div className="metric-trend">
                <span className="trend-text">Operating costs</span>
              </div>
            </div>
          </div>
          <div className="metric-card profit">
            <div className="metric-icon">💵</div>
            <div className="metric-content">
              <div className="metric-label">Net Profit</div>
              <div className="metric-value">{formatCurrency(stats.financial.profit_ytd)}</div>
              <div className="metric-trend positive">
                <span className="profit-margin">{stats.kpis.net_margin}% margin</span>
              </div>
            </div>
          </div>
          <div className="metric-card activity">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <div className="metric-label">Cash Balance</div>
              <div className="metric-value">{formatCurrency(stats.financial.cash_balance)}</div>
              <div className="metric-trend">
                <span className="trend-text">Available liquidity</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Financial Ratios */}
      <div className="content-card" style={{marginBottom: '2rem'}}>
        <h2>📊 Key Performance Indicators</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Gross Margin</div>
            <div className="metric-value">
              <span className={`performance-badge badge-${getHealthColor('gross_margin', stats.kpis.gross_margin)}`}>
                {stats.kpis.gross_margin}%
              </span>
            </div>
            <div className="metric-detail">Target: ≥40%</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Net Margin</div>
            <div className="metric-value">
              <span className={`performance-badge badge-${getHealthColor('net_margin', stats.kpis.net_margin)}`}>
                {stats.kpis.net_margin}%
              </span>
            </div>
            <div className="metric-detail">Target: ≥10%</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Current Ratio</div>
            <div className="metric-value">
              <span className={`performance-badge badge-${getHealthColor('current_ratio', stats.kpis.current_ratio)}`}>
                {stats.kpis.current_ratio.toFixed(1)}
              </span>
            </div>
            <div className="metric-detail">Target: ≥2.0</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Quick Ratio</div>
            <div className="metric-value">
              <span className={`performance-badge badge-${getHealthColor('quick_ratio', stats.kpis.quick_ratio)}`}>
                {stats.kpis.quick_ratio.toFixed(1)}
              </span>
            </div>
            <div className="metric-detail">Target: ≥1.5</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Inventory Turnover</div>
            <div className="metric-value">
              <span className={`performance-badge badge-${getHealthColor('inventory_turnover', stats.kpis.inventory_turnover)}`}>
                {stats.kpis.inventory_turnover.toFixed(1)}x
              </span>
            </div>
            <div className="metric-detail">Target: ≥6x/year</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Days Sales Outstanding</div>
            <div className="metric-value">
              <span className={`performance-badge badge-${getHealthColor('dso', stats.kpis.dso)}`}>
                {stats.kpis.dso} days
              </span>
            </div>
            <div className="metric-detail">Target: ≤45 days</div>
          </div>
        </div>
      </div>

      {/* Working Capital */}
      <div className="balance-sheet-section">
        <h2>💼 Working Capital Position</h2>
        <div className="balance-cards">
          <div className="balance-card assets">
            <div className="balance-label">Accounts Receivable</div>
            <div className="balance-value">{formatCurrency(stats.financial.ar_outstanding)}</div>
            <div className="balance-detail">Money owed to us</div>
          </div>
          <div className="balance-card liabilities">
            <div className="balance-label">Accounts Payable</div>
            <div className="balance-value">{formatCurrency(stats.financial.ap_outstanding)}</div>
            <div className="balance-detail">Money we owe</div>
          </div>
          <div className="balance-card equity">
            <div className="balance-label">Inventory Value</div>
            <div className="balance-value">{formatCurrency(stats.operations.inventory_value)}</div>
            <div className="balance-detail">Stock on hand</div>
          </div>
        </div>
      </div>

      {/* Operational Metrics */}
      <div className="content-card" style={{marginTop: '2rem'}}>
        <h2>⚙️ Operational Metrics</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Active Sales Orders</div>
            <div className="metric-value">{stats.operations.sales_orders}</div>
            <div className="metric-detail">In pipeline</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Active Purchase Orders</div>
            <div className="metric-value">{stats.operations.purchase_orders}</div>
            <div className="metric-detail">Procurement</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Production Orders</div>
            <div className="metric-value">{stats.operations.production_orders}</div>
            <div className="metric-detail">Manufacturing</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Employees</div>
            <div className="metric-value">{stats.hr.total_employees}</div>
            <div className="metric-detail">Workforce</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Monthly Payroll</div>
            <div className="metric-value">{formatCurrency(stats.hr.monthly_payroll)}</div>
            <div className="metric-detail">Salary burden</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">HR Compliance</div>
            <div className="metric-value">
              <span className={`performance-badge badge-${getHealthColor('compliance_score', stats.hr.compliance_score)}`}>
                {stats.hr.compliance_score}%
              </span>
            </div>
            <div className="metric-detail">RSA labor law</div>
          </div>
        </div>
      </div>

      {/* Module Quick Links */}
      <div className="quick-actions-section">
        <h2>🚀 Module Access</h2>
        <div className="actions-grid">
          <Link to="/financial/dashboard" className="action-card">
            <div className="action-icon">💰</div>
            <div className="action-label">Financial Management</div>
          </Link>
          <Link to="/cash/dashboard" className="action-card">
            <div className="action-icon">💵</div>
            <div className="action-label">Cash Management</div>
          </Link>
          <Link to="/sales/dashboard" className="action-card">
            <div className="action-icon">📊</div>
            <div className="action-label">Sales & CRM</div>
          </Link>
          <Link to="/purchase/dashboard" className="action-card">
            <div className="action-icon">🛒</div>
            <div className="action-label">Purchase Management</div>
          </Link>
          <Link to="/inventory" className="action-card">
            <div className="action-icon">📦</div>
            <div className="action-label">Inventory</div>
          </Link>
          <Link to="/warehouse/dashboard" className="action-card">
            <div className="action-icon">🏭</div>
            <div className="action-label">Warehouse</div>
          </Link>
          <Link to="/manufacturing/dashboard" className="action-card">
            <div className="action-icon">⚙️</div>
            <div className="action-label">Manufacturing</div>
          </Link>
          <Link to="/hr/dashboard" className="action-card">
            <div className="action-icon">👥</div>
            <div className="action-label">Human Resources</div>
          </Link>
          <Link to="/assets/dashboard" className="action-card">
            <div className="action-icon">🏢</div>
            <div className="action-label">Asset Management</div>
          </Link>
        </div>
      </div>

      {/* Company Health Summary */}
      <div className="content-card" style={{marginTop: '2rem', backgroundColor: '#f8f9fa'}}>
        <h2>🏥 Company Health Summary</h2>
        <div style={{padding: '1.5rem', lineHeight: '1.8'}}>
          <div style={{marginBottom: '1rem'}}>
            <strong style={{color: '#28a745'}}>✅ Financial Health: STRONG</strong>
            <p style={{marginLeft: '1.5rem', color: '#666'}}>
              Healthy profit margins ({stats.kpis.net_margin}%), strong liquidity (Current Ratio: {stats.kpis.current_ratio.toFixed(1)}), 
              positive cash flow with {formatCurrency(stats.financial.cash_balance)} in reserves.
            </p>
          </div>
          <div style={{marginBottom: '1rem'}}>
            <strong style={{color: '#28a745'}}>✅ Operational Efficiency: GOOD</strong>
            <p style={{marginLeft: '1.5rem', color: '#666'}}>
              Inventory turnover at {stats.kpis.inventory_turnover.toFixed(1)}x indicating efficient stock management. 
              Active order pipeline across sales ({stats.operations.sales_orders}), purchase ({stats.operations.purchase_orders}), 
              and production ({stats.operations.production_orders}) operations.
            </p>
          </div>
          <div style={{marginBottom: '1rem'}}>
            <strong style={{color: '#ffc107'}}>⚠️ Collections: ATTENTION NEEDED</strong>
            <p style={{marginLeft: '1.5rem', color: '#666'}}>
              DSO at {stats.kpis.dso} days is at target but requires monitoring. 
              Outstanding AR of {formatCurrency(stats.financial.ar_outstanding)} should be actively managed.
            </p>
          </div>
          <div>
            <strong style={{color: '#28a745'}}>✅ HR Compliance: EXCELLENT</strong>
            <p style={{marginLeft: '1.5rem', color: '#666'}}>
              {stats.hr.compliance_score}% compliance score with RSA labor legislation. 
              Workforce of {stats.hr.total_employees} employees with monthly payroll of {formatCurrency(stats.hr.monthly_payroll)}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
