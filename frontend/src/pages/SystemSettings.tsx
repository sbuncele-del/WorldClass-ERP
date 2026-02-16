import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Tabs, Select, Switch, Divider, Typography,
         Space, Row, Col, Spin, message, Tag, List, Avatar } from 'antd';
import { SettingOutlined, BankOutlined, GlobalOutlined, SafetyOutlined,
         SaveOutlined, ApiOutlined, ClockCircleOutlined, DollarOutlined,
         MailOutlined, PhoneOutlined } from '@ant-design/icons';
import apiClient from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const defaultModules = [
  { code: 'sales', name: 'Sales & CRM', description: 'Invoicing, quotes, customer management', enabled: true },
  { code: 'purchase', name: 'Purchase Management', description: 'Purchase orders, supplier management', enabled: true },
  { code: 'inventory', name: 'Inventory', description: 'Stock control, warehousing', enabled: true },
  { code: 'financial', name: 'Financial Accounting', description: 'GL, AP, AR, Chart of Accounts', enabled: true },
  { code: 'hr', name: 'HR & Payroll', description: 'Employee management, payroll processing', enabled: true },
  { code: 'manufacturing', name: 'Manufacturing', description: 'BOM, work orders, production', enabled: false },
  { code: 'warehouse', name: 'Warehouse Management', description: 'Locations, transfers, picking', enabled: true },
  { code: 'assets', name: 'Asset Management', description: 'IAS 16 compliant, depreciation', enabled: true },
  { code: 'projects', name: 'Projects Hub', description: 'Project management, tasks, timelines', enabled: true },
  { code: 'practice', name: 'Practice Management', description: 'Professional services, time tracking', enabled: false },
];

const SystemSettings: React.FC = () => {
  const [companyForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/api/v2/settings/tenant');
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          companyForm.setFieldsValue({
            companyName: d.business_name || d.name || '',
            registrationNumber: d.registration_number || '',
            vatNumber: d.vat_number || '',
            taxNumber: d.tax_number || '',
            industry: d.industry || '',
            address: d.address || '',
            city: d.city || '',
            province: d.province || '',
            postalCode: d.postal_code || '',
            country: d.country || 'South Africa',
            phone: d.phone || '',
            email: d.email || '',
            website: d.website || '',
            currency: d.currency || 'ZAR',
            timezone: d.timezone || 'Africa/Johannesburg',
            dateFormat: d.date_format || 'YYYY-MM-DD',
            financialYearEnd: d.financial_year_end || 'February',
          });
        }
      } catch {
        // Try loading from localStorage as fallback
        const tenant = localStorage.getItem('tenant');
        if (tenant) {
          try {
            const t = JSON.parse(tenant);
            companyForm.setFieldsValue({
              companyName: t.company_name || t.name || '',
              registrationNumber: t.registration_number || '',
              taxNumber: t.tax_number || '',
            });
          } catch { /* ignore */ }
        }
      }

      // Load modules — merge API data with localStorage overrides
      let loadedModules = [...defaultModules];
      try {
        const modRes = await apiClient.get('/api/v2/settings/tenant/modules');
        if (modRes.data?.success && modRes.data.data && modRes.data.data.length > 0) {
          loadedModules = modRes.data.data;
        }
      } catch { /* use defaults */ }

      // Apply localStorage overrides
      try {
        const stored = localStorage.getItem('enabledModules');
        if (stored) {
          const overrides = JSON.parse(stored);
          loadedModules = loadedModules.map(m => ({
            ...m,
            enabled: overrides[m.code] !== undefined ? overrides[m.code] : m.enabled
          }));
        }
      } catch { /* ignore */ }

      setModules(loadedModules);

      // Sync to localStorage for sidebar
      const enabledMap: Record<string, boolean> = {};
      loadedModules.forEach(m => { enabledMap[m.code] = m.enabled; });
      localStorage.setItem('enabledModules', JSON.stringify(enabledMap));

      setLoading(false);
    };
    loadSettings();
  }, [companyForm]);

  const handleSaveCompany = async (values: any) => {
    setSaving(true);
    try {
      const res = await apiClient.put('/api/v2/settings/tenant', {
        businessName: values.companyName,
        registrationNumber: values.registrationNumber,
        vatNumber: values.vatNumber,
        taxNumber: values.taxNumber,
        industry: values.industry,
        address: values.address,
        city: values.city,
        province: values.province,
        postalCode: values.postalCode,
        country: values.country,
        phone: values.phone,
        email: values.email,
        website: values.website,
        currency: values.currency,
        timezone: values.timezone,
        dateFormat: values.dateFormat,
        financialYearEnd: values.financialYearEnd,
      });
      if (res.data?.success) {
        // Update localStorage too
        const existing = localStorage.getItem('tenant');
        if (existing) {
          try {
            const t = JSON.parse(existing);
            t.name = values.companyName;
            t.registration_number = values.registrationNumber;
            localStorage.setItem('tenant', JSON.stringify(t));
          } catch { /* ignore */ }
        }
        message.success('Company settings saved successfully!');
      } else {
        message.error(res.data?.message || 'Failed to save settings');
      }
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleModuleToggle = async (code: string, enabled: boolean) => {
    // Optimistically update UI immediately
    const updatedModules = modules.length > 0 
      ? modules.map(m => m.code === code ? { ...m, enabled } : m)
      : defaultModules.map(m => m.code === code ? { ...m, enabled } : m);
    setModules(updatedModules);

    // Save to localStorage so sidebar reacts instantly
    const enabledMap: Record<string, boolean> = {};
    updatedModules.forEach(m => { enabledMap[m.code] = m.enabled; });
    localStorage.setItem('enabledModules', JSON.stringify(enabledMap));
    window.dispatchEvent(new Event('modulesChanged'));

    message.success(`${code.charAt(0).toUpperCase() + code.slice(1)} module ${enabled ? 'enabled' : 'disabled'}`);

    // Try API call in background (non-blocking)
    try {
      await apiClient.put('/api/v2/settings/tenant/modules', { moduleCode: code, enabled });
    } catch {
      // API may not have modules table — localStorage is the source of truth for now
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Loading settings..." />
      </div>
    );
  }

  const companyInfoTab = (
    <Form form={companyForm} layout="vertical" onFinish={handleSaveCompany}>
      <Card title={<><BankOutlined /> Company Information</>} style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item name="companyName" label="Company / Trading Name" rules={[{ required: true }]}>
              <Input size="large" placeholder="e.g. Masaphokati Equity Holdings" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="registrationNumber" label="Registration Number">
              <Input size="large" placeholder="e.g. 2024/636772/07" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="vatNumber" label="VAT Number">
              <Input size="large" placeholder="e.g. 4012345678" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="taxNumber" label="Tax Number">
              <Input size="large" placeholder="e.g. 9012345678" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="industry" label="Industry">
              <Select size="large" placeholder="Select industry">
                <Option value="retail">Retail</Option>
                <Option value="manufacturing">Manufacturing</Option>
                <Option value="services">Services</Option>
                <Option value="technology">Technology</Option>
                <Option value="healthcare">Healthcare</Option>
                <Option value="construction">Construction</Option>
                <Option value="mining">Mining</Option>
                <Option value="agriculture">Agriculture</Option>
                <Option value="finance">Finance</Option>
                <Option value="logistics">Logistics</Option>
                <Option value="property">Property Management</Option>
                <Option value="consulting">Consulting</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title={<><MailOutlined /> Contact Details</>} style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item name="email" label="Company Email">
              <Input size="large" placeholder="info@company.co.za" suffix={<MailOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Phone Number">
              <Input size="large" placeholder="+27 XX XXX XXXX" suffix={<PhoneOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="website" label="Website">
              <Input size="large" placeholder="https://www.company.co.za" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title={<><GlobalOutlined /> Address</>} style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col xs={24}>
            <Form.Item name="address" label="Street Address">
              <Input size="large" placeholder="123 Main Street" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="city" label="City">
              <Input size="large" placeholder="Johannesburg" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="province" label="Province / State">
              <Select size="large" placeholder="Select province" allowClear>
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
          <Col xs={24} md={8}>
            <Form.Item name="postalCode" label="Postal Code">
              <Input size="large" placeholder="2000" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="country" label="Country">
              <Select size="large">
                <Option value="South Africa">South Africa</Option>
                <Option value="Eswatini">Eswatini</Option>
                <Option value="Mozambique">Mozambique</Option>
                <Option value="Namibia">Namibia</Option>
                <Option value="Botswana">Botswana</Option>
                <Option value="Zimbabwe">Zimbabwe</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <div style={{ textAlign: 'right' }}>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
          Save Company Settings
        </Button>
      </div>
    </Form>
  );

  const preferencesTab = (
    <div>
      <Card title={<><ClockCircleOutlined /> Regional Preferences</>} style={{ marginBottom: 24 }}>
        <Form form={companyForm} layout="vertical" onFinish={handleSaveCompany}>
          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item name="currency" label="Currency">
                <Select size="large">
                  <Option value="ZAR">ZAR - South African Rand</Option>
                  <Option value="USD">USD - US Dollar</Option>
                  <Option value="EUR">EUR - Euro</Option>
                  <Option value="GBP">GBP - British Pound</Option>
                  <Option value="SZL">SZL - Swazi Lilangeni</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="timezone" label="Timezone">
                <Select size="large">
                  <Option value="Africa/Johannesburg">South Africa (SAST, GMT+2)</Option>
                  <Option value="Africa/Mbabane">Eswatini (SAST, GMT+2)</Option>
                  <Option value="Europe/London">London (GMT)</Option>
                  <Option value="America/New_York">New York (EST)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="dateFormat" label="Date Format">
                <Select size="large">
                  <Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
                  <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                  <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="financialYearEnd" label="Financial Year End">
                <Select size="large">
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                    <Option key={m} value={m}>{m}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
              Save Preferences
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );

  const moduleColors: Record<string, string> = {
    sales: '#52c41a', purchase: '#1890ff', inventory: '#faad14', financial: '#722ed1',
    hr: '#eb2f96', manufacturing: '#13c2c2', warehouse: '#fa541c', assets: '#2f54eb',
    practice: '#a0d911', healthcare: '#f5222d', mining: '#8c8c8c', construction: '#d48806',
    property: '#237804', agriculture: '#389e0d', logistics: '#096dd9', project: '#531dab',
  };

  const modulesTab = (
    <Card title="Enabled Modules">
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Enable or disable modules for your organization. Changes take effect immediately.
      </Paragraph>
      <List
        dataSource={modules.length > 0 ? modules : defaultModules}
        renderItem={(mod: any) => (
          <List.Item
            actions={[
              <Switch 
                key="toggle"
                checked={mod.enabled} 
                onChange={(checked) => handleModuleToggle(mod.code, checked)} 
              />
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar style={{ backgroundColor: mod.enabled ? (moduleColors[mod.code] || '#667eea') : '#d9d9d9' }} icon={<ApiOutlined />} />}
              title={<span style={{ opacity: mod.enabled ? 1 : 0.5 }}>{mod.name} {mod.enabled ? <Tag color="green" style={{ marginLeft: 8 }}>Active</Tag> : <Tag style={{ marginLeft: 8 }}>Disabled</Tag>}</span>}
              description={<span style={{ opacity: mod.enabled ? 1 : 0.5 }}>{mod.description}</span>}
            />
          </List.Item>
        )}
      />
    </Card>
  );

  const securityTab = (
    <div>
      <Card title={<><SafetyOutlined /> Security Settings</>} style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Enforce Strong Passwords</Text>
              <br /><Text type="secondary">Require minimum 8 characters with mixed case and numbers</Text>
            </div>
            <Switch defaultChecked />
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Session Timeout</Text>
              <br /><Text type="secondary">Automatically log out inactive users</Text>
            </div>
            <Select defaultValue="60" style={{ width: 200 }}>
              <Option value="15">15 minutes</Option>
              <Option value="30">30 minutes</Option>
              <Option value="60">1 hour</Option>
              <Option value="480">8 hours</Option>
            </Select>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Two-Factor Authentication</Text>
              <br /><Text type="secondary">Require 2FA for all users</Text>
            </div>
            <Tag color="default">Coming Soon</Tag>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>IP Whitelisting</Text>
              <br /><Text type="secondary">Restrict access to specific IP addresses</Text>
            </div>
            <Tag color="default">Coming Soon</Tag>
          </div>
        </Space>
      </Card>

      <Card title="Audit Log">
        <Paragraph type="secondary">
          All system changes are logged automatically. View the full audit trail in the{' '}
          <a href="/app/audit-hub">Audit Hub</a>.
        </Paragraph>
        <Tag color="green" icon={<SafetyOutlined />}>Audit Logging Active</Tag>
      </Card>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 12, padding: '32px 40px', marginBottom: 24, color: '#fff'
      }}>
        <Title level={2} style={{ color: '#fff', margin: 0 }}>
          <SettingOutlined style={{ marginRight: 12 }} />System Settings
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
          Configure your company, preferences, modules, and security
        </Text>
      </div>

      <Tabs
        defaultActiveKey="company"
        size="large"
        items={[
          { key: 'company', label: <span><BankOutlined /> Company Info</span>, children: companyInfoTab },
          { key: 'preferences', label: <span><DollarOutlined /> Preferences</span>, children: preferencesTab },
          { key: 'modules', label: <span><ApiOutlined /> Modules</span>, children: modulesTab },
          { key: 'security', label: <span><SafetyOutlined /> Security</span>, children: securityTab },
        ]}
      />
    </div>
  );
};

export default SystemSettings;
