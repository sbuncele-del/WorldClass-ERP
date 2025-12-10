import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Steps,
  Divider,
  Tag,
  Avatar,
  Table,
  Input,
  message,
  Modal,
  Result,
  Checkbox,
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  MessageOutlined,
  EditOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import './ClientPortal.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ClientPortal: React.FC = () => {
  const { id } = useParams();
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Sample proposal data (would be fetched based on ID)
  const proposal = {
    id: '1',
    title: 'Enterprise Software Implementation',
    number: 'PROP-2024-0042',
    status: 'sent',
    company: {
      name: 'WorldClass ERP',
      contact: 'John Smith',
      title: 'Account Executive',
      email: 'john.smith@worldclass-erp.com',
      phone: '+1 (555) 123-4567',
    },
    validUntil: '2024-02-13',
    createdAt: '2024-01-12',
    lineItems: [
      {
        name: 'Implementation Services',
        description: 'Full system implementation including setup and configuration',
        quantity: 1,
        unitPrice: 45000,
        total: 45000,
      },
      {
        name: 'Training & Onboarding',
        description: '5-day onsite training for your team',
        quantity: 5,
        unitPrice: 2000,
        total: 9000,
      },
      {
        name: 'Annual Support Package',
        description: 'Premium 24/7 support with dedicated account manager',
        quantity: 1,
        unitPrice: 18000,
        total: 18000,
      },
    ],
    subtotal: 72000,
    tax: 7200,
    total: 79200,
    terms: [
      'This proposal is valid for 30 days from the date of issue.',
      'Payment terms: 50% upfront, 50% upon completion.',
      'Additional services may be quoted separately.',
      'All prices are exclusive of applicable taxes.',
    ],
  };

  const handleAccept = () => {
    message.success('Proposal accepted! We will be in touch shortly.');
    setAcceptModalVisible(false);
    setAccepted(true);
  };

  const handleQuestion = (question: string) => {
    message.success('Your question has been sent to the team.');
    setQuestionModalVisible(false);
  };

  if (accepted) {
    return (
      <div className="client-portal">
        <Card className="portal-card">
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="Proposal Accepted!"
            subTitle={`Thank you for accepting proposal ${proposal.number}. Our team will be in touch shortly to begin the project.`}
            extra={[
              <Button type="primary" key="download" icon={<DownloadOutlined />}>
                Download Signed Copy
              </Button>,
              <Button key="contact">
                Contact Us
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="client-portal">
      {/* Header */}
      <div className="portal-header">
        <div className="company-brand">
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>WorldClass ERP</Title>
        </div>
        <div className="portal-meta">
          <Tag color="blue">Proposal</Tag>
          <Text strong>{proposal.number}</Text>
        </div>
      </div>

      <Row gutter={24}>
        {/* Main Content */}
        <Col xs={24} lg={16}>
          <Card className="portal-card">
            {/* Proposal Header */}
            <div className="proposal-header">
              <Title level={2}>{proposal.title}</Title>
              <div className="status-info">
                <Steps
                  current={1}
                  size="small"
                  items={[
                    { title: 'Sent', icon: <FileTextOutlined /> },
                    { title: 'Viewed', icon: <CheckCircleOutlined /> },
                    { title: 'Accepted', icon: <CheckCircleOutlined /> },
                  ]}
                />
              </div>
            </div>

            <Divider />

            {/* Validity Notice */}
            <div className="validity-notice">
              <ClockCircleOutlined />
              <Text>
                This proposal is valid until{' '}
                <Text strong>{dayjs(proposal.validUntil).format('MMMM D, YYYY')}</Text>
              </Text>
            </div>

            {/* Pricing Table */}
            <div className="pricing-section">
              <Title level={4}>Investment Summary</Title>
              <Table
                dataSource={proposal.lineItems}
                rowKey="name"
                pagination={false}
                columns={[
                  {
                    title: 'Description',
                    key: 'description',
                    render: (_, record) => (
                      <div>
                        <Text strong>{record.name}</Text>
                        <br />
                        <Text type="secondary">{record.description}</Text>
                      </div>
                    ),
                  },
                  { 
                    title: 'Qty', 
                    dataIndex: 'quantity', 
                    key: 'quantity', 
                    width: 60,
                    align: 'center' as const,
                  },
                  {
                    title: 'Unit Price',
                    dataIndex: 'unitPrice',
                    key: 'unitPrice',
                    width: 120,
                    render: (v) => `$${v.toLocaleString()}`,
                    align: 'right' as const,
                  },
                  {
                    title: 'Total',
                    dataIndex: 'total',
                    key: 'total',
                    width: 120,
                    render: (v) => <Text strong>${v.toLocaleString()}</Text>,
                    align: 'right' as const,
                  },
                ]}
              />
              <div className="pricing-summary">
                <div className="summary-row">
                  <Text>Subtotal</Text>
                  <Text>${proposal.subtotal.toLocaleString()}</Text>
                </div>
                <div className="summary-row">
                  <Text>Tax (10%)</Text>
                  <Text>${proposal.tax.toLocaleString()}</Text>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div className="summary-row total">
                  <Text strong>Total Investment</Text>
                  <Title level={3} style={{ margin: 0 }}>
                    ${proposal.total.toLocaleString()}
                  </Title>
                </div>
              </div>
            </div>

            <Divider />

            {/* Terms */}
            <div className="terms-section">
              <Title level={4}>Terms & Conditions</Title>
              <ol className="terms-list">
                {proposal.terms.map((term, index) => (
                  <li key={index}><Text>{term}</Text></li>
                ))}
              </ol>
            </div>
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          {/* Action Card */}
          <Card className="action-card">
            <Title level={4}>Ready to get started?</Title>
            <Paragraph type="secondary">
              Accept this proposal to begin working with our team.
            </Paragraph>
            <Button 
              type="primary" 
              size="large" 
              block
              onClick={() => setAcceptModalVisible(true)}
            >
              Accept Proposal
            </Button>
            <Button 
              size="large" 
              block 
              style={{ marginTop: 12 }}
              icon={<DownloadOutlined />}
            >
              Download PDF
            </Button>
          </Card>

          {/* Contact Card */}
          <Card className="contact-card">
            <Title level={5}>Questions?</Title>
            <div className="contact-info">
              <Avatar size={48}>{proposal.company.contact[0]}</Avatar>
              <div>
                <Text strong>{proposal.company.contact}</Text>
                <Text type="secondary" className="contact-title">
                  {proposal.company.title}
                </Text>
              </div>
            </div>
            <Divider style={{ margin: '16px 0' }} />
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="contact-row">
                <Text type="secondary">Email:</Text>
                <Text>{proposal.company.email}</Text>
              </div>
              <div className="contact-row">
                <Text type="secondary">Phone:</Text>
                <Text>{proposal.company.phone}</Text>
              </div>
            </Space>
            <Button 
              type="default" 
              block 
              style={{ marginTop: 16 }}
              icon={<QuestionCircleOutlined />}
              onClick={() => setQuestionModalVisible(true)}
            >
              Ask a Question
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Accept Modal */}
      <Modal
        title="Accept Proposal"
        open={acceptModalVisible}
        onCancel={() => setAcceptModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setAcceptModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="accept" 
            type="primary" 
            disabled={!termsAccepted}
            onClick={handleAccept}
          >
            Accept & Sign
          </Button>,
        ]}
      >
        <div className="accept-content">
          <Paragraph>
            By accepting this proposal, you agree to the terms and conditions outlined 
            in the document. A signed copy will be sent to your email.
          </Paragraph>
          
          <div className="signature-section">
            <Text strong>Your Signature</Text>
            <div className="signature-input">
              <Input placeholder="Type your full name to sign" size="large" />
            </div>
          </div>

          <div className="terms-checkbox">
            <Checkbox 
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            >
              I have read and agree to the terms and conditions
            </Checkbox>
          </div>
        </div>
      </Modal>

      {/* Question Modal */}
      <Modal
        title="Ask a Question"
        open={questionModalVisible}
        onCancel={() => setQuestionModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setQuestionModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="send" type="primary" onClick={() => handleQuestion('')}>
            Send Question
          </Button>,
        ]}
      >
        <div className="question-content">
          <Paragraph type="secondary">
            Have a question about this proposal? Send it to our team and we'll get 
            back to you as soon as possible.
          </Paragraph>
          <TextArea 
            rows={4} 
            placeholder="Type your question here..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default ClientPortal;
