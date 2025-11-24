import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/erp-ui.css';

interface Vehicle {
  vehicle_id: number;
  vehicle_number: string;
  registration_number: string;
  make: string;
  model: string;
  vehicle_type: string;
  year_of_manufacture: number;
  status: string;
  current_driver: string;
  last_service_date: string;
  next_service_date: string;
  next_service_km: number;
  current_odometer: number;
  license_expiry: string;
  roadworthy_expiry: string;
  insurance_expiry: string;
}

const FleetManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockVehicles: Vehicle[] = [
        {
          vehicle_id: 1,
          vehicle_number: 'TRK-001',
          registration_number: 'ABC 123 GP',
          make: 'Mercedes-Benz',
          model: 'Actros 2646',
          vehicle_type: 'TRUCK',
          year_of_manufacture: 2022,
          status: 'ACTIVE',
          current_driver: 'John Mthembu',
          last_service_date: '2025-09-15',
          next_service_date: '2025-12-15',
          next_service_km: 195000,
          current_odometer: 185420,
          license_expiry: '2026-03-20',
          roadworthy_expiry: '2025-11-30',
          insurance_expiry: '2026-02-15'
        },
        {
          vehicle_id: 2,
          vehicle_number: 'TRK-002',
          registration_number: 'DEF 456 GP',
          make: 'Volvo',
          model: 'FH16',
          vehicle_type: 'TRUCK',
          year_of_manufacture: 2021,
          status: 'ACTIVE',
          current_driver: 'Sarah Ndlovu',
          last_service_date: '2025-10-01',
          next_service_date: '2026-01-01',
          next_service_km: 220000,
          current_odometer: 212350,
          license_expiry: '2026-05-10',
          roadworthy_expiry: '2026-01-15',
          insurance_expiry: '2025-12-20'
        },
        {
          vehicle_id: 3,
          vehicle_number: 'TRK-003',
          registration_number: 'GHI 789 GP',
          make: 'Scania',
          model: 'R500',
          vehicle_type: 'TRUCK',
          year_of_manufacture: 2020,
          status: 'MAINTENANCE',
          current_driver: '-',
          last_service_date: '2025-08-20',
          next_service_date: '2025-11-20',
          next_service_km: 175000,
          current_odometer: 176340,
          license_expiry: '2025-11-15',
          roadworthy_expiry: '2025-11-10',
          insurance_expiry: '2026-04-30'
        },
        {
          vehicle_id: 4,
          vehicle_number: 'VAN-001',
          registration_number: 'JKL 012 GP',
          make: 'Mercedes-Benz',
          model: 'Sprinter 519',
          vehicle_type: 'VAN',
          year_of_manufacture: 2023,
          status: 'ACTIVE',
          current_driver: 'Thabo Dlamini',
          last_service_date: '2025-10-10',
          next_service_date: '2026-01-10',
          next_service_km: 35000,
          current_odometer: 28450,
          license_expiry: '2026-08-20',
          roadworthy_expiry: '2026-03-15',
          insurance_expiry: '2026-06-30'
        },
        {
          vehicle_id: 5,
          vehicle_number: 'BKK-001',
          registration_number: 'MNO 345 GP',
          make: 'Toyota',
          model: 'Hilux 2.8GD',
          vehicle_type: 'BAKKIE',
          year_of_manufacture: 2024,
          status: 'ACTIVE',
          current_driver: 'Peter Mokoena',
          last_service_date: '2025-09-25',
          next_service_date: '2025-12-25',
          next_service_km: 25000,
          current_odometer: 18920,
          license_expiry: '2027-01-10',
          roadworthy_expiry: '2026-09-20',
          insurance_expiry: '2026-03-15'
        }
      ];

      setVehicles(mockVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#10b981';
      case 'MAINTENANCE':
        return '#f59e0b';
      case 'OUT_OF_SERVICE':
        return '#ef4444';
      case 'SOLD':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryColor = (days: number) => {
    if (days < 0) return '#ef4444'; // Expired - Red
    if (days <= 30) return '#f59e0b'; // Expiring soon - Orange
    return '#10b981'; // Good - Green
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesFilter = filter === 'ALL' || vehicle.status === filter;
    const matchesSearch =
      searchTerm === '' ||
      vehicle.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">🚚 Fleet Management</h1>
          <p className="dashboard-subtitle">Manage vehicles, maintenance, and documents</p>
        </div>
        <button className="action-button primary">+ Add Vehicle</button>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="metric-card" style={{ borderLeftColor: '#667eea' }}>
          <div className="metric-value">{vehicles.length}</div>
          <div className="metric-label">Total Vehicles</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="metric-value">{vehicles.filter(v => v.status === 'ACTIVE').length}</div>
          <div className="metric-label">Active</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="metric-value">{vehicles.filter(v => v.status === 'MAINTENANCE').length}</div>
          <div className="metric-label">In Maintenance</div>
        </div>
        <div className="metric-card" style={{ borderLeftColor: '#ef4444' }}>
          <div className="metric-value">
            {vehicles.filter(v => getDaysUntilExpiry(v.license_expiry) <= 30).length}
          </div>
          <div className="metric-label">Expiring Soon</div>
        </div>
      </div>

      {/* Filters */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-content">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <input
                type="text"
                placeholder="🔍 Search by vehicle number, registration, make, or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['ALL', 'ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className="filter-button"
                  style={{
                    padding: '0.5rem 1rem',
                    border: filter === status ? '2px solid #667eea' : '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    background: filter === status ? '#eff6ff' : 'white',
                    color: filter === status ? '#667eea' : '#64748b',
                    fontSize: '0.875rem',
                    fontWeight: filter === status ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="content-card">
        <div className="card-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading vehicles...
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚚</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No vehicles found</h3>
              <p>Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Make & Model</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Current Driver</th>
                    <th>Odometer</th>
                    <th>Next Service</th>
                    <th>License Expiry</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => {
                    const licenseDays = getDaysUntilExpiry(vehicle.license_expiry);
                    const roadworthyDays = getDaysUntilExpiry(vehicle.roadworthy_expiry);
                    const insuranceDays = getDaysUntilExpiry(vehicle.insurance_expiry);
                    const kmToService = vehicle.next_service_km - vehicle.current_odometer;

                    return (
                      <tr key={vehicle.vehicle_id}>
                        <td>
                          <div>
                            <strong style={{ fontSize: '0.875rem' }}>{vehicle.vehicle_number}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {vehicle.registration_number}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.875rem' }}>
                            {vehicle.make} {vehicle.model}
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {vehicle.year_of_manufacture}
                            </div>
                          </div>
                        </td>
                        <td>{vehicle.vehicle_type}</td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: getStatusColor(vehicle.status) + '20',
                              color: getStatusColor(vehicle.status)
                            }}
                          >
                            {vehicle.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{vehicle.current_driver}</td>
                        <td>
                          <div style={{ fontSize: '0.875rem' }}>
                            {vehicle.current_odometer.toLocaleString()} km
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.875rem' }}>
                            {new Date(vehicle.next_service_date).toLocaleDateString('en-ZA')}
                            <div style={{ fontSize: '0.75rem', color: kmToService < 1000 ? '#f59e0b' : '#64748b' }}>
                              {kmToService.toLocaleString()} km to go
                            </div>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              fontSize: '0.875rem',
                              color: getExpiryColor(licenseDays),
                              fontWeight: licenseDays <= 30 ? 600 : 400
                            }}
                          >
                            {new Date(vehicle.license_expiry).toLocaleDateString('en-ZA')}
                            <div style={{ fontSize: '0.75rem' }}>
                              {licenseDays < 0 ? 'EXPIRED' : `${licenseDays} days`}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="action-button"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="action-button"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              📄 Docs
                            </button>
                            <button
                              className="action-button"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              🔧 Service
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FleetManagement;
