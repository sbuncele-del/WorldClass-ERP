import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import '../../styles/erp-ui.css';

const CreateTrip: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer: '',
    origin: '',
    destination: '',
    driver_id: '',
    vehicle_id: '',
    pickup_date: '',
    delivery_date: '',
    cargo_description: '',
    cargo_weight: '',
    special_instructions: ''
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
    { label: 'Trip Management', path: '/logistics/trips' },
    { label: 'Create New Trip' }
  ];

  const mockDrivers = [
    { id: 'D001', name: 'John Mthembu', vehicle: 'TRK-001 (ABC 123 GP)' },
    { id: 'D002', name: 'Sarah Ndlovu', vehicle: 'TRK-002 (DEF 456 GP)' },
    { id: 'D003', name: 'Thabo Dlamini', vehicle: 'TRK-003 (GHI 789 GP)' },
    { id: 'D004', name: 'Peter Mokoena', vehicle: 'VAN-001 (JKL 012 GP)' },
    { id: 'D005', name: 'Bongani Zulu', vehicle: 'BKK-001 (MNO 345 GP)' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate trip creation
    const tripId = `TRP-2025-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`;
    
    alert(`✅ Trip Created Successfully!\n\nTrip ID: ${tripId}\nCustomer: ${formData.customer}\nRoute: ${formData.origin} → ${formData.destination}\nDriver: ${mockDrivers.find(d => d.id === formData.driver_id)?.name}\n\nThe trip has been assigned and the driver has been notified.`);
    
    // Navigate back to trips list
    navigate('/logistics/trips');
  };

  return (
    <EnterpriseLayout
      moduleTitle="Create New Trip"
      moduleSubtitle="Plan and assign delivery trip"
      breadcrumbs={breadcrumbs}
      tabs={tabs}
    >
      <form onSubmit={handleSubmit}>
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Trip Details</h2>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Customer */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  Customer <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                >
                  <option value="">Select customer...</option>
                  <option value="Massmart">Massmart</option>
                  <option value="Shoprite">Shoprite</option>
                  <option value="Pick n Pay">Pick n Pay</option>
                  <option value="Unilever">Unilever</option>
                  <option value="SPAR">SPAR</option>
                  <option value="Sasol">Sasol</option>
                </select>
              </div>

              {/* Origin */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  Origin <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  required
                  placeholder="e.g., JHB Distribution Center"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Destination */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  Destination <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Cape Town DC"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Driver/Vehicle */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  Assign Driver & Vehicle <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  name="driver_id"
                  value={formData.driver_id}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                >
                  <option value="">Select driver...</option>
                  {mockDrivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} - {driver.vehicle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pickup Date */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  Pickup Date & Time <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  name="pickup_date"
                  value={formData.pickup_date}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Delivery Date */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  Expected Delivery <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  name="delivery_date"
                  value={formData.delivery_date}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Cargo Weight */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  Cargo Weight (kg) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  name="cargo_weight"
                  value={formData.cargo_weight}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 12000"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Cargo Description */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  Cargo Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="cargo_description"
                  value={formData.cargo_description}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Palletized groceries - ambient goods"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Special Instructions */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                  Special Instructions
                </label>
                <textarea
                  name="special_instructions"
                  value={formData.special_instructions}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g., Requires refrigeration, fragile items, gate code: 1234"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => navigate('/logistics/trips')}
            style={{
              padding: '0.875rem 2rem',
              border: '2px solid #e2e8f0',
              borderRadius: '0.75rem',
              background: 'white',
              color: '#64748b',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '0.875rem 2rem',
              border: 'none',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            📋 Create Trip
          </button>
        </div>
      </form>
    </EnterpriseLayout>
  );
};

export default CreateTrip;
