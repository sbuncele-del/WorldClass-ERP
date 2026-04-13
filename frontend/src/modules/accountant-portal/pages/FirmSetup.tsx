import React, { useState, useEffect } from 'react';
import {
  Card,
  Steps,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Typography,
  Row,
  Col,
  Result,
  Descriptions,
  Divider,
} from 'antd';
import {
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FirmSetupProps {
  onComplete: () => void;
  editMode?: boolean;
}

interface FirmFormData {
  // Step 1 - Firm Details
  name: string;
  type: string;
  registration_number: string;
  tax_number: string;
  practice_number: string;
  // Step 2 - Contact Info
  email: string;
  phone: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  // Step 3 - Preferences
  subscription_plan: string;
  default_engagement_type: string;
  billing_currency: string;
  notes: string;
}

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const FirmSetup: React.FC<FirmSetupProps> = ({ onComplete, editMode = false }) => {
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(editMode);
  const [form] = Form.useForm<FirmFormData>();

  // Load existing firm data in edit mode
  useEffect(() => {
    if (!editMode) return;
    (async () => {
      try {
        const res = await fetch('/api/v2/accountant-portal/firm', { headers: authHeaders() });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            form.setFieldsValue(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load firm data:', err);
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [editMode, form]);

  /* ---------- navigation ---------- */
  const stepsConfig = [
    { title: 'Firm Details', icon: <BankOutlined /> },
    { title: 'Contact Info', icon: <PhoneOutlined /> },
    { title: 'Preferences', icon: <SaveOutlined /> },
    { title: 'Confirm', icon: <CheckCircleOutlined /> },
  ];

  const validateStep = async (): Promise<boolean> => {
    try {
      const fieldsMap: Record<number, string[]> = {
        0: ['name', 'type'],
        1: ['email'],
        2: [],
      };
      const fields = fieldsMap[current];
      if (fields && fields.length > 0) {
        await form.validateFields(fields);
      }
      return true;
    } catch {
      return false;
    }
  };

  const next = async () => {
    if (await validateStep()) setCurrent((c) => c + 1);
  };

  const prev = () => setCurrent((c) => c - 1);

  /* ---------- submit ---------- */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const v = form.getFieldsValue(true);
      // Map form field names to API field names
      const payload = {
        firm_name: v.name,
        firm_type: v.type,
        contact_email: v.email,
        contact_phone: v.phone,
        website: v.website,
        address: [v.address_line1, v.address_line2].filter(Boolean).join(', ') || undefined,
        city: v.city,
        province: v.province,
        postal_code: v.postal_code,
        country: v.country,
        registration_number: v.registration_number,
        tax_number: v.tax_number,
        practice_number: v.practice_number,
        subscription_tier: v.subscription_plan,
      };
      const res = await fetch('/api/v2/accountant-portal/firm', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        message.success(editMode ? 'Firm settings updated' : 'Firm created successfully!');
        if (editMode) {
          // Stay on same page
        } else {
          setComplete(true);
          setTimeout(() => onComplete(), 1500);
        }
      } else {
        message.error(json.error || json.message || 'Failed to save firm');
      }
    } catch (err) {
      console.error('Firm save error:', err);
      message.error('Failed to save firm details');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- confirmation data ---------- */
  const formValues = form.getFieldsValue(true);

  /* ---------- render complete ---------- */
  if (complete) {
    return (
      <Result
        status="success"
        title="Firm Created Successfully!"
        subTitle="Your accounting firm has been set up. You can now start managing clients."
        extra={<Button type="primary" onClick={onComplete}>Go to Dashboard</Button>}
      />
    );
  }

  if (loadingExisting) {
    return (
      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading firm settings…</div>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 800, margin: '0 auto' }}>
      {!editMode && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <BankOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <Title level={3}>Set Up Your Accounting Firm</Title>
            <Paragraph type="secondary">
              Complete the steps below to configure your accounting firm profile.
            </Paragraph>
          </div>
        </>
      )}

      {editMode && (
        <Title level={4} style={{ marginBottom: 24 }}>
          <BankOutlined style={{ marginRight: 8 }} />
          Firm Settings
        </Title>
      )}

      <Steps
        current={current}
        items={stepsConfig}
        style={{ marginBottom: 32 }}
        size="small"
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          country: 'South Africa',
          billing_currency: 'ZAR',
          type: 'accounting_firm',
        }}
      >
        {/* --------- Step 1: Firm Details --------- */}
        <div style={{ display: current === 0 ? 'block' : 'none' }}>
          <Title level={5}>Firm Details</Title>
          <Row gutter={16}>
            <Col xs={24} sm={16}>
              <Form.Item
                name="name"
                label="Firm Name"
                rules={[{ required: true, message: 'Firm name is required' }]}
              >
                <Input placeholder="e.g., Smith & Associates Chartered Accountants" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="type"
                label="Firm Type"
                rules={[{ required: true, message: 'Select firm type' }]}
              >
                <Select size="large">
                  <Option value="accounting_firm">Accounting Firm</Option>
                  <Option value="audit_firm">Audit Firm</Option>
                  <Option value="tax_practice">Tax Practice</Option>
                  <Option value="bookkeeping">Bookkeeping Firm</Option>
                  <Option value="multi_service">Multi-Service Firm</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="registration_number" label="Registration Number">
                <Input placeholder="Company registration #" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="tax_number" label="Tax Number">
                <Input placeholder="Tax / VAT number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="practice_number" label="Practice Number">
                <Input placeholder="IRBA / SAICA practice #" />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* --------- Step 2: Contact Info --------- */}
        <div style={{ display: current === 1 ? 'block' : 'none' }}>
          <Title level={5}>Contact Information</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Enter a valid email' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="info@yourfirm.co.za" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Phone">
                <Input prefix={<PhoneOutlined />} placeholder="+27 11 123 4567" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="website" label="Website">
            <Input prefix={<GlobalOutlined />} placeholder="https://www.yourfirm.co.za" />
          </Form.Item>
          <Divider orientation="left" plain>Address</Divider>
          <Form.Item name="address_line1" label="Address Line 1">
            <Input placeholder="Street address" />
          </Form.Item>
          <Form.Item name="address_line2" label="Address Line 2">
            <Input placeholder="Suite, floor, building (optional)" />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="city" label="City">
                <Input placeholder="City" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="province" label="Province / State">
                <Select placeholder="Select" allowClear>
                  <Option value="Gauteng">Gauteng</Option>
                  <Option value="Western Cape">Western Cape</Option>
                  <Option value="KwaZulu-Natal">KwaZulu-Natal</Option>
                  <Option value="Eastern Cape">Eastern Cape</Option>
                  <Option value="Free State">Free State</Option>
                  <Option value="Limpopo">Limpopo</Option>
                  <Option value="Mpumalanga">Mpumalanga</Option>
                  <Option value="North West">North West</Option>
                  <Option value="Northern Cape">Northern Cape</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="postal_code" label="Postal Code">
                <Input placeholder="0001" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="country" label="Country">
            <Input placeholder="South Africa" />
          </Form.Item>
        </div>

        {/* --------- Step 3: Preferences --------- */}
        <div style={{ display: current === 2 ? 'block' : 'none' }}>
          <Title level={5}>Subscription & Preferences</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="subscription_plan" label="Subscription Plan">
                <Select placeholder="Select plan">
                  <Option value="starter">Starter (up to 5 clients)</Option>
                  <Option value="professional">Professional (up to 25 clients)</Option>
                  <Option value="enterprise">Enterprise (unlimited clients)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="default_engagement_type" label="Default Engagement Type">
                <Select placeholder="Select default type" allowClear>
                  <Option value="full_service">Full Service</Option>
                  <Option value="tax_only">Tax Only</Option>
                  <Option value="bookkeeping">Bookkeeping</Option>
                  <Option value="audit">Audit</Option>
                  <Option value="advisory">Advisory</Option>
                  <Option value="payroll">Payroll</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="billing_currency" label="Billing Currency">
                <Select>
                  <Option value="ZAR">ZAR — South African Rand</Option>
                  <Option value="USD">USD — US Dollar</Option>
                  <Option value="EUR">EUR — Euro</Option>
                  <Option value="GBP">GBP — British Pound</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Additional Notes">
            <TextArea rows={3} placeholder="Any additional information about your firm…" />
          </Form.Item>
        </div>

        {/* --------- Step 4: Confirm --------- */}
        <div style={{ display: current === 3 ? 'block' : 'none' }}>
          <Title level={5}>Review &amp; Confirm</Title>
          <Paragraph type="secondary">
            Please review your firm details before {editMode ? 'saving' : 'creating your firm'}.
          </Paragraph>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Firm Name">{formValues.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Type">{formValues.type || '—'}</Descriptions.Item>
            <Descriptions.Item label="Registration #">{formValues.registration_number || '—'}</Descriptions.Item>
            <Descriptions.Item label="Tax Number">{formValues.tax_number || '—'}</Descriptions.Item>
            <Descriptions.Item label="Practice #">{formValues.practice_number || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{formValues.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Phone">{formValues.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Website">{formValues.website || '—'}</Descriptions.Item>
            <Descriptions.Item label="City">{formValues.city || '—'}</Descriptions.Item>
            <Descriptions.Item label="Province">{formValues.province || '—'}</Descriptions.Item>
            <Descriptions.Item label="Plan">{formValues.subscription_plan || '—'}</Descriptions.Item>
            <Descriptions.Item label="Currency">{formValues.billing_currency || '—'}</Descriptions.Item>
          </Descriptions>
        </div>
      </Form>

      {/* --------- Navigation Buttons --------- */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          {current > 0 && (
            <Button icon={<ArrowLeftOutlined />} onClick={prev}>
              Previous
            </Button>
          )}
        </div>
        <Space>
          {current < stepsConfig.length - 1 && (
            <Button type="primary" onClick={next}>
              Next <ArrowRightOutlined />
            </Button>
          )}
          {current === stepsConfig.length - 1 && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={submitting}
              onClick={handleSubmit}
            >
              {editMode ? 'Save Changes' : 'Create Firm'}
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default FirmSetup;
