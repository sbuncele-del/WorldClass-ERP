import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  MapPin, 
  CheckCircle, 
  Clock, 
  Phone, 
  MessageCircle,
  Navigation,
  Package,
  AlertTriangle,
  ChevronRight,
  Send,
  User,
  Bell,
  Shield,
  PhoneCall,
  X,
  History,
  Home,
  AlertOctagon,
  Zap,
  Camera,
  Upload,
  FileText,
  Lock,
  Loader
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import './DriverDashboard.css';

interface Trip {
  id: string;
  tripNumber: string;
  status: 'assigned' | 'en-route-pickup' | 'at-pickup' | 'loaded' | 'in-transit' | 'at-destination' | 'delivered' | 'completed';
  pickup: {
    location: string;
    address: string;
    contact: string;
    phone: string;
    scheduledTime: string;
    actualTime?: string;
  };
  delivery: {
    location: string;
    address: string;
    contact: string;
    phone: string;
    expectedTime: string;
  };
  cargo: {
    description: string;
    weight: string;
    pieces: number;
    specialInstructions?: string;
  };
  customer: string;
  distance?: string;
  estimatedDuration?: string;
}

interface Message {
  id: string;
  from: string;
  role: 'driver' | 'dispatch' | 'customer' | 'system';
  content: string;
  timestamp: Date;
  isMe: boolean;
  type: 'text' | 'alert' | 'workflow';
}

const OFFICE_PHONE = '+27 11 555 0100';
const EMERGENCY_PHONE = '10111';
const COMPANY_EMERGENCY = '+27 800 HELP 247';

const DriverDashboard: React.FC = () => {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<'trip' | 'chat' | 'history'>('trip');
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [sosCountdown, setSOSCountdown] = useState<number | null>(null);
  
  // Delivery Verification States
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string[]>(['', '', '', '', '', '']);
  const [clientCode, setClientCode] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed' | null>(null);
  const [showPODModal, setShowPODModal] = useState(false);
  const [podFiles, setPodFiles] = useState<File[]>([]);
  const [podPreviews, setPodPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deliveryVerificationId, setDeliveryVerificationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const driverName = currentUser?.firstName || 'Driver';
  const driverFullName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Driver';

  useEffect(() => {
    loadCurrentTrip();
    loadMessages();
  }, []);

  useEffect(() => {
    if (sosCountdown !== null && sosCountdown > 0) {
      const timer = setTimeout(() => setSOSCountdown(sosCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (sosCountdown === 0) {
      triggerEmergency();
    }
  }, [sosCountdown]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCurrentTrip = async () => {
    setCurrentTrip({
      id: 'trip-001',
      tripNumber: 'TRP-2024-0847',
      status: 'in-transit',
      pickup: {
        location: 'Warehouse A',
        address: '123 Industrial Road, Midrand',
        contact: 'John Mokoena',
        phone: '+27 11 555 0123',
        scheduledTime: '08:00',
        actualTime: '08:15'
      },
      delivery: {
        location: 'ABC Retail Store',
        address: '456 Main Street, Hatfield, Pretoria',
        contact: 'Sarah Nkosi',
        phone: '+27 12 555 0456',
        expectedTime: '11:30'
      },
      cargo: {
        description: 'Electronics - Laptops & Accessories',
        weight: '450 kg',
        pieces: 24,
        specialInstructions: 'Fragile. Use loading bay at back. Call 10 min before.'
      },
      customer: 'ABC Retail Group',
      distance: '45 km',
      estimatedDuration: '1h 15min'
    });
  };

  const loadMessages = async () => {
    setMessages([
      {
        id: '1',
        from: 'Dispatch',
        role: 'dispatch',
        content: 'Good morning! Trip confirmed. Drive safe! 🚛',
        timestamp: new Date(Date.now() - 3600000 * 3),
        isMe: false,
        type: 'text'
      },
      {
        id: '2',
        from: driverName,
        role: 'driver',
        content: 'Loaded and departing now.',
        timestamp: new Date(Date.now() - 3600000 * 2),
        isMe: true,
        type: 'text'
      },
      {
        id: '3',
        from: 'Sarah Nkosi',
        role: 'customer',
        content: 'What time can we expect delivery?',
        timestamp: new Date(Date.now() - 3600000),
        isMe: false,
        type: 'text'
      }
    ]);
  };

  const handleStatusUpdate = async (newStatus: Trip['status']) => {
    if (!currentTrip) return;
    setIsProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentTrip({ ...currentTrip, status: newStatus });
      
      const statusMessages: Record<string, string> = {
        'at-pickup': '📍 Arrived at pickup location',
        'loaded': '📦 Cargo loaded successfully',
        'in-transit': '🚛 En route to delivery',
        'at-destination': '📍 Arrived at delivery location',
        'delivered': '✅ Delivery confirmed! Invoice created.',
      };

      addSystemMessage(statusMessages[newStatus] || 'Status updated');
      showToast('Status updated');
    } catch {
      showToast('Failed to update', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Called when driver clicks "I've Arrived" at destination
  const handleDriverArrived = async () => {
    if (!currentTrip) return;
    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${apiUrl}/api/delivery/${currentTrip.id}/driver-arrived`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_phone: currentTrip.delivery.phone,
          customer_name: currentTrip.delivery.contact
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setDeliveryVerificationId(data.verificationId);
        setCurrentTrip({ ...currentTrip, status: 'at-destination' });
        addSystemMessage('📍 Arrived at delivery. Verification code sent to customer.');
        showToast('Code sent to customer!');
        // Show the verification modal
        setShowVerificationModal(true);
      } else {
        throw new Error(data.message || 'Failed to generate verification');
      }
    } catch (error) {
      console.error('Arrival notification failed:', error);
      // Fallback to local status update
      setCurrentTrip({ ...currentTrip, status: 'at-destination' });
      addSystemMessage('📍 Arrived at delivery location');
      showToast('Arrived - ask customer for confirmation code', 'warning');
      setShowVerificationModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Verify the code entered by driver (given by customer)
  const handleVerifyCode = async () => {
    const codeString = verificationCode.join('');
    if (codeString.length !== 6) {
      showToast('Please enter the complete 6-digit code', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${apiUrl}/api/delivery/${currentTrip?.id}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: codeString,
          verification_id: deliveryVerificationId
        })
      });

      const data = await response.json();
      
      if (data.success && data.verified) {
        setVerificationStatus('verified');
        addSystemMessage('✅ Delivery code verified by customer!');
        showToast('Code verified! Now upload POD');
        setTimeout(() => {
          setShowVerificationModal(false);
          setShowPODModal(true);
        }, 1500);
      } else {
        setVerificationStatus('failed');
        showToast('Invalid code. Please try again.', 'error');
        setVerificationCode(['', '', '', '', '', '']);
      }
    } catch (error) {
      console.error('Verification failed:', error);
      // Demo mode fallback
      if (codeString === '123456') {
        setVerificationStatus('verified');
        addSystemMessage('✅ Delivery code verified! (Demo mode)');
        showToast('Code verified! Now upload POD');
        setTimeout(() => {
          setShowVerificationModal(false);
          setShowPODModal(true);
        }, 1500);
      } else {
        setVerificationStatus('failed');
        showToast('Invalid code. Try 123456 in demo mode.', 'error');
        setVerificationCode(['', '', '', '', '', '']);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle code input (6 digit OTP style)
  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle file selection for POD
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...podFiles, ...files];
    setPodFiles(newFiles);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setPodPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove a POD file
  const removePodFile = (index: number) => {
    setPodFiles(prev => prev.filter((_, i) => i !== index));
    setPodPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Upload POD and complete delivery
  const handleUploadPOD = async () => {
    if (podFiles.length === 0) {
      showToast('Please add at least one proof of delivery photo', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const formData = new FormData();
      podFiles.forEach((file, index) => {
        formData.append(`pod_${index}`, file);
      });
      formData.append('verification_id', deliveryVerificationId || '');
      formData.append('notes', 'Delivered successfully');

      const response = await fetch(`${apiUrl}/api/delivery/${currentTrip?.id}/pod`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setShowPODModal(false);
        await handleStatusUpdate('delivered');
        addSystemMessage('📸 POD uploaded. Delivery complete!');
        // Reset state
        setPodFiles([]);
        setPodPreviews([]);
        setVerificationCode(['', '', '', '', '', '']);
        setVerificationStatus(null);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('POD upload failed:', error);
      // Demo mode - complete anyway
      setShowPODModal(false);
      await handleStatusUpdate('delivered');
      addSystemMessage('📸 POD recorded. Delivery complete! (Demo mode)');
      showToast('Delivery completed!');
      setPodFiles([]);
      setPodPreviews([]);
      setVerificationCode(['', '', '', '', '', '']);
      setVerificationStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Skip verification (for special cases)
  const skipVerification = () => {
    setShowVerificationModal(false);
    setShowConfirmModal(true);
  };

  const handleDeliveryConfirm = async () => {
    setShowConfirmModal(false);
    await handleStatusUpdate('delivered');
  };

  const addSystemMessage = (content: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      from: 'System',
      role: 'system',
      content,
      timestamp: new Date(),
      isMe: false,
      type: 'workflow'
    };
    setMessages(prev => [...prev, msg]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const msg: Message = {
      id: Date.now().toString(),
      from: driverName,
      role: 'driver',
      content: newMessage,
      timestamp: new Date(),
      isMe: true,
      type: 'text'
    };
    
    setMessages(prev => [...prev, msg]);
    const messageContent = newMessage;
    setNewMessage('');

    // Send to backend API
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      await fetch(`${apiUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: messageContent,
          message_type: 'driver_to_dispatch',
          trip_id: currentTrip?.id,
          recipient_name: 'Dispatch'
        })
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Message already shown in UI, just log error
    }
  };

  const initiateCall = (phone: string, label: string) => {
    window.location.href = `tel:${phone}`;
    showToast(`Calling ${label}...`);
    setShowCallMenu(false);
  };

  const triggerEmergency = async () => {
    setSOSCountdown(null);
    setShowSOSModal(false);
    addSystemMessage('🚨 EMERGENCY ALERT - Dispatch notified. Help is on the way.');
    showToast('Emergency alert sent!', 'warning');

    // Send emergency alert to backend
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Get current location if available
      let location = 'Unknown';
      let coordinates = null;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          location = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        } catch {
          console.log('Could not get location');
        }
      }
      
      await fetch(`${apiUrl}/api/messages/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emergency_type: 'security',
          location,
          coordinates,
          trip_id: currentTrip?.id,
          details: 'Driver triggered emergency alert from app'
        })
      });
    } catch (error) {
      console.error('Failed to send emergency:', error);
    }

    // Auto-call emergency line
    setTimeout(() => {
      window.location.href = `tel:${COMPANY_EMERGENCY}`;
    }, 1000);
  };

  const cancelSOS = () => {
    setSOSCountdown(null);
    setShowSOSModal(false);
  };

  const getActionButton = () => {
    if (!currentTrip) return null;
    
    const statusActions: Record<string, { label: string; icon: React.ReactNode; action: () => void; color: string }> = {
      'assigned': { label: 'Start Trip', icon: <Truck size={20} />, action: () => handleStatusUpdate('en-route-pickup'), color: 'blue' },
      'en-route-pickup': { label: 'Arrived at Pickup', icon: <MapPin size={20} />, action: () => handleStatusUpdate('at-pickup'), color: 'blue' },
      'at-pickup': { label: 'Cargo Loaded', icon: <Package size={20} />, action: () => handleStatusUpdate('loaded'), color: 'orange' },
      'loaded': { label: 'Start Delivery', icon: <Navigation size={20} />, action: () => handleStatusUpdate('in-transit'), color: 'blue' },
      'in-transit': { label: "I've Arrived", icon: <MapPin size={20} />, action: handleDriverArrived, color: 'purple' },
      'at-destination': { label: 'Enter Code', icon: <Lock size={20} />, action: () => setShowVerificationModal(true), color: 'green' },
    };

    const action = statusActions[currentTrip.status];
    if (!action) return null;

    return (
      <button className={`main-action-btn ${action.color}`} onClick={action.action} disabled={isProcessing}>
        {isProcessing ? <div className="spinner" /> : <>{action.icon}<span>{action.label}</span></>}
      </button>
    );
  };

  const getStatusStep = () => {
    const steps = ['assigned', 'en-route-pickup', 'at-pickup', 'loaded', 'in-transit', 'at-destination', 'delivered'];
    return steps.indexOf(currentTrip?.status || 'assigned');
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="driver-app">
      <div className="safe-area-top" />

      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="logo-mark"><Zap size={18} /></div>
          <span className="brand-name">FleetPro</span>
        </div>
        
        <div className="header-actions">
          <button className="header-btn" onClick={() => setShowCallMenu(true)}>
            <PhoneCall size={18} />
          </button>
          <button className="header-btn notification" onClick={() => setActiveTab('chat')}>
            <Bell size={18} />
            <span className="badge">3</span>
          </button>
          <button className="header-btn profile" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="avatar">{driverName.charAt(0)}</div>
          </button>
        </div>

        {showProfileMenu && (
          <>
            <div className="overlay" onClick={() => setShowProfileMenu(false)} />
            <div className="dropdown-menu">
              <div className="menu-header">
                <div className="avatar lg">{driverName.charAt(0)}</div>
                <div>
                  <p className="name">{driverFullName}</p>
                  <p className="role">Driver</p>
                </div>
              </div>
              <div className="menu-divider" />
              <button className="menu-item"><User size={16} /> My Profile</button>
              <button className="menu-item"><History size={16} /> Trip History</button>
              <div className="menu-divider" />
              <button className="menu-item logout">Logout</button>
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="app-content">
        {activeTab === 'trip' && currentTrip && (
          <div className="trip-view">
            {/* Welcome */}
            <div className="welcome-section">
              <div className="welcome-text">
                <h1>Hello, {driverName} 👋</h1>
                <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
              <button className="sos-btn" onClick={() => { setShowSOSModal(true); setSOSCountdown(5); }}>
                <Shield size={16} />
                <span>SOS</span>
              </button>
            </div>

            {/* Trip Card */}
            <div className="trip-card">
              <div className="trip-header">
                <div className="trip-meta">
                  <span className="trip-number">{currentTrip.tripNumber}</span>
                  <span className={`status-badge ${currentTrip.status}`}>
                    {currentTrip.status.replace(/-/g, ' ')}
                  </span>
                </div>
                <span className="customer-name">{currentTrip.customer}</span>
              </div>

              {/* Progress */}
              <div className="progress-section">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(getStatusStep() / 6) * 100}%` }} />
                </div>
                <div className="progress-labels">
                  <span>Pickup</span>
                  <span>Load</span>
                  <span>Transit</span>
                  <span>Deliver</span>
                </div>
              </div>

              {/* Route */}
              <div className="route-section">
                <div className="route-point">
                  <div className="point-marker pickup"><div className="dot" /></div>
                  <div className="point-details">
                    <span className="label">PICKUP</span>
                    <span className="location">{currentTrip.pickup.location}</span>
                    <span className="address">{currentTrip.pickup.address}</span>
                    <span className="time"><Clock size={12} /> {currentTrip.pickup.scheduledTime}</span>
                  </div>
                  <button className="call-btn" onClick={() => initiateCall(currentTrip.pickup.phone, 'Pickup')}>
                    <Phone size={16} />
                  </button>
                </div>

                <div className="route-connector">
                  <div className="connector-line" />
                  <div className="connector-info">
                    <Navigation size={12} />
                    <span>{currentTrip.distance} • {currentTrip.estimatedDuration}</span>
                  </div>
                </div>

                <div className="route-point">
                  <div className="point-marker delivery"><MapPin size={14} /></div>
                  <div className="point-details">
                    <span className="label">DELIVERY</span>
                    <span className="location">{currentTrip.delivery.location}</span>
                    <span className="address">{currentTrip.delivery.address}</span>
                    <span className="time"><Clock size={12} /> ETA {currentTrip.delivery.expectedTime}</span>
                  </div>
                  <button className="call-btn" onClick={() => initiateCall(currentTrip.delivery.phone, 'Delivery')}>
                    <Phone size={16} />
                  </button>
                </div>
              </div>

              {/* Cargo */}
              <div className="cargo-section">
                <div className="cargo-header"><Package size={14} /><span>Cargo</span></div>
                <p className="cargo-desc">{currentTrip.cargo.description}</p>
                <p className="cargo-meta">{currentTrip.cargo.pieces} pcs • {currentTrip.cargo.weight}</p>
                {currentTrip.cargo.specialInstructions && (
                  <div className="instructions">
                    <AlertTriangle size={12} />
                    <span>{currentTrip.cargo.specialInstructions}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Action */}
            {currentTrip.status !== 'delivered' && currentTrip.status !== 'completed' && getActionButton()}

            {currentTrip.status === 'delivered' && (
              <div className="success-banner">
                <CheckCircle size={32} />
                <h3>Delivery Complete!</h3>
                <p>Invoice created and sent for approval</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
              <button className="quick-btn" onClick={() => window.open(`https://maps.google.com/?daddr=${encodeURIComponent(currentTrip.delivery.address)}`, '_blank')}>
                <Navigation size={18} /><span>Navigate</span>
              </button>
              <button className="quick-btn" onClick={() => setActiveTab('chat')}>
                <MessageCircle size={18} /><span>Message</span>
              </button>
              <button className="quick-btn" onClick={() => initiateCall(OFFICE_PHONE, 'Office')}>
                <Phone size={18} /><span>Call Office</span>
              </button>
              <button className="quick-btn danger" onClick={() => { setShowSOSModal(true); setSOSCountdown(5); }}>
                <AlertOctagon size={18} /><span>Emergency</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="chat-view">
            <div className="chat-header">
              <h2>Messages</h2>
              <p>Team & Customer Chat</p>
            </div>

            <div className="messages-container">
              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.isMe ? 'sent' : 'received'} ${msg.type}`}>
                  {!msg.isMe && (
                    <div className="msg-meta">
                      <span className="sender">{msg.from}</span>
                      <span className={`role ${msg.role}`}>{msg.role}</span>
                    </div>
                  )}
                  <div className="msg-bubble">
                    <p>{msg.content}</p>
                    <span className="time">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="quick-replies">
              {['On my way', 'Arrived', 'Running late', 'Need help'].map(text => (
                <button key={text} onClick={() => setNewMessage(text)}>{text}</button>
              ))}
            </div>

            <div className="chat-input">
              <input 
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button className="send-btn" onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-view">
            <div className="history-header">
              <h2>Trip History</h2>
              <p>Your completed deliveries</p>
            </div>
            <div className="history-list">
              {[
                { id: '1', num: 'TRP-2024-0846', customer: 'Metro Supplies', date: 'Today' },
                { id: '2', num: 'TRP-2024-0845', customer: 'City Hardware', date: 'Yesterday' },
                { id: '3', num: 'TRP-2024-0844', customer: 'BuildRight Ltd', date: '2 days ago' },
              ].map(trip => (
                <div key={trip.id} className="history-item">
                  <CheckCircle size={18} className="check" />
                  <div className="info">
                    <span className="num">{trip.num}</span>
                    <span className="customer">{trip.customer}</span>
                  </div>
                  <span className="date">{trip.date}</span>
                  <ChevronRight size={16} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className={`nav-btn ${activeTab === 'trip' ? 'active' : ''}`} onClick={() => setActiveTab('trip')}>
          <Home size={20} /><span>My Trip</span>
        </button>
        <button className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <MessageCircle size={20} /><span>Chat</span>
          <span className="nav-badge">3</span>
        </button>
        <button className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <History size={20} /><span>History</span>
        </button>
      </nav>
      <div className="safe-area-bottom" />

      {/* Call Menu */}
      {showCallMenu && (
        <div className="modal-overlay" onClick={() => setShowCallMenu(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3>Quick Call</h3>
            <div className="call-list">
              <button className="call-item" onClick={() => initiateCall(OFFICE_PHONE, 'Dispatch')}>
                <div className="call-icon blue"><Phone size={20} /></div>
                <div><span className="label">Dispatch Office</span><span className="sub">{OFFICE_PHONE}</span></div>
              </button>
              {currentTrip && (
                <button className="call-item" onClick={() => initiateCall(currentTrip.delivery.phone, currentTrip.delivery.contact)}>
                  <div className="call-icon green"><User size={20} /></div>
                  <div><span className="label">{currentTrip.delivery.contact}</span><span className="sub">Customer</span></div>
                </button>
              )}
              <button className="call-item emergency" onClick={() => initiateCall(COMPANY_EMERGENCY, 'Emergency')}>
                <div className="call-icon red"><AlertOctagon size={20} /></div>
                <div><span className="label">Emergency Hotline</span><span className="sub">24/7 Support</span></div>
              </button>
            </div>
            <button className="cancel-btn" onClick={() => setShowCallMenu(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon green"><CheckCircle size={40} /></div>
            <h3>Confirm Delivery?</h3>
            <ul className="confirm-list">
              <li><CheckCircle size={14} /> Mark as delivered</li>
              <li><CheckCircle size={14} /> Create invoice</li>
              <li><CheckCircle size={14} /> Notify dispatch</li>
            </ul>
            <div className="modal-btns">
              <button className="btn secondary" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button className="btn primary" onClick={handleDeliveryConfirm}>
                {isProcessing ? <div className="spinner white" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Code Modal */}
      {showVerificationModal && (
        <div className="modal-overlay">
          <div className="modal-card verification">
            <button className="modal-close" onClick={() => setShowVerificationModal(false)}>
              <X size={20} />
            </button>
            
            <div className="modal-icon purple"><Lock size={40} /></div>
            <h3>Customer Verification</h3>
            <p className="modal-subtitle">
              Ask the customer for the 6-digit code sent to their phone
            </p>

            {verificationStatus === 'verified' ? (
              <div className="verification-success">
                <CheckCircle size={48} className="success-icon" />
                <p>Code Verified!</p>
              </div>
            ) : (
              <>
                <div className="code-inputs">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeInput(index, e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !digit && index > 0) {
                          const prevInput = document.getElementById(`code-${index - 1}`);
                          prevInput?.focus();
                        }
                      }}
                      className={verificationStatus === 'failed' ? 'error' : ''}
                    />
                  ))}
                </div>

                {verificationStatus === 'failed' && (
                  <p className="error-text">Invalid code. Please try again.</p>
                )}

                <div className="modal-btns">
                  <button className="btn secondary" onClick={skipVerification}>
                    Skip (No Code)
                  </button>
                  <button 
                    className="btn primary" 
                    onClick={handleVerifyCode}
                    disabled={verificationCode.join('').length !== 6 || isProcessing}
                  >
                    {isProcessing ? <Loader size={18} className="spin" /> : 'Verify'}
                  </button>
                </div>

                <p className="demo-hint">Demo: Use code 123456</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* POD Upload Modal */}
      {showPODModal && (
        <div className="modal-overlay">
          <div className="modal-card pod-modal">
            <button className="modal-close" onClick={() => setShowPODModal(false)}>
              <X size={20} />
            </button>

            <div className="modal-icon blue"><Camera size={40} /></div>
            <h3>Proof of Delivery</h3>
            <p className="modal-subtitle">
              Take photos of the delivered goods and signed documents
            </p>

            <div className="pod-previews">
              {podPreviews.map((preview, index) => (
                <div key={index} className="pod-preview">
                  <img src={preview} alt={`POD ${index + 1}`} />
                  <button className="remove-btn" onClick={() => removePodFile(index)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {podFiles.length < 4 && (
                <button className="add-pod-btn" onClick={() => cameraInputRef.current?.click()}>
                  <Camera size={24} />
                  <span>Add Photo</span>
                </button>
              )}
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <button 
              className="btn secondary gallery-btn" 
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} /> Choose from Gallery
            </button>

            <div className="pod-info">
              <FileText size={14} />
              <span>{podFiles.length} of 4 photos added</span>
            </div>

            <div className="modal-btns">
              <button 
                className="btn secondary" 
                onClick={() => {
                  setShowPODModal(false);
                  setShowConfirmModal(true);
                }}
              >
                Skip POD
              </button>
              <button 
                className="btn primary" 
                onClick={handleUploadPOD}
                disabled={podFiles.length === 0 || isUploading}
              >
                {isUploading ? <Loader size={18} className="spin" /> : 'Complete Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSOSModal && (
        <div className="modal-overlay sos">
          <div className="modal-card sos">
            <div className="sos-icon"><AlertOctagon size={48} /></div>
            <h2>Emergency Alert</h2>
            {sosCountdown !== null && sosCountdown > 0 ? (
              <>
                <div className="countdown">{sosCountdown}</div>
                <p>Alerting dispatch & sharing location...</p>
                <button className="btn cancel-sos" onClick={cancelSOS}>Cancel</button>
              </>
            ) : (
              <>
                <p>Select emergency type:</p>
                <div className="sos-options">
                  <button onClick={triggerEmergency}><AlertTriangle size={20} /> Breakdown</button>
                  <button className="danger" onClick={triggerEmergency}><Shield size={20} /> Security</button>
                  <button className="danger" onClick={() => initiateCall(EMERGENCY_PHONE, 'Police')}>
                    <Phone size={20} /> Call 10111
                  </button>
                </div>
                <button className="btn secondary full" onClick={cancelSOS}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={16} />}
          {toast.type === 'error' && <X size={16} />}
          {toast.type === 'warning' && <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
