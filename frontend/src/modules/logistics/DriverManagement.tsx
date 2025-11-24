import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaPlus, FaFilePdf, FaUserCheck, FaUserTimes, FaUserClock } from 'react-icons/fa';
import '../../App.css';

interface Driver {
  driver_id: string;
  name: string;
  employee_id: string;
  id_number: string;
  license_type: 'Code 08' | 'Code 10' | 'Code 14';
  prdp_expiry: string;
  medical_expiry: string;
  status: 'Active' | 'On Leave' | 'Inactive' | 'On Trip';
  total_trips: number;
  on_time_rate: number;
  incidents: number;
}

const mockDrivers: Driver[] = [
  { driver_id: 'D001', name: 'John Mthembu', employee_id: 'E1021', id_number: '8501105180085', license_type: 'Code 14', prdp_expiry: '2026-10-15', medical_expiry: '2026-09-20', status: 'On Trip', total_trips: 128, on_time_rate: 98.5, incidents: 1 },
  { driver_id: 'D002', name: 'Sarah Ndlovu', employee_id: 'E1022', id_number: '8803204181083', license_type: 'Code 14', prdp_expiry: '2025-11-25', medical_expiry: '2026-01-15', status: 'Active', total_trips: 95, on_time_rate: 99.2, incidents: 0 },
  { driver_id: 'D003', name: 'Thabo Dlamini', employee_id: 'E1023', id_number: '9011055382089', license_type: 'Code 10', prdp_expiry: '2027-05-30', medical_expiry: '2027-05-30', status: 'Active', total_trips: 210, on_time_rate: 97.8, incidents: 3 },
  { driver_id: 'D004', name: 'Peter Mokoena', employee_id: 'E1024', id_number: '9207155183081', license_type: 'Code 14', prdp_expiry: '2026-02-10', medical_expiry: '2026-02-10', status: 'On Leave', total_trips: 88, on_time_rate: 99.0, incidents: 0 },
  { driver_id: 'D005', name: 'Michael van Wyk', employee_id: 'E1025', id_number: '8204015184086', license_type: 'Code 14', prdp_expiry: '2025-12-08', medical_expiry: '2025-12-01', status: 'Inactive', total_trips: 350, on_time_rate: 95.0, incidents: 8 },
  { driver_id: 'D006', name: 'Bongani Zulu', employee_id: 'E1029', id_number: '9509225837089', license_type: 'Code 14', prdp_expiry: '2027-08-19', medical_expiry: '2027-08-19', status: 'Active', total_trips: 45, on_time_rate: 100, incidents: 0 },
];

const getDaysUntilExpiry = (date: string) => {
  const today = new Date();
  const expiryDate = new Date(date);
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getExpiryColor = (days: number) => {
  if (days < 0) return 'text-red-600 font-bold';
  if (days <= 30) return 'text-orange-500 font-bold';
  return 'text-gray-500';
};

const DriverManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredDrivers = useMemo(() => {
    return mockDrivers.filter(driver => {
      const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            driver.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            driver.id_number.includes(searchTerm);
      const matchesStatus = statusFilter === 'All' || driver.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const summaryStats = useMemo(() => ({
    total: mockDrivers.length,
    active: mockDrivers.filter(d => d.status === 'Active').length,
    onTrip: mockDrivers.filter(d => d.status === 'On Trip').length,
    onLeave: mockDrivers.filter(d => d.status === 'On Leave').length,
    expiringSoon: mockDrivers.filter(d => getDaysUntilExpiry(d.prdp_expiry) <= 30 || getDaysUntilExpiry(d.medical_expiry) <= 30).length,
  }), []);

  const renderStatusIcon = (status: Driver['status']) => {
    switch (status) {
      case 'Active': return <FaUserCheck className="text-green-500" title="Active" />;
      case 'On Trip': return <FaUserClock className="text-blue-500" title="On Trip" />;
      case 'On Leave': return <FaUserClock className="text-yellow-500" title="On Leave" />;
      case 'Inactive': return <FaUserTimes className="text-red-500" title="Inactive" />;
      default: return null;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Driver Management</h1>
        <div className="page-actions">
          <Link to="/hr/employees/new" className="btn btn-primary">
            <FaPlus className="mr-2" /> Add New Driver
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="summary-card">
          <h3 className="summary-card-title">Total Drivers</h3>
          <p className="summary-card-value">{summaryStats.total}</p>
        </div>
        <div className="summary-card">
          <h3 className="summary-card-title">Available & Active</h3>
          <p className="summary-card-value">{summaryStats.active}</p>
        </div>
        <div className="summary-card">
          <h3 className="summary-card-title">On Trip</h3>
          <p className="summary-card-value">{summaryStats.onTrip}</p>
        </div>
        <div className="summary-card">
          <h3 className="summary-card-title">On Leave</h3>
          <p className="summary-card-value">{summaryStats.onLeave}</p>
        </div>
        <div className="summary-card-alert">
          <h3 className="summary-card-title">Docs Expiring Soon</h3>
          <p className="summary-card-value">{summaryStats.expiringSoon}</p>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <div className="table-search">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, employee ID, or ID number..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="table-filters">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Trip">On Trip</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Driver Name</th>
              <th>Employee ID</th>
              <th>License</th>
              <th>PrDP Expiry</th>
              <th>Medical Expiry</th>
              <th>Performance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map((driver) => {
              const prdpDays = getDaysUntilExpiry(driver.prdp_expiry);
              const medicalDays = getDaysUntilExpiry(driver.medical_expiry);
              return (
                <tr key={driver.driver_id}>
                  <td className="text-center">{renderStatusIcon(driver.status)}</td>
                  <td>
                    <Link to={`/hr/employees/${driver.employee_id}`} className="font-semibold text-blue-600 hover:underline">
                      {driver.name}
                    </Link>
                    <div className="text-xs text-gray-500">{driver.id_number}</div>
                  </td>
                  <td>{driver.employee_id}</td>
                  <td>
                    <span className="badge badge-blue">{driver.license_type}</span>
                  </td>
                  <td className={getExpiryColor(prdpDays)}>
                    {new Date(driver.prdp_expiry).toLocaleDateString()}
                    {prdpDays < 0 ? ` (Expired)`: ` (${prdpDays} days)`}
                  </td>
                  <td className={getExpiryColor(medicalDays)}>
                    {new Date(driver.medical_expiry).toLocaleDateString()}
                    {medicalDays < 0 ? ` (Expired)`: ` (${medicalDays} days)`}
                  </td>
                  <td>
                    <div className="text-sm">On-Time: {driver.on_time_rate}%</div>
                    <div className="text-xs text-gray-500">Incidents: {driver.incidents}</div>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button className="btn-icon" title="View Documents"><FaFilePdf /></button>
                      <button className="btn-icon" title="Edit Driver">✏️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DriverManagement;
