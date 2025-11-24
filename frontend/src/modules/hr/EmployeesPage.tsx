import React, { useState, useEffect } from 'react';
import '../../styles/erp-ui.css';

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  id_number: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: 'ACTIVE' | 'PROBATION' | 'NOTICE' | 'SUSPENDED' | 'TERMINATED';
  employment_type: 'PERMANENT' | 'CONTRACT' | 'TEMPORARY' | 'INTERN';
  hire_date: string;
  basic_salary: number;
  leave_balance: number;
  manager: string;
}

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const mockEmployees: Employee[] = [
        {
          id: 'EMP001',
          employee_number: 'E2023-001',
          first_name: 'Thabo',
          last_name: 'Mkhize',
          id_number: '8501155234081',
          email: 'thabo.mkhize@company.co.za',
          phone: '+27 82 345 6789',
          department: 'Operations',
          position: 'Operations Manager',
          status: 'ACTIVE',
          employment_type: 'PERMANENT',
          hire_date: '2023-03-15',
          basic_salary: 45000,
          leave_balance: 12,
          manager: 'Sarah van der Merwe'
        },
        {
          id: 'EMP002',
          employee_number: 'E2024-015',
          first_name: 'Nomvula',
          last_name: 'Dlamini',
          id_number: '9208123456089',
          email: 'nomvula.dlamini@company.co.za',
          phone: '+27 71 234 5678',
          department: 'Sales & Marketing',
          position: 'Sales Executive',
          status: 'ACTIVE',
          employment_type: 'PERMANENT',
          hire_date: '2024-02-01',
          basic_salary: 32000,
          leave_balance: 15,
          manager: 'Johan Botha'
        },
        {
          id: 'EMP003',
          employee_number: 'E2024-022',
          first_name: 'Pieter',
          last_name: 'Kruger',
          id_number: '9505208765432',
          email: 'pieter.kruger@company.co.za',
          phone: '+27 83 456 7890',
          department: 'IT & Development',
          position: 'Senior Developer',
          status: 'PROBATION',
          employment_type: 'PERMANENT',
          hire_date: '2024-09-01',
          basic_salary: 55000,
          leave_balance: 2,
          manager: 'Sarah van der Merwe'
        },
        {
          id: 'EMP004',
          employee_number: 'C2024-008',
          first_name: 'Zanele',
          last_name: 'Nkosi',
          id_number: '9712156789012',
          email: 'zanele.nkosi@company.co.za',
          phone: '+27 76 789 0123',
          department: 'Finance',
          position: 'Accountant',
          status: 'ACTIVE',
          employment_type: 'CONTRACT',
          hire_date: '2024-01-10',
          basic_salary: 38000,
          leave_balance: 8,
          manager: 'Thabo Mkhize'
        },
        {
          id: 'EMP005',
          employee_number: 'E2023-045',
          first_name: 'Johan',
          last_name: 'Botha',
          id_number: '8709127890123',
          email: 'johan.botha@company.co.za',
          phone: '+27 84 567 8901',
          department: 'Sales & Marketing',
          position: 'Sales Director',
          status: 'NOTICE',
          employment_type: 'PERMANENT',
          hire_date: '2023-06-20',
          basic_salary: 62000,
          leave_balance: 5,
          manager: 'CEO'
        }
      ];

      setEmployees(mockEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
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

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'ACTIVE': 'green',
      'PROBATION': 'blue',
      'NOTICE': 'orange',
      'SUSPENDED': 'red',
      'TERMINATED': 'gray'
    };
    return colors[status] || 'gray';
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'ALL' || emp.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
  const totalPayroll = employees.filter(e => e.status === 'ACTIVE').reduce((sum, e) => sum + e.basic_salary, 0);
  const avgSalary = activeEmployees > 0 ? totalPayroll / activeEmployees : 0;

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="content-card">
        <div className="card-header">
          <h2>👥 Employee Management</h2>
          <button className="btn-primary">+ New Employee</button>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search employees by name, number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button 
              className={filterStatus === 'ALL' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('ALL')}
            >
              All
            </button>
            <button 
              className={filterStatus === 'ACTIVE' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('ACTIVE')}
            >
              Active
            </button>
            <button 
              className={filterStatus === 'PROBATION' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('PROBATION')}
            >
              Probation
            </button>
            <button 
              className={filterStatus === 'NOTICE' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('NOTICE')}
            >
              Notice Period
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee #</th>
                <th>Name</th>
                <th>ID Number</th>
                <th>Department</th>
                <th>Position</th>
                <th>Status</th>
                <th>Type</th>
                <th>Basic Salary</th>
                <th>Leave Balance</th>
                <th>Hire Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td className="code-cell">{emp.employee_number}</td>
                  <td>
                    <div className="employee-name">
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div className="employee-email">{emp.email}</div>
                  </td>
                  <td>{emp.id_number}</td>
                  <td>{emp.department}</td>
                  <td>{emp.position}</td>
                  <td>
                    <span className={`status-badge status-${getStatusColor(emp.status)}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td>{emp.employment_type}</td>
                  <td className="amount-cell">{formatCurrency(emp.basic_salary)}</td>
                  <td className="text-center">{emp.leave_balance} days</td>
                  <td>{new Date(emp.hire_date).toLocaleDateString('en-ZA')}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="View Profile">👁️</button>
                      <button className="btn-icon" title="Edit">✏️</button>
                      <button className="btn-icon" title="Payslip">💰</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="empty-state">
            <p>No employees found matching your criteria.</p>
          </div>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Employees</div>
          <div className="metric-value">{totalEmployees}</div>
          <div className="metric-detail">{activeEmployees} active</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Monthly Payroll</div>
          <div className="metric-value">{formatCurrency(totalPayroll)}</div>
          <div className="metric-detail">Basic salaries only</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Average Salary</div>
          <div className="metric-value">{formatCurrency(avgSalary)}</div>
          <div className="metric-detail">Per employee</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Departments</div>
          <div className="metric-value">{new Set(employees.map(e => e.department)).size}</div>
          <div className="metric-detail">Active units</div>
        </div>
      </div>
    </div>
  );
};

export default EmployeesPage;
