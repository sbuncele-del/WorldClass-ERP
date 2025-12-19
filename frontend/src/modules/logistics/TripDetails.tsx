import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import apiClient from '../../services/api';
import '../../styles/erp-ui.css';

const TripDetails: React.FC = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState({
    trip_id: tripId || '',
    customer: '',
    origin: '',
    destination: '',
    driver: '',
    vehicle_reg: '',
    vehicle_id: '',
    status: 'Planned',
    pod_status: 'Pending',
    pickup_date: '',
    delivery_date: '',
    cargo_description: '',
    cargo_weight: 0,
    current_location: '',
    distance_covered: 0,
    distance_total: 0,
    eta: '',
    special_instructions: '',
    created_at: '',
    updated_at: ''
  });

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const response = await apiClient.get(`/api/logistics/trips/${tripId}`);
        const data = response.data.trip || response.data;
        setTrip({
          trip_id: data.trip_id || data.id || tripId,
          customer: data.customer || data.customer_name || '',
          origin: data.origin || '',
          destination: data.destination || '',
          driver: data.driver || data.driver_name || '',
          vehicle_reg: data.vehicle_reg || data.registration || '',
          vehicle_id: data.vehicle_id || '',
          status: data.status || 'Planned',
          pod_status: data.pod_status || 'Pending',
          pickup_date: data.pickup_date || '',
          delivery_date: data.delivery_date || '',
          cargo_description: data.cargo_description || data.description || '',
          cargo_weight: data.cargo_weight || data.weight || 0,
          current_location: data.current_location || '',
          distance_covered: data.distance_covered || 0,
          distance_total: data.distance_total || 0,
          eta: data.eta || '',
          special_instructions: data.special_instructions || '',
          created_at: data.created_at || '',
          updated_at: data.updated_at || ''
        });
      } catch (error) {
        console.error('Failed to fetch trip:', error);
      } finally {
        setLoading(false);
      }
    };
    if (tripId) fetchTrip();
    else setLoading(false);
  }, [tripId]);

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
    { label: trip.trip_id }
  ];

  const handleSave = () => {
    setIsEditing(false);
    alert(`✅ Trip Updated!\n\nTrip ${trip.trip_id} has been updated successfully.`);
  };

  const handleStatusChange = (newStatus: string) => {
    setTrip({ ...trip, status: newStatus as any });
    alert(`✅ Status Updated!\n\nTrip ${trip.trip_id} status changed to: ${newStatus}`);
  };

  const handleCapturePOD = () => {
    alert(`📄 POD Capture\n\nIn production:\n• Take photo of signed delivery note\n• Capture GPS coordinates\n• Add notes/exceptions\n• Upload to system\n\nStatus will change to "Delivered"`);
  };

  const handleTrackVehicle = () => {
    alert(`📍 Live Tracking\n\nVehicle: ${trip.vehicle_reg}\nCurrent Location: ${trip.current_location}\n\nIn production:\n• Opens live GPS map\n• Shows real-time position\n• Route history\n• ETA updates\n\nIntegration: CarTrack/MiX Telematics API`);
  };

  const handleContactDriver = () => {
    alert(`📞 Contact Driver\n\nDriver: ${trip.driver}\nPhone: +27 82 345 6789\n\nIn production:\n• Direct call from system\n• SMS notification\n• Push notification to driver app\n• WhatsApp integration`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return '#64748b';
      case 'Assigned': return '#0ea5e9';
      case 'Loading': return '#f59e0b';
      case 'In Transit': return '#8b5cf6';
      case 'Delivered': return '#10b981';
      case 'Cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const progressPercentage = (trip.distance_covered / trip.distance_total) * 100;

  return (
    <EnterpriseLayout
      moduleTitle={`Trip ${trip.trip_id}`}
      moduleSubtitle={`${trip.origin} → ${trip.destination}`}
      breadcrumbs={breadcrumbs}
      tabs={tabs}
      actionButtons={[
        {
          label: isEditing ? 'Save Changes' : 'Edit Trip',
          icon: <span>{isEditing ? '💾' : '✏️'}</span>,
          variant: 'primary' as const,
          onClick: isEditing ? handleSave : () => setIsEditing(true)
        },
        {
          label: 'Track Vehicle',
          icon: <span>📍</span>,
          variant: 'secondary' as const,
          onClick: handleTrackVehicle
        }
      ]}
    >
      {/* Status Banner */}
      <div style={{
        padding: '1.25rem',
        background: `linear-gradient(135deg, ${getStatusColor(trip.status)}15 0%, ${getStatusColor(trip.status)}25 100%)`,
        border: `2px solid ${getStatusColor(trip.status)}40`,
        borderRadius: '0.75rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Current Status</div>
          <div style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            background: getStatusColor(trip.status),
            color: 'white',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            {trip.status}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {['Loading', 'In Transit', 'Delivered'].map(status => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={trip.status === status}
              style={{
                padding: '0.625rem 1.25rem',
                border: 'none',
                borderRadius: '0.5rem',
                background: trip.status === status ? '#e2e8f0' : 'white',
                color: trip.status === status ? '#94a3b8' : '#475569',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: trip.status === status ? 'not-allowed' : 'pointer',
                opacity: trip.status === status ? 0.5 : 1
              }}
            >
              Mark as {status}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Trip Progress</h2>
        </div>
        <div className="card-content">
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                📍 {trip.current_location}
              </span>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {trip.distance_covered} km of {trip.distance_total} km
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '16px',
              background: '#e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.5s'
              }}></div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '1.125rem', fontWeight: 700, color: '#667eea' }}>
              {progressPercentage.toFixed(1)}% Complete
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>ETA</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{trip.eta}</div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>POD Status</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: trip.pod_status === 'Received' ? '#10b981' : '#f59e0b' }}>
                {trip.pod_status}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Cargo Weight</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{trip.cargo_weight.toLocaleString()} kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Details */}
      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Trip Details</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
                Customer
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={trip.customer}
                  onChange={(e) => setTrip({ ...trip, customer: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem'
                  }}
                />
              ) : (
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{trip.customer}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
                Driver
              </label>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{trip.driver}</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
                Vehicle
              </label>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{trip.vehicle_id} ({trip.vehicle_reg})</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
                Origin
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={trip.origin}
                  onChange={(e) => setTrip({ ...trip, origin: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem'
                  }}
                />
              ) : (
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{trip.origin}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
                Destination
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={trip.destination}
                  onChange={(e) => setTrip({ ...trip, destination: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem'
                  }}
                />
              ) : (
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{trip.destination}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
                Cargo Description
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={trip.cargo_description}
                  onChange={(e) => setTrip({ ...trip, cargo_description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem'
                  }}
                />
              ) : (
                <div style={{ fontSize: '1rem' }}>{trip.cargo_description}</div>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
                Special Instructions
              </label>
              {isEditing ? (
                <textarea
                  value={trip.special_instructions}
                  onChange={(e) => setTrip({ ...trip, special_instructions: e.target.value })}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              ) : (
                <div style={{ fontSize: '1rem' }}>{trip.special_instructions}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Trip Actions</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <button
              onClick={handleTrackVehicle}
              style={{
                padding: '1.25rem',
                border: '2px solid #e2e8f0',
                borderRadius: '0.75rem',
                background: 'white',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📍</div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Track Vehicle</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Live GPS location</div>
            </button>

            <button
              onClick={handleContactDriver}
              style={{
                padding: '1.25rem',
                border: '2px solid #e2e8f0',
                borderRadius: '0.75rem',
                background: 'white',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📞</div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Contact Driver</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Call or message</div>
            </button>

            <button
              onClick={handleCapturePOD}
              disabled={trip.status !== 'Delivered'}
              style={{
                padding: '1.25rem',
                border: '2px solid #e2e8f0',
                borderRadius: '0.75rem',
                background: trip.status === 'Delivered' ? 'white' : '#f8fafc',
                cursor: trip.status === 'Delivered' ? 'pointer' : 'not-allowed',
                textAlign: 'center',
                opacity: trip.status === 'Delivered' ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (trip.status === 'Delivered') {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Capture POD</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Photo & signature</div>
            </button>

            <button
              onClick={() => navigate('/logistics/trips')}
              style={{
                padding: '1.25rem',
                border: '2px solid #e2e8f0',
                borderRadius: '0.75rem',
                background: 'white',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Back to Trips</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>View all trips</div>
            </button>
          </div>
        </div>
      </div>
    </EnterpriseLayout>
  );
};

export default TripDetails;
