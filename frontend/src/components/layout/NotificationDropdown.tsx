import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotificationDropdown.css';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  icon: string;
  title: string;
  message: string;
  time: string;
  link?: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    icon: '🚚',
    title: 'Trip Delivered',
    message: 'Trip TRP-2025-00125 delivered successfully',
    time: '2 minutes ago',
    link: '/logistics/trips/TRP-2025-00125',
    read: false
  },
  {
    id: '2',
    type: 'warning',
    icon: '⚠️',
    title: 'Vehicle Service Due',
    message: 'ABC 123 GP requires service in 3 days',
    time: '1 hour ago',
    link: '/logistics/fleet',
    read: false
  },
  {
    id: '3',
    type: 'info',
    icon: '📝',
    title: 'New Purchase Order',
    message: 'PO #PO-2025-156 created by John Mthembu',
    time: '3 hours ago',
    link: '/purchase',
    read: false
  },
  {
    id: '4',
    type: 'success',
    icon: '💰',
    title: 'Invoice Paid',
    message: 'Invoice #INV-2025-0432 paid by Shoprite',
    time: '5 hours ago',
    link: '/financial',
    read: true
  },
  {
    id: '5',
    type: 'warning',
    icon: '📋',
    title: 'Driver License Expiring',
    message: 'Thabo Dlamini - PrDP expires in 14 days',
    time: '1 day ago',
    link: '/logistics/drivers',
    read: true
  }
];

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  return (
    <div className="notification-dropdown">
      <div className="dropdown-header">
        <div>
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} unread</span>
          )}
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '3rem' }}>🔔</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div 
                className="notification-icon"
                style={{ background: `${getTypeColor(notification.type)}20`, color: getTypeColor(notification.type) }}
              >
                {notification.icon}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">{notification.time}</div>
              </div>
              {!notification.read && <div className="unread-dot"></div>}
            </div>
          ))
        )}
      </div>

      <div className="dropdown-footer">
        <button className="footer-btn" onClick={markAllRead}>
          Mark All Read
        </button>
        <button className="footer-btn primary" onClick={() => { navigate('/notifications'); onClose(); }}>
          View All Activity
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
