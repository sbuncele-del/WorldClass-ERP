import React, { useState, useEffect } from 'react';
import '../../styles/erp-ui.css';

interface SalesOrder {
  order_id: number;
  order_number: string;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  total_amount: number;
  status: 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  payment_status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  items_count: number;
}

const SalesOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      setOrders([
        {
          order_id: 1,
          order_number: 'SO-2025-001',
          customer_name: 'Acme Corporation',
          order_date: '2025-11-01',
          delivery_date: '2025-11-15',
          total_amount: 450000,
          status: 'SHIPPED',
          payment_status: 'PAID',
          items_count: 5
        },
        {
          order_id: 2,
          order_number: 'SO-2025-002',
          customer_name: 'TechStart Solutions',
          order_date: '2025-11-03',
          delivery_date: '2025-11-17',
          total_amount: 285000,
          status: 'PROCESSING',
          payment_status: 'PARTIAL',
          items_count: 3
        },
        {
          order_id: 3,
          order_number: 'SO-2025-003',
          customer_name: 'Global Enterprises',
          order_date: '2025-11-05',
          delivery_date: '2025-11-20',
          total_amount: 825000,
          status: 'CONFIRMED',
          payment_status: 'PENDING',
          items_count: 8
        },
        {
          order_id: 4,
          order_number: 'SO-2025-004',
          customer_name: 'Innovation Labs',
          order_date: '2025-11-07',
          delivery_date: '2025-11-22',
          total_amount: 125000,
          status: 'PROCESSING',
          payment_status: 'PAID',
          items_count: 2
        },
        {
          order_id: 5,
          order_number: 'SO-2025-005',
          customer_name: 'Acme Corporation',
          order_date: '2025-10-25',
          delivery_date: '2025-11-08',
          total_amount: 385000,
          status: 'DELIVERED',
          payment_status: 'PAID',
          items_count: 6
        }
      ]);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'CONFIRMED': '#3b82f6',
      'PROCESSING': '#f59e0b',
      'SHIPPED': '#8b5cf6',
      'DELIVERED': '#10b981',
      'CANCELLED': '#ef4444'
    };
    return colors[status] || '#64748b';
  };

  const getPaymentStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'PAID': '#10b981',
      'PARTIAL': '#f59e0b',
      'PENDING': '#3b82f6',
      'OVERDUE': '#ef4444'
    };
    return colors[status] || '#64748b';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="content-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Order Date</th>
                <th>Delivery Date</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Order Status</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.order_id}>
                  <td style={{ fontWeight: 600, color: '#667eea' }}>{order.order_number}</td>
                  <td style={{ fontWeight: 600 }}>{order.customer_name}</td>
                  <td>{new Date(order.order_date).toLocaleDateString()}</td>
                  <td>{new Date(order.delivery_date).toLocaleDateString()}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#f3f4f6',
                      color: '#374151'
                    }}>
                      {order.items_count} items
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(order.total_amount)}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: `${getStatusColor(order.status)}15`,
                      color: getStatusColor(order.status)
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: `${getPaymentStatusColor(order.payment_status)}15`,
                      color: getPaymentStatusColor(order.payment_status)
                    }}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td>
                    <button style={{
                      background: 'white',
                      color: '#667eea',
                      border: '2px solid #667eea',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="metric-card revenue">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <div className="metric-label">Total Orders</div>
            <div className="metric-value">{orders.length}</div>
            <div className="metric-trend positive">
              <span className="trend-text">{orders.filter(o => o.status === 'PROCESSING').length} In Progress</span>
            </div>
          </div>
        </div>

        <div className="metric-card expenses">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <div className="metric-label">Total Value</div>
            <div className="metric-value">
              {formatCurrency(orders.reduce((sum, o) => sum + o.total_amount, 0))}
            </div>
          </div>
        </div>

        <div className="metric-card profit">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <div className="metric-label">Delivered</div>
            <div className="metric-value">{orders.filter(o => o.status === 'DELIVERED').length}</div>
            <div className="metric-trend">
              <span className="profit-margin">Completed orders</span>
            </div>
          </div>
        </div>

        <div className="metric-card activity">
          <div className="metric-icon">💵</div>
          <div className="metric-content">
            <div className="metric-label">Paid Orders</div>
            <div className="metric-value">{orders.filter(o => o.payment_status === 'PAID').length}</div>
            <div className="metric-detail">
              <span className="pending-badge">
                {orders.filter(o => o.payment_status === 'PENDING').length} Pending payment
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOrdersPage;
