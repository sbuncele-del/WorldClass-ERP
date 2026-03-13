import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Tag, Button, Space, Badge,
  Input, Typography, Avatar, List, Divider, message,
  Alert, Progress, Tabs, Empty, Timeline, Modal, Form,
  Tooltip, Spin, Descriptions, Select, Upload, DatePicker
} from 'antd';
import {
  FileTextOutlined, DownloadOutlined, FolderOpenOutlined,
  MessageOutlined, SendOutlined, UserOutlined, LockOutlined,
  CheckCircleOutlined, ClockCircleOutlined, SearchOutlined,
  SafetyCertificateOutlined, BellOutlined, HomeOutlined,
  FileSearchOutlined, HistoryOutlined, LogoutOutlined,
  MailOutlined, EyeOutlined, AuditOutlined, PlusOutlined,
  ExclamationCircleOutlined, InfoCircleOutlined,
  InboxOutlined, CloudDownloadOutlined, PaperClipOutlined,
  FileExcelOutlined, FilePdfOutlined, FileZipOutlined,
  QuestionCircleOutlined, SwapOutlined, FolderOutlined,
  CommentOutlined, UploadOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ─── API Client ───
const api = axios.create({ baseURL: '', headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auditor_token');
  const tenantId = localStorage.getItem('auditor_tenant_id');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-ID'] = tenantId;
  return config;
});

// ─── Login Page ───
const AuditorLogin: React.FC<{ onLogin: (data: any) => void }> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/v2/auth/login', { email, password });
      const tokens = res.data?.data?.tokens || res.data?.tokens;
      const user = res.data?.data?.user || res.data?.user;
      const tenantId = user?.tenantId || user?.tenant_id || res.data?.data?.tenantId;
      if (tokens?.accessToken) {
        localStorage.setItem('auditor_token', tokens.accessToken);
        if (tenantId) localStorage.setItem('auditor_tenant_id', tenantId);
        onLogin({ user, tokens });
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <SafetyCertificateOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          <Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>Auditor Portal</Title>
          <Text type="secondary">SiyaBusa ERP — Secure Access</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item label="Email Address">
            <Input
              prefix={<MailOutlined />}
              placeholder="auditor@firm.co.za"
              value={email}
              onChange={e => setEmail(e.target.value)}
              size="large"
            />
          </Form.Item>
          <Form.Item label="Password">
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              size="large"
              onPressEnter={handleLogin}
            />
          </Form.Item>
          <Button type="primary" block size="large" loading={loading} onClick={handleLogin}>
            Sign In
          </Button>
        </Form>

        <Divider />
        <div style={{ textAlign: 'center' }}>
          <LockOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>End-to-end encrypted • All activity is logged</Text>
        </div>
      </Card>
    </div>
  );
};

// ─── Stat Card Helper ───
const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string; suffix?: string }> = ({ title, value, icon, color, suffix }) => (
  <Card>
    <Space>
      <Avatar style={{ background: color, width: 48, height: 48 }} icon={icon} />
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
        <div style={{ fontSize: 22, fontWeight: 'bold' }}>{value}{suffix && <span style={{ fontSize: 12, fontWeight: 'normal', color: '#8c8c8c' }}> {suffix}</span>}</div>
      </div>
    </Space>
  </Card>
);

// ─── File icon helper ───
const fileIcon = (name: string) => {
  if (name.endsWith('.pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />;
  if (name.endsWith('.xlsx') || name.endsWith('.csv')) return <FileExcelOutlined style={{ color: '#52c41a', fontSize: 18 }} />;
  if (name.endsWith('.zip')) return <FileZipOutlined style={{ color: '#722ed1', fontSize: 18 }} />;
  return <FileTextOutlined style={{ color: '#1890ff', fontSize: 18 }} />;
};

// ─── Main Portal ───
const AuditorPortal: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  const isDemo = new URLSearchParams(window.location.search).has('demo');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(!isDemo);

  // Data
  const [engagements, setEngagements] = useState<any[]>(isDemo ? DEMO_ENGAGEMENTS : []);
  const [findings, setFindings] = useState<any[]>(isDemo ? DEMO_FINDINGS : []);
  const [auditPackages, setAuditPackages] = useState<any[]>(isDemo ? DEMO_AUDIT_PACKAGES : []);
  const [infoRequests, setInfoRequests] = useState<any[]>(isDemo ? DEMO_INFO_REQUESTS : []);
  const [messages_, setMessages_] = useState<any[]>(isDemo ? DEMO_MESSAGES : []);

  // UI state
  const [newMessageText, setNewMessageText] = useState('');
  const [newRequestModal, setNewRequestModal] = useState(false);
  const [requestForm] = Form.useForm();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  useEffect(() => {
    if (isDemo) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [engRes, findRes, pkgRes, reqRes, msgRes] = await Promise.all([
          api.get('/api/audit/engagements').catch(() => ({ data: { data: [] } })),
          api.get('/api/audit/findings').catch(() => ({ data: { data: [] } })),
          api.get('/api/audit/portal/packages').catch(() => ({ data: { data: [] } })),
          api.get('/api/audit/portal/requests').catch(() => ({ data: { data: [] } })),
          api.get('/api/audit/portal/messages').catch(() => ({ data: { data: [] } })),
        ]);
        setEngagements(engRes.data?.data || []);
        setFindings(findRes.data?.data || []);
        setAuditPackages((pkgRes.data?.data || []).map((p: any) => ({
          ...p, documents: typeof p.documents === 'string' ? JSON.parse(p.documents) : (p.documents || []),
        })));
        setInfoRequests(reqRes.data?.data || []);
        setMessages_((msgRes.data?.data || []).map((m: any) => ({
          ...m, from: m.sender_type, fromName: m.sender_name, fromEmail: m.sender_email,
          toName: m.recipient_name, toEmail: m.recipient_email, body: m.body,
          timestamp: m.created_at, read: m.read, emailSent: m.email_sent,
          attachment: m.attachment_name,
        })));
      } catch (err) {
        console.error('Failed to fetch audit data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openFindings = findings.filter(f => f.status !== 'closed' && f.status !== 'resolved');
  const criticalFindings = findings.filter(f => f.severity === 'critical' || f.severity === 'high');
  const pendingRequests = infoRequests.filter(r => r.status === 'pending' || r.status === 'in_progress');
  const unreadMessages = messages_.filter(m => !m.read && m.from !== 'auditor').length;

  // ─── Send message (with email relay) ───
  const handleSendMessage = async () => {
    if (!newMessageText.trim()) return;
    const msgPayload = {
      sender_type: 'auditor',
      sender_name: `${user?.firstName || 'Auditor'} ${user?.lastName || ''}`.trim(),
      sender_email: user?.email,
      recipient_name: 'Client',
      recipient_email: 'sbuncele@gmail.com',
      subject: 'Audit Communication',
      body: newMessageText.trim(),
    };

    if (!isDemo) {
      try {
        const res = await api.post('/api/audit/portal/messages', msgPayload);
        const saved = res.data?.data;
        setMessages_([...messages_, {
          ...saved, from: 'auditor', fromName: msgPayload.sender_name,
          toName: 'Ncele Lekhohlwa', toEmail: 'sbuncele@gmail.com',
          timestamp: saved.created_at, read: true, emailSent: true,
        }]);
      } catch { message.error('Failed to send message'); return; }
    } else {
      setMessages_([...messages_, {
        id: messages_.length + 1, from: 'auditor', fromName: msgPayload.sender_name,
        to: 'client', toName: 'Ncele Lekhohlwa', toEmail: 'sbuncele@gmail.com',
        subject: 'Audit Communication', body: newMessageText.trim(),
        timestamp: new Date().toISOString(), read: true, emailSent: true,
      }]);
    }
    setNewMessageText('');
    message.success('Message sent — email copy sent to client');
  };

  // ─── Submit info request ───
  const handleSubmitRequest = async () => {
    try {
      const values = await requestForm.validateFields();
      const reqPayload = {
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        due_date: values.dueDate || null,
        requested_by: `${user?.firstName || 'Auditor'} ${user?.lastName || ''}`.trim(),
        requested_by_email: user?.email,
      };

      if (!isDemo) {
        try {
          const res = await api.post('/api/audit/portal/requests', reqPayload);
          const saved = res.data?.data;
          setInfoRequests([...infoRequests, {
            ...saved, requestedBy: reqPayload.requested_by,
            requestedDate: saved.created_at?.split('T')[0], dueDate: saved.due_date,
            emailSent: true, response: null,
          }]);
        } catch { message.error('Failed to send request'); return; }
      } else {
        setInfoRequests([...infoRequests, {
          id: infoRequests.length + 1, ...reqPayload, status: 'pending',
          requestedBy: reqPayload.requested_by, requestedDate: new Date().toISOString().split('T')[0],
          dueDate: values.dueDate, emailSent: true, response: null,
        }]);
      }
      requestForm.resetFields();
      setNewRequestModal(false);
      message.success('Information request sent — email notification sent to client');
    } catch { /* validation error */ }
  };

  // ─── OVERVIEW TAB ───
  const renderOverview = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} md={4}><StatCard title="Engagements" value={engagements.length} icon={<AuditOutlined />} color="#1890ff" /></Col>
        <Col xs={12} md={4}><StatCard title="Audit Packages" value={auditPackages.length} icon={<FolderOutlined />} color="#52c41a" /></Col>
        <Col xs={12} md={4}><StatCard title="Open Findings" value={openFindings.length} icon={<ExclamationCircleOutlined />} color={openFindings.length > 0 ? '#faad14' : '#52c41a'} /></Col>
        <Col xs={12} md={4}><StatCard title="Critical/High" value={criticalFindings.length} icon={<ExclamationCircleOutlined />} color={criticalFindings.length > 0 ? '#ff4d4f' : '#52c41a'} /></Col>
        <Col xs={12} md={4}><StatCard title="Pending Requests" value={pendingRequests.length} icon={<QuestionCircleOutlined />} color="#722ed1" /></Col>
        <Col xs={12} md={4}><StatCard title="Unread Messages" value={unreadMessages} icon={<MailOutlined />} color={unreadMessages > 0 ? '#eb2f96' : '#8c8c8c'} /></Col>
      </Row>

      {/* How it works banner */}
      <Alert
        message="How the Audit Portal Works"
        description={
          <div>
            <strong>1.</strong> Client prepares an <strong>Audit Package</strong> from their ERP — GL, trial balance, bank recs, payroll, asset registers, etc.<br />
            <strong>2.</strong> You receive access and can <strong>download everything</strong> from the Documents tab.<br />
            <strong>3.</strong> Need more info? Use the <strong>Information Requests</strong> tab — the client gets an email notification.<br />
            <strong>4.</strong> All communication in the <strong>Messages</strong> tab is <strong>copied to email</strong> so nothing is missed.<br />
            <strong>5.</strong> Log findings in the <strong>Findings</strong> tab — management can respond directly.
          </div>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 24 }}
        closable
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title={<><FolderOutlined /> Latest Audit Packages</>} size="small"
            extra={<Button type="link" size="small" onClick={() => setActiveTab('documents')}>View All</Button>}>
            {auditPackages.length === 0 ? <Empty description="No audit packages received yet" /> : (
              <List dataSource={auditPackages.slice(0, 3)} renderItem={pkg => (
                <List.Item actions={[<Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedPackage(pkg); setActiveTab('documents'); }}>Open</Button>]}>
                  <List.Item.Meta
                    avatar={<Avatar style={{ background: '#52c41a' }} icon={<FolderOutlined />} />}
                    title={pkg.name}
                    description={<><Tag color="blue">{pkg.documents.length} documents</Tag> Prepared {pkg.preparedDate}</>}
                  />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<><QuestionCircleOutlined /> Recent Info Requests</>} size="small"
            extra={<Button type="link" size="small" onClick={() => setActiveTab('requests')}>View All</Button>}>
            {infoRequests.length === 0 ? <Empty description="No information requests yet" /> : (
              <List dataSource={infoRequests.slice(0, 4)} renderItem={req => (
                <List.Item>
                  <List.Item.Meta
                    title={<Space>{req.title} <Tag color={req.status === 'fulfilled' ? 'green' : req.status === 'in_progress' ? 'blue' : 'orange'}>{req.status.toUpperCase()}</Tag></Space>}
                    description={req.description?.slice(0, 60) + '...'}
                  />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>
      </Row>

      <Card title={<><MailOutlined /> Recent Messages</>} size="small" style={{ marginTop: 16 }}
        extra={<Badge count={unreadMessages}><Button type="link" size="small" onClick={() => setActiveTab('messages')}>View All</Button></Badge>}>
        {messages_.length === 0 ? <Empty description="No messages yet" /> : (
          <List dataSource={messages_.slice(-3).reverse()} renderItem={msg => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar style={{ background: msg.from === 'auditor' ? '#1890ff' : '#52c41a' }} icon={<UserOutlined />} />}
                title={<Space><Text strong>{msg.fromName}</Text> <Text type="secondary" style={{ fontSize: 11 }}>{new Date(msg.timestamp).toLocaleString()}</Text> {msg.emailSent && <Tag color="geekblue" style={{ fontSize: 10 }}>EMAIL SENT</Tag>}</Space>}
                description={msg.body.slice(0, 100)}
              />
            </List.Item>
          )} />
        )}
      </Card>
    </div>
  );

  // ─── DOCUMENTS TAB (Audit Packages) ───
  const renderDocuments = () => (
    <div>
      <Alert
        message="Audit Packages"
        description="These are documents prepared and pushed by the client from their ERP system. The client clicked 'Prepare Audit Package' and all relevant financial data was packaged for your review. Click any package to browse and download documents."
        type="success"
        showIcon
        icon={<CloudDownloadOutlined />}
        style={{ marginBottom: 16 }}
      />

      {auditPackages.length === 0 ? (
        <Card><Empty description="No audit packages received yet. The client will prepare and push documents from their ERP." /></Card>
      ) : (
        <Row gutter={[16, 16]}>
          {auditPackages.map(pkg => (
            <Col xs={24} md={12} key={pkg.id}>
              <Card
                hoverable
                onClick={() => setSelectedPackage(selectedPackage?.id === pkg.id ? null : pkg)}
                style={{ borderColor: selectedPackage?.id === pkg.id ? '#1890ff' : undefined }}
                title={<Space><FolderOutlined /> {pkg.name}</Space>}
                extra={<Tag color={pkg.status === 'complete' ? 'green' : 'orange'}>{pkg.status?.toUpperCase()}</Tag>}
              >
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Prepared by">{pkg.preparedBy}</Descriptions.Item>
                  <Descriptions.Item label="Date">{pkg.preparedDate}</Descriptions.Item>
                  <Descriptions.Item label="Period">{pkg.period}</Descriptions.Item>
                  <Descriptions.Item label="Documents">{pkg.documents.length} files</Descriptions.Item>
                </Descriptions>

                {selectedPackage?.id === pkg.id && (
                  <div style={{ marginTop: 16 }}>
                    <Divider style={{ margin: '12px 0' }}>Package Contents</Divider>
                    <List dataSource={pkg.documents} renderItem={(doc: any) => (
                      <List.Item actions={[
                        <Button type="primary" size="small" icon={<DownloadOutlined />} onClick={e => { e.stopPropagation(); message.info(`Downloading ${doc.name}...`); }}>Download</Button>
                      ]}>
                        <List.Item.Meta
                          avatar={fileIcon(doc.name)}
                          title={doc.name}
                          description={<Space><Tag>{doc.category}</Tag><Text type="secondary">{doc.size}</Text></Space>}
                        />
                      </List.Item>
                    )} />
                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                      <Button type="primary" icon={<CloudDownloadOutlined />} size="large"
                        onClick={e => { e.stopPropagation(); message.success(`Downloading all ${pkg.documents.length} documents as ZIP...`); }}>
                        Download Entire Package (.zip)
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );

  // ─── INFORMATION REQUESTS TAB ───
  const renderRequests = () => (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Alert
            message="Request additional documents or information from the client. Each request triggers an email notification to the client team."
            type="info" showIcon style={{ marginBottom: 0 }}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setNewRequestModal(true)}>
            New Request
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={infoRequests}
        rowKey="id"
        columns={[
          { title: '#', dataIndex: 'id', key: 'id', width: 50 },
          { title: 'Request', dataIndex: 'title', key: 'title', render: (v: string, r: any) => (
            <div><Text strong>{v}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.description?.slice(0, 80)}</Text></div>
          )},
          { title: 'Category', dataIndex: 'category', key: 'cat', render: (v: string) => <Tag>{v}</Tag> },
          { title: 'Priority', dataIndex: 'priority', key: 'pri', render: (v: string) => (
            <Tag color={v === 'urgent' ? 'red' : v === 'high' ? 'orange' : v === 'medium' ? 'gold' : 'default'}>{(v || 'normal').toUpperCase()}</Tag>
          )},
          { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => (
            <Tag color={v === 'fulfilled' ? 'green' : v === 'in_progress' ? 'blue' : v === 'declined' ? 'red' : 'orange'}>{v.toUpperCase()}</Tag>
          )},
          { title: 'Requested', dataIndex: 'requestedDate', key: 'date' },
          { title: 'Due', dataIndex: 'dueDate', key: 'due', render: (v: string) => v || '-' },
          { title: 'Email', dataIndex: 'emailSent', key: 'email', render: (v: boolean) => v ? <Tag color="geekblue">SENT</Tag> : <Tag>PENDING</Tag> },
        ]}
        expandable={{
          expandedRowRender: (record: any) => (
            <div style={{ padding: 8 }}>
              <Text strong>Full Description:</Text> <Paragraph>{record.description}</Paragraph>
              {record.response && (<><Text strong>Client Response:</Text> <Paragraph style={{ background: '#f6ffed', padding: 12, borderRadius: 8, border: '1px solid #b7eb8f' }}>{record.response}</Paragraph></>)}
              {!record.response && record.status === 'pending' && <Alert message="Awaiting client response — email reminder was sent" type="warning" showIcon />}
            </div>
          ),
        }}
        pagination={{ pageSize: 10 }}
      />

      {/* New Request Modal */}
      <Modal title="Request Information from Client" open={newRequestModal} onCancel={() => setNewRequestModal(false)}
        onOk={handleSubmitRequest} okText="Send Request" width={600}>
        <Alert message="An email notification will be sent to the client when you submit this request." type="info" showIcon style={{ marginBottom: 16 }} />
        <Form form={requestForm} layout="vertical">
          <Form.Item name="title" label="What do you need?" rules={[{ required: true }]}>
            <Input placeholder="e.g. February 2026 FNB bank statement" />
          </Form.Item>
          <Form.Item name="description" label="Details" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Provide details about what you need and why..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="category" label="Category" initialValue="Financial">
                <Select options={[
                  { value: 'Financial', label: 'Financial' }, { value: 'Tax', label: 'Tax' },
                  { value: 'Payroll', label: 'Payroll' }, { value: 'Compliance', label: 'Compliance' },
                  { value: 'Legal', label: 'Legal' }, { value: 'IT', label: 'IT / Systems' },
                  { value: 'Other', label: 'Other' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select options={[
                  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dueDate" label="Needed by">
                <Input placeholder="e.g. 2026-03-20" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );

  // ─── MESSAGES TAB (email-mirrored) ───
  const renderMessages = () => (
    <div>
      <Alert
        message="All messages are mirrored to email"
        description="When you send a message here, the client receives it both in the portal AND via email. When the client replies (even by email), it appears here. This ensures nothing falls through the cracks."
        type="info" showIcon icon={<MailOutlined />}
        style={{ marginBottom: 16 }}
        closable
      />

      <Card style={{ maxHeight: 500, overflow: 'auto', marginBottom: 16 }}>
        {messages_.length === 0 ? (
          <Empty description="No messages yet. Start the conversation below." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages_.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: msg.from === 'auditor' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: msg.from === 'auditor' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.from === 'auditor' ? '#1890ff' : '#f0f0f0',
                  color: msg.from === 'auditor' ? 'white' : '#000',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong style={{ color: msg.from === 'auditor' ? 'white' : '#000', fontSize: 12 }}>{msg.fromName}</Text>
                    <Text style={{ color: msg.from === 'auditor' ? 'rgba(255,255,255,0.7)' : '#8c8c8c', fontSize: 10, marginLeft: 12 }}>
                      {new Date(msg.timestamp).toLocaleString()}
                    </Text>
                  </div>
                  <div>{msg.body}</div>
                  {msg.emailSent && (
                    <div style={{ marginTop: 4, textAlign: 'right' }}>
                      <Tag color={msg.from === 'auditor' ? 'blue' : 'green'} style={{ fontSize: 9, lineHeight: '16px' }}>
                        <MailOutlined /> Email copy sent to {msg.from === 'auditor' ? msg.toEmail : msg.fromEmail || 'auditor'}
                      </Tag>
                    </div>
                  )}
                  {msg.attachment && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(0,0,0,0.1)', borderRadius: 8 }}>
                      <PaperClipOutlined /> {msg.attachment} <Button type="link" size="small" style={{ color: msg.from === 'auditor' ? 'white' : '#1890ff' }}>Download</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Compose */}
      <Card size="small">
        <Row gutter={8}>
          <Col flex="auto">
            <TextArea
              value={newMessageText}
              onChange={e => setNewMessageText(e.target.value)}
              placeholder="Type a message... (will also be sent as email to client)"
              rows={2}
              onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            />
          </Col>
          <Col>
            <Space direction="vertical">
              <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} disabled={!newMessageText.trim()}>
                Send
              </Button>
              <Tooltip title="Attach file"><Button icon={<PaperClipOutlined />} /></Tooltip>
            </Space>
          </Col>
        </Row>
        <div style={{ marginTop: 8 }}>
          <MailOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
          <Text type="secondary" style={{ fontSize: 11 }}>Messages are sent to client via email at sbuncele@gmail.com</Text>
        </div>
      </Card>
    </div>
  );

  // ─── ENGAGEMENTS TAB ───
  const renderEngagements = () => (
    <Card title="Audit Engagements">
      {engagements.length === 0 ? <Empty description="No audit engagements found" /> : (
        <Table dataSource={engagements} rowKey="id" columns={[
          { title: 'Engagement', dataIndex: 'title', key: 'title', render: (v: string, r: any) => v || r.name },
          { title: 'Type', dataIndex: 'audit_type', key: 'type', render: (v: string) => <Tag>{v || 'Financial'}</Tag> },
          { title: 'Period', dataIndex: 'period', key: 'period' },
          { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => (
            <Tag color={v === 'completed' ? 'green' : v === 'in_progress' ? 'blue' : 'default'}>{(v || 'pending').replace('_', ' ').toUpperCase()}</Tag>
          )},
          { title: 'Lead Auditor', dataIndex: 'lead_auditor', key: 'lead' },
        ]} pagination={{ pageSize: 10 }} />
      )}
    </Card>
  );

  // ─── FINDINGS TAB ───
  const renderFindings = () => (
    <Card title="Audit Findings">
      {findings.length === 0 ? <Empty description="No audit findings recorded" /> : (
        <Table dataSource={findings} rowKey="id" columns={[
          { title: 'Finding', dataIndex: 'title', key: 'title' },
          { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (v: string) => (
            <Tag color={v === 'critical' ? 'red' : v === 'high' ? 'orange' : v === 'medium' ? 'gold' : 'blue'}>{(v || 'medium').toUpperCase()}</Tag>
          )},
          { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => (
            <Tag color={v === 'resolved' || v === 'closed' ? 'green' : v === 'in_progress' ? 'blue' : 'orange'}>{(v || 'open').toUpperCase()}</Tag>
          )},
          { title: 'Category', dataIndex: 'category', key: 'category' },
          { title: 'Due', dataIndex: 'due_date', key: 'due', render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
        ]} expandable={{
          expandedRowRender: (record: any) => (
            <div style={{ padding: 8 }}>
              <Text strong>Description:</Text><Paragraph>{record.description}</Paragraph>
              {record.recommendation && (<><Text strong>Recommendation:</Text><Paragraph>{record.recommendation}</Paragraph></>)}
              {record.management_response && (<><Text strong>Management Response:</Text><Paragraph style={{ background: '#f6ffed', padding: 8, borderRadius: 4, border: '1px solid #b7eb8f' }}>{record.management_response}</Paragraph></>)}
            </div>
          ),
        }} pagination={{ pageSize: 10 }} />
      )}
    </Card>
  );

  // ─── TAB CONFIG ───
  const tabItems = [
    { key: 'overview', label: <><HomeOutlined /> Overview</>, children: renderOverview() },
    { key: 'documents', label: <Badge count={auditPackages.length} size="small" offset={[8, 0]}><FolderOutlined /> Audit Packages</Badge>, children: renderDocuments() },
    { key: 'requests', label: <Badge count={pendingRequests.length} size="small" offset={[8, 0]}><QuestionCircleOutlined /> Info Requests</Badge>, children: renderRequests() },
    { key: 'messages', label: <Badge count={unreadMessages} size="small" offset={[8, 0]}><MessageOutlined /> Messages</Badge>, children: renderMessages() },
    { key: 'engagements', label: <><AuditOutlined /> Engagements</>, children: renderEngagements() },
    { key: 'findings', label: <><FileSearchOutlined /> Findings</>, children: renderFindings() },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', padding: '12px 24px', color: 'white' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <SafetyCertificateOutlined style={{ fontSize: 28 }} />
              <div>
                <Title level={4} style={{ color: 'white', margin: 0 }}>Auditor Portal</Title>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>SiyaBusa ERP — Secure Audit Access</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="large">
              <Badge count={unreadMessages + pendingRequests.length} offset={[-2, 2]}>
                <BellOutlined style={{ fontSize: 20, color: 'white', cursor: 'pointer' }} onClick={() => setActiveTab('messages')} />
              </Badge>
              <Space>
                <Avatar icon={<UserOutlined />} style={{ background: '#fff', color: '#1890ff' }} />
                <div>
                  <Text style={{ color: 'white' }}>{user?.firstName || user?.first_name || 'Auditor'} {user?.lastName || user?.last_name || ''}</Text>
                  <br />
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{user?.email}</Text>
                </div>
              </Space>
              <Button type="text" icon={<LogoutOutlined style={{ color: 'white' }} />} onClick={onLogout}>
                <span style={{ color: 'white' }}>Logout</span>
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /><br /><Text type="secondary">Loading audit data...</Text></div>
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" />
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: 16 }}>
        <LockOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Secure Portal powered by SiyaBusa ERP • All activity is logged • Messages mirrored to email
        </Text>
      </div>
    </div>
  );
};

// ─── Demo Data ───
const DEMO_USER = {
  firstName: 'Thabo', lastName: 'Mokoena', email: 'thabo@auditfirm.co.za', role: 'External Auditor',
};
const DEMO_ENGAGEMENTS = [
  { id: 1, title: 'Annual Financial Audit FY2025', audit_type: 'Financial', status: 'in_progress', period: '2025-03-01 — 2026-02-28', lead_auditor: 'Thabo Mokoena' },
  { id: 2, title: 'BBBEE Verification Audit', audit_type: 'Compliance', status: 'planning', period: '2026-01-01 — 2026-03-31', lead_auditor: 'Zanele Dlamini' },
  { id: 3, title: 'IT General Controls Review', audit_type: 'IT Audit', status: 'in_progress', period: '2026-02-01 — 2026-04-30', lead_auditor: 'Sipho Nkosi' },
  { id: 4, title: 'VAT Compliance Review', audit_type: 'Tax', status: 'completed', period: '2025-03-01 — 2025-12-31', lead_auditor: 'Thabo Mokoena' },
  { id: 5, title: 'Internal Controls Evaluation', audit_type: 'Internal', status: 'in_progress', period: '2026-01-15 — 2026-06-30', lead_auditor: 'Naledi Khumalo' },
];
const DEMO_FINDINGS = [
  { id: 1, title: 'Segregation of duties weakness in AP', severity: 'high', status: 'open', category: 'Internal Controls', due_date: '2026-04-15', description: 'The same user can create and approve purchase orders without secondary approval. This bypasses the dual-authorization control.', recommendation: 'Implement maker-checker workflow for all POs above R10,000.', management_response: 'Agreed. Will implement by end of Q1 2026.' },
  { id: 2, title: 'Bank reconciliation backlog (3 months)', severity: 'critical', status: 'open', category: 'Cash Management', due_date: '2026-03-31', description: 'Bank reconciliations for FNB operating account have not been performed since December 2025.', recommendation: 'Clear backlog immediately and implement monthly reconciliation deadline.' },
  { id: 3, title: 'Fixed asset register incomplete', severity: 'medium', status: 'in_progress', category: 'Asset Management', due_date: '2026-05-01', description: 'Asset register does not include 12 vehicles acquired in 2025. Depreciation is understated.', recommendation: 'Perform full physical verification and update asset register.' },
  { id: 4, title: 'POPIA consent records missing', severity: 'high', status: 'open', category: 'Compliance', due_date: '2026-04-30', description: 'Employee data processing consent forms not obtained for 45 employees hired in 2025.', recommendation: 'Distribute and collect POPIA consent forms for all employees.' },
  { id: 5, title: 'VAT input claims unsupported', severity: 'medium', status: 'resolved', category: 'Tax', due_date: '2026-02-28', description: 'R142,000 in VAT input claims for Q3 2025 lack supporting tax invoices.', recommendation: 'Obtain valid tax invoices or reverse unsupported claims.', management_response: 'Invoices located and filed. Issue resolved.' },
  { id: 6, title: 'Access logs not reviewed', severity: 'low', status: 'open', category: 'IT Controls', due_date: '2026-06-30', description: 'System access logs have not been reviewed since system go-live.', recommendation: 'Implement monthly access log review process.' },
];
const DEMO_AUDIT_PACKAGES = [
  {
    id: 1, name: 'FY2025 Year-End Financial Package', status: 'complete',
    preparedBy: 'Ncele Lekhohlwa', preparedDate: '2026-03-10', period: 'Mar 2025 — Feb 2026',
    documents: [
      { name: 'Trial_Balance_FY2025.xlsx', category: 'General Ledger', size: '2.4 MB' },
      { name: 'General_Ledger_Detail_FY2025.xlsx', category: 'General Ledger', size: '8.1 MB' },
      { name: 'Bank_Reconciliation_FNB_Feb2026.pdf', category: 'Cash Management', size: '340 KB' },
      { name: 'Bank_Reconciliation_Nedbank_Feb2026.pdf', category: 'Cash Management', size: '280 KB' },
      { name: 'Accounts_Receivable_Ageing_Feb2026.xlsx', category: 'Debtors', size: '1.1 MB' },
      { name: 'Accounts_Payable_Ageing_Feb2026.xlsx', category: 'Creditors', size: '890 KB' },
      { name: 'Fixed_Asset_Register_FY2025.xlsx', category: 'Assets', size: '3.2 MB' },
      { name: 'Depreciation_Schedule_FY2025.xlsx', category: 'Assets', size: '1.5 MB' },
      { name: 'Payroll_Summary_FY2025.pdf', category: 'Payroll', size: '520 KB' },
      { name: 'EMP501_Reconciliation_FY2025.pdf', category: 'Tax', size: '180 KB' },
      { name: 'VAT201_Returns_FY2025.zip', category: 'Tax', size: '4.5 MB' },
      { name: 'Chart_of_Accounts.xlsx', category: 'General Ledger', size: '120 KB' },
      { name: 'Journal_Entry_Listing_FY2025.xlsx', category: 'General Ledger', size: '5.8 MB' },
      { name: 'Intercompany_Balances_Feb2026.xlsx', category: 'Consolidation', size: '650 KB' },
    ],
  },
  {
    id: 2, name: 'BBBEE Supporting Documents', status: 'complete',
    preparedBy: 'Ncele Lekhohlwa', preparedDate: '2026-03-08', period: '2025 Calendar Year',
    documents: [
      { name: 'BBBEE_Ownership_Structure.pdf', category: 'Ownership', size: '450 KB' },
      { name: 'Skills_Development_Spend_2025.xlsx', category: 'Skills Development', size: '320 KB' },
      { name: 'Preferential_Procurement_Report.xlsx', category: 'Procurement', size: '780 KB' },
      { name: 'Enterprise_Development_Spend.pdf', category: 'ED/SED', size: '290 KB' },
      { name: 'Employment_Equity_Report_EEA2.pdf', category: 'Management Control', size: '1.1 MB' },
      { name: 'Socio_Economic_Development.pdf', category: 'ED/SED', size: '210 KB' },
    ],
  },
  {
    id: 3, name: 'IT Controls Evidence Pack', status: 'partial',
    preparedBy: 'Ncele Lekhohlwa', preparedDate: '2026-03-11', period: 'FY2025',
    documents: [
      { name: 'User_Access_Matrix.xlsx', category: 'Access Control', size: '180 KB' },
      { name: 'Backup_Recovery_Log_2025.pdf', category: 'Business Continuity', size: '420 KB' },
      { name: 'Change_Management_Log.xlsx', category: 'Change Control', size: '350 KB' },
      { name: 'System_Architecture_Diagram.pdf', category: 'IT General', size: '2.1 MB' },
    ],
  },
];
const DEMO_INFO_REQUESTS = [
  { id: 1, title: 'February 2026 FNB bank statement', description: 'Please provide the full February 2026 FNB current account bank statement (PDF). Need the original bank statement, not the reconciliation.', category: 'Financial', priority: 'high', status: 'fulfilled', requestedBy: 'Thabo Mokoena', requestedDate: '2026-03-08', dueDate: '2026-03-12', emailSent: true, response: 'Uploaded to the FY2025 Year-End package. See Bank_Reconciliation_FNB_Feb2026.pdf — the raw statement is included as page 3-8.' },
  { id: 2, title: 'Board minutes for FY2025', description: 'All board meeting minutes from March 2025 to February 2026. Need to verify approval of major transactions and related party disclosures.', category: 'Legal', priority: 'high', status: 'in_progress', requestedBy: 'Thabo Mokoena', requestedDate: '2026-03-09', dueDate: '2026-03-15', emailSent: true, response: null },
  { id: 3, title: 'Lease agreements schedule', description: 'Schedule of all active lease agreements (property, vehicles, equipment) including IFRS 16 calculations and right-of-use asset details.', category: 'Financial', priority: 'medium', status: 'pending', requestedBy: 'Zanele Dlamini', requestedDate: '2026-03-10', dueDate: '2026-03-18', emailSent: true, response: null },
  { id: 4, title: 'Related party transaction listing', description: 'Full listing of all related party transactions for FY2025, including director loans, intercompany transactions, and management fees.', category: 'Financial', priority: 'urgent', status: 'pending', requestedBy: 'Thabo Mokoena', requestedDate: '2026-03-11', dueDate: '2026-03-14', emailSent: true, response: null },
  { id: 5, title: 'Insurance policy schedule', description: 'Schedule of all active insurance policies — property, liability, directors & officers, cyber, vehicle fleet.', category: 'Compliance', priority: 'low', status: 'fulfilled', requestedBy: 'Naledi Khumalo', requestedDate: '2026-03-05', dueDate: '2026-03-12', emailSent: true, response: 'All policies are with Hollard and Santam. Schedule attached via the Messages tab with policy numbers and expiry dates.' },
];
const DEMO_MESSAGES = [
  { id: 1, from: 'client', fromName: 'Ncele Lekhohlwa', fromEmail: 'sbuncele@gmail.com', to: 'auditor', toName: 'Thabo Mokoena', subject: 'Welcome', body: 'Hi Thabo, welcome to the audit portal. I\'ve prepared the FY2025 year-end financial package — everything should be in the Audit Packages tab. Let me know if you need anything else.', timestamp: '2026-03-10T09:15:00Z', read: true, emailSent: true },
  { id: 2, from: 'auditor', fromName: 'Thabo Mokoena', to: 'client', toName: 'Ncele Lekhohlwa', toEmail: 'sbuncele@gmail.com', subject: 'Re: Welcome', body: 'Thanks Ncele, I can see the package. Very thorough — the trial balance and GL detail look complete. I\'ll need the raw FNB bank statement (not just the reconciliation). I\'ve logged it as an information request.', timestamp: '2026-03-10T10:30:00Z', read: true, emailSent: true },
  { id: 3, from: 'client', fromName: 'Ncele Lekhohlwa', fromEmail: 'sbuncele@gmail.com',  to: 'auditor', toName: 'Thabo Mokoena', subject: 'Bank statement', body: 'No problem. I\'ve included the raw statement in the updated package — see pages 3-8 of the FNB reconciliation PDF. Also uploaded the BBBEE supporting docs for Zanele.', timestamp: '2026-03-10T14:22:00Z', read: true, emailSent: true },
  { id: 4, from: 'auditor', fromName: 'Thabo Mokoena', to: 'client', toName: 'Ncele Lekhohlwa', toEmail: 'sbuncele@gmail.com', subject: 'Board minutes', body: 'Perfect, thank you. One more request — I need all board minutes for FY2025 to verify related party disclosures. Can you have those ready by the 15th?', timestamp: '2026-03-11T08:45:00Z', read: true, emailSent: true },
  { id: 5, from: 'client', fromName: 'Ncele Lekhohlwa', fromEmail: 'sbuncele@gmail.com', to: 'auditor', toName: 'Thabo Mokoena', subject: 'Re: Board minutes', body: 'Working on it — our company secretary is compiling them. Should be ready by Friday. I\'ll also add the insurance schedule that Naledi requested.', timestamp: '2026-03-11T11:30:00Z', read: false, emailSent: true, attachment: 'Insurance_Schedule_2025.pdf' },
];

// ─── Root App ───
const AuditorPortalApp: React.FC = () => {
  const isDemo = new URLSearchParams(window.location.search).has('demo');
  const [authenticated, setAuthenticated] = useState(isDemo);
  const [user, setUser] = useState<any>(isDemo ? DEMO_USER : null);

  useEffect(() => {
    if (isDemo) return;
    const token = localStorage.getItem('auditor_token');
    if (token) {
      api.get('/api/v2/auth/me').then(res => {
        setUser(res.data?.data || res.data?.user || res.data);
        setAuthenticated(true);
      }).catch(() => {
        localStorage.removeItem('auditor_token');
        localStorage.removeItem('auditor_tenant_id');
      });
    }
  }, []);

  const handleLogin = (data: any) => {
    setUser(data.user);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auditor_token');
    localStorage.removeItem('auditor_tenant_id');
    setAuthenticated(false);
    setUser(null);
  };

  if (!authenticated) return <AuditorLogin onLogin={handleLogin} />;
  return <AuditorPortal user={user} onLogout={handleLogout} />;
};

export default AuditorPortalApp;
