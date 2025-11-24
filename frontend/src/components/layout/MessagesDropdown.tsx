import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MessagesDropdown.css';

interface Message {
  id: string;
  type: 'approval' | 'task' | 'message';
  icon: string;
  title: string;
  description: string;
  time: string;
  actionable: boolean;
  link?: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    type: 'approval',
    icon: '⚠️',
    title: 'Approval Required',
    description: 'Purchase Order #PO-2025-156 - R 45,000 from Shoprite',
    time: '10 minutes ago',
    actionable: true
  },
  {
    id: '2',
    type: 'task',
    icon: '📋',
    title: 'Task Assigned',
    description: 'Review driver performance report - Due: Today 17:00',
    time: '2 hours ago',
    actionable: true,
    link: '/logistics/reports'
  },
  {
    id: '3',
    type: 'message',
    icon: '💬',
    title: 'Message from John Mthembu',
    description: 'POD signature required for TRP-00125',
    time: '5 hours ago',
    actionable: false,
    link: '/logistics/trips/TRP-2025-00125'
  },
  {
    id: '4',
    type: 'task',
    icon: '📝',
    title: 'Document Review',
    description: 'Annual financial statements need approval',
    time: '1 day ago',
    actionable: true,
    link: '/financial'
  },
  {
    id: '5',
    type: 'approval',
    icon: '✅',
    title: 'Expense Claim',
    description: 'Sarah Ndlovu - Fuel expenses R 1,250',
    time: '2 days ago',
    actionable: true
  }
];

interface MessagesDropdownProps {
  onClose: () => void;
}

const MessagesDropdown: React.FC<MessagesDropdownProps> = ({ onClose }) => {
  const navigate = useNavigate();

  const handleApprove = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`Approved item ${messageId}`);
  };

  const handleReject = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`Rejected item ${messageId}`);
  };

  const handleMessageClick = (message: Message) => {
    if (message.link) {
      navigate(message.link);
      onClose();
    }
  };

  return (
    <div className="messages-dropdown">
      <div className="dropdown-header">
        <div>
          <h3>Inbox</h3>
          <span className="pending-badge">{mockMessages.filter(m => m.actionable).length} pending</span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="messages-list">
        {mockMessages.map((message) => (
          <div
            key={message.id}
            className={`message-item ${message.actionable ? 'actionable' : ''}`}
            onClick={() => handleMessageClick(message)}
          >
            <div className="message-icon">{message.icon}</div>
            <div className="message-content">
              <div className="message-title">{message.title}</div>
              <div className="message-description">{message.description}</div>
              <div className="message-time">{message.time}</div>
              
              {message.actionable && message.type === 'approval' && (
                <div className="message-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="action-btn approve"
                    onClick={(e) => handleApprove(message.id, e)}
                  >
                    Approve
                  </button>
                  <button 
                    className="action-btn reject"
                    onClick={(e) => handleReject(message.id, e)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="dropdown-footer">
        <button className="footer-btn primary" onClick={() => { navigate('/inbox'); onClose(); }}>
          View All Tasks
        </button>
      </div>
    </div>
  );
};

export default MessagesDropdown;
