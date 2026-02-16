import React, { useState, useMemo } from 'react';
import { Card, Input, Typography, Collapse, Tag, Space, Row, Col, Button, Divider, message } from 'antd';
import { SearchOutlined, QuestionCircleOutlined, BookOutlined, MessageOutlined,
         RocketOutlined, SafetyOutlined, DollarOutlined, TeamOutlined,
         ShoppingCartOutlined, InboxOutlined, BarChartOutlined, SettingOutlined,
         MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FaqItem[] = [
  // Getting Started
  { category: 'Getting Started', question: 'How do I set up my company?', answer: 'Go to System Settings > Company Info to enter your business name, registration number, VAT number, and contact details. This information is used across invoices, reports, and compliance documents.' },
  { category: 'Getting Started', question: 'How do I add team members?', answer: 'Navigate to Admin Hub > User Management and click "Add User". Enter their email, assign a role (Admin, Manager, Accountant, Staff), and they will receive an invitation to join your organization.' },
  { category: 'Getting Started', question: 'How do I enable additional modules?', answer: 'Go to System Settings > Modules tab. Toggle on the modules you need — Sales, Purchase, Inventory, Financial, HR & Payroll, Manufacturing, etc. Changes take effect immediately.' },

  // Sales & Invoicing
  { category: 'Sales', question: 'How do I create a new invoice?', answer: 'Go to Sales Hub and click "New Invoice" or use Quick Actions in the top bar. Fill in the customer details, add line items, set payment terms, and click Save. You can then email the invoice directly from the system.' },
  { category: 'Sales', question: 'How do I create a quote?', answer: 'Navigate to Sales Hub > Quotes and click "New Quote". Add your customer, line items, and validity period. Once approved, you can convert the quote directly into an invoice with one click.' },
  { category: 'Sales', question: 'How do I track outstanding payments?', answer: 'The Dashboard shows an Accounts Receivable summary. For details, go to Financial > Accounts Receivable to see all outstanding invoices, aging analysis, and payment history.' },

  // Inventory
  { category: 'Inventory', question: 'How do I manage stock levels?', answer: 'Go to Inventory Hub to view current stock. Set reorder points and minimum quantities for automatic alerts. Use Stock Adjustments for manual corrections and Stock Takes for physical counts.' },
  { category: 'Inventory', question: 'How do I transfer stock between warehouses?', answer: 'Navigate to Warehouse Management > Transfers. Create a new transfer specifying source and destination warehouses, items, and quantities. The transfer will update stock at both locations once confirmed.' },

  // Financial
  { category: 'Financial', question: 'How do I reconcile bank transactions?', answer: 'Go to Cash Management > Bank Reconciliation. Upload your bank statement (CSV or OFX format), and the system will automatically match transactions. Review and confirm matches, then mark the reconciliation as complete.' },
  { category: 'Financial', question: 'How do I generate financial reports?', answer: 'Navigate to Financial > Reports. Choose from Trial Balance, Income Statement, Balance Sheet, Cash Flow Statement, and VAT reports. Set the date range and click Generate. Reports can be exported to PDF or Excel.' },
  { category: 'Financial', question: 'How does VAT work in the system?', answer: 'The system is configured for South African VAT at 15%. VAT is automatically calculated on invoices and purchases. Run the VAT Report from Financial > Tax Reports to prepare your VAT201 submission.' },

  // HR & Payroll
  { category: 'HR', question: 'How do I process payroll?', answer: 'Go to HR & Payroll > Payroll Processing. Select the pay period, review employee earnings and deductions, make any adjustments, and click "Process Payroll". The system generates payslips and journal entries automatically.' },
  { category: 'HR', question: 'How do I manage leave?', answer: 'Employees can request leave from their profile. Managers approve leave under HR > Leave Management. The system tracks annual, sick, and family responsibility leave balances as per South African labor law.' },

  // Security
  { category: 'Security', question: 'How do I reset my password?', answer: 'Go to Profile Settings > Security tab. Enter your current password and new password. If you\'re locked out, contact your system administrator to reset your account.' },
  { category: 'Security', question: 'What do the different user roles mean?', answer: 'Super Admin: Full system access. Admin: Manage users and settings. Director: View all data and reports. Manager: Manage their department. Accountant: Financial module access. Staff: Limited access based on assigned modules.' },
];

const quickLinks = [
  { icon: <ShoppingCartOutlined />, title: 'Sales Hub', desc: 'Invoices, quotes, customers', path: '/app/sales-hub' },
  { icon: <InboxOutlined />, title: 'Inventory', desc: 'Stock management', path: '/app/inventory' },
  { icon: <DollarOutlined />, title: 'Financial', desc: 'Accounting & reports', path: '/app/financial' },
  { icon: <TeamOutlined />, title: 'HR & Payroll', desc: 'People management', path: '/app/hr-payroll' },
  { icon: <BarChartOutlined />, title: 'Dashboard', desc: 'KPIs & analytics', path: '/app/dashboard' },
  { icon: <SettingOutlined />, title: 'System Settings', desc: 'Company configuration', path: '/app/system-settings' },
];

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(() => {
    return [...new Set(faqData.map(f => f.category))];
  }, []);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqData;
    const q = searchQuery.toLowerCase();
    return faqData.filter(f =>
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredCategories = useMemo(() => {
    const activeCats = new Set(filteredFaqs.map(f => f.category));
    return categories.filter(c => activeCats.has(c));
  }, [filteredFaqs, categories]);

  const categoryIcons: Record<string, React.ReactNode> = {
    'Getting Started': <RocketOutlined />,
    'Sales': <ShoppingCartOutlined />,
    'Inventory': <InboxOutlined />,
    'Financial': <DollarOutlined />,
    'HR': <TeamOutlined />,
    'Security': <SafetyOutlined />,
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 12, padding: '40px', marginBottom: 32, color: '#fff', textAlign: 'center'
      }}>
        <QuestionCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <Title level={2} style={{ color: '#fff', margin: '0 0 8px 0' }}>How can we help you?</Title>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
          Search our knowledge base or browse frequently asked questions
        </Text>
        <div style={{ maxWidth: 500, margin: '24px auto 0' }}>
          <Input
            size="large"
            placeholder="Search for help... (e.g. invoice, payroll, VAT)"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ borderRadius: 8, fontSize: 16 }}
          />
        </div>
        {searchQuery && (
          <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8, display: 'block' }}>
            {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''} found
          </Text>
        )}
      </div>

      {/* Quick Links */}
      <Title level={4} style={{ marginBottom: 16 }}>
        <BookOutlined style={{ marginRight: 8 }} />Quick Links
      </Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {quickLinks.map(link => (
          <Col key={link.path} xs={12} sm={8} md={4}>
            <Card
              hoverable
              size="small"
              style={{ textAlign: 'center', borderRadius: 8 }}
              onClick={() => navigate(link.path)}
            >
              <div style={{ fontSize: 24, color: '#667eea', marginBottom: 4 }}>{link.icon}</div>
              <Text strong style={{ fontSize: 12 }}>{link.title}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* FAQ Sections */}
      <Title level={4} style={{ marginBottom: 16 }}>
        <QuestionCircleOutlined style={{ marginRight: 8 }} />Frequently Asked Questions
      </Title>

      {filteredCategories.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <QuestionCircleOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={4} type="secondary">No results found</Title>
          <Paragraph type="secondary">Try a different search term or browse all categories</Paragraph>
          <Button type="link" onClick={() => setSearchQuery('')}>Clear search</Button>
        </Card>
      ) : (
        filteredCategories.map(category => (
          <Card 
            key={category} 
            style={{ marginBottom: 16, borderRadius: 8 }}
            title={
              <Space>
                {categoryIcons[category] || <QuestionCircleOutlined />}
                <span>{category}</span>
                <Tag color="blue">{filteredFaqs.filter(f => f.category === category).length}</Tag>
              </Space>
            }
          >
            <Collapse ghost expandIconPosition="end">
              {filteredFaqs.filter(f => f.category === category).map((faq, idx) => (
                <Panel
                  key={`${category}-${idx}`}
                  header={<Text strong>{faq.question}</Text>}
                >
                  <Paragraph style={{ margin: 0, paddingLeft: 8, borderLeft: '3px solid #667eea' }}>
                    {faq.answer}
                  </Paragraph>
                </Panel>
              ))}
            </Collapse>
          </Card>
        ))
      )}

      <Divider />

      {/* Support & Resources */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 8, textAlign: 'center', height: '100%' }} hoverable onClick={() => {
            // Open the floating AI assistant
            const btn = document.querySelector('.floating-ai-trigger, .floating-ai-button, [class*="floating-ai"]') as HTMLElement;
            if (btn) btn.click();
            else message.info('Click the AI Assistant bubble in the bottom-right corner to chat!');
          }}>
            <RocketOutlined style={{ fontSize: 36, color: '#667eea', marginBottom: 12 }} />
            <Title level={5} style={{ margin: '0 0 4px 0' }}>AI Assistant</Title>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
              Get instant help from our AI — ask anything about your business
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 8, textAlign: 'center', height: '100%' }} hoverable onClick={() => window.location.href = 'mailto:support@siyabusaerp.co.za'}>
            <MailOutlined style={{ fontSize: 36, color: '#52c41a', marginBottom: 12 }} />
            <Title level={5} style={{ margin: '0 0 4px 0' }}>Email Support</Title>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
              support@siyabusaerp.co.za
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 8, textAlign: 'center', height: '100%' }} hoverable onClick={() => window.location.href = 'tel:+27740126873'}>
            <PhoneOutlined style={{ fontSize: 36, color: '#fa8c16', marginBottom: 12 }} />
            <Title level={5} style={{ margin: '0 0 4px 0' }}>Call Us</Title>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
              074 012 6873<br />Mon–Fri, 08:00 – 17:00 SAST
            </Paragraph>
          </Card>
        </Col>
      </Row>

      {/* System Info Footer */}
      <Card style={{ borderRadius: 8, background: '#fafafa' }}>
        <Row gutter={24} align="middle">
          <Col xs={24} md={16}>
            <Space direction="vertical" size={4}>
              <Text strong>SiyaBusa ERP — Enterprise Resource Planning</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Version 2.1.0 &nbsp;·&nbsp; Last updated {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} 
                &nbsp;·&nbsp; <Tag color="green" style={{ margin: 0 }}>All Systems Operational</Tag>
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                © {new Date().getFullYear()} SiyaBusa ERP. Built in South Africa 🇿🇦
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button type="link" size="small" onClick={() => navigate('/app/system-settings')}>System Settings</Button>
              <Button type="link" size="small" onClick={() => window.open('https://docs.siyabusaerp.co.za', '_blank')}>API Docs</Button>
              <Button type="link" size="small" onClick={() => navigate('/app/audit-hub')}>Audit Hub</Button>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default HelpCenter;
