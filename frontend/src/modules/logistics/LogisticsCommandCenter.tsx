import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import '../../styles/erp-ui.css';

interface FleetKPI {
  inTransit: number;
  idle: number;
  loading: number;
  maintenance: number;
  total: number;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'maintenance' | 'license' | 'delay' | 'fuel' | 'route';
  title: string;
  message: string;
  vehicleId?: string;
  vehicleNumber?: string;
  timestamp: string;
  actionable: boolean;
}

interface LiveVehicle {
  id: string;
  number: string;
  registration: string;
  driver: string;
  status: 'on-time' | 'delayed' | 'idle' | 'at-risk';
  location: { lat: number; lng: number };
  locationName: string;
  destination: string;
  tripNumber: string;
  eta: string;
  fuelLevel: number;
  speed: number;
  loadPercentage: number;
  delayMinutes?: number;
}

interface PredictiveInsight {
  type: 'route' | 'maintenance' | 'fuel' | 'efficiency';
  severity: 'high' | 'medium' | 'low';
  vehicle: string;
  message: string;
  recommendation: string;
  potentialSavings?: string;
}

const LogisticsCommandCenter: React.FC = () => {
  const [fleetKPI, setFleetKPI] = useState<FleetKPI>({
    inTransit: 28,
    idle: 12,
    loading: 5,
    maintenance: 3,
    total: 48
  });

  const [onTimePerformance, setOnTimePerformance] = useState(87.5);
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'A001',
      type: 'critical',
      category: 'maintenance',
      title: 'Overdue Maintenance',
      message: 'TRK-015 is 450km overdue for scheduled service',
      vehicleId: '15',
      vehicleNumber: 'TRK-015',
      timestamp: '2 hours ago',
      actionable: true
    },
    {
      id: 'A002',
      type: 'critical',
      category: 'delay',
      title: 'Severe Delay',
      message: 'TRIP-2025-089 is running 2.5 hours behind schedule',
      vehicleId: '7',
      vehicleNumber: 'TRK-007',
      timestamp: '15 minutes ago',
      actionable: true
    },
    {
      id: 'A003',
      type: 'warning',
      category: 'maintenance',
      title: 'Maintenance Due This Week',
      message: 'TRK-023 service due in 3 days (in 280km)',
      vehicleId: '23',
      vehicleNumber: 'TRK-023',
      timestamp: '1 hour ago',
      actionable: true
    },
    {
      id: 'A004',
      type: 'warning',
      category: 'license',
      title: 'License Expiring Soon',
      message: 'Driver John Mthembu - PDP expires in 12 days',
      timestamp: '3 hours ago',
      actionable: true
    },
    {
      id: 'A005',
      type: 'warning',
      category: 'delay',
      title: 'At Risk of Delay',
      message: 'TRIP-2025-092 may be delayed due to heavy traffic on N3',
      vehicleId: '12',
      vehicleNumber: 'TRK-012',
      timestamp: '30 minutes ago',
      actionable: true
    },
    {
      id: 'A006',
      type: 'critical',
      category: 'fuel',
      title: 'Excessive Idling Detected',
      message: 'TRK-031 has been idling for 45 minutes - fuel waste detected',
      vehicleId: '31',
      vehicleNumber: 'TRK-031',
      timestamp: '10 minutes ago',
      actionable: true
    }
  ]);

  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([
    {
      id: '1',
      number: 'TRK-001',
      registration: 'ABC 123 GP',
      driver: 'John Mthembu',
      status: 'on-time',
      location: { lat: -25.7479, lng: 28.2293 },
      locationName: 'N1 North, near Pretoria',
      destination: 'Polokwane Distribution Center',
      tripNumber: 'TRIP-2025-087',
      eta: '14:30',
      fuelLevel: 78,
      speed: 95,
      loadPercentage: 100
    },
    {
      id: '7',
      number: 'TRK-007',
      registration: 'GHI 789 GP',
      driver: 'Sarah Ndlovu',
      status: 'delayed',
      location: { lat: -29.0852, lng: 26.1596 },
      locationName: 'N3, approaching Harrismith',
      destination: 'Cape Town Warehouse',
      tripNumber: 'TRIP-2025-089',
      eta: '18:45',
      fuelLevel: 45,
      speed: 65,
      loadPercentage: 95,
      delayMinutes: 150
    },
    {
      id: '12',
      number: 'TRK-012',
      registration: 'JKL 012 GP',
      driver: 'Thabo Dlamini',
      status: 'at-risk',
      location: { lat: -29.8587, lng: 31.0218 },
      locationName: 'N3, near Durban',
      destination: 'Richards Bay Port',
      tripNumber: 'TRIP-2025-092',
      eta: '15:15',
      fuelLevel: 62,
      speed: 45,
      loadPercentage: 88
    },
    {
      id: '18',
      number: 'TRK-018',
      registration: 'MNO 345 GP',
      driver: 'Lindiwe Khumalo',
      status: 'on-time',
      location: { lat: -26.2041, lng: 28.0473 },
      locationName: 'Johannesburg CBD',
      destination: 'Soweto Distribution Hub',
      tripNumber: 'TRIP-2025-094',
      eta: '12:00',
      fuelLevel: 91,
      speed: 40,
      loadPercentage: 75
    },
    {
      id: '31',
      number: 'TRK-031',
      registration: 'PQR 678 GP',
      driver: 'Sipho Mokoena',
      status: 'idle',
      location: { lat: -26.1076, lng: 28.0567 },
      locationName: 'Warehouse A - Johannesburg',
      destination: 'Not Assigned',
      tripNumber: 'N/A',
      eta: 'N/A',
      fuelLevel: 55,
      speed: 0,
      loadPercentage: 0
    }
  ]);

  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([
    {
      type: 'route',
      severity: 'high',
      vehicle: 'TRK-012',
      message: 'Based on current traffic patterns, TRIP-2025-092 is at high risk of delay',
      recommendation: 'Suggest alternative route via R34 to avoid N3 congestion',
      potentialSavings: '45 minutes'
    },
    {
      type: 'maintenance',
      severity: 'high',
      vehicle: 'TRK-015',
      message: 'Engine diagnostics show deteriorating fuel efficiency (15% below fleet average)',
      recommendation: 'Schedule immediate inspection - injector cleaning recommended'
    },
    {
      type: 'fuel',
      severity: 'medium',
      vehicle: 'TRK-031',
      message: 'Excessive idling detected - 45 minutes idle time today',
      recommendation: 'Driver coaching on idle reduction protocols',
      potentialSavings: 'R 145/day'
    },
    {
      type: 'efficiency',
      severity: 'medium',
      vehicle: 'TRK-007',
      message: 'Aggressive driving patterns detected - harsh braking increased 30%',
      recommendation: 'Schedule driver training session on fuel-efficient driving'
    }
  ]);

  const tabs = [
    { id: 'command', label: '🎯 Command Center', path: '/logistics/dashboard' },
    { id: 'planner', label: '📋 Load Planner', path: '/logistics/planner' },
    { id: 'trips', label: '🚚 Trip Management', path: '/logistics/trips' },
    { id: 'fleet', label: '🚛 Fleet', path: '/logistics/fleet' },
    { id: 'drivers', label: '👨‍✈️ Drivers', path: '/logistics/drivers' },
    { id: 'fuel', label: '⛽ Fuel', path: '/logistics/fuel' },
    { id: 'documents', label: '📄 Documents', path: '/logistics/documents' },
    { id: 'reports', label: '📊 Analytics', path: '/logistics/reports' }
  ];

  const breadcrumbs = [
    { label: 'Logistics', path: '/logistics' },
    { label: 'Command Center' }
  ];

  return (
    <EnterpriseLayout
      moduleTitle="🎯 Logistics Command Center"
      moduleSubtitle="Real-time fleet monitoring & dispatch control"
      breadcrumbs={breadcrumbs}
      tabs={tabs}
      actionButtons={[
        {
          label: '📄 Process Document',
          icon: <span>📄</span>,
          variant: 'primary' as const,
          onClick: () => window.location.href = '/logistics/documents'
        },
        {
          label: '+ Dispatch Trip',
          icon: <span>🚚</span>,
          variant: 'secondary' as const,
          onClick: () => window.location.href = '/logistics/trips/new'
        },
        {
          label: 'Optimize Routes',
          icon: <span>🗺️</span>,
          variant: 'secondary' as const,
          onClick: () => window.location.href = '/logistics/planning'
        }
      ]}
    >
      {/* Simple, Clean KPIs */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="metric-header">
            <span className="metric-label">🚛 Active Trucks on Road</span>
            <span className="metric-icon" style={{ fontSize: '2.5rem' }}>🚛</span>
          </div>
          <div className="metric-value">28</div>
          <div className="metric-footer">
            <span className="metric-change" style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Currently making deliveries
            </span>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              12 idle · 5 loading · 3 in workshop
            </div>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="metric-header">
            <span className="metric-label">📦 Deliveries Today</span>
            <span className="metric-icon" style={{ fontSize: '2.5rem' }}>📦</span>
          </div>
          <div className="metric-value">35</div>
          <div className="metric-footer">
            <span className="metric-change success" style={{ fontSize: '0.875rem' }}>
              Scheduled delivery trips
            </span>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              18 en route · 12 completed · 5 pending
            </div>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="metric-header">
            <span className="metric-label">⏱️ On-Time Delivery Rate</span>
            <span className="metric-icon" style={{ fontSize: '2.5rem' }}>⏱️</span>
          </div>
          <div className="metric-value">87.5%</div>
          <div className="metric-footer">
            <span className="metric-change warning" style={{ fontSize: '0.875rem' }}>
              Of deliveries arrive on time
            </span>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Target: 95% · Gap: -7.5%
            </div>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#ef4444' }}>
          <div className="metric-header">
            <span className="metric-label">🚨 Urgent Issues</span>
            <span className="metric-icon" style={{ fontSize: '2.5rem' }}>🚨</span>
          </div>
          <div className="metric-value">6</div>
          <div className="metric-footer">
            <span className="metric-change danger" style={{ fontSize: '0.875rem' }}>
              Require immediate attention
            </span>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              2 overdue service · 3 delays · 1 license
            </div>
          </div>
        </div>
      </div>

      {/* Live Map */}
      <div className="content-card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">
            <span style={{ marginRight: '0.5rem' }}>🗺️</span>
            Live Fleet Tracking
            <span style={{ 
              marginLeft: '0.75rem', 
              padding: '0.25rem 0.75rem', 
              background: '#ef4444', 
              color: 'white', 
              borderRadius: '50px', 
              fontSize: '0.75rem',
              fontWeight: 700
            }}>● LIVE</span>
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="action-button">🔄 Refresh</button>
            <button className="action-button primary">⛶ Full Screen</button>
          </div>
        </div>
        <div className="card-content">
          <div style={{ 
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', 
            borderRadius: '12px', 
            padding: '3rem 2rem', 
            textAlign: 'center',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🗺️</div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                color: '#334155', 
                marginBottom: '0.75rem'
              }}>
                GPS Telematics Integration
              </h3>
              <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1rem' }}>
                Connect your GPS provider for real-time vehicle tracking
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: 'white', 
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#475569',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  🛰️ Cartrack
                </div>
                <div style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: 'white', 
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#475569',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  📡 MiX Telematics
                </div>
                <div style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: 'white', 
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#475569',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  🌐 Ctrack
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column: Alerts + Active Vehicles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Critical Alerts */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">
              <span style={{ marginRight: '0.5rem' }}>🔔</span>
              Critical Alerts
            </h2>
          </div>
          <div className="card-content" style={{ padding: '0' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Alert Item */}
              <div style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
              onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                <div style={{ fontSize: '1.5rem' }}>🔧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                    TRK-015 Overdue Maintenance
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    450km overdue for service
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
              onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                <div style={{ fontSize: '1.5rem' }}>⏰</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                    TRIP-089 Delayed
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    2.5 hours behind schedule
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#fffbeb'}
              onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                    TRK-023 Service Due Soon
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    Due in 3 days (280km remaining)
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#fffbeb'}
              onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                <div style={{ fontSize: '1.5rem' }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                    License Expiring
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    John Mthembu - PDP expires in 12 days
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#fffbeb'}
              onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                <div style={{ fontSize: '1.5rem' }}>🚨</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                    TRIP-092 At Risk
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    Heavy traffic on N3 - possible delay
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: '1rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
              onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                <div style={{ fontSize: '1.5rem' }}>⛽</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                    Excessive Idling
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    TRK-031 idling for 45 minutes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Vehicles */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">
              <span style={{ marginRight: '0.5rem' }}>🚚</span>
              Active Vehicles (5)
            </h2>
          </div>
          <div className="card-content">
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Destination</th>
                    <th>ETA</th>
                    <th>Load</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>TRK-001</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ABC 123 GP</div>
                    </td>
                    <td>John Mthembu</td>
                    <td>
                      <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        ON TIME
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>📍 N1 North, Pretoria</td>
                    <td>Polokwane</td>
                    <td style={{ fontWeight: 600 }}>14:30</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: '100%', height: '100%', background: '#10b981' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>100%</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>TRK-007</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>GHI 789 GP</div>
                    </td>
                    <td>Sarah Ndlovu</td>
                    <td>
                      <span className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        DELAYED
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>📍 N3, Harrismith</td>
                    <td>Cape Town</td>
                    <td style={{ fontWeight: 600, color: '#ef4444' }}>18:45</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: '95%', height: '100%', background: '#f59e0b' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>95%</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>TRK-012</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>JKL 012 GP</div>
                    </td>
                    <td>Thabo Dlamini</td>
                    <td>
                      <span className="status-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        AT RISK
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>📍 N3, Durban</td>
                    <td>Richards Bay</td>
                    <td style={{ fontWeight: 600 }}>15:15</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: '88%', height: '100%', background: '#3b82f6' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>88%</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>TRK-018</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>MNO 345 GP</div>
                    </td>
                    <td>Lindiwe Khumalo</td>
                    <td>
                      <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        ON TIME
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>📍 Johannesburg CBD</td>
                    <td>Soweto Hub</td>
                    <td style={{ fontWeight: 600 }}>12:00</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: '75%', height: '100%', background: '#667eea' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>75%</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>TRK-031</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>PQR 678 GP</div>
                    </td>
                    <td>Sipho Mokoena</td>
                    <td>
                      <span className="status-badge" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b' }}>
                        IDLE
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>📍 Warehouse A, JHB</td>
                    <td>-</td>
                    <td style={{ fontWeight: 600 }}>-</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: '0%', height: '100%', background: '#64748b' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>0%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </EnterpriseLayout>
  );
};

export default LogisticsCommandCenter;
