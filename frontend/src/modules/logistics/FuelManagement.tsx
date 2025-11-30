import React, { useState } from 'react';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import { API_BASE_URL } from '../../services/api.service';
import '../../styles/erp-ui.css';

interface FuelTransaction {
  id?: string;
  date: string;
  vehicle: string;
  driver: string;
  litres: number;
  pricePerLitre: number;
  cost: number;
  odometer: number;
  supplier: string;
  invoiceNumber: string;
  km?: number;
  journalEntry?: string;
}

const FuelManagement: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<FuelTransaction[]>([
    { id: 'FT-001', date: '2025-11-10', vehicle: 'TRK-001 (ABC 123 GP)', driver: 'John Mthembu', litres: 285, pricePerLitre: 24.00, cost: 6840, odometer: 145820, supplier: 'Engen Midrand', invoiceNumber: 'ENG-20251110-001', km: 3.2, journalEntry: 'JE-2025-1523' },
    { id: 'FT-002', date: '2025-11-10', vehicle: 'TRK-002 (DEF 456 GP)', driver: 'Sarah Ndlovu', litres: 310, pricePerLitre: 24.00, cost: 7440, odometer: 98420, supplier: 'Shell Gateway', invoiceNumber: 'SHL-20251110-045', km: 3.5, journalEntry: 'JE-2025-1524' },
    { id: 'FT-003', date: '2025-11-09', vehicle: 'TRK-003 (GHI 789 GP)', driver: 'Thabo Dlamini', litres: 295, pricePerLitre: 24.00, cost: 7080, odometer: 203450, supplier: 'BP Fourways', invoiceNumber: 'BP-20251109-128', km: 3.1, journalEntry: 'JE-2025-1502' },
    { id: 'FT-004', date: '2025-11-09', vehicle: 'VAN-001 (JKL 012 GP)', driver: 'Peter Mokoena', litres: 65, pricePerLitre: 24.00, cost: 1560, odometer: 67230, supplier: 'Engen Sandton', invoiceNumber: 'ENG-20251109-089', km: 11.2, journalEntry: 'JE-2025-1503' },
  ]);

  const [formData, setFormData] = useState<FuelTransaction>({
    date: new Date().toISOString().split('T')[0],
    vehicle: '',
    driver: '',
    litres: 0,
    pricePerLitre: 24.00,
    cost: 0,
    odometer: 0,
    supplier: '',
    invoiceNumber: ''
  });

  const tabs = [
    { id: 'command', label: '🎯 Command Center', path: '/logistics/dashboard' },
    { id: 'planner', label: '📋 Load Planner', path: '/logistics/planner' },
    { id: 'trips', label: '🚚 Trip Management', path: '/logistics/trips' },
    { id: 'fleet', label: '🚛 Fleet', path: '/logistics/fleet' },
    { id: 'drivers', label: '👨‍✈️ Drivers', path: '/logistics/drivers' },
    { id: 'fuel', label: '⛽ Fuel', path: '/logistics/fuel' },
    { id: 'reports', label: '📊 Analytics', path: '/logistics/reports' }
  ];

  const breadcrumbs = [
    { label: 'Logistics', path: '/logistics' },
    { label: 'Fuel Management' }
  ];

  const vehicles = [
    { id: 'TRK-001', registration: 'ABC 123 GP', driver: 'John Mthembu' },
    { id: 'TRK-002', registration: 'DEF 456 GP', driver: 'Sarah Ndlovu' },
    { id: 'TRK-003', registration: 'GHI 789 GP', driver: 'Thabo Dlamini' },
    { id: 'VAN-001', registration: 'JKL 012 GP', driver: 'Peter Mokoena' },
    { id: 'TRK-007', registration: 'MNO 345 GP', driver: 'Lindiwe Khumalo' },
  ];

  const fuelSuppliers = [
    'Engen Midrand',
    'Shell Gateway',
    'BP Fourways',
    'Engen Sandton',
    'Shell Rivonia',
    'Sasol Sandton',
    'Total Midrand'
  ];

  const handleInputChange = (field: keyof FuelTransaction, value: any) => {
    const updated = { ...formData, [field]: value };
    
    // Auto-calculate cost when litres or price changes
    if (field === 'litres' || field === 'pricePerLitre') {
      updated.cost = parseFloat((updated.litres * updated.pricePerLitre).toFixed(2));
    }

    // Auto-fill driver when vehicle is selected
    if (field === 'vehicle') {
      const selectedVehicle = vehicles.find(v => `${v.id} (${v.registration})` === value);
      if (selectedVehicle) {
        updated.driver = selectedVehicle.driver;
      }
    }

    setFormData(updated);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.vehicle || !formData.driver || !formData.supplier || !formData.invoiceNumber) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.litres <= 0 || formData.odometer <= 0) {
      alert('Litres and odometer reading must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create fuel transaction with journal entry
      const response = await fetch(`${API_BASE_URL}/api/logistics/fuel/transactions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          ...formData,
          // This will trigger automatic journal entry creation in backend:
          // Debit: Fuel Expense (Account 5-20-001)
          // Credit: Accounts Payable - [Supplier Name] (Account 2-10-XXX)
        })
      });

      if (!response.ok) throw new Error('Failed to create fuel transaction');

      const result = await response.json();
      
      // Add to local state with generated IDs
      const newTransaction: FuelTransaction = {
        ...formData,
        id: result.transaction_id,
        journalEntry: result.journal_entry_id,
        km: 3.2 // This would be calculated from previous odometer reading
      };

      setTransactions([newTransaction, ...transactions]);

      // Success notification
      alert(`✅ Fuel transaction logged successfully!\n\n` +
            `Transaction ID: ${result.transaction_id}\n` +
            `Journal Entry: ${result.journal_entry_id}\n\n` +
            `Accounting Entry Created:\n` +
            `• Debit: Fuel Expense R ${formData.cost.toFixed(2)}\n` +
            `• Credit: Accounts Payable - ${formData.supplier} R ${formData.cost.toFixed(2)}`);

      // Reset form and close modal
      setFormData({
        date: new Date().toISOString().split('T')[0],
        vehicle: '',
        driver: '',
        litres: 0,
        pricePerLitre: 24.00,
        cost: 0,
        odometer: 0,
        supplier: '',
        invoiceNumber: ''
      });
      setShowModal(false);

    } catch (error) {
      console.error('Error creating fuel transaction:', error);
      alert('❌ Error: Could not create fuel transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EnterpriseLayout
      moduleTitle="⛽ Fuel Management"
      moduleSubtitle="Track fuel costs and efficiency across your fleet"
      breadcrumbs={breadcrumbs}
      tabs={tabs}
      actionButtons={[
        {
          label: '+ Log Fuel Transaction',
          icon: <span>⛽</span>,
          variant: 'primary' as const,
          onClick: () => setShowModal(true)
        }
      ]}
    >
      <div className="metrics-grid">
        <div className="metric-card" style={{ borderLeftColor: '#667eea' }}>
          <div className="metric-header">
            <span className="metric-label">💰 Total Fuel Spend (Nov)</span>
            <span className="metric-icon" style={{ fontSize: '2rem' }}>💰</span>
          </div>
          <div className="metric-value">R {transactions.reduce((sum, t) => sum + t.cost, 0).toLocaleString()}</div>
          <div className="metric-footer">
            <span className="metric-change">{transactions.reduce((sum, t) => sum + t.litres, 0)} litres consumed</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="metric-header">
            <span className="metric-label">📊 Avg Efficiency</span>
            <span className="metric-icon" style={{ fontSize: '2rem' }}>📊</span>
          </div>
          <div className="metric-value">3.8 km/L</div>
          <div className="metric-footer">
            <span className="metric-change success">+0.2 vs last month</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="metric-header">
            <span className="metric-label">⛽ Cost per km</span>
            <span className="metric-icon" style={{ fontSize: '2rem' }}>⛽</span>
          </div>
          <div className="metric-value">R 6.32</div>
          <div className="metric-footer">
            <span className="metric-change">Fleet average</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="metric-header">
            <span className="metric-label">🧾 Transactions</span>
            <span className="metric-icon" style={{ fontSize: '2rem' }}>🧾</span>
          </div>
          <div className="metric-value">{transactions.length}</div>
          <div className="metric-footer">
            <span className="metric-change">This month</span>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">
            <span style={{ marginRight: '0.5rem' }}>📋</span>
            Recent Fuel Transactions
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select className="filter-select" style={{ padding: '0.5rem 1rem' }}>
              <option>All Vehicles</option>
              <option>TRK-001</option>
              <option>TRK-002</option>
              <option>TRK-003</option>
              <option>VAN-001</option>
            </select>
            <button className="action-button">
              📊 Export Report
            </button>
          </div>
        </div>
        <div className="card-content">
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Supplier</th>
                  <th>Invoice #</th>
                  <th>Litres</th>
                  <th>Price/L</th>
                  <th>Total Cost</th>
                  <th>Efficiency</th>
                  <th>Journal Entry</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <strong style={{ color: '#3b82f6' }}>{tx.id}</strong>
                    </td>
                    <td style={{ fontWeight: 500 }}>{new Date(tx.date).toLocaleDateString('en-ZA')}</td>
                    <td>
                      <strong style={{ fontSize: '0.875rem' }}>{tx.vehicle}</strong>
                    </td>
                    <td>{tx.driver}</td>
                    <td style={{ fontSize: '0.875rem' }}>{tx.supplier}</td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{tx.invoiceNumber}</td>
                    <td style={{ fontWeight: 600 }}>{tx.litres}L</td>
                    <td style={{ fontSize: '0.875rem' }}>R {tx.pricePerLitre.toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: '#667eea' }}>R {tx.cost.toLocaleString()}</td>
                    <td>
                      {tx.km && (
                        <span style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.5rem',
                          background: tx.km >= 3.5 ? '#dcfce7' : tx.km >= 3.0 ? '#fef3c7' : '#fee2e2',
                          color: tx.km >= 3.5 ? '#166534' : tx.km >= 3.0 ? '#92400e' : '#991b1b',
                          fontWeight: 700,
                          fontSize: '0.8125rem'
                        }}>
                          {tx.km} km/L
                        </span>
                      )}
                    </td>
                    <td>
                      {tx.journalEntry && (
                        <a 
                          href={`/finance/journal-entries/${tx.journalEntry}`}
                          style={{ 
                            color: '#10b981', 
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            textDecoration: 'none'
                          }}
                        >
                          {tx.journalEntry} →
                        </a>
                      )}
                    </td>
                    <td>
                      <button className="action-button" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}>
                        📄 Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">
            <span style={{ marginRight: '0.5rem' }}>📊</span>
            Fuel Efficiency by Vehicle
          </h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { vehicle: 'TRK-001', registration: 'ABC 123 GP', efficiency: 3.2, status: 'good' },
              { vehicle: 'TRK-002', registration: 'DEF 456 GP', efficiency: 3.5, status: 'excellent' },
              { vehicle: 'TRK-003', registration: 'GHI 789 GP', efficiency: 3.1, status: 'good' },
              { vehicle: 'VAN-001', registration: 'JKL 012 GP', efficiency: 11.2, status: 'excellent' },
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '1.25rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  background: 'white',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                  {item.vehicle}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  {item.registration}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#667eea', marginBottom: '0.25rem' }}>
                  {item.efficiency}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>km/L</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Log Fuel Transaction Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 2rem',
              borderBottom: '2px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                  ⛽ Log Fuel Transaction
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Creates fuel expense entry in financial records
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '0.5rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Date */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem'
                    }}
                  />
                </div>

                {/* Vehicle */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                    Vehicle *
                  </label>
                  <select
                    value={formData.vehicle}
                    onChange={(e) => handleInputChange('vehicle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem'
                    }}
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={`${v.id} (${v.registration})`}>
                        {v.id} - {v.registration}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Driver */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                    Driver *
                  </label>
                  <input
                    type="text"
                    value={formData.driver}
                    onChange={(e) => handleInputChange('driver', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem',
                      background: '#f8fafc'
                    }}
                    readOnly
                    placeholder="Auto-filled from vehicle"
                  />
                </div>

                {/* Fuel Supplier */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                    Fuel Supplier *
                  </label>
                  <select
                    value={formData.supplier}
                    onChange={(e) => handleInputChange('supplier', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem'
                    }}
                  >
                    <option value="">Select Supplier</option>
                    {fuelSuppliers.map((supplier) => (
                      <option key={supplier} value={supplier}>
                        {supplier}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Invoice Number */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                    placeholder="e.g., ENG-20251111-001"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem'
                    }}
                  />
                </div>

                {/* Odometer Reading */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                    Odometer Reading (km) *
                  </label>
                  <input
                    type="number"
                    value={formData.odometer || ''}
                    onChange={(e) => handleInputChange('odometer', parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 145820"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem'
                    }}
                  />
                </div>

                {/* Litres */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                    Litres *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.litres || ''}
                    onChange={(e) => handleInputChange('litres', parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 285.50"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem'
                    }}
                  />
                </div>

                {/* Price per Litre */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>
                    Price per Litre (R) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pricePerLitre || ''}
                    onChange={(e) => handleInputChange('pricePerLitre', parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 24.00"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem'
                    }}
                  />
                </div>
              </div>

              {/* Total Cost (Auto-calculated) */}
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1.25rem', 
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderRadius: '0.75rem',
                border: '2px solid #3b82f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Total Cost (Auto-calculated)
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {formData.litres} L × R {formData.pricePerLitre.toFixed(2)}/L
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e40af' }}>
                    R {formData.cost.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Accounting Info */}
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#f8fafc',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  📒 Automatic Accounting Entry:
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: '1.6' }}>
                  • <strong>Debit:</strong> Fuel Expense (5-20-001) - R {formData.cost.toFixed(2)}<br />
                  • <strong>Credit:</strong> Accounts Payable - {formData.supplier || '[Supplier]'} (2-10-XXX) - R {formData.cost.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem 2rem',
              borderTop: '2px solid #e2e8f0',
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  borderRadius: '0.5rem',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  color: '#64748b'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 2rem',
                  border: 'none',
                  background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? '⏳ Creating Transaction...' : '✓ Log Fuel & Create Journal Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EnterpriseLayout>
  );
};

export default FuelManagement;
