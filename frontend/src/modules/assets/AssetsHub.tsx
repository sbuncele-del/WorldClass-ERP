import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Tag,
  Progress,
  Statistic,
  Table,
  Space,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Divider,
  List,
  Alert,
  Badge,
  Descriptions,
  Timeline,
  Popconfirm,
  Spin,
} from 'antd';
import {
  BankOutlined,
  ToolOutlined,
  CarOutlined,
  DesktopOutlined,
  HomeOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  DownloadOutlined,
  SyncOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  FileProtectOutlined,
  SwapOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  HistoryOutlined,
  CalculatorOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import {
  HubLayout,
  HubHeader,
  StatusBanner,
  HubTabs,
  QuickActionsCard,
} from '../../components/hub';
import {
  assetService,
  FixedAsset,
  AssetCategory,
  AssetDisposal,
} from '../../services/asset.service';

const { Text } = Typography;

// ===========================================
// IAS 16 COMPLIANT ASSET POLICIES - TYPE DEFINITIONS
// ===========================================

interface AssetPolicy {
  id: string;
  category: string;
  categoryCode: string;
  usefulLifeYears: number;
  residualValuePercent: number;
  depreciationMethod: 'straight_line' | 'reducing_balance' | 'units_of_production';
  componentDepreciation: boolean;
  revaluationModel: boolean;
  reviewFrequency: 'annual' | 'biannual' | 'quarterly';
  lastReviewDate: string;
  nextReviewDate: string;
  approvedBy: string;
  status: 'active' | 'pending_approval' | 'superseded';
  sarsWearAndTear?: number;
  ias16Reference: string;
}

interface AssetStats {
  totalAssets: number;
  totalCost: number;
  totalNBV: number;
  accumulatedDepreciation: number;
  assetsFullyDepreciated: number;
  assetsDueForReview: number;
  pendingDisposals: number;
  impairedAssets: number;
  monthlyDepreciation: number;
  categories: number;
  activeAssets: number;
  underMaintenance: number;
}

// Default IAS 16 compliant policies (static reference data)
const DEFAULT_POLICIES: AssetPolicy[] = [
  {
    id: 'POL-001',
    category: 'Land',
    categoryCode: 'LAND',
    usefulLifeYears: 0,
    residualValuePercent: 100,
    depreciationMethod: 'straight_line',
    componentDepreciation: false,
    revaluationModel: true,
    reviewFrequency: 'annual',
    lastReviewDate: '2025-03-01',
    nextReviewDate: '2026-03-01',
    approvedBy: 'CFO',
    status: 'active',
    ias16Reference: 'IAS 16.58 - Land not depreciated',
  },
  {
    id: 'POL-002',
    category: 'Buildings',
    categoryCode: 'BLDG',
    usefulLifeYears: 40,
    residualValuePercent: 10,
    depreciationMethod: 'straight_line',
    componentDepreciation: true,
    revaluationModel: false,
    reviewFrequency: 'annual',
    lastReviewDate: '2025-03-01',
    nextReviewDate: '2026-03-01',
    approvedBy: 'CFO',
    status: 'active',
    sarsWearAndTear: 5,
    ias16Reference: 'IAS 16.43 - Systematic depreciation',
  },
  {
    id: 'POL-003',
    category: 'Plant & Machinery',
    categoryCode: 'MACH',
    usefulLifeYears: 10,
    residualValuePercent: 5,
    depreciationMethod: 'straight_line',
    componentDepreciation: true,
    revaluationModel: false,
    reviewFrequency: 'annual',
    lastReviewDate: '2025-03-01',
    nextReviewDate: '2026-03-01',
    approvedBy: 'CFO',
    status: 'active',
    sarsWearAndTear: 20,
    ias16Reference: 'IAS 16.50 - Useful life factors',
  },
  {
    id: 'POL-004',
    category: 'Motor Vehicles',
    categoryCode: 'VEHI',
    usefulLifeYears: 5,
    residualValuePercent: 15,
    depreciationMethod: 'straight_line',
    componentDepreciation: false,
    revaluationModel: false,
    reviewFrequency: 'annual',
    lastReviewDate: '2025-03-01',
    nextReviewDate: '2026-03-01',
    approvedBy: 'CFO',
    status: 'active',
    sarsWearAndTear: 25,
    ias16Reference: 'IAS 16.6 - Definition of PPE',
  },
  {
    id: 'POL-005',
    category: 'Office Equipment',
    categoryCode: 'OFEQ',
    usefulLifeYears: 5,
    residualValuePercent: 0,
    depreciationMethod: 'straight_line',
    componentDepreciation: false,
    revaluationModel: false,
    reviewFrequency: 'annual',
    lastReviewDate: '2025-03-01',
    nextReviewDate: '2026-03-01',
    approvedBy: 'CFO',
    status: 'active',
    sarsWearAndTear: 33.33,
    ias16Reference: 'IAS 16.43 - Depreciation method',
  },
  {
    id: 'POL-006',
    category: 'IT Equipment',
    categoryCode: 'ITEQ',
    usefulLifeYears: 3,
    residualValuePercent: 0,
    depreciationMethod: 'straight_line',
    componentDepreciation: false,
    revaluationModel: false,
    reviewFrequency: 'annual',
    lastReviewDate: '2025-03-01',
    nextReviewDate: '2026-03-01',
    approvedBy: 'CFO',
    status: 'active',
    sarsWearAndTear: 33.33,
    ias16Reference: 'IAS 16.51 - Technology obsolescence',
  },
  {
    id: 'POL-007',
    category: 'Furniture & Fittings',
    categoryCode: 'FURN',
    usefulLifeYears: 10,
    residualValuePercent: 5,
    depreciationMethod: 'straight_line',
    componentDepreciation: false,
    revaluationModel: false,
    reviewFrequency: 'annual',
    lastReviewDate: '2025-03-01',
    nextReviewDate: '2026-03-01',
    approvedBy: 'CFO',
    status: 'active',
    sarsWearAndTear: 16.67,
    ias16Reference: 'IAS 16.6 - Definition of PPE',
  },
  {
    id: 'POL-008',
    category: 'Leasehold Improvements',
    categoryCode: 'LHLD',
    usefulLifeYears: 5,
    residualValuePercent: 0,
    depreciationMethod: 'straight_line',
    componentDepreciation: false,
    revaluationModel: false,
    reviewFrequency: 'annual',
    lastReviewDate: '2025-03-01',
    nextReviewDate: '2026-03-01',
    approvedBy: 'CFO',
    status: 'active',
    sarsWearAndTear: 20,
    ias16Reference: 'IAS 16.56 - Lease term consideration',
  },
];

// Pending policy change requests - will be populated from API when workflow is implemented
const pendingPolicyChanges: any[] = [];

const AssetsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPolicyChangeModal, setShowPolicyChangeModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<AssetPolicy | null>(null);
  const [addAssetForm] = Form.useForm();
  const [disposalForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [maintenanceForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [depreciationPeriod, setDepreciationPeriod] = useState<any>(null);
  const [depreciationLoading, setDepreciationLoading] = useState(false);

  // State for API data
  const [assetStats, setAssetStats] = useState<AssetStats>({
    totalAssets: 0,
    totalCost: 0,
    totalNBV: 0,
    accumulatedDepreciation: 0,
    assetsFullyDepreciated: 0,
    assetsDueForReview: 0,
    pendingDisposals: 0,
    impairedAssets: 0,
    monthlyDepreciation: 0,
    categories: 0,
    activeAssets: 0,
    underMaintenance: 0,
  });
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [disposals, setDisposals] = useState<AssetDisposal[]>([]);

  // Fetch assets data from API
  useEffect(() => {
    const fetchAssetsData = async () => {
      setLoading(true);
      try {
        const [dashboardRes, assetsRes, categoriesRes, disposalsRes] = await Promise.all([
          assetService.getDashboard().catch(() => null),
          assetService.getAssets({ limit: 100 }).catch(() => null),
          assetService.getCategories().catch(() => []),
          assetService.getDisposals().catch(() => []),
        ]);

        // Process dashboard data
        if (dashboardRes?.summary) {
          const s = dashboardRes.summary;
          setAssetStats(prev => ({
            ...prev,
            totalAssets: s.total_assets || 0,
            totalCost: s.total_acquisition_cost || 0,
            totalNBV: s.total_book_value || 0,
            accumulatedDepreciation: s.total_accumulated_depreciation || 0,
            activeAssets: s.active_assets || 0,
            categories: s.total_categories || 0,
            underMaintenance: s.under_maintenance || 0,
          }));
        }

        // Supplement with assets list summary if available
        if (assetsRes?.summary) {
          const s = assetsRes.summary;
          setAssetStats(prev => ({
            ...prev,
            totalAssets: prev.totalAssets || parseInt(s.total_assets || '0'),
            totalCost: prev.totalCost || parseFloat(s.total_acquisition_cost || '0'),
            activeAssets: prev.activeAssets || parseInt(s.active_assets || '0'),
            underMaintenance: prev.underMaintenance || parseInt(s.under_maintenance || '0'),
          }));
        }

        // Set categories count
        const catList = Array.isArray(categoriesRes) ? categoriesRes : [];
        setAssetStats(prev => ({
          ...prev,
          categories: prev.categories || catList.length,
        }));

        setAssets(assetsRes?.data || []);
        setCategories(catList);
        setDisposals(Array.isArray(disposalsRes) ? disposalsRes : []);
      } catch (error) {
        console.error('Error fetching assets data:', error);
        message.error('Failed to load assets data');
      } finally {
        setLoading(false);
      }
    };

    fetchAssetsData();
  }, [refreshKey]);

  const refreshData = () => setRefreshKey(k => k + 1);

  const formatCurrency = (amount: number) => `R ${(amount || 0).toLocaleString('en-ZA')}`;

  const getCategoryIcon = (code: string) => {
    const icons: Record<string, React.ReactNode> = {
      'LAND': <HomeOutlined />,
      'BLDG': <BankOutlined />,
      'MACH': <ToolOutlined />,
      'VEHI': <CarOutlined />,
      'OFEQ': <AppstoreOutlined />,
      'ITEQ': <DesktopOutlined />,
      'FURN': <AppstoreOutlined />,
      'LHLD': <HomeOutlined />,
    };
    return icons[code] || <AppstoreOutlined />;
  };

  const getStatusTag = (status: string) => {
    const normalized = (status || '').toLowerCase();
    const configs: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      'active': { color: 'green', text: 'Active', icon: <CheckCircleOutlined /> },
      'disposed': { color: 'default', text: 'Disposed' },
      'impaired': { color: 'orange', text: 'Impaired', icon: <WarningOutlined /> },
      'fully_depreciated': { color: 'purple', text: 'Fully Depreciated' },
      'under_construction': { color: 'blue', text: 'Under Construction', icon: <ClockCircleOutlined /> },
      'under_maintenance': { color: 'orange', text: 'Under Maintenance', icon: <ToolOutlined /> },
      'idle': { color: 'default', text: 'Idle', icon: <ClockCircleOutlined /> },
      'pending_approval': { color: 'orange', text: 'Pending Approval', icon: <ClockCircleOutlined /> },
      'superseded': { color: 'default', text: 'Superseded' },
    };
    const config = configs[normalized] || { color: 'default', text: status };
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  // =============================================
  // ACTION HANDLERS
  // =============================================

  const handleCreateAsset = async () => {
    try {
      const values = await addAssetForm.validateFields();

      const usefulLifeMonths = values.usefulLifeYears
        ? values.usefulLifeYears * 12
        : 60;

      const assetData: Record<string, any> = {
        asset_name: values.assetName,
        description: values.description || values.assetName,
        category_id: values.category_id,
        acquisition_cost: values.purchasePrice || 0,
        residual_value: values.residualValue || 0,
        useful_life_months: usefulLifeMonths,
        depreciation_method: values.depreciationMethod || 'STRAIGHT_LINE',
        acquisition_date: values.acquisitionDate?.format('YYYY-MM-DD'),
        serial_number: values.serialNumber,
        manufacturer: values.manufacturer,
        model_number: values.modelNumber,
        notes: values.notes,
      };

      await assetService.createAsset(assetData);
      message.success('Asset created successfully');
      setShowAddAssetModal(false);
      addAssetForm.resetFields();
      setSelectedPolicy(null);
      refreshData();
    } catch (error: any) {
      if (error.errorFields) return; // Form validation error
      message.error(error.response?.data?.message || 'Failed to create asset');
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await assetService.deleteAsset(assetId);
      message.success('Asset disposed successfully');
      refreshData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete asset');
    }
  };

  const handleRunDepreciation = async () => {
    if (!depreciationPeriod) {
      message.warning('Please select a depreciation period');
      return;
    }
    setDepreciationLoading(true);
    try {
      const periodEndDate = depreciationPeriod.endOf('month').format('YYYY-MM-DD');
      const result = await assetService.runDepreciation(periodEndDate);
      message.success(
        result.message || `Depreciation run completed: ${result.data?.processedAssets || 0} assets processed, R ${result.data?.totalDepreciation || '0'} total`
      );
      refreshData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to run depreciation');
    } finally {
      setDepreciationLoading(false);
    }
  };

  const handleCreateDisposal = async () => {
    try {
      const values = await disposalForm.validateFields();
      const disposalData = {
        asset_id: values.asset_id,
        disposal_date: values.disposal_date?.format('YYYY-MM-DD'),
        disposal_type: values.disposal_type,
        disposal_amount: values.disposal_amount || 0,
        reason: values.reason,
        notes: values.notes,
      };

      await assetService.createDisposal(disposalData);
      message.success('Asset disposed successfully');
      setShowDisposalModal(false);
      disposalForm.resetFields();
      refreshData();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.response?.data?.message || 'Failed to record disposal');
    }
  };

  const handleCreateTransfer = async () => {
    try {
      const values = await transferForm.validateFields();
      const transferData = {
        asset_id: values.asset_id,
        transfer_date: values.transfer_date?.format('YYYY-MM-DD'),
        to_location_id: values.to_location_id,
        to_department_id: values.to_department_id,
        reason: values.reason,
        notes: values.notes,
      };

      await assetService.createTransfer(transferData);
      message.success('Asset transferred successfully');
      setShowTransferModal(false);
      transferForm.resetFields();
      refreshData();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.response?.data?.message || 'Failed to transfer asset');
    }
  };

  const handleCreateMaintenance = async () => {
    try {
      const values = await maintenanceForm.validateFields();
      const assetId = values.asset_id;
      const maintenanceData = {
        asset_id: assetId,
        maintenance_type: values.maintenance_type,
        maintenance_date: values.maintenance_date?.format('YYYY-MM-DD'),
        description: values.description,
        cost: values.cost,
        vendor: values.vendor,
        status: values.status || 'SCHEDULED',
        next_maintenance_date: values.next_maintenance_date?.format('YYYY-MM-DD'),
        notes: values.notes,
      };

      await assetService.createMaintenance(assetId, maintenanceData);
      message.success('Maintenance record created successfully');
      setShowMaintenanceModal(false);
      maintenanceForm.resetFields();
      refreshData();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.response?.data?.message || 'Failed to create maintenance record');
    }
  };

  // When category changes, auto-populate policy fields
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.category_id === categoryId);
    if (category) {
      const usefulLifeYears = category.default_useful_life_years || Math.round((category.default_useful_life_months || 60) / 12);
      const method = (category.default_depreciation_method || 'STRAIGHT_LINE').toLowerCase();

      addAssetForm.setFieldsValue({
        usefulLifeYears,
        depreciationMethod: category.default_depreciation_method || 'STRAIGHT_LINE',
      });

      // Try to find matching static policy for IAS 16 reference display
      const staticPolicy = DEFAULT_POLICIES.find(p =>
        p.categoryCode === category.category_code
      );

      setSelectedPolicy(staticPolicy || {
        id: category.category_id,
        category: category.category_name,
        categoryCode: category.category_code || '',
        usefulLifeYears,
        residualValuePercent: 0,
        depreciationMethod: method as any,
        componentDepreciation: false,
        revaluationModel: false,
        reviewFrequency: 'annual',
        lastReviewDate: '',
        nextReviewDate: '',
        approvedBy: '',
        status: 'active',
        ias16Reference: 'IAS 16',
      });

      message.info(`Policy applied: ${category.category_name} - ${usefulLifeYears} years ${method.replace(/_/g, ' ')}`);
    }
  };

  // The category options for dropdowns: prefer API categories, fall back to static policies
  const categoryOptions = categories.length > 0
    ? categories.map(c => ({
        value: c.category_id,
        label: c.category_name,
        code: c.category_code,
      }))
    : DEFAULT_POLICIES.map(p => ({
        value: p.id,
        label: p.category,
        code: p.categoryCode,
      }));

  // =============================================
  // TABLE COLUMNS
  // =============================================

  const assetColumns = [
    {
      title: 'Asset Number',
      dataIndex: 'asset_number',
      key: 'asset_number',
      render: (text: string) => (
        <Text strong style={{ color: '#667eea' }}>{text}</Text>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'asset_name',
      key: 'asset_name',
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'category_name',
      key: 'category_name',
      render: (text: string) => <Tag>{text || 'Uncategorized'}</Tag>,
    },
    {
      title: 'Cost',
      dataIndex: 'acquisition_cost',
      key: 'acquisition_cost',
      render: (v: number) => formatCurrency(v || 0),
      align: 'right' as const,
    },
    {
      title: 'Acc. Depr.',
      dataIndex: 'accumulated_depreciation',
      key: 'accumulated_depreciation',
      render: (v: number) => <Text type="secondary">{formatCurrency(v || 0)}</Text>,
      align: 'right' as const,
    },
    {
      title: 'NBV',
      dataIndex: 'book_value',
      key: 'book_value',
      render: (v: number) => <Text strong style={{ color: '#10b981' }}>{formatCurrency(v || 0)}</Text>,
      align: 'right' as const,
    },
    {
      title: 'Status',
      dataIndex: 'asset_status',
      key: 'asset_status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: FixedAsset) => (
        <Space>
          <Tooltip title="View Details"><Button type="link" size="small" icon={<FileTextOutlined />} /></Tooltip>
          <Tooltip title="Depreciation Schedule"><Button type="link" size="small" icon={<CalculatorOutlined />} /></Tooltip>
          <Popconfirm
            title="Dispose this asset?"
            description="This will mark the asset as disposed."
            onConfirm={() => handleDeleteAsset(record.asset_id)}
          >
            <Tooltip title="Dispose">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Build policies from DB categories if available, otherwise fall back to static defaults
  const activePolicies: AssetPolicy[] = categories.length > 0
    ? categories.map(cat => {
        // Try to find matching static policy for IAS 16 reference & SARS rates
        const staticMatch = DEFAULT_POLICIES.find(p => p.categoryCode === cat.category_code);
        return {
          id: String(cat.category_id),
          category: cat.category_name,
          categoryCode: cat.category_code || '',
          usefulLifeYears: cat.default_useful_life_years || 0,
          residualValuePercent: cat.default_residual_value_percentage || 0,
          depreciationMethod: (cat.default_depreciation_method || 'straight_line').toLowerCase() as any,
          componentDepreciation: staticMatch?.componentDepreciation || false,
          revaluationModel: staticMatch?.revaluationModel || false,
          reviewFrequency: staticMatch?.reviewFrequency || 'annual',
          lastReviewDate: staticMatch?.lastReviewDate || '',
          nextReviewDate: staticMatch?.nextReviewDate || '',
          approvedBy: staticMatch?.approvedBy || '',
          status: (cat.is_active !== false ? 'active' : 'superseded') as any,
          sarsWearAndTear: staticMatch?.sarsWearAndTear,
          ias16Reference: cat.description || staticMatch?.ias16Reference || 'IAS 16',
        };
      })
    : DEFAULT_POLICIES;

  const policyColumns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text: string, record: AssetPolicy) => (
        <Space>
          {getCategoryIcon(record.categoryCode)}
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Useful Life',
      dataIndex: 'usefulLifeYears',
      key: 'usefulLifeYears',
      render: (years: number) => years === 0 ? <Tag color="blue">Not Depreciated</Tag> : `${years} years`,
    },
    {
      title: 'Residual %',
      dataIndex: 'residualValuePercent',
      key: 'residualValuePercent',
      render: (v: number) => `${v}%`,
    },
    {
      title: 'Method',
      dataIndex: 'depreciationMethod',
      key: 'depreciationMethod',
      render: (method: string) => {
        const labels: Record<string, string> = {
          'straight_line': 'Straight Line',
          'reducing_balance': 'Reducing Balance',
          'units_of_production': 'Units of Production',
        };
        return labels[method] || method;
      },
    },
    {
      title: 'SARS Rate',
      dataIndex: 'sarsWearAndTear',
      key: 'sarsWearAndTear',
      render: (rate: number | undefined) => rate ? `${rate}%` : '-',
    },
    {
      title: 'IAS 16 Ref',
      dataIndex: 'ias16Reference',
      key: 'ias16Reference',
      render: (ref: string) => <Tooltip title={ref}><Tag color="blue">IAS 16</Tag></Tooltip>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: AssetPolicy) => (
        <Space>
          <Tooltip title="Request Change">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedPolicy(record);
                setShowPolicyChangeModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="View History">
            <Button type="link" size="small" icon={<HistoryOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const disposalColumns = [
    {
      title: 'Asset',
      key: 'asset',
      render: (_: unknown, record: AssetDisposal) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.asset_number || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.asset_name}</Text>
        </Space>
      ),
    },
    {
      title: 'Disposal Date',
      dataIndex: 'disposal_date',
      key: 'disposal_date',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Type',
      dataIndex: 'disposal_type',
      key: 'disposal_type',
      render: (type: string) => <Tag>{type || 'N/A'}</Tag>,
    },
    {
      title: 'Disposal Amount',
      dataIndex: 'disposal_amount',
      key: 'disposal_amount',
      render: (v: number) => formatCurrency(v || 0),
      align: 'right' as const,
    },
    {
      title: 'Book Value',
      dataIndex: 'book_value_at_disposal',
      key: 'book_value_at_disposal',
      render: (v: number) => formatCurrency(v || 0),
      align: 'right' as const,
    },
    {
      title: 'Gain/Loss',
      dataIndex: 'gain_loss',
      key: 'gain_loss',
      render: (v: number) => {
        const val = v || 0;
        const color = val >= 0 ? '#10b981' : '#ef4444';
        return <Text style={{ color }}>{formatCurrency(val)}</Text>;
      },
      align: 'right' as const,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
  ];

  // =============================================
  // TAB CONTENT
  // =============================================

  const tabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <BarChartOutlined />,
      children: loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : (
        <Row gutter={24}>
          <Col span={16}>
            {/* Asset Value Summary */}
            <Card style={{ marginBottom: 24 }}>
              <Row gutter={24}>
                <Col span={6}>
                  <Statistic
                    title="Total Cost"
                    value={assetStats.totalCost}
                    prefix="R"
                    valueStyle={{ color: '#667eea' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Accumulated Depreciation"
                    value={assetStats.accumulatedDepreciation}
                    prefix="R"
                    valueStyle={{ color: '#ef4444' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Net Book Value"
                    value={assetStats.totalNBV}
                    prefix="R"
                    valueStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Monthly Depreciation"
                    value={assetStats.monthlyDepreciation}
                    prefix="R"
                    suffix="/mo"
                    valueStyle={{ color: '#f59e0b' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* IAS 16 Compliance Alert */}
            <Alert
              message="IAS 16 Compliance Status"
              description={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row gutter={24}>
                    <Col span={8}>
                      <Text><CheckCircleOutlined style={{ color: '#10b981' }} /> Recognition criteria applied</Text>
                    </Col>
                    <Col span={8}>
                      <Text><CheckCircleOutlined style={{ color: '#10b981' }} /> Cost model measurement</Text>
                    </Col>
                    <Col span={8}>
                      <Text><CheckCircleOutlined style={{ color: '#10b981' }} /> Systematic depreciation</Text>
                    </Col>
                  </Row>
                  <Row gutter={24}>
                    <Col span={8}>
                      <Text><CheckCircleOutlined style={{ color: '#10b981' }} /> Component depreciation active</Text>
                    </Col>
                    <Col span={8}>
                      <Text><WarningOutlined style={{ color: '#f59e0b' }} /> {assetStats.assetsDueForReview} assets due for review</Text>
                    </Col>
                    <Col span={8}>
                      <Text><ExclamationCircleOutlined style={{ color: '#ef4444' }} /> {assetStats.impairedAssets} assets impaired</Text>
                    </Col>
                  </Row>
                </Space>
              }
              type="info"
              showIcon
              icon={<SafetyCertificateOutlined />}
              style={{ marginBottom: 24 }}
            />

            {/* Asset Register */}
            <Card
              title="Asset Register"
              extra={
                <Space>
                  <Button icon={<PlusOutlined />} onClick={() => setShowAddAssetModal(true)}>Add Asset</Button>
                  <Button type="link" onClick={() => setActiveTab('register')}>View All</Button>
                </Space>
              }
            >
              <Table
                dataSource={assets.slice(0, 5)}
                columns={assetColumns}
                rowKey="asset_id"
                pagination={false}
                size="middle"
                locale={{ emptyText: 'No assets found. Click "Add Asset" to create one.' }}
              />
            </Card>
          </Col>

          <Col span={8}>
            {/* Key Metrics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Total Assets"
                    value={assetStats.totalAssets}
                    prefix={<AppstoreOutlined style={{ color: '#667eea' }} />}
                    valueStyle={{ color: '#667eea' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Active"
                    value={assetStats.activeAssets}
                    prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                    valueStyle={{ color: '#10b981' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Quick Actions */}
            <QuickActionsCard
              title="Quick Actions"
              actions={[
                { icon: <PlusOutlined />, label: 'Add Asset', onClick: () => setShowAddAssetModal(true) },
                { icon: <CalculatorOutlined />, label: 'Run Depreciation', onClick: () => setActiveTab('depreciation') },
                { icon: <SwapOutlined />, label: 'Transfer Asset', onClick: () => setShowTransferModal(true) },
                { icon: <AuditOutlined />, label: 'Record Maintenance', onClick: () => setShowMaintenanceModal(true) },
              ]}
            />

            {/* Pending Approvals */}
            {pendingPolicyChanges.length > 0 && (
              <Card
                title={
                  <Space>
                    <LockOutlined style={{ color: '#f59e0b' }} />
                    Pending Policy Changes
                    <Badge count={pendingPolicyChanges.length} />
                  </Space>
                }
                style={{ marginTop: 24 }}
              >
                {pendingPolicyChanges.map(change => (
                  <div key={change.id} style={{ marginBottom: 16 }}>
                    <Text strong>{change.category}</Text>
                    <br />
                    <Text type="secondary">{change.changeType}: {change.currentValue} &rarr; {change.proposedValue}</Text>
                    <br />
                    <Space style={{ marginTop: 8 }}>
                      <Button type="primary" size="small">Approve</Button>
                      <Button size="small">Reject</Button>
                    </Space>
                  </div>
                ))}
              </Card>
            )}

            {/* Categories Summary */}
            <Card title="Categories" style={{ marginTop: 24 }}>
              {categories.length > 0 ? (
                categories.slice(0, 6).map(cat => (
                  <div key={cat.category_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <Space>
                      {getCategoryIcon(cat.category_code)}
                      <Text>{cat.category_name}</Text>
                    </Space>
                    <Tag>{cat.asset_count || 0} assets</Tag>
                  </div>
                ))
              ) : (
                DEFAULT_POLICIES.slice(0, 5).map(policy => (
                  <div key={policy.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <Space>
                      {getCategoryIcon(policy.categoryCode)}
                      <Text>{policy.category}</Text>
                    </Space>
                    <Text type="secondary">{policy.usefulLifeYears > 0 ? `${policy.usefulLifeYears}yr` : 'N/A'}</Text>
                  </div>
                ))
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'register',
      label: 'Asset Register',
      icon: <FileTextOutlined />,
      children: (
        <Card
          title="Full Asset Register"
          extra={
            <Space>
              <Button icon={<DownloadOutlined />}>Export</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddAssetModal(true)}>
                Add Asset
              </Button>
            </Space>
          }
        >
          <Table
            dataSource={assets}
            columns={assetColumns}
            rowKey="asset_id"
            pagination={{ pageSize: 10 }}
            loading={loading}
            locale={{ emptyText: 'No assets found. Click "Add Asset" to create your first asset.' }}
          />
        </Card>
      ),
    },
    {
      key: 'depreciation',
      label: 'Depreciation',
      icon: <CalculatorOutlined />,
      children: (
        <Row gutter={24}>
          <Col span={16}>
            <Card title="Depreciation Schedule">
              <Alert
                message="Monthly Depreciation Run"
                description="Depreciation is calculated automatically at month-end based on category policies. Manual runs can be triggered for adjustments."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table
                dataSource={assets.filter(a => (a.asset_status || '').toUpperCase() === 'ACTIVE')}
                columns={[
                  { title: 'Asset', dataIndex: 'asset_name', key: 'asset_name' },
                  { title: 'Method', dataIndex: 'depreciation_method', key: 'depreciation_method',
                    render: (v: string) => (v || '').replace(/_/g, ' ') },
                  { title: 'Cost', dataIndex: 'acquisition_cost', key: 'acquisition_cost',
                    render: (v: number) => formatCurrency(v || 0), align: 'right' as const },
                  { title: 'Accumulated', dataIndex: 'accumulated_depreciation', key: 'accumulated_depreciation',
                    render: (v: number) => formatCurrency(v || 0), align: 'right' as const },
                  { title: 'NBV', dataIndex: 'book_value', key: 'book_value',
                    render: (v: number) => <Text strong>{formatCurrency(v || 0)}</Text>, align: 'right' as const },
                  {
                    title: 'Progress',
                    key: 'progress',
                    render: (_: unknown, record: FixedAsset) => {
                      const depreciable = (record.acquisition_cost || 0) - (record.residual_value || 0);
                      const percent = depreciable > 0
                        ? Math.min(100, Math.round(((record.accumulated_depreciation || 0) / depreciable) * 100))
                        : 0;
                      return <Progress percent={percent} size="small" strokeColor="#667eea" />;
                    },
                  },
                ]}
                rowKey="asset_id"
                pagination={false}
                loading={loading}
                locale={{ emptyText: 'No active assets found for depreciation.' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Run Depreciation">
              <Form layout="vertical">
                <Form.Item label="Period">
                  <DatePicker.MonthPicker
                    style={{ width: '100%' }}
                    value={depreciationPeriod}
                    onChange={(val) => setDepreciationPeriod(val)}
                    placeholder="Select month"
                  />
                </Form.Item>
                <Form.Item label="Scope">
                  <Select defaultValue="all">
                    <Select.Option value="all">All Assets</Select.Option>
                    <Select.Option value="category">By Category</Select.Option>
                    <Select.Option value="selected">Selected Assets</Select.Option>
                  </Select>
                </Form.Item>
                <Button
                  type="primary"
                  block
                  icon={<CalculatorOutlined />}
                  onClick={handleRunDepreciation}
                  loading={depreciationLoading}
                >
                  Calculate Depreciation
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'policies',
      label: 'Policies',
      icon: <FileProtectOutlined />,
      children: (
        <Row gutter={24}>
          <Col span={24}>
            <Alert
              message="IAS 16 Depreciation Policies"
              description={
                <Space direction="vertical">
                  <Text>These policies are automatically applied to new assets based on their category. <strong>Policy changes require management approval</strong> to ensure compliance.</Text>
                  <Text type="secondary">IAS 16.50: The useful life of an asset shall be reviewed at least at each financial year-end.</Text>
                </Space>
              }
              type="info"
              showIcon
              icon={<SafetyCertificateOutlined />}
              style={{ marginBottom: 24 }}
            />

            <Card
              title={
                <Space>
                  <LockOutlined />
                  Asset Category Policies
                </Space>
              }
              extra={
                <Space>
                  <Tag color="blue">IAS 16 Compliant</Tag>
                  <Tag color="green">SARS Aligned</Tag>
                </Space>
              }
            >
              <Table
                dataSource={activePolicies}
                columns={policyColumns}
                rowKey="id"
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'impairment',
      label: 'Impairment',
      icon: <WarningOutlined />,
      children: (
        <Row gutter={24}>
          <Col span={16}>
            <Card title="IAS 36 Impairment Testing">
              <Alert
                message="Impairment Indicators"
                description="Assets should be tested for impairment when there are indicators that the carrying amount may not be recoverable (IAS 36)."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <List
                header={<Text strong>Assets Requiring Review</Text>}
                bordered
                dataSource={assets.filter(a =>
                  (a.asset_status || '').toUpperCase() === 'ACTIVE' &&
                  (a.book_value || 0) > 0
                ).slice(0, 5).map(a => ({
                  asset: a.asset_name,
                  indicator: 'Scheduled review',
                  action: 'Calculate recoverable amount',
                }))}
                locale={{ emptyText: 'No assets currently flagged for impairment review.' }}
                renderItem={item => (
                  <List.Item
                    actions={[<Button type="primary" size="small" key="test">Test Impairment</Button>]}
                  >
                    <List.Item.Meta
                      title={item.asset}
                      description={
                        <Space>
                          <Tag color="orange">{item.indicator}</Tag>
                          <Text type="secondary">{item.action}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Impairment Calculation">
              <Form layout="vertical">
                <Form.Item label="Select Asset">
                  <Select placeholder="Choose asset">
                    {assets.map(a => (
                      <Select.Option key={a.asset_id} value={a.asset_id}>{a.asset_name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item label="Fair Value Less Costs to Sell">
                  <InputNumber style={{ width: '100%' }} prefix="R" />
                </Form.Item>
                <Form.Item label="Value in Use">
                  <InputNumber style={{ width: '100%' }} prefix="R" />
                </Form.Item>
                <Button type="primary" block>Calculate Recoverable Amount</Button>
              </Form>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'disposals',
      label: 'Disposals',
      icon: <DeleteOutlined />,
      children: (
        <Card
          title="Asset Disposals & Derecognition"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowDisposalModal(true)}>
              Record Disposal
            </Button>
          }
        >
          <Alert
            message="IAS 16.67 - Derecognition"
            description="An asset shall be derecognized on disposal or when no future economic benefits are expected from its use or disposal."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={disposals}
            columns={disposalColumns}
            rowKey="disposal_id"
            pagination={{ pageSize: 10 }}
            loading={loading}
            locale={{ emptyText: 'No disposal records found.' }}
          />
        </Card>
      ),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card title="General Settings">
              <Form layout="vertical">
                <Form.Item label="Asset Number Prefix">
                  <Input defaultValue="AST-" />
                </Form.Item>
                <Form.Item label="Depreciation Run Schedule">
                  <Select defaultValue="month_end">
                    <Select.Option value="month_end">Month End</Select.Option>
                    <Select.Option value="daily">Daily</Select.Option>
                    <Select.Option value="manual">Manual Only</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Default Measurement Model">
                  <Select defaultValue="cost">
                    <Select.Option value="cost">Cost Model (IAS 16.30)</Select.Option>
                    <Select.Option value="revaluation">Revaluation Model (IAS 16.31)</Select.Option>
                  </Select>
                </Form.Item>
                <Button type="primary">Save Settings</Button>
              </Form>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Policy Change Workflow">
              <Alert
                message="Approval Required"
                description="Changes to depreciation policies require approval from designated approvers to maintain IAS 16 compliance and audit trail."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form layout="vertical">
                <Form.Item label="Required Approvers">
                  <Select mode="multiple" defaultValue={['finance_manager', 'cfo']}>
                    <Select.Option value="finance_manager">Finance Manager</Select.Option>
                    <Select.Option value="cfo">CFO</Select.Option>
                    <Select.Option value="ceo">CEO</Select.Option>
                    <Select.Option value="audit_committee">Audit Committee</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Approval Threshold">
                  <Select defaultValue="all">
                    <Select.Option value="all">All Approvers Required</Select.Option>
                    <Select.Option value="any">Any One Approver</Select.Option>
                    <Select.Option value="majority">Majority</Select.Option>
                  </Select>
                </Form.Item>
                <Button type="primary">Save Workflow</Button>
              </Form>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <HubLayout>
      <HubHeader
        title="Asset Management"
        subtitle="IAS 16 Compliant Fixed Asset Register & Depreciation"
        icon={<BankOutlined />}
        gradient="green"
        actions={
          <>
            <Button icon={<SyncOutlined spin={loading} />} onClick={refreshData}>Sync</Button>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddAssetModal(true)}>
              Add Asset
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="green"
        icon={<SafetyCertificateOutlined />}
        title="Asset Portfolio"
        subtitle="IAS 16 & SARS Compliant"
        stats={[
          { title: 'Total Assets', value: assetStats.totalAssets, span: 3 },
          { title: 'Total Cost', value: assetStats.totalCost, prefix: 'R', span: 4 },
          { title: 'Net Book Value', value: assetStats.totalNBV, prefix: 'R', valueStyle: { color: '#86efac' }, span: 4 },
          { title: 'Monthly Depr.', value: assetStats.monthlyDepreciation, prefix: 'R', span: 4 },
          { title: 'Categories', value: assetStats.categories, span: 3 },
        ]}
      />

      <HubTabs
        theme="green"
        tabs={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* ===========================================
          ADD ASSET MODAL
          =========================================== */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            Add New Asset
            <Tag color="blue">IAS 16 Compliant</Tag>
          </Space>
        }
        open={showAddAssetModal}
        onCancel={() => {
          setShowAddAssetModal(false);
          addAssetForm.resetFields();
          setSelectedPolicy(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowAddAssetModal(false);
            addAssetForm.resetFields();
            setSelectedPolicy(null);
          }}>Cancel</Button>,
          <Button key="create" type="primary" onClick={handleCreateAsset}>
            Create Asset
          </Button>
        ]}
        width={800}
      >
        <Alert
          message="Policy Auto-Application"
          description="Select a category to automatically apply the approved depreciation policy. Policies ensure IAS 16 compliance across all assets."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={addAssetForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Asset Category" name="category_id" rules={[{ required: true, message: 'Please select a category' }]}>
                <Select
                  placeholder="Select category"
                  onChange={handleCategoryChange}
                >
                  {categoryOptions.map(opt => (
                    <Select.Option key={opt.value} value={opt.value}>
                      <Space>{getCategoryIcon(opt.code)} {opt.label}</Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Asset Number">
                <Input placeholder="Auto-generated" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Asset Name" name="assetName" rules={[{ required: true, message: 'Please enter asset name' }]}>
                <Input placeholder="Enter asset name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Description" name="description">
                <Input placeholder="Enter description (optional)" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">IAS 16 Initial Measurement</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Purchase Price" name="purchasePrice" rules={[{ required: true, message: 'Purchase price is required' }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="R"
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Residual Value" name="residualValue">
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="R"
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Useful Life (Years)" name="usefulLifeYears">
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Acquisition Date" name="acquisitionDate" rules={[{ required: true, message: 'Acquisition date is required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Depreciation Method" name="depreciationMethod">
                <Select placeholder="Select method">
                  <Select.Option value="STRAIGHT_LINE">Straight Line</Select.Option>
                  <Select.Option value="REDUCING_BALANCE">Reducing Balance</Select.Option>
                  <Select.Option value="UNITS_OF_PRODUCTION">Units of Production</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Serial Number" name="serialNumber">
                <Input placeholder="Serial number (optional)" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Manufacturer" name="manufacturer">
                <Input placeholder="Manufacturer (optional)" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Model Number" name="modelNumber">
                <Input placeholder="Model number (optional)" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Notes" name="notes">
                <Input placeholder="Notes (optional)" />
              </Form.Item>
            </Col>
          </Row>

          {selectedPolicy && (
            <>
              <Divider orientation="left">
                <Space>
                  <LockOutlined />
                  Applied Policy (Auto-Inherited)
                </Space>
              </Divider>

              <Card size="small" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <Descriptions size="small" column={3}>
                  <Descriptions.Item label="Category">{selectedPolicy.category}</Descriptions.Item>
                  <Descriptions.Item label="Useful Life">{selectedPolicy.usefulLifeYears} years</Descriptions.Item>
                  <Descriptions.Item label="Residual Value">{selectedPolicy.residualValuePercent}%</Descriptions.Item>
                  <Descriptions.Item label="Method">{selectedPolicy.depreciationMethod.replace(/_/g, ' ')}</Descriptions.Item>
                  <Descriptions.Item label="SARS Rate">{selectedPolicy.sarsWearAndTear || 'N/A'}%</Descriptions.Item>
                  <Descriptions.Item label="IAS 16 Ref">{selectedPolicy.ias16Reference}</Descriptions.Item>
                </Descriptions>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                  <LockOutlined /> Policy locked. Changes require management approval.
                </Text>
              </Card>
            </>
          )}
        </Form>
      </Modal>

      {/* ===========================================
          DISPOSAL MODAL
          =========================================== */}
      <Modal
        title={
          <Space>
            <DeleteOutlined />
            Record Asset Disposal
          </Space>
        }
        open={showDisposalModal}
        onCancel={() => {
          setShowDisposalModal(false);
          disposalForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowDisposalModal(false);
            disposalForm.resetFields();
          }}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={handleCreateDisposal}>
            Record Disposal
          </Button>
        ]}
        width={600}
      >
        <Alert
          message="IAS 16.67 - Derecognition"
          description="The gain or loss arising from derecognition shall be determined as the difference between the net disposal proceeds and the carrying amount."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={disposalForm} layout="vertical">
          <Form.Item label="Asset" name="asset_id" rules={[{ required: true, message: 'Please select an asset' }]}>
            <Select placeholder="Select asset to dispose">
              {assets
                .filter(a => (a.asset_status || '').toUpperCase() !== 'DISPOSED')
                .map(a => (
                  <Select.Option key={a.asset_id} value={a.asset_id}>
                    {a.asset_number} - {a.asset_name}
                  </Select.Option>
                ))
              }
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Disposal Date" name="disposal_date" rules={[{ required: true, message: 'Required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Disposal Type" name="disposal_type" rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder="Select type">
                  <Select.Option value="SALE">Sale</Select.Option>
                  <Select.Option value="SCRAP">Scrap</Select.Option>
                  <Select.Option value="DONATION">Donation</Select.Option>
                  <Select.Option value="THEFT">Theft/Loss</Select.Option>
                  <Select.Option value="TRADE_IN">Trade-in</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Disposal Amount" name="disposal_amount">
            <InputNumber
              style={{ width: '100%' }}
              prefix="R"
              min={0}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item label="Reason" name="reason" rules={[{ required: true, message: 'Reason is required' }]}>
            <Input.TextArea rows={2} placeholder="Reason for disposal" />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Additional notes (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===========================================
          TRANSFER MODAL
          =========================================== */}
      <Modal
        title={
          <Space>
            <SwapOutlined />
            Transfer Asset
          </Space>
        }
        open={showTransferModal}
        onCancel={() => {
          setShowTransferModal(false);
          transferForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowTransferModal(false);
            transferForm.resetFields();
          }}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={handleCreateTransfer}>
            Transfer Asset
          </Button>
        ]}
        width={600}
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item label="Asset" name="asset_id" rules={[{ required: true, message: 'Please select an asset' }]}>
            <Select placeholder="Select asset to transfer">
              {assets
                .filter(a => (a.asset_status || '').toUpperCase() === 'ACTIVE')
                .map(a => (
                  <Select.Option key={a.asset_id} value={a.asset_id}>
                    {a.asset_number} - {a.asset_name}
                  </Select.Option>
                ))
              }
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Transfer Date" name="transfer_date" rules={[{ required: true, message: 'Required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="To Location" name="to_location_id">
                <Input placeholder="New location" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="To Department" name="to_department_id">
            <Input placeholder="New department" />
          </Form.Item>

          <Form.Item label="Reason" name="reason" rules={[{ required: true, message: 'Reason is required' }]}>
            <Input.TextArea rows={2} placeholder="Reason for transfer" />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Additional notes (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===========================================
          MAINTENANCE MODAL
          =========================================== */}
      <Modal
        title={
          <Space>
            <ToolOutlined />
            Record Maintenance
          </Space>
        }
        open={showMaintenanceModal}
        onCancel={() => {
          setShowMaintenanceModal(false);
          maintenanceForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowMaintenanceModal(false);
            maintenanceForm.resetFields();
          }}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={handleCreateMaintenance}>
            Record Maintenance
          </Button>
        ]}
        width={600}
      >
        <Form form={maintenanceForm} layout="vertical">
          <Form.Item label="Asset" name="asset_id" rules={[{ required: true, message: 'Please select an asset' }]}>
            <Select placeholder="Select asset">
              {assets.map(a => (
                <Select.Option key={a.asset_id} value={a.asset_id}>
                  {a.asset_number} - {a.asset_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Maintenance Type" name="maintenance_type" rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder="Select type">
                  <Select.Option value="PREVENTIVE">Preventive</Select.Option>
                  <Select.Option value="CORRECTIVE">Corrective</Select.Option>
                  <Select.Option value="INSPECTION">Inspection</Select.Option>
                  <Select.Option value="CALIBRATION">Calibration</Select.Option>
                  <Select.Option value="OVERHAUL">Overhaul</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Maintenance Date" name="maintenance_date" rules={[{ required: true, message: 'Required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Description is required' }]}>
            <Input.TextArea rows={2} placeholder="Describe the maintenance work" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Cost" name="cost">
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="R"
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Vendor" name="vendor">
                <Input placeholder="Vendor/Contractor" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Status" name="status" initialValue="SCHEDULED">
                <Select>
                  <Select.Option value="SCHEDULED">Scheduled</Select.Option>
                  <Select.Option value="IN_PROGRESS">In Progress</Select.Option>
                  <Select.Option value="COMPLETED">Completed</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Next Maintenance Date" name="next_maintenance_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Additional notes (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===========================================
          POLICY CHANGE REQUEST MODAL
          =========================================== */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            Request Policy Change
            <Tag color="orange">Requires Approval</Tag>
          </Space>
        }
        open={showPolicyChangeModal}
        onCancel={() => setShowPolicyChangeModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowPolicyChangeModal(false)}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={() => {
            message.success('Policy change request submitted for approval');
            setShowPolicyChangeModal(false);
          }}>
            Submit for Approval
          </Button>
        ]}
        width={600}
      >
        <Alert
          message="Management Approval Required"
          description="Changes to depreciation policies affect financial statements and require approval from Finance Manager and CFO per IAS 16.51."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {selectedPolicy && (
          <Form layout="vertical">
            <Form.Item label="Category">
              <Input value={selectedPolicy.category} disabled />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Current Useful Life">
                  <Input value={`${selectedPolicy.usefulLifeYears} years`} disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Proposed Useful Life" required>
                  <InputNumber style={{ width: '100%' }} suffix="years" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Current Residual Value">
                  <Input value={`${selectedPolicy.residualValuePercent}%`} disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Proposed Residual Value">
                  <InputNumber style={{ width: '100%' }} suffix="%" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Reason for Change" required>
              <Input.TextArea
                rows={3}
                placeholder="Provide justification per IAS 16.51 - change in expected pattern of consumption, technical obsolescence, etc."
              />
            </Form.Item>

            <Form.Item label="Supporting Documentation">
              <Button icon={<DownloadOutlined />}>Attach Evidence</Button>
            </Form.Item>

            <Divider />

            <Text strong>Approval Workflow:</Text>
            <Timeline style={{ marginTop: 12 }}>
              <Timeline.Item color="blue">Finance Manager Review</Timeline.Item>
              <Timeline.Item color="gray">CFO Approval</Timeline.Item>
              <Timeline.Item color="gray">Policy Updated & Applied</Timeline.Item>
            </Timeline>
          </Form>
        )}
      </Modal>
    </HubLayout>
  );
};

export default AssetsHub;
