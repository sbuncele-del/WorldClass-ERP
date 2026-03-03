/**
 * CommunicationsHub - Unified Communications Management
 * 
 * Features:
 * - Internal Messaging & Chat
 * - Email Integration & Campaigns
 * - SMS & WhatsApp Notifications
 * - Company Announcements
 * - Document Sharing
 * - Notification Center
 * - Message Templates
 * - Contact Management
 * - Communication Analytics
 * - PoPI Act Compliance
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space, Badge,
  Input, Select, DatePicker, TimePicker, Modal, Form, Typography, Avatar,
  Timeline, Descriptions, Tooltip, Dropdown, InputNumber, Switch, Alert,
  List, Tabs, Divider, Steps, Upload, message, Checkbox, Empty, Spin
} from 'antd';
import {
  HomeOutlined, TeamOutlined, CalendarOutlined, ClockCircleOutlined,
  DollarOutlined, BarChartOutlined, CheckCircleOutlined, WarningOutlined,
  PlusOutlined, SearchOutlined, FilterOutlined, ExportOutlined,
  SettingOutlined, SyncOutlined, FlagOutlined, SendOutlined,
  UserOutlined, BellOutlined, ThunderboltOutlined, MailOutlined,
  SafetyCertificateOutlined, AuditOutlined, BankOutlined, RocketOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, MoreOutlined, MessageOutlined,
  FileDoneOutlined, TrophyOutlined, PieChartOutlined, LineChartOutlined,
  FileTextOutlined, SolutionOutlined, ProfileOutlined, ScheduleOutlined,
  MobileOutlined, WhatsAppOutlined, NotificationOutlined, SoundOutlined,
  InboxOutlined, StarOutlined, StarFilled, PaperClipOutlined, SmileOutlined,
  PhoneOutlined, GlobalOutlined, LockOutlined, ContactsOutlined,
  CopyOutlined, VideoCameraOutlined, LinkOutlined, AudioOutlined,
  DesktopOutlined, UsergroupAddOutlined, PlayCircleOutlined
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../../components/hub';
import apiClient from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// Interfaces
interface Message {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'internal' | 'announcement';
  subject?: string;
  content: string;
  from: string;
  to: string[];
  cc?: string[];
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed' | 'scheduled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;
  attachments?: string[];
  isStarred?: boolean;
  isRead?: boolean;
  thread?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  type: 'customer' | 'supplier' | 'employee' | 'lead' | 'other';
  groups: string[];
  optInEmail: boolean;
  optInSMS: boolean;
  optInWhatsApp: boolean;
  lastContact?: string;
}

interface Template {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp';
  category: string;
  subject?: string;
  content: string;
  variables: string[];
  usageCount: number;
  lastUsed?: string;
}

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  recipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  scheduledDate?: string;
  completedDate?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  department: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'draft' | 'published' | 'archived';
  publishDate: string;
  expiryDate?: string;
  viewCount: number;
  targetAudience: string[];
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  host: string;
  participants: string[];
  externalGuests: string[];
  scheduledStart: string;
  scheduledEnd: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  type: 'video' | 'audio' | 'webinar';
  meetingLink: string;
  passcode?: string;
  recording?: boolean;
  recordingUrl?: string;
}

interface Notification {
  id: string;
  type: 'system' | 'message' | 'meeting' | 'task' | 'approval' | 'alert';
  title: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  sender?: string;
}

// Email Account interface
interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  username: string;
  is_default: boolean;
  is_active: boolean;
  last_sync_at?: string;
}

// Real email from IMAP
interface RealEmail {
  id: string;
  message_id: string;
  folder: string;
  from_address: string;
  from_name: string;
  to_addresses: string;
  cc_addresses?: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  date: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  attachments_json?: string;
}

const normalizeMeeting = (record: any): Meeting => {
  const rawStatus = record?.status || 'scheduled';
  const normalizedStatus: Meeting['status'] =
    rawStatus === 'in_progress' ? 'live' :
    rawStatus === 'completed' ? 'ended' :
    (['scheduled', 'live', 'ended', 'cancelled'].includes(rawStatus) ? rawStatus : 'scheduled');

  const rawType = record?.type || record?.meeting_type || 'video';
  const normalizedType: Meeting['type'] =
    rawType === 'instant' ? 'video' :
    (['video', 'audio', 'webinar'].includes(rawType) ? rawType : 'video');

  const scheduledStart = record?.scheduledStart || record?.scheduled_start || record?.actual_start || new Date().toISOString();
  const scheduledEnd = record?.scheduledEnd || record?.scheduled_end || record?.actual_end || scheduledStart;

  return {
    id: String(record?.id || ''),
    title: record?.title || 'Meeting',
    description: record?.description || '',
    host: record?.organizer_name || record?.host_name || record?.host || 'Host',
    participants: Array.isArray(record?.participants) ? record.participants : [],
    externalGuests: Array.isArray(record?.externalGuests) ? record.externalGuests : [],
    scheduledStart,
    scheduledEnd,
    status: normalizedStatus,
    type: normalizedType,
    meetingLink: record?.meetingLink || record?.room_url || record?.joinUrl || '',
    recordingUrl: record?.recording_url || record?.recordingUrl
  };
};

const CommunicationsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const selectedFolderRef = useRef(selectedFolder);
  selectedFolderRef.current = selectedFolder;
  const [form] = Form.useForm();
  
  // Email integration state
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [realEmails, setRealEmails] = useState<RealEmail[]>([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<RealEmail | null>(null);
  const [emailDetailVisible, setEmailDetailVisible] = useState(false);
  const [emailDetailData, setEmailDetailData] = useState<any>(null);
  const [addAccountModalVisible, setAddAccountModalVisible] = useState(false);
  const [accountForm] = Form.useForm();
  const [composeForm] = Form.useForm();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [syncingEmail, setSyncingEmail] = useState(false);
  const [emailTotal, setEmailTotal] = useState(0);
  const [replyMode, setReplyMode] = useState<'reply' | 'forward' | null>(null);
  const [folderCounts, setFolderCounts] = useState<any>({ inbox: 0, unread: 0, starred: 0, sent: 0, drafts: 0, trash: 0, all: 0 });
  const [emailSearch, setEmailSearch] = useState('');

  // Fetch all communication data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [messagesRes, contactsRes, templatesRes, campaignsRes, announcementsRes, meetingsRes, notificationsRes] = await Promise.all([
          apiClient.get('/api/v2/communications/messages').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/communications/contacts').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/communications/templates').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/communications/campaigns').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/communications/announcements').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/communications/meetings').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/communications/notifications').catch(() => ({ data: { data: [] } }))
        ]);
        // V2 API returns { success: true, data: [...] }
        setMessages(Array.isArray(messagesRes.data?.data) ? messagesRes.data.data : messagesRes.data?.messages || []);
        setContacts(Array.isArray(contactsRes.data?.data) ? contactsRes.data.data : contactsRes.data?.contacts || []);
        setTemplates(Array.isArray(templatesRes.data?.data) ? templatesRes.data.data : templatesRes.data?.templates || []);
        setCampaigns(Array.isArray(campaignsRes.data?.data) ? campaignsRes.data.data : campaignsRes.data?.campaigns || []);
        setAnnouncements(Array.isArray(announcementsRes.data?.data) ? announcementsRes.data.data : announcementsRes.data?.announcements || []);
        const rawMeetings = Array.isArray(meetingsRes.data?.data) ? meetingsRes.data.data : meetingsRes.data?.meetings || [];
        setMeetings(rawMeetings.map((meeting: any) => normalizeMeeting(meeting)));
        setNotifications(Array.isArray(notificationsRes.data?.data) ? notificationsRes.data.data : notificationsRes.data?.notifications || []);
      } catch (error) {
        console.error('Failed to fetch communications data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch email accounts and inbox
  const fetchEmailAccounts = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/email/accounts');
      const accounts = res.data?.data || [];
      setEmailAccounts(accounts);
      return accounts;
    } catch (err) {
      console.error('Failed to fetch email accounts:', err);
      return [];
    }
  }, []);

  const fetchFolderCounts = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/email/folder-counts');
      if (res.data?.success) setFolderCounts(res.data.data);
    } catch (err) { /* ignore */ }
  }, []);

  const fetchEmailInbox = useCallback(async (folder?: string) => {
    setEmailLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      const activeFolder = folder || selectedFolderRef.current || 'inbox';
      // Map sidebar keys to backend folder names
      const folderMap: Record<string, string> = { inbox: 'INBOX', sent: 'Sent', drafts: 'Drafts', trash: 'Trash', starred: 'starred', all: 'all' };
      params.append('folder', folderMap[activeFolder] || activeFolder);
      const res = await apiClient.get(`/api/email/inbox?${params.toString()}`);
      setRealEmails(res.data?.data || []);
      setEmailTotal(res.data?.total || 0);
      // Refresh folder counts
      fetchFolderCounts();
      // If backend says it's syncing in background, poll for updates
      if (res.data?.syncing) {
        setSyncingEmail(true);
        setTimeout(async () => {
          try {
            const refreshRes = await apiClient.get(`/api/email/inbox?limit=50&folder=${folderMap[activeFolder] || activeFolder}`);
            setRealEmails(refreshRes.data?.data || []);
            setEmailTotal(refreshRes.data?.total || 0);
            fetchFolderCounts();
          } catch (e) { /* ignore */ }
          setSyncingEmail(false);
        }, 8000);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setEmailLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFolderCounts]);

  // Load email accounts on mount
  useEffect(() => {
    fetchEmailAccounts().then(accounts => {
      if (accounts.length > 0) {
        fetchEmailInbox('inbox');
        fetchFolderCounts();
      }
    });
    // Auto-refresh emails every 3 minutes
    const interval = setInterval(() => {
      fetchEmailInbox(selectedFolderRef.current);
    }, 180000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add email account
  const handleAddEmailAccount = async (values: any) => {
    try {
      const res = await apiClient.post('/api/email/accounts', values);
      if (res.data?.success) {
        message.success(res.data.message || 'Email account added!');
        setAddAccountModalVisible(false);
        accountForm.resetFields();
        fetchEmailAccounts();
        fetchEmailInbox('inbox');
      } else {
        message.error(res.data?.message || 'Failed to add account');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to connect email account');
    }
  };

  // Delete email account
  const handleDeleteEmailAccount = async (id: string) => {
    try {
      await apiClient.delete(`/api/email/accounts/${id}`);
      message.success('Email account removed');
      fetchEmailAccounts();
    } catch (err) {
      message.error('Failed to remove account');
    }
  };

  // View email detail
  const handleViewEmail = async (email: RealEmail) => {
    setSelectedEmail(email);
    setEmailDetailVisible(true);
    try {
      const res = await apiClient.get(`/api/email/message/${email.id}`);
      setEmailDetailData(res.data?.data);
      // Mark as read in local state
      setRealEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
    } catch (err) {
      console.error('Failed to fetch email detail:', err);
    }
  };

  // Toggle star
  const handleToggleStar = async (emailId: string) => {
    try {
      await apiClient.put(`/api/email/message/${emailId}/star`);
      setRealEmails(prev => prev.map(e => e.id === emailId ? { ...e, is_starred: !e.is_starred } : e));
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  // Delete email (moves to Trash, or permanently deletes if already in Trash)
  const handleDeleteEmail = async (emailId: string) => {
    try {
      const res = await apiClient.delete(`/api/email/message/${emailId}`);
      setRealEmails(prev => prev.filter(e => e.id !== emailId));
      message.success(res.data?.message || 'Email deleted');
      fetchFolderCounts();
    } catch (err) {
      message.error('Failed to delete email');
    }
  };

  // Restore email from Trash
  const handleRestoreEmail = async (emailId: string) => {
    try {
      await apiClient.post(`/api/email/message/${emailId}/restore`);
      setRealEmails(prev => prev.filter(e => e.id !== emailId));
      message.success('Email restored to Inbox');
      fetchFolderCounts();
    } catch (err) {
      message.error('Failed to restore email');
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    try {
      const values = composeForm.getFieldsValue();
      await apiClient.post('/api/email/draft', {
        to: Array.isArray(values.to) ? values.to.join(', ') : values.to || '',
        cc: Array.isArray(values.cc) ? values.cc.join(', ') : values.cc || '',
        subject: values.subject || '',
        body: values.content || ''
      });
      message.success('Draft saved');
      setComposeModalVisible(false);
      composeForm.resetFields();
      fetchFolderCounts();
      if (selectedFolder === 'drafts') fetchEmailInbox('drafts');
    } catch (err) {
      message.error('Failed to save draft');
    }
  };

  // Send email
  const handleSendEmail = async (values: any) => {
    setSendingEmail(true);
    try {
      const res = await apiClient.post('/api/email/send', {
        to: values.to,
        cc: values.cc,
        subject: values.subject,
        body: values.content,
        html: values.content
      });
      if (res.data?.success) {
        message.success('Email sent successfully!');
        setComposeModalVisible(false);
        composeForm.resetFields();
        setReplyMode(null);
        fetchFolderCounts();
        if (selectedFolder === 'sent') fetchEmailInbox('sent');
      } else {
        message.error(res.data?.message || 'Failed to send');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Reply to email
  const handleReply = (email: any) => {
    setReplyMode('reply');
    composeForm.setFieldsValue({
      to: [email.from_address],
      subject: `Re: ${email.subject}`,
      content: `\n\n--- Original Message ---\nFrom: ${email.from_name} <${email.from_address}>\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body_text || ''}`
    });
    setEmailDetailVisible(false);
    setComposeModalVisible(true);
  };

  // Forward email
  const handleForward = (email: any) => {
    setReplyMode('forward');
    composeForm.setFieldsValue({
      to: [],
      subject: `Fwd: ${email.subject}`,
      content: `\n\n--- Forwarded Message ---\nFrom: ${email.from_name} <${email.from_address}>\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body_text || ''}`
    });
    setEmailDetailVisible(false);
    setComposeModalVisible(true);
  };

  // Sync emails (manual trigger - fires background sync then refreshes)
  const handleSyncEmails = async () => {
    setSyncingEmail(true);
    message.loading({ content: 'Syncing emails from server...', key: 'sync' });
    try {
      await apiClient.post('/api/email/sync', {});
      message.info({ content: 'Sync started... refreshing shortly', key: 'sync', duration: 3 });
      // Wait for background sync to fetch some emails, then refresh
      setTimeout(async () => {
        await fetchEmailInbox();
        setSyncingEmail(false);
        message.success({ content: 'Emails synced!', key: 'sync' });
      }, 6000);
    } catch (err) {
      setSyncingEmail(false);
      message.error({ content: 'Sync failed', key: 'sync' });
    }
  };

  // Daily.co Meeting API Integration
  const createInstantMeeting = useCallback(async () => {
    setMeetingLoading(true);
    try {
      const response = await apiClient.post('/api/v2/communications/meetings/instant', {
        title: 'Instant Meeting'
      });
      const data = response.data;

      if (data.success && data.data) {
        const meetingData = data.data;
        const joinUrl = meetingData.joinUrl || meetingData.room_url;

        // Add the new meeting to the list
        const newMeeting: Meeting = normalizeMeeting({
          ...meetingData,
          status: 'in_progress',
          room_url: joinUrl
        });
        
        setMeetings(prev => [newMeeting, ...prev]);
        message.success('Meeting created! Opening video call...');
        
        // Open the meeting in a new tab
        if (joinUrl) {
          window.open(joinUrl, '_blank');
        }
        
        // Show meeting link for sharing
        Modal.info({
          title: 'Meeting Created',
          content: (
            <div>
              <p>Your meeting is ready! Share this link with participants:</p>
              <Input.TextArea 
                value={joinUrl} 
                readOnly 
                autoSize 
                style={{ marginBottom: 16 }}
              />
              <Button 
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(joinUrl);
                  message.success('Link copied!');
                }}
              >
                Copy Link
              </Button>
            </div>
          ),
          okText: 'Close'
        });
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      message.error('Failed to create meeting. Please try again.');
    } finally {
      setMeetingLoading(false);
    }
  }, []);

  // Schedule a meeting via API
  const scheduleMeeting = useCallback(async (values: any) => {
    setMeetingLoading(true);
    try {
      const title = values.title || values.meetingTitle;
      const description = values.description || values.meetingDescription || '';
      const durationMinutes = Number(values.duration || 60);

      let startDateTime = new Date();
      if (values.meetingDate) {
        const selectedDate = values.meetingDate.toDate ? values.meetingDate.toDate() : new Date(values.meetingDate);
        startDateTime = new Date(selectedDate);
        if (values.meetingTime) {
          const selectedTime = values.meetingTime.toDate ? values.meetingTime.toDate() : new Date(values.meetingTime);
          startDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
        }
      }
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

      const participantUserIds = Array.isArray(values.participants) ? values.participants : [];

      const response = await apiClient.post('/api/v2/communications/meetings', {
        title,
        scheduledStart: startDateTime.toISOString(),
        scheduledEnd: endDateTime.toISOString(),
        participantUserIds
      });
      const data = response.data;
      
      if (data.success && data.data) {
        const newMeeting: Meeting = normalizeMeeting({
          ...data.data,
          description,
          participants: participantUserIds,
          externalGuests: values.externalGuests || []
        });
        
        setMeetings(prev => [newMeeting, ...prev]);
        message.success('Meeting scheduled successfully!');
        setMeetingModalVisible(false);
        form.resetFields();
        
        // Offer to copy the invite link
        Modal.confirm({
          title: 'Meeting Scheduled',
          content: `Copy the meeting link to share with participants?`,
          okText: 'Copy Link',
          cancelText: 'Later',
          onOk: () => {
            navigator.clipboard.writeText(newMeeting.meetingLink);
            message.success('Meeting link copied to clipboard!');
          }
        });
      }
    } catch (error) {
      console.error('Failed to schedule meeting:', error);
      message.error('Failed to schedule meeting. Please try again.');
    } finally {
      setMeetingLoading(false);
    }
  }, [form]);

  const handleTemplateAction = (actionKey: string, template: Template) => {
    switch (actionKey) {
      case 'use':
        message.success(`Template '${template.name}' selected for compose.`);
        setComposeModalVisible(true);
        break;
      case 'edit':
        message.info(`Edit template '${template.name}' (hook to backend).`);
        break;
      case 'duplicate':
        message.success(`Duplicated '${template.name}' (simulate backend).`);
        break;
      case 'delete':
        message.warning(`Delete '${template.name}' (connect API when ready).`);
        break;
      default:
        break;
    }
  };

  // Calculate stats from folderCounts (server-side accurate) with fallback to local
  const commsStats = {
    totalMessages: folderCounts.all || emailTotal || realEmails.length,
    unreadMessages: folderCounts.unread || realEmails.filter(e => !e.is_read).length,
    sentToday: realEmails.filter(e => e.date?.startsWith(new Date().toISOString().split('T')[0])).length,
    totalContacts: (contacts || []).length,
    emailsSent: folderCounts.sent || 0,
    smsSent: (messages || []).filter(m => m?.type === 'sms').length,
    whatsappSent: (messages || []).filter(m => m?.type === 'whatsapp').length,
    activeCampaigns: (campaigns || []).filter(c => c?.status === 'running').length,
    templateCount: (templates || []).length
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <MailOutlined style={{ color: '#1890ff' }} />;
      case 'sms': return <MobileOutlined style={{ color: '#52c41a' }} />;
      case 'whatsapp': return <WhatsAppOutlined style={{ color: '#25D366' }} />;
      case 'internal': return <MessageOutlined style={{ color: '#722ed1' }} />;
      case 'announcement': return <SoundOutlined style={{ color: '#fa8c16' }} />;
      default: return <MailOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default', sent: 'blue', delivered: 'cyan', read: 'green',
      failed: 'red', scheduled: 'orange', running: 'processing',
      completed: 'success', paused: 'warning', published: 'green', archived: 'default'
    };
    return colors[status] || 'default';
  };

  // Dashboard
  const renderDashboard = () => (
    <div style={{ padding: '24px' }}>
      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => setActiveTab('inbox')}>
            <Statistic
              title="Unread Emails"
              value={folderCounts.unread}
              prefix={<Badge count={folderCounts.unread} style={{ marginRight: 8 }}><InboxOutlined /></Badge>}
              valueStyle={{ color: folderCounts.unread > 0 ? '#ff4d4f' : '#52c41a' }}
            />
            <Text type="secondary">{folderCounts.all || commsStats.totalMessages} total emails</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => { setSelectedFolder('sent'); setActiveTab('inbox'); fetchEmailInbox('sent'); }}>
            <Statistic
              title="Sent Emails"
              value={folderCounts.sent}
              prefix={<SendOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Space>
              <Tag color="green">{folderCounts.sent} sent</Tag>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Email Accounts"
              value={emailAccounts.length}
              prefix={<MailOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary">{emailAccounts.length > 0 ? 'Connected' : 'Not configured'}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Starred"
              value={realEmails.filter(e => e.is_starred).length}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <Text type="secondary">{realEmails.filter(e => e.has_attachments).length} with attachments</Text>
          </Card>
        </Col>
      </Row>

      {/* Email Account Status */}
      {emailAccounts.length === 0 ? (
        <Alert
          message="No Email Account Connected"
          description="Connect your email account to start sending and receiving emails from the ERP. Go to Settings to add your IMAP/SMTP account."
          type="warning"
          showIcon
          icon={<MailOutlined />}
          style={{ marginTop: 16, marginBottom: 16 }}
          action={<Button type="primary" onClick={() => { setActiveTab('settings'); setAddAccountModalVisible(true); }}>Connect Email</Button>}
        />
      ) : (
        <Alert
          message={`Email Connected: ${emailAccounts[0].email_address}`}
          description={
            <Space wrap>
              <Tag color="green">IMAP Synced</Tag>
              <Tag color="green">SMTP Ready</Tag>
              <Tag color="blue">{commsStats.totalMessages} emails loaded</Tag>
              {emailAccounts[0].last_sync_at && <Tag color="cyan">Last sync: {new Date(emailAccounts[0].last_sync_at).toLocaleString('en-ZA')}</Tag>}
            </Space>
          }
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginTop: 16, marginBottom: 16 }}
          action={<Button icon={<SyncOutlined spin={syncingEmail} />} onClick={handleSyncEmails}>Sync Now</Button>}
        />
      )}

      {/* Recent Emails & Quick Actions */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card 
            title={<><InboxOutlined /> Recent Emails</>}
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { composeForm.resetFields(); setReplyMode(null); setComposeModalVisible(true); }}>Compose</Button>}
          >
            {realEmails.length > 0 ? (
              <List
                dataSource={realEmails.slice(0, 8)}
                renderItem={item => (
                  <List.Item
                    style={{ cursor: 'pointer', background: item.is_read ? undefined : '#f0f5ff', borderRadius: 4, padding: '8px 12px' }}
                    onClick={() => handleViewEmail(item)}
                    actions={[
                      <Button size="small" icon={item.is_starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />} onClick={(e) => { e.stopPropagation(); handleToggleStar(item.id); }} />,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<MailOutlined />} style={{ backgroundColor: item.is_read ? '#d9d9d9' : '#1890ff' }} />}
                      title={
                        <Space>
                          <Text strong={!item.is_read}>{item.subject || '(No Subject)'}</Text>
                          {!item.is_read && <Badge status="processing" />}
                          {item.has_attachments && <PaperClipOutlined style={{ color: '#8c8c8c' }} />}
                        </Space>
                      }
                      description={
                        <Space>
                          <Text type="secondary">{item.from_name || item.from_address}</Text>
                          <Text type="secondary">•</Text>
                          <Text type="secondary">{new Date(item.date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No emails yet. Click Sync to fetch your inbox." />
            )}
            {realEmails.length > 8 && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Button type="link" onClick={() => setActiveTab('inbox')}>View all {commsStats.totalMessages} emails →</Button>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          {/* Quick Actions */}
          <Card title={<><ThunderboltOutlined /> Quick Actions</>}>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Card size="small" hoverable onClick={() => { composeForm.resetFields(); setReplyMode(null); setComposeModalVisible(true); }} style={{ textAlign: 'center' }}>
                  <MailOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                  <br />
                  <Text strong>Compose Email</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" hoverable onClick={handleSyncEmails} style={{ textAlign: 'center' }}>
                  <SyncOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} spin={syncingEmail} />
                  <br />
                  <Text strong>Sync Inbox</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" hoverable onClick={createInstantMeeting} style={{ textAlign: 'center' }}>
                  <VideoCameraOutlined style={{ fontSize: 24, color: '#722ed1', marginBottom: 8 }} />
                  <br />
                  <Text strong>Quick Meeting</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" hoverable onClick={() => setActiveTab('settings')} style={{ textAlign: 'center' }}>
                  <SettingOutlined style={{ fontSize: 24, color: '#fa8c16', marginBottom: 8 }} />
                  <br />
                  <Text strong>Settings</Text>
                </Card>
              </Col>
            </Row>
          </Card>

          {/* Top Senders */}
          <Card title={<><UserOutlined /> Top Senders</>} style={{ marginTop: 16 }}>
            {(() => {
              const senderCounts: Record<string, { name: string; count: number }> = {};
              realEmails.forEach(e => {
                const key = e.from_address;
                if (!senderCounts[key]) senderCounts[key] = { name: e.from_name || e.from_address, count: 0 };
                senderCounts[key].count++;
              });
              const topSenders = Object.entries(senderCounts)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5);
              return topSenders.length > 0 ? (
                <List
                  size="small"
                  dataSource={topSenders}
                  renderItem={([addr, data]) => (
                    <List.Item>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{data.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 11 }}>{addr}</Text>
                        </div>
                      </Space>
                      <Tag color="blue">{data.count} emails</Tag>
                    </List.Item>
                  )}
                />
              ) : <Empty description="No emails synced yet" />;
            })()}
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Inbox/Messages - REAL IMAP EMAIL
  const renderInbox = () => {
    const hasAccounts = emailAccounts.length > 0;
    
    if (!hasAccounts) {
      return (
        <div style={{ padding: '24px' }}>
          <Card>
            <Empty
              image={<MailOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
              description={
                <div>
                  <Title level={4}>Connect Your Email</Title>
                  <Text type="secondary">Add your email account to send and receive emails directly from the ERP.</Text>
                </div>
              }
            >
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => { setActiveTab('settings'); setAddAccountModalVisible(true); }}>
                Add Email Account
              </Button>
            </Empty>
          </Card>
        </div>
      );
    }

    const folderLabels: Record<string, { icon: React.ReactNode; label: string }> = {
      inbox: { icon: <InboxOutlined />, label: 'Inbox' },
      starred: { icon: <StarFilled style={{ color: '#faad14' }} />, label: 'Starred' },
      sent: { icon: <SendOutlined />, label: 'Sent' },
      drafts: { icon: <EditOutlined />, label: 'Drafts' },
      trash: { icon: <DeleteOutlined />, label: 'Trash' },
      all: { icon: <MailOutlined />, label: 'All Mail' },
    };
    const currentFolder = folderLabels[selectedFolder] || folderLabels.inbox;

    const handleFolderClick = (key: string) => {
      setSelectedFolder(key);
      fetchEmailInbox(key);
    };

    // Filter emails by search
    const filteredEmails = emailSearch
      ? realEmails.filter(e =>
          (e.subject || '').toLowerCase().includes(emailSearch.toLowerCase()) ||
          (e.from_name || '').toLowerCase().includes(emailSearch.toLowerCase()) ||
          (e.from_address || '').toLowerCase().includes(emailSearch.toLowerCase()) ||
          (e.to_addresses || '').toLowerCase().includes(emailSearch.toLowerCase())
        )
      : realEmails;

    // Build columns dynamically based on active folder
    const isSentOrDrafts = selectedFolder === 'sent' || selectedFolder === 'drafts';
    const isTrash = selectedFolder === 'trash';

    const emailColumns: any[] = [
      {
        title: '',
        key: 'star',
        width: 40,
        render: (_: any, record: any) => (
          <Button
            type="text"
            size="small"
            icon={record.is_starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
            onClick={(e: any) => { e.stopPropagation(); handleToggleStar(record.id); }}
          />
        )
      },
      {
        title: isSentOrDrafts ? 'To' : 'From',
        key: 'from',
        width: 220,
        render: (_: any, record: any) => {
          if (isSentOrDrafts) {
            return (
              <div>
                <Text strong>{record.to_addresses || '(no recipient)'}</Text>
              </div>
            );
          }
          return (
            <div>
              <Text strong={!record.is_read}>{record.from_name || record.from_address}</Text>
              {record.from_name && <><br /><Text type="secondary" style={{ fontSize: 11 }}>{record.from_address}</Text></>}
            </div>
          );
        }
      },
      {
        title: 'Subject',
        key: 'subject',
        render: (_: any, record: any) => (
          <div>
            <Text strong={!record.is_read}>{record.subject || '(No Subject)'}</Text>
            {record.has_attachments && <PaperClipOutlined style={{ marginLeft: 8, color: '#8c8c8c' }} />}
            {selectedFolder === 'all' && record.folder && (
              <Tag style={{ marginLeft: 8, fontSize: 10 }} color={record.folder === 'INBOX' ? 'blue' : record.folder === 'Sent' ? 'green' : record.folder === 'Drafts' ? 'orange' : 'default'}>
                {record.folder === 'INBOX' ? 'Inbox' : record.folder}
              </Tag>
            )}
          </div>
        )
      },
      {
        title: 'Date',
        key: 'date',
        width: 160,
        render: (_: any, record: any) => {
          const d = new Date(record.date);
          const today = new Date();
          const isToday = d.toDateString() === today.toDateString();
          return <Text type="secondary">{isToday ? d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>;
        }
      },
      {
        title: '',
        key: 'actions',
        width: isTrash ? 100 : 50,
        render: (_: any, record: any) => (
          <Space>
            {isTrash && (
              <Tooltip title="Restore to Inbox">
                <Button size="small" icon={<InboxOutlined />} onClick={(e: any) => { e.stopPropagation(); handleRestoreEmail(record.id); }} />
              </Tooltip>
            )}
            {selectedFolder === 'drafts' ? (
              <Tooltip title="Edit Draft">
                <Button size="small" icon={<EditOutlined />} onClick={(e: any) => {
                  e.stopPropagation();
                  handleViewEmail(record);
                }} />
              </Tooltip>
            ) : (
              <Tooltip title={isTrash ? 'Delete Forever' : 'Move to Trash'}>
                <Button size="small" icon={<DeleteOutlined />} danger onClick={(e: any) => { e.stopPropagation(); handleDeleteEmail(record.id); }} />
              </Tooltip>
            )}
          </Space>
        )
      }
    ];

    return (
      <div style={{ padding: '24px' }}>
        <Row gutter={16}>
          <Col span={4}>
            <Card size="small" styles={{ body: { padding: '12px' } }}>
              <Button type="primary" block icon={<PlusOutlined />} onClick={() => { composeForm.resetFields(); setReplyMode(null); setComposeModalVisible(true); }} style={{ marginBottom: 16 }}>
                Compose
              </Button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { key: 'inbox', icon: <InboxOutlined />, label: 'Inbox', count: folderCounts.unread, badgeColor: '#ff4d4f' },
                  { key: 'starred', icon: <StarFilled style={{ color: '#faad14' }} />, label: 'Starred', count: folderCounts.starred, badgeColor: '#faad14' },
                  { key: 'sent', icon: <SendOutlined />, label: 'Sent', count: folderCounts.sent, badgeColor: '#52c41a' },
                  { key: 'drafts', icon: <EditOutlined />, label: 'Drafts', count: folderCounts.drafts, badgeColor: '#fa8c16' },
                  { key: 'trash', icon: <DeleteOutlined />, label: 'Trash', count: folderCounts.trash, badgeColor: '#8c8c8c' },
                  { key: 'all', icon: <MailOutlined />, label: 'All Mail', count: folderCounts.all, badgeColor: '#1890ff' },
                ].map(item => (
                  <div
                    key={item.key}
                    onClick={() => handleFolderClick(item.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                      backgroundColor: selectedFolder === item.key ? '#e6f7ff' : 'transparent',
                      borderLeft: selectedFolder === item.key ? '3px solid #1890ff' : '3px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Space size={8}>
                      {item.icon}
                      <Text strong={selectedFolder === item.key}>{item.label}</Text>
                    </Space>
                    {item.count > 0 && (
                      <Badge
                        count={item.count}
                        overflowCount={999}
                        style={{ backgroundColor: item.key === 'inbox' ? item.badgeColor : 'transparent', color: item.key === 'inbox' ? '#fff' : '#8c8c8c', boxShadow: item.key === 'inbox' ? undefined : 'none', fontSize: 11 }}
                        showZero={false}
                      />
                    )}
                  </div>
                ))}
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Account</Text>
              <div style={{ marginTop: 8 }}>
                {emailAccounts.map(acct => (
                  <Tag key={acct.id} color="blue" style={{ marginBottom: 4, fontSize: 11 }}>
                    <MailOutlined /> {acct.email_address}
                  </Tag>
                ))}
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Coming Soon</Text>
              <Space direction="vertical" size={4} style={{ marginTop: 4, opacity: 0.5 }}>
                <Space size={6}><WhatsAppOutlined style={{ color: '#25D366' }} /><Text style={{ fontSize: 12 }}>WhatsApp</Text></Space>
                <Space size={6}><MobileOutlined style={{ color: '#1890ff' }} /><Text style={{ fontSize: 12 }}>SMS</Text></Space>
                <Space size={6}><MessageOutlined style={{ color: '#722ed1' }} /><Text style={{ fontSize: 12 }}>Internal Chat</Text></Space>
              </Space>
            </Card>
          </Col>
          <Col span={20}>
            <Card
              title={
                <Space>
                  {currentFolder.icon}
                  <span>{currentFolder.label} ({emailTotal} {emailTotal === 1 ? 'email' : 'emails'})</span>
                  {syncingEmail && <Tag color="processing" icon={<SyncOutlined spin />}>Syncing...</Tag>}
                </Space>
              }
              extra={
                <Space>
                  <Button icon={<SyncOutlined spin={syncingEmail} />} onClick={handleSyncEmails} loading={syncingEmail} size="small">
                    Sync
                  </Button>
                  <Input
                    placeholder="Search emails..."
                    prefix={<SearchOutlined />}
                    style={{ width: 220 }}
                    allowClear
                    value={emailSearch}
                    onChange={e => setEmailSearch(e.target.value)}
                  />
                </Space>
              }
              loading={emailLoading}
            >
              {isTrash && realEmails.length > 0 && (
                <Alert
                  message={'Emails in Trash will be permanently deleted. Use the restore button to move back to Inbox.'}
                  type="warning"
                  showIcon
                  closable
                  style={{ marginBottom: 12 }}
                />
              )}
              <Table
                dataSource={filteredEmails}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 20, showTotal: (total) => `${total} emails` }}
                onRow={(record) => ({
                  onClick: () => selectedFolder === 'drafts' ? (() => {
                    composeForm.setFieldsValue({ to: record.to_addresses ? [record.to_addresses] : [], cc: record.cc_addresses ? [record.cc_addresses] : [], subject: record.subject, content: record.body_text || '' });
                    setComposeModalVisible(true);
                  })() : handleViewEmail(record),
                  style: { cursor: 'pointer', background: record.is_read ? undefined : '#f0f5ff' }
                })}
                columns={emailColumns}
                locale={{ emptyText: <Empty description={`No emails in ${currentFolder.label}`} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // Contacts
  const renderContacts = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><ContactsOutlined /> Contact Management</>}
        extra={
          <Space>
            <Input placeholder="Search contacts..." prefix={<SearchOutlined />} style={{ width: 250 }} />
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Types</Option>
              <Option value="customer">Customers</Option>
              <Option value="supplier">Suppliers</Option>
              <Option value="employee">Employees</Option>
              <Option value="lead">Leads</Option>
            </Select>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />}>Add Contact</Button>
          </Space>
        }
      >
        <Table
          dataSource={contacts || []}
          rowKey="id"
          columns={[
            {
              title: 'Contact',
              key: 'contact',
              render: (_, record) => (
                <Space>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: record.type === 'customer' ? '#1890ff' : record.type === 'supplier' ? '#52c41a' : record.type === 'employee' ? '#722ed1' : '#fa8c16' }} />
                  <div>
                    <Text strong>{record.name}</Text>
                    {record.company && <><br /><Text type="secondary" style={{ fontSize: 11 }}>{record.company}</Text></>}
                  </div>
                </Space>
              )
            },
            {
              title: 'Email',
              dataIndex: 'email',
              key: 'email',
              render: (email: string) => <a href={`mailto:${email}`}>{email}</a>
            },
            {
              title: 'Phone',
              dataIndex: 'phone',
              key: 'phone',
              render: (phone: string) => <a href={`tel:${phone}`}>{phone}</a>
            },
            {
              title: 'Type',
              dataIndex: 'type',
              key: 'type',
              render: (type: string) => {
                const colors: Record<string, string> = { customer: 'blue', supplier: 'green', employee: 'purple', lead: 'orange', other: 'default' };
                return <Tag color={colors[type]}>{type}</Tag>;
              }
            },
            {
              title: 'Groups',
              dataIndex: 'groups',
              key: 'groups',
              render: (groups: string[]) => groups.map(g => <Tag key={g}>{g}</Tag>)
            },
            {
              title: 'Opt-In',
              key: 'optIn',
              render: (_, record) => (
                <Space>
                  <Tooltip title="Email"><Tag color={record.optInEmail ? 'green' : 'default'}><MailOutlined /></Tag></Tooltip>
                  <Tooltip title="SMS"><Tag color={record.optInSMS ? 'green' : 'default'}><MobileOutlined /></Tag></Tooltip>
                  <Tooltip title="WhatsApp"><Tag color={record.optInWhatsApp ? 'green' : 'default'}><WhatsAppOutlined /></Tag></Tooltip>
                </Space>
              )
            },
            {
              title: 'Last Contact',
              dataIndex: 'lastContact',
              key: 'lastContact'
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'email', label: 'Send Email', icon: <MailOutlined /> },
                      { key: 'sms', label: 'Send SMS', icon: <MobileOutlined /> },
                      { key: 'whatsapp', label: 'Send WhatsApp', icon: <WhatsAppOutlined /> },
                      { type: 'divider' },
                      { key: 'edit', label: 'Edit Contact', icon: <EditOutlined /> },
                      { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true }
                    ]
                  }}
                >
                  <Button icon={<MoreOutlined />} />
                </Dropdown>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Templates
  const renderTemplates = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><FileTextOutlined /> Message Templates</>}
        extra={
          <Space>
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Types</Option>
              <Option value="email">Email</Option>
              <Option value="sms">SMS</Option>
              <Option value="whatsapp">WhatsApp</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setTemplateModalVisible(true)}>
              Create Template
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          {templates.map(template => (
            <Col xs={24} sm={12} lg={8} key={template.id}>
              <Card
                size="small"
                title={
                  <Space>
                    {template.type === 'email' ? <MailOutlined style={{ color: '#1890ff' }} /> : 
                     template.type === 'sms' ? <MobileOutlined style={{ color: '#52c41a' }} /> : 
                     <WhatsAppOutlined style={{ color: '#25D366' }} />}
                    <Text strong>{template.name}</Text>
                  </Space>
                }
                extra={
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'use', label: 'Use Template', icon: <SendOutlined /> },
                        { key: 'edit', label: 'Edit', icon: <EditOutlined /> },
                        { key: 'duplicate', label: 'Duplicate', icon: <CopyOutlined /> },
                        { type: 'divider' },
                        { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true }
                      ],
                      onClick: ({ key }) => handleTemplateAction(key, template)
                    }}
                  >
                    <Button size="small" icon={<MoreOutlined />} />
                  </Dropdown>
                }
              >
                <Tag color="blue">{template.category}</Tag>
                <Tag>{template.type}</Tag>
                {template.subject && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Subject:</Text>
                    <br />
                    <Text ellipsis style={{ fontSize: 12 }}>{template.subject}</Text>
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Content Preview:</Text>
                  <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: 12, marginBottom: 8 }}>
                    {template.content}
                  </Paragraph>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <ThunderboltOutlined /> Used {template.usageCount} times
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Variables: {template.variables.length}
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );

  // Campaigns
  const renderCampaigns = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><RocketOutlined /> Campaign Management</>}
        extra={
          <Space>
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Status</Option>
              <Option value="draft">Draft</Option>
              <Option value="scheduled">Scheduled</Option>
              <Option value="running">Running</Option>
              <Option value="completed">Completed</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCampaignModalVisible(true)}>
              Create Campaign
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={campaigns || []}
          rowKey="id"
          columns={[
            {
              title: 'Campaign',
              key: 'campaign',
              render: (_, record) => (
                <Space>
                  {record.type === 'email' ? <MailOutlined style={{ color: '#1890ff' }} /> : 
                   record.type === 'sms' ? <MobileOutlined style={{ color: '#52c41a' }} /> : 
                   <WhatsAppOutlined style={{ color: '#25D366' }} />}
                  <div>
                    <Text strong>{record.name}</Text>
                    <br />
                    <Tag>{record.type}</Tag>
                  </div>
                </Space>
              )
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
            },
            {
              title: 'Recipients',
              dataIndex: 'recipients',
              key: 'recipients',
              render: (count: number) => count.toLocaleString()
            },
            {
              title: 'Sent',
              dataIndex: 'sent',
              key: 'sent',
              render: (sent: number, record) => (
                <div>
                  <Text>{sent.toLocaleString()}</Text>
                  {record.recipients > 0 && (
                    <Progress 
                      percent={Math.round((sent / record.recipients) * 100)} 
                      size="small" 
                      showInfo={false}
                      style={{ width: 60 }}
                    />
                  )}
                </div>
              )
            },
            {
              title: 'Delivered',
              dataIndex: 'delivered',
              key: 'delivered',
              render: (delivered: number) => <Text type="success">{delivered.toLocaleString()}</Text>
            },
            {
              title: 'Opened',
              key: 'opened',
              render: (_, record) => record.type === 'email' ? (
                <div>
                  <Text>{record.opened.toLocaleString()}</Text>
                  {record.delivered > 0 && (
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                      ({((record.opened / record.delivered) * 100).toFixed(1)}%)
                    </Text>
                  )}
                </div>
              ) : <Text type="secondary">N/A</Text>
            },
            {
              title: 'Clicked',
              key: 'clicked',
              render: (_, record) => record.type === 'email' ? (
                <Text>{record.clicked.toLocaleString()}</Text>
              ) : <Text type="secondary">N/A</Text>
            },
            {
              title: 'Schedule',
              key: 'schedule',
              render: (_, record) => record.scheduledDate ? (
                <Tag icon={<ClockCircleOutlined />} color="orange">{record.scheduledDate}</Tag>
              ) : record.completedDate ? (
                <Tag icon={<CheckCircleOutlined />} color="green">{record.completedDate}</Tag>
              ) : '-'
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  {record.status === 'draft' && <Button size="small" type="primary">Launch</Button>}
                  {record.status === 'running' && <Button size="small">Pause</Button>}
                  {record.status === 'scheduled' && <Button size="small">Edit</Button>}
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Announcements
  const renderAnnouncements = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><SoundOutlined /> Company Announcements</>}
        extra={
          <Space>
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Status</Option>
              <Option value="published">Published</Option>
              <Option value="draft">Draft</Option>
              <Option value="archived">Archived</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAnnouncementModalVisible(true)}>
              New Announcement
            </Button>
          </Space>
        }
      >
        <List
          dataSource={announcements || []}
          renderItem={item => (
            <List.Item
              actions={[
                <Button size="small" icon={<EyeOutlined />}>View</Button>,
                <Button size="small" icon={<EditOutlined />}>Edit</Button>,
                <Dropdown
                  menu={{
                    items: [
                      { key: 'archive', label: 'Archive', icon: <FlagOutlined /> },
                      { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true }
                    ]
                  }}
                >
                  <Button size="small" icon={<MoreOutlined />} />
                </Dropdown>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    icon={<SoundOutlined />} 
                    style={{ 
                      backgroundColor: item.priority === 'critical' ? '#ff4d4f' : 
                                      item.priority === 'high' ? '#fa8c16' : '#1890ff' 
                    }} 
                  />
                }
                title={
                  <Space>
                    <Text strong>{item.title}</Text>
                    <Tag color={item.priority === 'critical' ? 'red' : item.priority === 'high' ? 'orange' : 'blue'}>
                      {item.priority}
                    </Tag>
                    <Tag color={getStatusColor(item.status)}>{item.status}</Tag>
                  </Space>
                }
                description={
                  <div>
                    <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 4 }}>
                      {item.content}
                    </Paragraph>
                    <Space size="large">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <UserOutlined /> {item.author} ({item.department})
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <CalendarOutlined /> {item.publishDate}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <EyeOutlined /> {item.viewCount} views
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <TeamOutlined /> {item.targetAudience.join(', ')}
                      </Text>
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );

  // Video Meetings
  const renderMeetings = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Scheduled Meetings" value={(meetings || []).filter(m => m?.status === 'scheduled').length} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Live Now" value={(meetings || []).filter(m => m?.status === 'live').length} valueStyle={{ color: '#52c41a' }} prefix={<PlayCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Total Participants Today" value={24} prefix={<UsergroupAddOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Recordings" value={(meetings || []).filter(m => m?.recordingUrl).length} prefix={<VideoCameraOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<><VideoCameraOutlined /> Video Meetings & Conferences</>}
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <Button
              icon={<LinkOutlined />}
              loading={meetingLoading}
              onClick={createInstantMeeting}
            >
              Quick Meeting
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setMeetingModalVisible(true)}>
              Schedule Meeting
            </Button>
          </Space>
        }
      >
        <Alert
          message="Video Conferencing Powered by Daily.co"
          description="Host HD video meetings with internal teams and external clients. Send meeting links via email, SMS, or WhatsApp. Clients join via browser - no software download needed."
          type="info"
          showIcon
          icon={<VideoCameraOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Table
          dataSource={meetings || []}
          rowKey="id"
          columns={[
            {
              title: 'Meeting',
              key: 'meeting',
              render: (_, record) => (
                <div>
                  <Text strong>{record.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
                </div>
              )
            },
            {
              title: 'Type',
              dataIndex: 'type',
              key: 'type',
              render: (type: string) => (
                <Tag color={type === 'video' ? 'blue' : type === 'webinar' ? 'purple' : 'cyan'}>
                  {type === 'video' ? <VideoCameraOutlined /> : type === 'webinar' ? <DesktopOutlined /> : <AudioOutlined />} {type.toUpperCase()}
                </Tag>
              )
            },
            {
              title: 'Host',
              dataIndex: 'host',
              key: 'host',
              render: (host: string) => (
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {host}
                </Space>
              )
            },
            {
              title: 'Participants',
              key: 'participants',
              render: (_, record) => (
                <div>
                  <Text>{Array.isArray(record.participants) ? record.participants.length : 0} internal</Text>
                  {Array.isArray(record.externalGuests) && record.externalGuests.length > 0 && (
                    <><br /><Text type="secondary" style={{ fontSize: 12 }}>{record.externalGuests.length} external guests</Text></>
                  )}
                </div>
              )
            },
            {
              title: 'Schedule',
              key: 'schedule',
              render: (_, record) => {
                const start = new Date(record.scheduledStart);
                const end = new Date(record.scheduledEnd);
                const startDate = Number.isNaN(start.getTime()) ? record.scheduledStart : start.toLocaleDateString('en-ZA');
                const startTime = Number.isNaN(start.getTime()) ? '' : start.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
                const endTime = Number.isNaN(end.getTime()) ? '' : end.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div>
                    <Tag icon={<CalendarOutlined />}>{startDate}</Tag>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>{startTime && endTime ? `${startTime} - ${endTime}` : 'Time TBD'}</Text>
                  </div>
                );
              }
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => (
                <Tag color={status === 'live' ? 'green' : status === 'scheduled' ? 'blue' : status === 'ended' ? 'default' : 'red'}>
                  {status === 'live' && <Badge status="processing" />} {status.toUpperCase()}
                </Tag>
              )
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  {record.status === 'scheduled' && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<VideoCameraOutlined />}
                      onClick={() => {
                        setMeetings(prev => prev.map(m => m.id === record.id ? { ...m, status: 'live' } : m));
                        message.success('Meeting started');
                        window.open(record.meetingLink, '_blank');
                      }}
                    >
                      Start
                    </Button>
                  )}
                  {record.status === 'live' && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      style={{ background: '#52c41a' }}
                      onClick={() => window.open(record.meetingLink, '_blank')}
                    >
                      Join
                    </Button>
                  )}
                  <Tooltip title="Copy Meeting Link">
                    <Button size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(record.meetingLink); message.success('Meeting link copied!'); }} />
                  </Tooltip>
                  <Tooltip title="Send Invite">
                    <Button size="small" icon={<SendOutlined />} onClick={() => message.info('Send invite via Email/SMS/WhatsApp')} />
                  </Tooltip>
                  {record.recordingUrl && (
                    <Tooltip title="View Recording">
                      <Button size="small" icon={<PlayCircleOutlined />} />
                    </Tooltip>
                  )}
                </Space>
              )
            }
          ]}
        />

        {/* Quick Actions */}
        <Divider />
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small" hoverable onClick={createInstantMeeting} style={{ cursor: meetingLoading ? 'wait' : 'pointer' }}>
              <Space>
                <Avatar style={{ background: '#1890ff' }} icon={meetingLoading ? <Spin size="small" /> : <VideoCameraOutlined />} />
                <div>
                  <Text strong>Start Instant Call</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>Start a video meeting now</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" hoverable onClick={() => setMeetingModalVisible(true)}>
              <Space>
                <Avatar style={{ background: '#722ed1' }} icon={<CalendarOutlined />} />
                <div>
                  <Text strong>Schedule Meeting</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>Plan a meeting for later</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" hoverable onClick={() => message.info('Webinar feature coming soon')}>
              <Space>
                <Avatar style={{ background: '#52c41a' }} icon={<DesktopOutlined />} />
                <div>
                  <Text strong>Host Webinar</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>Present to large audiences</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Notifications
  const renderNotifications = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Unread" value={(notifications || []).filter(n => n && !n.isRead).length} valueStyle={{ color: '#ff4d4f' }} prefix={<BellOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="High Priority" value={(notifications || []).filter(n => n?.priority === 'high' || n?.priority === 'urgent').length} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Today" value={(notifications || []).filter(n => n?.timestamp?.includes('2024-06-15')).length} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Pending Actions" value={(notifications || []).filter(n => n?.actionUrl && !n?.isRead).length} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<><BellOutlined /> Notification Center</>}
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <Button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}>
              Mark All Read
            </Button>
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Types</Option>
              <Option value="message">Messages</Option>
              <Option value="meeting">Meetings</Option>
              <Option value="task">Tasks</Option>
              <Option value="approval">Approvals</Option>
              <Option value="system">System</Option>
              <Option value="alert">Alerts</Option>
            </Select>
          </Space>
        }
      >
        <List
          dataSource={notifications || []}
          renderItem={notification => (
            <List.Item
              style={{ 
                background: notification.isRead ? 'transparent' : '#f0f5ff',
                padding: '12px 16px',
                borderRadius: 8,
                marginBottom: 8
              }}
              actions={[
                <Button size="small" type="link" onClick={() => setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n))}>
                  {notification.isRead ? 'Read' : 'Mark Read'}
                </Button>,
                notification.actionUrl && <Button size="small" type="primary">View</Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    style={{
                      background: notification.type === 'meeting' ? '#1890ff' :
                        notification.type === 'message' ? '#52c41a' :
                        notification.type === 'approval' ? '#faad14' :
                        notification.type === 'task' ? '#722ed1' :
                        notification.type === 'alert' ? '#ff4d4f' : '#666'
                    }}
                    icon={
                      notification.type === 'meeting' ? <VideoCameraOutlined /> :
                      notification.type === 'message' ? <MailOutlined /> :
                      notification.type === 'approval' ? <CheckCircleOutlined /> :
                      notification.type === 'task' ? <FileTextOutlined /> :
                      notification.type === 'alert' ? <WarningOutlined /> : <BellOutlined />
                    }
                  />
                }
                title={
                  <Space>
                    <Text strong={!notification.isRead}>{notification.title}</Text>
                    <Tag color={notification.priority === 'urgent' ? 'red' : notification.priority === 'high' ? 'orange' : notification.priority === 'normal' ? 'blue' : 'default'}>
                      {notification.priority}
                    </Tag>
                    {!notification.isRead && <Badge status="processing" />}
                  </Space>
                }
                description={
                  <div>
                    <Text type="secondary">{notification.content}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}><ClockCircleOutlined /> {notification.timestamp}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Notification Settings Quick Access */}
      <Card title="Quick Settings" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Email Notifications">
              <Switch defaultChecked />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Push Notifications">
              <Switch defaultChecked />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="SMS Alerts">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Desktop Alerts">
              <Switch defaultChecked />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Settings
  const renderSettings = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        {/* Email Account Integration */}
        <Col xs={24}>
          <Card 
            title={<><MailOutlined /> Email Account Integration (IMAP/SMTP)</>}
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddAccountModalVisible(true)}>
                Add Email Account
              </Button>
            }
          >
            {emailAccounts.length === 0 ? (
              <Alert
                message="No Email Accounts Connected"
                description="Connect your email account to send and receive emails directly from the ERP system. Your emails will be synced via IMAP and you can send via SMTP."
                type="info"
                showIcon
                icon={<MailOutlined />}
                action={
                  <Button type="primary" onClick={() => setAddAccountModalVisible(true)}>
                    Connect Email Account
                  </Button>
                }
              />
            ) : (
              <Table
                dataSource={emailAccounts}
                rowKey="id"
                columns={[
                  {
                    title: 'Email Address',
                    dataIndex: 'email_address',
                    key: 'email',
                    render: (email: string, record) => (
                      <Space>
                        <MailOutlined style={{ color: '#1890ff' }} />
                        <div>
                          <Text strong>{email}</Text>
                          {record.display_name && <><br /><Text type="secondary">{record.display_name}</Text></>}
                        </div>
                        {record.is_default && <Tag color="green">Default</Tag>}
                      </Space>
                    )
                  },
                  {
                    title: 'IMAP Server',
                    key: 'imap',
                    render: (_, record) => <Text type="secondary">{record.imap_host}:{record.imap_port}</Text>
                  },
                  {
                    title: 'SMTP Server',
                    key: 'smtp',
                    render: (_, record) => <Text type="secondary">{record.smtp_host}:{record.smtp_port}</Text>
                  },
                  {
                    title: 'Status',
                    key: 'status',
                    render: (_, record) => (
                      <Tag color={record.is_active ? 'green' : 'red'}>
                        {record.is_active ? 'Active' : 'Inactive'}
                      </Tag>
                    )
                  },
                  {
                    title: 'Last Sync',
                    key: 'sync',
                    render: (_, record) => record.last_sync_at 
                      ? <Text type="secondary">{new Date(record.last_sync_at).toLocaleString('en-ZA')}</Text>
                      : <Text type="secondary">Never</Text>
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, record) => (
                      <Space>
                        <Button size="small" icon={<SyncOutlined />} onClick={() => handleSyncEmails()}>Sync</Button>
                        <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDeleteEmailAccount(record.id)}>Remove</Button>
                      </Space>
                    )
                  }
                ]}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<><MailOutlined /> Outgoing Email Signature</>}>
            <Form layout="vertical">
              <Form.Item label="Email Signature">
                <TextArea rows={4} defaultValue="Kind Regards,\nThe WorldClass ERP Team\n\nThis email was sent from WorldClass ERP. Please do not reply directly." />
              </Form.Item>
              <Button type="primary">Save Signature</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<><MobileOutlined /> SMS & WhatsApp Settings</>}>
            <Form layout="vertical">
              <Form.Item label="SMS Provider">
                <Select defaultValue="bulksms">
                  <Option value="bulksms">BulkSMS</Option>
                  <Option value="clickatell">Clickatell</Option>
                  <Option value="twilio">Twilio</Option>
                </Select>
              </Form.Item>
              <Form.Item label="SMS API Key">
                <Input.Password defaultValue="xxxxxxxxxx" />
              </Form.Item>
              <Form.Item label="WhatsApp Business Number">
                <Input defaultValue="+27110001234" />
              </Form.Item>
              <Button type="primary">Save SMS Settings</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title={<><LockOutlined /> PoPI Act Compliance</>}>
            <Alert
              message="Protection of Personal Information Act (PoPI)"
              description="Ensure all communications comply with PoPI Act requirements."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Require Double Opt-In">
                    <Switch defaultChecked />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Include Unsubscribe Link">
                    <Switch defaultChecked />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Log All Communications">
                    <Switch defaultChecked />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary">Save Compliance Settings</Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Show loading spinner while data loads
  if (loading) {
    return (
      <HubLayout>
        <HubHeader
          title="Communications Hub"
          subtitle="Email, SMS, WhatsApp & Internal Messaging"
          icon={<MessageOutlined />}
          gradient="blue"
        />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin size="large" tip="Loading communications..." />
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <HubHeader
        title="Communications Hub"
        subtitle="Email, SMS, WhatsApp & Internal Messaging"
        icon={<MessageOutlined />}
        gradient="blue"
        actions={
          <>
            <Button icon={<SyncOutlined spin={syncingEmail} />} onClick={handleSyncEmails}>Sync Email</Button>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { composeForm.resetFields(); setReplyMode(null); setComposeModalVisible(true); }}>
              Compose
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="blue"
        icon={<MessageOutlined />}
        title="Communications Overview"
        subtitle="Messages & Campaigns"
        stats={[
          { title: 'Unread', value: folderCounts.unread, valueStyle: folderCounts.unread > 0 ? { color: '#fca5a5' } : undefined, span: 4 },
          { title: 'Total Emails', value: folderCounts.all || emailTotal, span: 4 },
          { title: 'Sent', value: folderCounts.sent, span: 4 },
          { title: 'Drafts', value: folderCounts.drafts, span: 4 },
          { title: 'Accounts', value: emailAccounts.length, span: 4 },
        ]}
      />

      <HubTabs
        theme="blue"
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <HomeOutlined />, children: renderDashboard() },
          { key: 'inbox', label: 'Inbox', icon: <InboxOutlined />, children: renderInbox() },
          { key: 'meetings', label: 'Meetings', icon: <VideoCameraOutlined />, children: renderMeetings() },
          { key: 'contacts', label: 'Contacts', icon: <ContactsOutlined />, children: renderContacts() },
          { key: 'templates', label: 'Templates', icon: <FileTextOutlined />, children: renderTemplates() },
          { key: 'campaigns', label: 'Campaigns', icon: <RocketOutlined />, children: renderCampaigns() },
          { key: 'announcements', label: 'Announcements', icon: <SoundOutlined />, children: renderAnnouncements() },
          { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: renderSettings() }
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* Compose Modal - REAL SMTP SEND */}
      <Modal
        title={replyMode === 'reply' ? 'Reply' : replyMode === 'forward' ? 'Forward' : 'Compose Email'}
        open={composeModalVisible}
        onCancel={() => { setComposeModalVisible(false); composeForm.resetFields(); setReplyMode(null); }}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => { setComposeModalVisible(false); composeForm.resetFields(); setReplyMode(null); }}>Cancel</Button>,
          <Button key="draft" icon={<EditOutlined />} onClick={handleSaveDraft}>Save Draft</Button>,
          <Button key="send" type="primary" icon={<SendOutlined />} loading={sendingEmail} onClick={() => composeForm.submit()}>
            {sendingEmail ? 'Sending...' : 'Send Email'}
          </Button>
        ]}
      >
        {emailAccounts.length === 0 ? (
          <Alert
            message="No Email Account Configured"
            description="Please add an email account in Settings before sending emails."
            type="warning"
            showIcon
            action={<Button onClick={() => { setComposeModalVisible(false); setActiveTab('settings'); setAddAccountModalVisible(true); }}>Go to Settings</Button>}
          />
        ) : (
          <Form form={composeForm} layout="vertical" onFinish={handleSendEmail}>
            <Form.Item label="From">
              <Input disabled value={emailAccounts[0]?.email_address} prefix={<MailOutlined />} />
            </Form.Item>
            <Form.Item label="To" name="to" rules={[{ required: true, message: 'Please enter recipients' }]}>
              <Select mode="tags" placeholder="Enter email addresses" tokenSeparators={[',', ';']}>
                {contacts.map(c => <Option key={c.email} value={c.email}>{c.name} ({c.email})</Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="CC" name="cc">
              <Select mode="tags" placeholder="CC (optional)" tokenSeparators={[',', ';']}>
                {contacts.map(c => <Option key={c.email} value={c.email}>{c.name} ({c.email})</Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="Subject" name="subject" rules={[{ required: true, message: 'Please enter a subject' }]}>
              <Input placeholder="Email subject" />
            </Form.Item>
            <Form.Item label="Message" name="content" rules={[{ required: true, message: 'Please enter a message' }]}>
              <TextArea rows={10} placeholder="Type your email message here..." />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Email Detail Modal */}
      <Modal
        title={selectedEmail?.subject || 'Email'}
        open={emailDetailVisible}
        onCancel={() => { setEmailDetailVisible(false); setSelectedEmail(null); setEmailDetailData(null); }}
        width={800}
        footer={[
          <Button key="reply" icon={<SendOutlined />} onClick={() => emailDetailData && handleReply(emailDetailData)}>Reply</Button>,
          <Button key="forward" icon={<ExportOutlined />} onClick={() => emailDetailData && handleForward(emailDetailData)}>Forward</Button>,
          selectedFolder === 'trash' 
            ? <Button key="restore" icon={<InboxOutlined />} onClick={() => { if (selectedEmail) { handleRestoreEmail(selectedEmail.id); setEmailDetailVisible(false); } }}>Restore</Button>
            : null,
          <Button key="delete" danger icon={<DeleteOutlined />} onClick={() => { if (selectedEmail) { handleDeleteEmail(selectedEmail.id); setEmailDetailVisible(false); } }}>{selectedFolder === 'trash' ? 'Delete Forever' : 'Delete'}</Button>,
          <Button key="close" onClick={() => setEmailDetailVisible(false)}>Close</Button>
        ]}
      >
        {emailDetailData ? (
          <div>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="From">
                <Space>
                  <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: '#1890ff' }} />
                  <Text strong>{emailDetailData.from_name}</Text>
                  <Text type="secondary">&lt;{emailDetailData.from_address}&gt;</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="To">{emailDetailData.to_addresses}</Descriptions.Item>
              {emailDetailData.cc_addresses && <Descriptions.Item label="CC">{emailDetailData.cc_addresses}</Descriptions.Item>}
              <Descriptions.Item label="Date">{new Date(emailDetailData.date).toLocaleString('en-ZA')}</Descriptions.Item>
              <Descriptions.Item label="Subject"><Text strong>{emailDetailData.subject}</Text></Descriptions.Item>
            </Descriptions>
            <Divider />
            {emailDetailData.body_html ? (
              <div 
                style={{ padding: 16, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, maxHeight: 400, overflow: 'auto', fontSize: 14, lineHeight: 1.6, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                dangerouslySetInnerHTML={{ __html: emailDetailData.body_html }} 
              />
            ) : emailDetailData.body_text ? (
              <div 
                style={{ padding: 16, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, maxHeight: 400, overflow: 'auto', fontSize: 14, lineHeight: 1.6, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                dangerouslySetInnerHTML={{ __html: emailDetailData.body_text
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#1890ff">$1</a>')
                  .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" style="color:#1890ff">$1</a>')
                  .replace(/\n/g, '<br />')
                }} 
              />
            ) : (
              <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, color: '#999', textAlign: 'center' }}>
                (No content)
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        )}
      </Modal>

      {/* Add Email Account Modal */}
      <Modal
        title={<><MailOutlined /> Connect Email Account</>}
        open={addAccountModalVisible}
        onCancel={() => { setAddAccountModalVisible(false); accountForm.resetFields(); }}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => { setAddAccountModalVisible(false); accountForm.resetFields(); }}>Cancel</Button>,
          <Button key="save" type="primary" icon={<CheckCircleOutlined />} onClick={() => accountForm.submit()}>
            Test & Connect
          </Button>
        ]}
      >
        <Alert
          message="Email Account Setup"
          description="Enter your email credentials below. The system will test the IMAP and SMTP connection before saving."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={accountForm} layout="vertical" onFinish={handleAddEmailAccount}
          initialValues={{
            imap_port: 993,
            imap_secure: true,
            smtp_port: 465,
            smtp_secure: true,
            is_default: true
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Email Address" name="email_address" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="you@company.co.za" prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Display Name" name="display_name">
                <Input placeholder="Your Name" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Username" name="username" rules={[{ required: true }]}>
                <Input placeholder="you@company.co.za" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Password" name="password" rules={[{ required: true }]}>
                <Input.Password placeholder="Email password" />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Incoming Mail (IMAP)</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="IMAP Server" name="imap_host" rules={[{ required: true }]}>
                <Input placeholder="mail.yourserver.co.za" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Port" name="imap_port" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SSL/TLS" name="imap_secure" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Outgoing Mail (SMTP)</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="SMTP Server" name="smtp_host" rules={[{ required: true }]}>
                <Input placeholder="mail.yourserver.co.za" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Port" name="smtp_port" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SSL/TLS" name="smtp_secure" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="is_default" valuePropName="checked">
            <Checkbox>Set as default account</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* Schedule Meeting Modal */}
      <Modal
        title={<><VideoCameraOutlined /> Schedule Video Meeting</>}
        open={meetingModalVisible}
        onCancel={() => setMeetingModalVisible(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setMeetingModalVisible(false)}>Cancel</Button>,
          <Button key="instant" type="default" icon={<PlayCircleOutlined />} loading={meetingLoading} onClick={async () => {
            await createInstantMeeting();
            setMeetingModalVisible(false);
          }}>
            Start Now
          </Button>,
          <Button key="schedule" type="primary" icon={<CalendarOutlined />} loading={meetingLoading} onClick={async () => {
            try {
              const values = await form.validateFields();
              await scheduleMeeting(values);
            } catch (error) {
              // Validation errors are surfaced by the form
            }
          }}>
            Schedule Meeting
          </Button>
        ]}
      >
        <Alert
          message="Video Meeting Features"
          description="Host HD video meetings with screen sharing, chat, and recording. External guests join via browser - no software required. Send invites via email, SMS, or WhatsApp."
          type="info"
          showIcon
          icon={<VideoCameraOutlined />}
          style={{ marginBottom: 16 }}
        />
        
        <Form form={form} layout="vertical">
          <Form.Item label="Meeting Title" name="meetingTitle" rules={[{ required: true }]}>
            <Input placeholder="e.g., Weekly Team Standup" prefix={<VideoCameraOutlined />} />
          </Form.Item>
          
          <Form.Item label="Description" name="meetingDescription">
            <TextArea rows={2} placeholder="What's this meeting about?" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Meeting Type" name="meetingType" initialValue="video">
                <Select>
                  <Option value="video"><VideoCameraOutlined /> Video Call</Option>
                  <Option value="audio"><AudioOutlined /> Audio Only</Option>
                  <Option value="webinar"><DesktopOutlined /> Webinar</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Duration" name="duration" initialValue="60">
                <Select>
                  <Option value="15">15 minutes</Option>
                  <Option value="30">30 minutes</Option>
                  <Option value="60">1 hour</Option>
                  <Option value="90">1.5 hours</Option>
                  <Option value="120">2 hours</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Date" name="meetingDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Time" name="meetingTime">
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item label="Internal Participants" name="participants">
            <Select mode="multiple" placeholder="Select team members">
              {(contacts || []).filter(c => c?.type === 'employee').map(c => (
                <Option key={c.id} value={c.id}>{c.name} ({c.company})</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="External Guests (Clients)" name="externalGuests">
            <Select mode="tags" placeholder="Enter client email addresses">
              {(contacts || []).filter(c => c?.type === 'customer').map(c => (
                <Option key={c.email} value={c.email}>{c.name} - {c.email}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Divider />
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="recordMeeting" valuePropName="checked">
                <Checkbox><VideoCameraOutlined /> Record Meeting</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="requirePasscode" valuePropName="checked">
                <Checkbox><LockOutlined /> Require Passcode</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="waitingRoom" valuePropName="checked">
                <Checkbox><UsergroupAddOutlined /> Enable Waiting Room</Checkbox>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item label="Send Invite Via">
            <Space>
              <Button icon={<MailOutlined />}>Email</Button>
              <Button icon={<MobileOutlined />}>SMS</Button>
              <Button icon={<WhatsAppOutlined />} style={{ color: '#25D366' }}>WhatsApp</Button>
              <Button icon={<CopyOutlined />}>Copy Link</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </HubLayout>
  );
};

export default CommunicationsHub;
