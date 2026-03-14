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
  Tabs,
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
  Avatar,
  Spin,
  Empty,
} from 'antd';
import {
  ShoppingCartOutlined,
  UserOutlined,
  FileTextOutlined,
  BarChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  DownloadOutlined,
  PrinterOutlined,
  SyncOutlined,
  SettingOutlined,
  CalendarOutlined,
  PhoneOutlined,
  MailOutlined,
  DollarOutlined,
  TeamOutlined,
  TrophyOutlined,
  LineChartOutlined,
  StarOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  HubLayout,
  HubHeader,
  StatusBanner,
  HubTabs,
  StatCard,
  QuickActionsCard,
  StatusIndicator,
  ProgressCard,
} from '../../components/hub';
import { salesService } from '../../services/sales.service';
import { workspaceApi } from '../../services/api.service';
import type { SalesStats, SalesOrder, Customer } from '../../services/sales.service';
import StatementsPage from '../financial/components/StatementsPage';

const { Title, Text, Paragraph } = Typography;

// Types for API data
interface SalesStatsState {
  totalSales: number;
  pipelineValue: number;
  quotesOpen: number;
  ordersThisMonth: number;
  avgDealSize: number;
  winRate: number;
  targetProgress: number;
  targetAmount: number;
}

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
  color: string;
}

interface TopCustomer {
  id?: string;
  name: string;
  revenue: number;
  orders: number;
  segment: string;
  avatar: string;
  email?: string;
  phone?: string;
}

interface Quote {
  id: string;
  customer: string;
  amount: number;
  validUntil: string;
  status: string;
  daysLeft: number;
}

interface Order {
  id: string;
  customer: string;
  amount: number;
  date: string;
  status: string;
  items: number;
}

interface SalesTeamMember {
  name: string;
  target: number;
  achieved: number;
  deals: number;
  winRate: number;
}

// Default/fallback data when API returns empty
const defaultPipelineStages: PipelineStage[] = [
  { stage: 'Lead', count: 0, value: 0, color: '#667eea' },
  { stage: 'Qualified', count: 0, value: 0, color: '#06b6d4' },
  { stage: 'Proposal', count: 0, value: 0, color: '#f59e0b' },
  { stage: 'Negotiation', count: 0, value: 0, color: '#ec4899' },
  { stage: 'Won', count: 0, value: 0, color: '#10b981' },
];

const SalesHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [quoteForm] = Form.useForm();
  const [orderForm] = Form.useForm();
  const [customerForm] = Form.useForm();
  const [invoiceForm] = Form.useForm();
  const [dealForm] = Form.useForm();
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'proforma'>('invoice');

  // All customers for dropdowns (separate from topCustomers stats)
  const [allCustomers, setAllCustomers] = useState<{ id: string | number; name: string; email?: string }[]>([]);

  // Quote line items
  const [quoteLines, setQuoteLines] = useState<{ description: string; qty: number; rate: number; unit: string }[]>([]);
  // Invoice line items
  const [invoiceLines, setInvoiceLines] = useState<{ description: string; qty: number; rate: number; unit: string }[]>([]);
  
  // API State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesStats, setSalesStats] = useState<SalesStatsState>({
    totalSales: 0,
    pipelineValue: 0,
    quotesOpen: 0,
    ordersThisMonth: 0,
    avgDealSize: 0,
    winRate: 0,
    targetProgress: 0,
    targetAmount: 0,
  });
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(defaultPipelineStages);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [salesTeam, setSalesTeam] = useState<SalesTeamMember[]>([]);

  // Retainer Services State
  const [retainers, setRetainers] = useState<any[]>([]);
  const [loadingRetainers, setLoadingRetainers] = useState(false);
  const [showRetainerModal, setShowRetainerModal] = useState(false);
  const [retainerForm] = Form.useForm();
  const [creatingRetainer, setCreatingRetainer] = useState(false);

  // Fetch data from API
  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Primary workspace data (multi-tenant aware)
        const workspace = await salesService.getStats();

        setSalesStats({
          totalSales: parseFloat(workspace.total_revenue) || parseFloat(workspace.won_revenue) || 0,
          pipelineValue: parseFloat(workspace.pipeline_value) || 0,
          quotesOpen: parseInt(workspace.pending_quotes) || 0,
          ordersThisMonth: parseInt(workspace.total_orders) || 0,
          avgDealSize: parseFloat(workspace.avg_deal_size) || parseFloat(workspace.average_order_value) || 0,
          winRate: parseFloat(workspace.win_rate) || 0,
          targetProgress: 0,
          targetAmount: 0,
        });

        // Merge API pipeline data into default stages so the structure always shows
        const stageMap: Record<string, { display: string; color: string }> = {
          lead: { display: 'Lead', color: '#667eea' },
          qualification: { display: 'Qualified', color: '#06b6d4' },
          qualified: { display: 'Qualified', color: '#06b6d4' },
          proposal: { display: 'Proposal', color: '#f59e0b' },
          negotiation: { display: 'Negotiation', color: '#ec4899' },
          won: { display: 'Won', color: '#10b981' },
          closed_won: { display: 'Won', color: '#10b981' },
        };

        // Always start with the 5 default stages
        const mergedPipeline: PipelineStage[] = [
          { stage: 'Lead', count: 0, value: 0, color: '#667eea' },
          { stage: 'Qualified', count: 0, value: 0, color: '#06b6d4' },
          { stage: 'Proposal', count: 0, value: 0, color: '#f59e0b' },
          { stage: 'Negotiation', count: 0, value: 0, color: '#ec4899' },
          { stage: 'Won', count: 0, value: 0, color: '#10b981' },
        ];

        if (Array.isArray((workspace as any)?.pipeline) && (workspace as any).pipeline.length > 0) {
          // Overlay API data onto matching stages
          (workspace as any).pipeline.forEach((apiStage: any) => {
            const key = (apiStage.stage || '').toLowerCase();
            const mapped = stageMap[key];
            if (mapped) {
              const target = mergedPipeline.find(s => s.stage === mapped.display);
              if (target) {
                target.count += Number(apiStage.opportunity_count || apiStage.count || 0);
                target.value += Number(apiStage.total_value || 0);
              }
            }
          });
        }
        setPipelineStages(mergedPipeline);

        if (Array.isArray((workspace as any)?.recent_orders)) {
          setRecentOrders(
            (workspace as any).recent_orders.map((order: any) => ({
              id: order.order_number || order.id,
              customer: order.customer_name,
              amount: order.total_amount || order.total || 0,
              date: order.order_date,
              status: (order.status || order.order_status || 'pending').toLowerCase(),
              items: 1,
            }))
          );
        }

        if (Array.isArray((workspace as any)?.top_customers)) {
          setTopCustomers(
            (workspace as any).top_customers.map((customer: any) => ({
              name: customer.name || customer.customer_name,
              revenue: customer.total_revenue || customer.total_spent || 0,
              orders: customer.order_count || customer.total_orders || 0,
              segment: customer.customer_type || 'General',
              avatar: (customer.name || customer.customer_name || 'C').charAt(0),
            }))
          );
        }

        // Fetch granular lists; if they fail, keep workspace fallbacks instead of failing the page
        const [ordersResult, customersResult] = await Promise.allSettled([
          salesService.getOrders({ limit: 10 }),
          salesService.getCustomers({ limit: 5 }),
        ]);

        if (ordersResult.status === 'fulfilled' && Array.isArray(ordersResult.value.data)) {
          setRecentOrders(
            ordersResult.value.data.map((order: SalesOrder) => ({
              id: order.order_number || order.order_id,
              customer: order.customer_name,
              amount: order.total_amount,
              date: order.order_date,
              status: order.order_status?.toLowerCase() || 'pending',
              items: 1,
            }))
          );
        } else if (ordersResult.status === 'rejected') {
          console.warn('Orders endpoint failed, using workspace data if available', ordersResult.reason);
          message.warning('Orders not available yet. Showing workspace data.');
        }

        if (customersResult.status === 'fulfilled' && Array.isArray(customersResult.value.data)) {
          setTopCustomers(
            customersResult.value.data.map((customer: Customer) => ({
              name: customer.customer_name,
              revenue: customer.total_spent || 0,
              orders: customer.total_orders || 0,
              segment: customer.customer_type || 'General',
              avatar: customer.customer_name?.charAt(0) || 'C',
            }))
          );
        } else if (customersResult.status === 'rejected') {
          console.warn('Customers endpoint failed, using workspace data if available', customersResult.reason);
        }

        // Hydrate latest entities
        loadQuotes();
        loadOrders();
        loadCustomers();

      } catch (err: unknown) {
        console.error('Failed to fetch sales data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load sales data';
        setError(errorMessage);
        message.error('Failed to load sales data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  // Refresh data function
  const handleRefresh = () => {
    setLoading(true);
    salesService.getStats()
      .then(stats => {
        setSalesStats(prev => ({
          ...prev,
          totalSales: parseFloat(stats.total_revenue) || 0,
          ordersThisMonth: parseInt(stats.total_orders) || 0,
          avgDealSize: parseFloat(stats.average_order_value) || 0,
        }));
        message.success('Data refreshed');
      })
      .catch(() => message.error('Failed to refresh'))
      .finally(() => setLoading(false));
  };

  // Export sales data to CSV
  const handleExport = () => {
    try {
      // Determine what to export based on active tab
      let csvContent = '';
      let filename = '';
      const now = new Date().toISOString().split('T')[0];

      if (activeTab === 'dashboard' || activeTab === 'orders') {
        // Export Orders
        csvContent = 'Order ID,Customer,Amount,Date,Status,Items\n';
        recentOrders.forEach(order => {
          csvContent += `"${order.id}","${order.customer}",${order.amount},"${order.date}","${order.status}",${order.items}\n`;
        });
        filename = `sales-orders-${now}.csv`;
      } else if (activeTab === 'customers') {
        // Export Customers
        csvContent = 'Name,Revenue,Orders,Segment,Email,Phone\n';
        topCustomers.forEach(customer => {
          csvContent += `"${customer.name}",${customer.revenue},${customer.orders},"${customer.segment}","${customer.email || ''}","${customer.phone || ''}"\n`;
        });
        filename = `customers-${now}.csv`;
      } else if (activeTab === 'quotes') {
        // Export Quotes
        csvContent = 'Quote ID,Customer,Amount,Valid Until,Status\n';
        recentQuotes.forEach(quote => {
          csvContent += `"${quote.id}","${quote.customer}",${quote.amount},"${quote.validUntil}","${quote.status}"\n`;
        });
        filename = `quotes-${now}.csv`;
      } else if (activeTab === 'pipeline') {
        // Export Pipeline
        csvContent = 'Stage,Count,Value\n';
        pipelineStages.forEach(stage => {
          csvContent += `"${stage.stage}",${stage.count},${stage.value}\n`;
        });
        filename = `sales-pipeline-${now}.csv`;
      } else {
        // Default: Export summary
        csvContent = 'Metric,Value\n';
        csvContent += `Total Sales,${salesStats.totalSales}\n`;
        csvContent += `Pipeline Value,${salesStats.pipelineValue}\n`;
        csvContent += `Open Quotes,${salesStats.quotesOpen}\n`;
        csvContent += `Orders This Month,${salesStats.ordersThisMonth}\n`;
        csvContent += `Average Deal Size,${salesStats.avgDealSize}\n`;
        csvContent += `Win Rate,${salesStats.winRate}%\n`;
        filename = `sales-summary-${now}.csv`;
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success(`Exported ${filename} successfully!`);
    } catch (err) {
      console.error('Export failed:', err);
      message.error('Failed to export data');
    }
  };

  // ===== RETAINER SERVICES =====
  const loadRetainers = async () => {
    setLoadingRetainers(true);
    try {
      const res = await workspaceApi.sales.getRetainers();
      setRetainers(res.data || []);
    } catch (err) {
      console.warn('Failed to load retainers:', err);
    } finally {
      setLoadingRetainers(false);
    }
  };

  const handleCreateRetainer = async () => {
    try {
      const values = await retainerForm.validateFields();
      setCreatingRetainer(true);
      await workspaceApi.sales.createRetainer({
        ...values,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD') || null,
      });
      message.success('Retainer created successfully');
      setShowRetainerModal(false);
      retainerForm.resetFields();
      loadRetainers();
    } catch (err: any) {
      if (err?.errorFields) return; // validation error
      message.error(err?.response?.data?.message || 'Failed to create retainer');
    } finally {
      setCreatingRetainer(false);
    }
  };

  const handleGenerateRetainerInvoice = async (retainerId: number, retainerName: string) => {
    Modal.confirm({
      title: 'Generate Invoice',
      content: `Generate a new invoice for retainer "${retainerName}"? This will create an approved invoice and advance the next billing date.`,
      okText: 'Generate Invoice',
      onOk: async () => {
        try {
          const res = await workspaceApi.sales.generateRetainerInvoice(retainerId);
          message.success(res.message || 'Invoice generated successfully');
          loadRetainers();
        } catch (err: any) {
          message.error(err?.response?.data?.message || 'Failed to generate invoice');
        }
      },
    });
  };

  const handleToggleRetainer = async (retainerId: number, action: string) => {
    try {
      await workspaceApi.sales.toggleRetainerStatus(retainerId, action);
      message.success(`Retainer ${action}d successfully`);
      loadRetainers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || `Failed to ${action} retainer`);
    }
  };

  const handleDeleteRetainer = async (retainerId: number) => {
    Modal.confirm({
      title: 'Delete Retainer',
      content: 'Are you sure you want to delete this retainer? This action cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await workspaceApi.sales.deleteRetainer(retainerId);
          message.success('Retainer deleted');
          loadRetainers();
        } catch (err: any) {
          message.error('Failed to delete retainer');
        }
      },
    });
  };

  const formatCurrency = (amount: number) => `R ${amount.toLocaleString('en-ZA')}`;

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      'sent': { color: 'blue', text: 'Sent', icon: <MailOutlined /> },
      'viewed': { color: 'purple', text: 'Viewed' },
      'accepted': { color: 'green', text: 'Accepted', icon: <CheckCircleOutlined /> },
      'expired': { color: 'red', text: 'Expired' },
      'processing': { color: 'blue', text: 'Processing', icon: <SyncOutlined spin /> },
      'shipped': { color: 'cyan', text: 'Shipped' },
      'delivered': { color: 'green', text: 'Delivered', icon: <CheckCircleOutlined /> },
      'invoiced': { color: 'purple', text: 'Invoiced' },
    };
    const config = configs[status] || { color: 'default', text: status };
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const loadQuotes = async () => {
    try {
      const response: any = await workspaceApi.sales.getQuotations({ limit: 10 });
      const list = response?.data || response?.quotations || response?.quotes || [];
      const mapped = Array.isArray(list)
        ? list.map((item: any) => ({
            id: item.quotation_number || item.quote_number || item.id || item.reference || 'QUOTE',
            customer: item.customer_name || item.customer || item.client_name || 'Customer',
            amount: Number(item.total_amount ?? item.amount ?? 0),
            validUntil: item.valid_until || item.expiry_date || item.valid_till || '—',
            status: (item.status || 'draft').toLowerCase(),
            daysLeft: item.valid_until ? 0 : 0,
          }))
        : [];
      setRecentQuotes(mapped);
    } catch (err) {
      console.warn('Failed to load quotes', err);
      message.warning('Unable to load quotes');
    }
  };

  const loadOrders = async () => {
    try {
      const response: any = await workspaceApi.sales.getOrders({ limit: 10 });
      const list = response?.data || response?.orders || [];
      const mapped = Array.isArray(list)
        ? list.map((order: any) => ({
            id: order.order_number || order.order_id || order.id || 'ORDER',
            customer: order.customer_name || order.customer || 'Customer',
            amount: Number(order.total_amount ?? order.total ?? 0),
            date: order.order_date || order.created_at || '',
            status: (order.order_status || order.status || 'pending').toLowerCase(),
            items: order.items_count || (Array.isArray(order.items) ? order.items.length : 1),
          }))
        : [];
      setRecentOrders(mapped);
    } catch (err) {
      console.warn('Failed to load orders', err);
      message.warning('Unable to load orders');
    }
  };

  const loadCustomers = async () => {
    try {
      const response: any = await workspaceApi.sales.getCustomers({ limit: 100 });
      const list = response?.data || response?.customers || [];
      const mapped = Array.isArray(list)
        ? list.map((customer: any) => {
            const displayName = customer.company_name || customer.customer_name || customer.name || 'Unnamed';
            return {
              id: customer.customer_id || customer.id,
              name: displayName,
              revenue: Number(customer.total_spent ?? 0),
              orders: customer.total_orders ?? customer.order_count ?? 0,
              segment: customer.customer_type || 'General',
              avatar: displayName.charAt(0),
              email: customer.email,
              phone: customer.phone,
            };
          })
        : [];
      if (mapped.length > 0) {
        setTopCustomers(mapped);
      }
      // Always update allCustomers for dropdowns
      setAllCustomers(mapped.map(c => ({ id: c.id, name: c.name, email: c.email })));
    } catch (err) {
      console.warn('Failed to load customers', err);
      message.warning('Unable to load customers');
    }
  };

  const handleCreateQuote = async (asDraft = true) => {
    try {
      const values = await quoteForm.validateFields();
      setCreatingQuote(true);
      const lineTotal = quoteLines.reduce((sum, l) => sum + (l.qty * l.rate), 0);
      const taxAmount = lineTotal * 0.15;
      await workspaceApi.sales.createQuotation({
        customer_id: values.customer_id,
        valid_until: values.valid_until
          ? (values.valid_until.toDate ? values.valid_until.toDate().toISOString() : values.valid_until.toISOString?.())
          : undefined,
        subtotal: lineTotal,
        tax_amount: taxAmount,
        total_amount: lineTotal + taxAmount,
        notes: values.notes,
        status: asDraft ? 'draft' : 'sent',
        lines: quoteLines.map((line, i) => ({
          line_number: i + 1,
          description: line.description,
          quantity: line.qty,
          unit_of_measure: line.unit,
          unit_price: line.rate,
          discount_percentage: 0,
          tax_rate: 15,
          line_total: line.qty * line.rate * 1.15,
        })),
      });
      message.success(asDraft ? 'Quote saved as draft' : 'Quote created and sent');
      setShowQuoteModal(false);
      quoteForm.resetFields();
      setQuoteLines([]);
      loadQuotes();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create quote');
    } finally {
      setCreatingQuote(false);
    }
  };

  // Add line item to quote
  const addQuoteLine = () => {
    setQuoteLines([...quoteLines, { description: '', qty: 1, rate: 0, unit: 'service' }]);
  };

  const updateQuoteLine = (index: number, field: string, value: any) => {
    const updated = [...quoteLines];
    (updated[index] as any)[field] = value;
    setQuoteLines(updated);
  };

  const removeQuoteLine = (index: number) => {
    setQuoteLines(quoteLines.filter((_, i) => i !== index));
  };

  // Invoice creation
  const handleCreateInvoice = async () => {
    try {
      const values = await invoiceForm.validateFields();
      setCreatingInvoice(true);
      const lineTotal = invoiceLines.reduce((sum, l) => sum + (l.qty * l.rate), 0);
      const taxAmount = lineTotal * 0.15;
      await workspaceApi.sales.createInvoice({
        customer_id: values.customer_id,
        invoice_date: values.invoice_date
          ? (values.invoice_date.toDate ? values.invoice_date.toDate().toISOString() : values.invoice_date.toISOString?.())
          : new Date().toISOString(),
        due_date: values.due_date
          ? (values.due_date.toDate ? values.due_date.toDate().toISOString() : values.due_date.toISOString?.())
          : undefined,
        subtotal: lineTotal,
        tax_amount: taxAmount,
        total_amount: lineTotal + taxAmount,
        notes: values.notes,
        invoice_type: invoiceType,
        status: invoiceType === 'proforma' ? 'proforma' : 'draft',
        lines: invoiceLines.map((line, i) => ({
          line_number: i + 1,
          description: line.description,
          quantity: line.qty,
          unit_of_measure: line.unit,
          unit_price: line.rate,
          discount_percentage: 0,
          tax_rate: 15,
          line_total: line.qty * line.rate * 1.15,
        })),
      });
      message.success(invoiceType === 'proforma' ? 'Pro-forma invoice created' : 'Invoice created');
      setShowInvoiceModal(false);
      invoiceForm.resetFields();
      setInvoiceLines([]);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Add line item to invoice
  const addInvoiceLine = () => {
    setInvoiceLines([...invoiceLines, { description: '', qty: 1, rate: 0, unit: 'service' }]);
  };

  const updateInvoiceLine = (index: number, field: string, value: any) => {
    const updated = [...invoiceLines];
    (updated[index] as any)[field] = value;
    setInvoiceLines(updated);
  };

  const removeInvoiceLine = (index: number) => {
    setInvoiceLines(invoiceLines.filter((_, i) => i !== index));
  };

  // Open customer modal from inside another modal
  const openInlineCustomerCreate = () => {
    setShowCustomerModal(true);
  };

  const handleCreateOrder = async () => {
    try {
      const values = await orderForm.validateFields();
      setCreatingOrder(true);
      await workspaceApi.sales.createOrder({
        customer_id: values.customer_id,
        order_date: values.order_date
          ? (values.order_date.toDate ? values.order_date.toDate().toISOString() : values.order_date.toISOString?.())
          : undefined,
        total_amount: values.total_amount,
        order_status: values.order_status || 'pending',
      });
      message.success('Order created');
      setShowOrderModal(false);
      orderForm.resetFields();
      loadOrders();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create order');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleCreateCustomer = async () => {
    try {
      const values = await customerForm.validateFields();
      setCreatingCustomer(true);
      await workspaceApi.sales.createCustomer({
        company_name: values.customer_name,
        customer_name: values.customer_name,
        email: values.email,
        phone: values.phone,
        customer_type: values.customer_type,
      });
      message.success('Customer added! You can now select them in any form.');
      setShowCustomerModal(false);
      customerForm.resetFields();
      await loadCustomers();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to add customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Deal / Opportunity creation
  const handleCreateDeal = async () => {
    try {
      const values = await dealForm.validateFields();
      setCreatingDeal(true);
      await workspaceApi.sales.createOpportunity({
        opportunity_name: values.deal_name,
        contact_person: values.contact_person,
        email: values.contact_email,
        phone: values.contact_phone,
        customer_id: values.customer_id,
        value: values.deal_value || 0,
        stage: values.stage || 'qualification',
        probability: values.probability || 25,
        expected_close_date: values.expected_close_date
          ? (values.expected_close_date.toDate ? values.expected_close_date.toDate().toISOString().split('T')[0] : values.expected_close_date.toISOString?.().split('T')[0])
          : undefined,
        source: values.source,
        notes: values.description,
      });
      message.success('Deal created! Pipeline updated.');
      setShowDealModal(false);
      dealForm.resetFields();
      // Refresh the dashboard stats to show updated pipeline
      try {
        const workspace = await salesService.getStats();
        setSalesStats(prev => ({
          ...prev,
          pipelineValue: parseFloat(workspace.pipeline_value) || 0,
          totalSales: parseFloat(workspace.total_revenue) || prev.totalSales,
          ordersThisMonth: parseInt(workspace.total_orders) || prev.ordersThisMonth,
        }));
        // Re-merge pipeline
        const stageMapRefresh: Record<string, { display: string }> = {
          lead: { display: 'Lead' },
          qualification: { display: 'Qualified' },
          qualified: { display: 'Qualified' },
          proposal: { display: 'Proposal' },
          negotiation: { display: 'Negotiation' },
          won: { display: 'Won' },
          closed_won: { display: 'Won' },
        };
        const refreshedPipeline: PipelineStage[] = [
          { stage: 'Lead', count: 0, value: 0, color: '#667eea' },
          { stage: 'Qualified', count: 0, value: 0, color: '#06b6d4' },
          { stage: 'Proposal', count: 0, value: 0, color: '#f59e0b' },
          { stage: 'Negotiation', count: 0, value: 0, color: '#ec4899' },
          { stage: 'Won', count: 0, value: 0, color: '#10b981' },
        ];
        if (Array.isArray((workspace as any)?.pipeline)) {
          (workspace as any).pipeline.forEach((apiStage: any) => {
            const key = (apiStage.stage || '').toLowerCase();
            const mapped = stageMapRefresh[key];
            if (mapped) {
              const target = refreshedPipeline.find(s => s.stage === mapped.display);
              if (target) {
                target.count += Number(apiStage.opportunity_count || apiStage.count || 0);
                target.value += Number(apiStage.total_value || 0);
              }
            }
          });
        }
        setPipelineStages(refreshedPipeline);
      } catch { /* ignore refresh failure */ }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create deal');
    } finally {
      setCreatingDeal(false);
    }
  };

  const quoteColumns = [
    {
      title: 'Quote #',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text strong style={{ color: '#667eea' }}>{text}</Text>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntil',
      key: 'validUntil',
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
      render: (_: unknown, record: typeof recentQuotes[0]) => (
        <Space>
          <Button type="link" size="small">View</Button>
          {record.status !== 'accepted' && record.status !== 'expired' && (
            <Button type="link" size="small">Convert to Order</Button>
          )}
        </Space>
      ),
    },
  ];

  const orderColumns = [
    {
      title: 'Order #',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text strong style={{ color: '#10b981' }}>{text}</Text>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
  ];

  const tabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <BarChartOutlined />,
      children: (
        <Row gutter={24}>
          {/* Main Content */}
          <Col span={16}>
            {/* Sales Target Progress */}
            <Card style={{ marginBottom: 24 }}>
              <Row gutter={24} align="middle">
                <Col span={16}>
                  <Text type="secondary">Monthly Sales Target</Text>
                  <Title level={3} style={{ margin: '8px 0' }}>
                    {formatCurrency(salesStats.totalSales)} / {formatCurrency(salesStats.targetAmount)}
                  </Title>
                  <Progress 
                    percent={salesStats.targetProgress} 
                    strokeColor={{ from: '#667eea', to: '#764ba2' }}
                    strokeWidth={12}
                  />
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Days Remaining"
                    value={20}
                    valueStyle={{ color: '#667eea', fontSize: 32 }}
                    suffix="days"
                  />
                </Col>
              </Row>
            </Card>

            {/* Pipeline Stages */}
            <Card
              title="Sales Pipeline"
              style={{ marginBottom: 24 }}
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowDealModal(true)} size="small">
                  New Deal
                </Button>
              }
            >
              {pipelineStages.every(s => s.count === 0) && (
                <Alert
                  message="Your pipeline is empty"
                  description='Click "New Deal" above to add your first opportunity. Deals flow through these stages as they progress.'
                  type="info"
                  showIcon
                  icon={<RiseOutlined />}
                  style={{ marginBottom: 16 }}
                  action={
                    <Button type="primary" size="small" onClick={() => setShowDealModal(true)}>
                      Add First Deal
                    </Button>
                  }
                />
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {pipelineStages.map((stage, idx) => (
                  <div
                    key={stage.stage}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '12px 4px',
                      background: stage.count > 0 ? `${stage.color}08` : '#fafafa',
                      borderRadius: 8,
                      border: stage.count > 0 ? `1px solid ${stage.color}30` : '1px solid #f0f0f0',
                      position: 'relative',
                    }}
                  >
                    {/* Stage progress bar */}
                    <div style={{
                      width: '100%',
                      height: 6,
                      background: `linear-gradient(90deg, ${stage.color}, ${stage.color}80)`,
                      borderRadius: 3,
                      marginBottom: 10,
                      opacity: stage.count > 0 ? 1 : 0.3,
                    }} />
                    {/* Arrow connector */}
                    {idx < pipelineStages.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        right: -8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#d9d9d9',
                        fontSize: 14,
                        zIndex: 1,
                      }}>›</div>
                    )}
                    <Text strong style={{ fontSize: 13, color: stage.count > 0 ? stage.color : '#8c8c8c' }}>
                      {stage.stage}
                    </Text>
                    <div style={{ margin: '6px 0 2px' }}>
                      <Text style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: stage.count > 0 ? stage.color : '#bfbfbf',
                      }}>
                        {stage.count}
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatCurrency(stage.value)}
                    </Text>
                  </div>
                ))}
              </div>
              {pipelineStages.some(s => s.count > 0) && (
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Total Pipeline: <Text strong style={{ color: '#667eea' }}>
                      {formatCurrency(pipelineStages.reduce((sum, s) => sum + s.value, 0))}
                    </Text>
                    {' · '}
                    {pipelineStages.reduce((sum, s) => sum + s.count, 0)} deal(s)
                  </Text>
                </div>
              )}
            </Card>

            {/* Recent Quotes */}
            <Card 
              title="Recent Quotes"
              extra={
                <Space>
                  <Button icon={<PlusOutlined />} onClick={() => setShowQuoteModal(true)}>New Quote</Button>
                  <Button type="link">View All</Button>
                </Space>
              }
            >
              <Table
                dataSource={recentQuotes}
                columns={quoteColumns}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>

          {/* Right Sidebar */}
          <Col span={8}>
            {/* Key Metrics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Win Rate"
                    value={salesStats.winRate}
                    suffix="%"
                    prefix={<TrophyOutlined style={{ color: '#f59e0b' }} />}
                    valueStyle={{ color: '#10b981' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Avg Deal Size"
                    value={salesStats.avgDealSize}
                    prefix="R"
                    valueStyle={{ color: '#667eea' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Top Customers */}
            <Card title="Top Customers" style={{ marginBottom: 24 }}>
              <List
                dataSource={topCustomers.slice(0, 4)}
                renderItem={(customer, idx) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ backgroundColor: ['#667eea', '#10b981', '#f59e0b', '#ec4899'][idx] }}>
                          {customer.avatar}
                        </Avatar>
                      }
                      title={customer.name}
                      description={customer.segment}
                    />
                    <Text strong>{formatCurrency(customer.revenue)}</Text>
                  </List.Item>
                )}
              />
            </Card>

            {/* Quick Actions */}
            <QuickActionsCard
              title="Quick Actions"
              actions={[
                { icon: <RiseOutlined />, label: 'New Deal', onClick: () => setShowDealModal(true) },
                { icon: <FileTextOutlined />, label: 'New Quote', onClick: () => setShowQuoteModal(true) },
                { icon: <DollarOutlined />, label: 'New Invoice', onClick: () => { setInvoiceType('invoice'); setShowInvoiceModal(true); } },
                { icon: <FileTextOutlined />, label: 'Pro-forma', onClick: () => { setInvoiceType('proforma'); setShowInvoiceModal(true); } },
                { icon: <ShoppingCartOutlined />, label: 'New Order', onClick: () => setShowOrderModal(true) },
                { icon: <UserOutlined />, label: 'Add Customer', onClick: () => setShowCustomerModal(true) },
                { icon: <LineChartOutlined />, label: 'Sales Report' },
              ]}
            />
          </Col>
        </Row>
      ),
    },
    {
      key: 'quotes',
      label: 'Quotes',
      icon: <FileTextOutlined />,
      children: (
        <Card 
          title="All Quotations"
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setShowQuoteModal(true)}>New Quote</Button>}
        >
          <Table
            dataSource={recentQuotes}
            columns={quoteColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: <ShoppingCartOutlined />,
      children: (
        <Card 
          title="Sales Orders"
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setShowOrderModal(true)}>New Order</Button>}
        >
          <Table
            dataSource={recentOrders}
            columns={orderColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: 'customers',
      label: 'Customers',
      icon: <TeamOutlined />,
      children: (
        <Card title="Customer Management">
          <List
            dataSource={topCustomers}
            renderItem={customer => (
              <List.Item
                actions={[
                  <Button type="link" key="view">View Profile</Button>,
                  <Button type="link" key="quote">Create Quote</Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar size={48} style={{ backgroundColor: '#667eea' }}>{customer.avatar}</Avatar>}
                  title={<Text strong>{customer.name}</Text>}
                  description={
                    <Space>
                      <Tag>{customer.segment}</Tag>
                      <Text type="secondary">{customer.orders} orders</Text>
                    </Space>
                  }
                />
                <Statistic value={customer.revenue} prefix="R" valueStyle={{ fontSize: 16 }} />
              </List.Item>
            )}
          />
        </Card>
      ),
    },
    {
      key: 'retainers',
      label: 'Retainers',
      icon: <CalendarOutlined />,
      children: (
        <Card
          title="Retainer Services"
          extra={
            <Space>
              <Button onClick={loadRetainers} icon={<SyncOutlined />} loading={loadingRetainers}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowRetainerModal(true)}>New Retainer</Button>
            </Space>
          }
        >
          {retainers.length === 0 && !loadingRetainers ? (
            <Empty
              description="No retainers yet. Create a retainer to set up recurring billing for your clients."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowRetainerModal(true)}>
                Create First Retainer
              </Button>
            </Empty>
          ) : (
            <Table
              dataSource={retainers}
              loading={loadingRetainers}
              rowKey="id"
              columns={[
                {
                  title: 'Client',
                  dataIndex: 'customer_name',
                  key: 'customer_name',
                  render: (text: string) => <Text strong>{text || 'Unknown'}</Text>,
                },
                {
                  title: 'Service',
                  dataIndex: 'retainer_name',
                  key: 'retainer_name',
                },
                {
                  title: 'Amount',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: (v: number) => formatCurrency(Number(v) || 0),
                },
                {
                  title: 'Frequency',
                  dataIndex: 'billing_frequency',
                  key: 'billing_frequency',
                  render: (v: string) => <Tag color="blue">{(v || 'monthly').charAt(0).toUpperCase() + (v || 'monthly').slice(1)}</Tag>,
                },
                {
                  title: 'Hours',
                  key: 'hours',
                  render: (_: any, record: any) => (
                    record.hours_included > 0 ? (
                      <Tooltip title={`${record.hours_used || 0}h used of ${record.hours_included}h`}>
                        <Progress
                          percent={Math.round(((record.hours_used || 0) / record.hours_included) * 100)}
                          size="small"
                          strokeColor={((record.hours_used || 0) / record.hours_included) > 0.8 ? '#ff4d4f' : '#667eea'}
                        />
                      </Tooltip>
                    ) : <Text type="secondary">N/A</Text>
                  ),
                },
                {
                  title: 'Next Invoice',
                  dataIndex: 'next_invoice_date',
                  key: 'next_invoice_date',
                  render: (v: string) => v ? new Date(v).toLocaleDateString('en-ZA') : '-',
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (v: string) => {
                    const colors: Record<string, string> = {
                      active: 'green', paused: 'orange', cancelled: 'red',
                      expired: 'default', draft: 'blue'
                    };
                    return <Tag color={colors[v] || 'default'}>{(v || 'active').toUpperCase()}</Tag>;
                  },
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_: any, record: any) => (
                    <Space>
                      {record.status === 'active' && (
                        <>
                          <Tooltip title="Generate Invoice">
                            <Button type="link" size="small" icon={<DollarOutlined />}
                              onClick={() => handleGenerateRetainerInvoice(record.id, record.retainer_name)} />
                          </Tooltip>
                          <Tooltip title="Pause">
                            <Button type="link" size="small" icon={<ClockCircleOutlined />}
                              onClick={() => handleToggleRetainer(record.id, 'pause')} />
                          </Tooltip>
                        </>
                      )}
                      {record.status === 'paused' && (
                        <Tooltip title="Resume">
                          <Button type="link" size="small" icon={<CheckCircleOutlined />}
                            onClick={() => handleToggleRetainer(record.id, 'resume')} />
                        </Tooltip>
                      )}
                      {['active', 'paused'].includes(record.status) && (
                        <Tooltip title="Cancel">
                          <Button type="link" size="small" danger icon={<ExclamationCircleOutlined />}
                            onClick={() => handleToggleRetainer(record.id, 'cancel')} />
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <Button type="link" size="small" danger
                          onClick={() => handleDeleteRetainer(record.id)}>Del</Button>
                      </Tooltip>
                    </Space>
                  ),
                },
              ]}
              pagination={{ pageSize: 10 }}
            />
          )}
        </Card>
      ),
    },
    {
      key: 'team',
      label: 'Sales Team',
      icon: <TrophyOutlined />,
      children: (
        <Card title="Team Performance">
          <Table
            dataSource={salesTeam}
            columns={[
              { 
                title: 'Name', 
                dataIndex: 'name', 
                key: 'name',
                render: (text: string) => (
                  <Space>
                    <Avatar style={{ backgroundColor: '#667eea' }}>{text.charAt(0)}</Avatar>
                    <Text strong>{text}</Text>
                  </Space>
                ),
              },
              { 
                title: 'Target', 
                dataIndex: 'target', 
                key: 'target',
                render: (v: number) => formatCurrency(v),
              },
              { 
                title: 'Achieved', 
                dataIndex: 'achieved', 
                key: 'achieved',
                render: (v: number) => <Text strong style={{ color: '#10b981' }}>{formatCurrency(v)}</Text>,
              },
              { 
                title: 'Progress', 
                key: 'progress',
                render: (_: unknown, record: typeof salesTeam[0]) => (
                  <Progress 
                    percent={Math.round((record.achieved / record.target) * 100)} 
                    strokeColor="#667eea"
                    size="small"
                  />
                ),
              },
              { 
                title: 'Deals', 
                dataIndex: 'deals', 
                key: 'deals',
              },
              { 
                title: 'Win Rate', 
                dataIndex: 'winRate', 
                key: 'winRate',
                render: (v: number) => <Tag color={v >= 70 ? 'green' : v >= 60 ? 'orange' : 'red'}>{v}%</Tag>,
              },
            ]}
            rowKey="name"
            pagination={false}
          />
        </Card>
      ),
    },
    {
      key: 'statements',
      label: 'Statements',
      icon: <FileTextOutlined />,
      children: <StatementsPage defaultMode="customers" />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Sales Configuration">
              <Form layout="vertical">
                <Form.Item label="Default Payment Terms">
                  <Select defaultValue="30">
                    <Select.Option value="7">7 Days</Select.Option>
                    <Select.Option value="14">14 Days</Select.Option>
                    <Select.Option value="30">30 Days</Select.Option>
                    <Select.Option value="60">60 Days</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Quote Validity (Days)">
                  <InputNumber defaultValue={30} style={{ width: '100%' }} />
                </Form.Item>
                <Button type="primary">Save Settings</Button>
              </Form>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Commission Structure">
              <Paragraph>Configure sales commission rates and tiers.</Paragraph>
              <Button type="primary" icon={<SettingOutlined />}>Configure Commissions</Button>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  // Show loading state
  if (loading) {
    return (
      <HubLayout>
        <HubHeader
          title="Sales & CRM"
          subtitle="Quotes, Orders & Customer Relationship Management"
          icon={<ShoppingCartOutlined />}
          gradient="cyan"
        />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Spin size="large" tip="Loading sales data..." />
        </div>
      </HubLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <HubLayout>
        <HubHeader
          title="Sales & CRM"
          subtitle="Quotes, Orders & Customer Relationship Management"
          icon={<ShoppingCartOutlined />}
          gradient="cyan"
        />
        <Alert
          message="Failed to Load Data"
          description={error}
          type="error"
          showIcon
          style={{ margin: 24 }}
          action={
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <HubHeader
        title="Sales & CRM"
        subtitle="Quotes, Orders & Customer Relationship Management"
        icon={<ShoppingCartOutlined />}
        gradient="cyan"
        actions={
          <>
            <Button icon={<SyncOutlined />} onClick={handleRefresh} loading={loading}>Refresh</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
            <Button icon={<RiseOutlined />} onClick={() => setShowDealModal(true)}>
              New Deal
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => setShowQuoteModal(true)}>
              New Quote
            </Button>
            <Button type="primary" icon={<DollarOutlined />} onClick={() => { setInvoiceType('invoice'); setShowInvoiceModal(true); }}>
              New Invoice
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="cyan"
        icon={<LineChartOutlined />}
        title="Sales Performance"
        subtitle="December 2025"
        stats={[
          { title: 'Total Sales', value: salesStats.totalSales, prefix: 'R', span: 4 },
          { title: 'Pipeline Value', value: salesStats.pipelineValue, prefix: 'R', span: 4 },
          { title: 'Open Quotes', value: salesStats.quotesOpen, span: 3 },
          { title: 'Orders This Month', value: salesStats.ordersThisMonth, span: 4 },
          { title: 'Win Rate', value: `${salesStats.winRate}%`, valueStyle: { color: '#86efac' }, span: 3 },
        ]}
      />

      <HubTabs 
        theme="cyan"
        tabs={tabs}
        activeKey={activeTab}
        onChange={(key: string) => {
          setActiveTab(key);
          if (key === 'retainers' && retainers.length === 0) loadRetainers();
        }}
      />

      {/* New Quote Modal */}
      <Modal
        title="Create New Quote"
        open={showQuoteModal}
        onCancel={() => { setShowQuoteModal(false); setQuoteLines([]); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowQuoteModal(false); setQuoteLines([]); }}>Cancel</Button>,
          <Button key="draft" onClick={() => handleCreateQuote(true)} loading={creatingQuote}>Save as Draft</Button>,
          <Button key="send" type="primary" onClick={() => handleCreateQuote(false)} loading={creatingQuote}>
            Send Quote
          </Button>
        ]}
        width={800}
      >
        <Form layout="vertical" form={quoteForm}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Customer"
                name="customer_id"
                rules={[{ required: true, message: 'Select a customer' }]}
              >
                <Select
                  placeholder="Search or select customer..."
                  showSearch
                  optionFilterProp="children"
                  notFoundContent={
                    <Button type="link" icon={<PlusOutlined />} onClick={openInlineCustomerCreate} style={{ width: '100%' }}>
                      No customers found — Create one
                    </Button>
                  }
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={openInlineCustomerCreate}
                        style={{ width: '100%', textAlign: 'left', color: '#10b981', fontWeight: 600 }}
                      >
                        ➕ Create New Customer
                      </Button>
                    </>
                  )}
                >
                  {allCustomers.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Valid Until"
                name="valid_until"
                rules={[{ required: true, message: 'Select validity date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Notes / Terms" name="notes">
                <Input.TextArea rows={2} placeholder="Payment terms, notes, special conditions..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Items / Services</Divider>

          {quoteLines.map((line, idx) => (
            <Row gutter={8} key={idx} align="middle" style={{ marginBottom: 8 }}>
              <Col span={9}>
                <Input
                  placeholder="Description (e.g. Web Development)"
                  value={line.description}
                  onChange={e => updateQuoteLine(idx, 'description', e.target.value)}
                />
              </Col>
              <Col span={3}>
                <InputNumber
                  placeholder="Qty"
                  min={0.01}
                  step={0.5}
                  value={line.qty}
                  onChange={v => updateQuoteLine(idx, 'qty', v || 1)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={3}>
                <Select value={line.unit} onChange={v => updateQuoteLine(idx, 'unit', v)} style={{ width: '100%' }}>
                  <Select.Option value="service">Service</Select.Option>
                  <Select.Option value="hrs">Hours</Select.Option>
                  <Select.Option value="days">Days</Select.Option>
                  <Select.Option value="EA">Each</Select.Option>
                  <Select.Option value="month">Monthly</Select.Option>
                  <Select.Option value="fixed">Fixed</Select.Option>
                </Select>
              </Col>
              <Col span={4}>
                <InputNumber
                  placeholder="Rate (R)"
                  prefix="R"
                  min={0}
                  step={100}
                  value={line.rate}
                  onChange={v => updateQuoteLine(idx, 'rate', v || 0)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={3}>
                <Text strong style={{ color: '#10b981' }}>
                  R {((line.qty || 0) * (line.rate || 0)).toLocaleString('en-ZA')}
                </Text>
              </Col>
              <Col span={2}>
                <Button type="text" danger size="small" onClick={() => removeQuoteLine(idx)}>✕</Button>
              </Col>
            </Row>
          ))}

          <Button type="dashed" icon={<PlusOutlined />} onClick={addQuoteLine} style={{ width: '100%', marginTop: 4 }}>
            + Add Item / Service
          </Button>

          {quoteLines.length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 16, padding: '12px 16px', background: '#f6ffed', borderRadius: 8 }}>
              <Text>Subtotal: <Text strong>R {quoteLines.reduce((s, l) => s + l.qty * l.rate, 0).toLocaleString('en-ZA')}</Text></Text>
              <br />
              <Text>VAT (15%): <Text strong>R {(quoteLines.reduce((s, l) => s + l.qty * l.rate, 0) * 0.15).toLocaleString('en-ZA')}</Text></Text>
              <br />
              <Text style={{ fontSize: 16 }}>Total: <Text strong style={{ color: '#10b981', fontSize: 18 }}>R {(quoteLines.reduce((s, l) => s + l.qty * l.rate, 0) * 1.15).toLocaleString('en-ZA')}</Text></Text>
            </div>
          )}
        </Form>
      </Modal>

      {/* New Order Modal */}
      <Modal
        title="Create New Order"
        open={showOrderModal}
        onCancel={() => setShowOrderModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowOrderModal(false)}>Cancel</Button>,
          <Button key="create" type="primary" onClick={handleCreateOrder} loading={creatingOrder}>
            Create Order
          </Button>
        ]}
        width={700}
      >
        <Form layout="vertical" form={orderForm} initialValues={{ total_amount: 0, order_status: 'pending' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Customer"
                name="customer_id"
                rules={[{ required: true, message: 'Select a customer' }]}
              >
                <Select
                  placeholder="Search or select customer..."
                  showSearch
                  optionFilterProp="children"
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button type="text" icon={<PlusOutlined />} onClick={openInlineCustomerCreate}
                        style={{ width: '100%', textAlign: 'left', color: '#10b981', fontWeight: 600 }}>
                        ➕ Create New Customer
                      </Button>
                    </>
                  )}
                >
                  {allCustomers.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Order Date"
                name="order_date"
                rules={[{ required: true, message: 'Select order date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Total Amount"
                name="total_amount"
                rules={[{ required: true, message: 'Enter total amount' }]}
              >
                <InputNumber style={{ width: '100%' }} prefix="R" min={0} step={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Status" name="order_status">
                <Select>
                  <Select.Option value="pending">Pending</Select.Option>
                  <Select.Option value="processing">Processing</Select.Option>
                  <Select.Option value="shipped">Shipped</Select.Option>
                  <Select.Option value="delivered">Delivered</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        title="Add Customer"
        open={showCustomerModal}
        onCancel={() => setShowCustomerModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowCustomerModal(false)}>Cancel</Button>,
          <Button key="create" type="primary" onClick={handleCreateCustomer} loading={creatingCustomer}>
            Save Customer
          </Button>
        ]}
        width={600}
      >
        <Form layout="vertical" form={customerForm}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Customer Name"
                name="customer_name"
                rules={[{ required: true, message: 'Enter customer name' }]}
              >
                <Input placeholder="ABC Trading" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Type" name="customer_type" initialValue="Business">
                <Select>
                  <Select.Option value="Business">Business</Select.Option>
                  <Select.Option value="Individual">Individual</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Enter valid email' }]}> 
                <Input placeholder="customer@email.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="(+27)" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* New Deal / Opportunity Modal */}
      <Modal
        title="🚀 New Deal / Opportunity"
        open={showDealModal}
        onCancel={() => setShowDealModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowDealModal(false)}>Cancel</Button>,
          <Button key="create" type="primary" onClick={handleCreateDeal} loading={creatingDeal}
            icon={<RiseOutlined />}
          >
            Create Deal
          </Button>
        ]}
        width={700}
      >
        <Alert
          message="Deals populate your Sales Pipeline"
          description="Each deal appears in the pipeline at its current stage. As deals progress through Qualification → Proposal → Negotiation → Won, your pipeline value updates automatically."
          type="info"
          showIcon
          icon={<RiseOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Form layout="vertical" form={dealForm} initialValues={{ stage: 'qualification', probability: 25, deal_value: 0 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="Deal Name"
                name="deal_name"
                rules={[{ required: true, message: 'Give this deal a name' }]}
              >
                <Input placeholder="e.g. Acme Corp - ERP Implementation" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Deal Value (R)"
                name="deal_value"
                rules={[{ required: true, message: 'Enter deal value' }]}
              >
                <InputNumber style={{ width: '100%' }} prefix="R" min={0} step={1000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => v?.replace(/,/g, '') as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Contact Person"
                name="contact_person"
                rules={[{ required: true, message: 'Enter the contact person name' }]}
              >
                <Input placeholder="e.g. John Smith" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="contact_email"
                rules={[
                  { required: true, message: 'Email is required for customer creation' },
                  { type: 'email', message: 'Enter a valid email address' }
                ]}
              >
                <Input placeholder="contact@company.co.za" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Phone" name="contact_phone">
                <Input placeholder="+27..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Customer"
                name="customer_id"
              >
                <Select
                  placeholder="Link to existing (optional)"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button type="text" icon={<PlusOutlined />} onClick={openInlineCustomerCreate}
                        style={{ width: '100%', textAlign: 'left', color: '#10b981', fontWeight: 600 }}>
                        ➕ Create New Customer
                      </Button>
                    </>
                  )}
                >
                  {allCustomers.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Pipeline Stage"
                name="stage"
                rules={[{ required: true, message: 'Select a stage' }]}
              >
                <Select>
                  <Select.Option value="qualification">
                    <Space><Badge color="#06b6d4" />Qualification</Space>
                  </Select.Option>
                  <Select.Option value="proposal">
                    <Space><Badge color="#f59e0b" />Proposal</Space>
                  </Select.Option>
                  <Select.Option value="negotiation">
                    <Space><Badge color="#ec4899" />Negotiation</Space>
                  </Select.Option>
                  <Select.Option value="closed_won">
                    <Space><Badge color="#10b981" />Won (Closed)</Space>
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Probability (%)" name="probability">
                <InputNumber style={{ width: '100%' }} min={0} max={100} suffix="%" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Expected Close Date" name="expected_close_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Source" name="source">
                <Select placeholder="How did this come in?" allowClear>
                  <Select.Option value="Website">Website</Select.Option>
                  <Select.Option value="Referral">Referral</Select.Option>
                  <Select.Option value="Cold Call">Cold Call</Select.Option>
                  <Select.Option value="Event">Event / Conference</Select.Option>
                  <Select.Option value="LinkedIn">LinkedIn</Select.Option>
                  <Select.Option value="Existing Client">Existing Client</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Description / Notes" name="description">
            <Input.TextArea rows={3} placeholder="Describe the opportunity, key contacts, requirements..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Invoice / Pro-forma Modal */}
      <Modal
        title={invoiceType === 'proforma' ? '📋 Create Pro-forma Invoice' : '📄 Create Invoice'}
        open={showInvoiceModal}
        onCancel={() => { setShowInvoiceModal(false); setInvoiceLines([]); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowInvoiceModal(false); setInvoiceLines([]); }}>Cancel</Button>,
          <Button key="create" type="primary" onClick={handleCreateInvoice} loading={creatingInvoice}>
            {invoiceType === 'proforma' ? 'Create Pro-forma' : 'Create Invoice'}
          </Button>
        ]}
        width={800}
      >
        <Alert
          message={invoiceType === 'proforma'
            ? 'Pro-forma invoices are not official tax invoices. They serve as preliminary quotes or commitments.'
            : 'This will create an official tax invoice.'}
          type={invoiceType === 'proforma' ? 'info' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type={invoiceType === 'invoice' ? 'primary' : 'default'}
              onClick={() => setInvoiceType('invoice')}
              icon={<DollarOutlined />}
            >
              Tax Invoice
            </Button>
            <Button
              type={invoiceType === 'proforma' ? 'primary' : 'default'}
              onClick={() => setInvoiceType('proforma')}
              icon={<FileTextOutlined />}
            >
              Pro-forma Invoice
            </Button>
          </Space>
        </div>

        <Form layout="vertical" form={invoiceForm}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Customer"
                name="customer_id"
                rules={[{ required: true, message: 'Select a customer' }]}
              >
                <Select
                  placeholder="Search customer..."
                  showSearch
                  optionFilterProp="children"
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button type="text" icon={<PlusOutlined />} onClick={openInlineCustomerCreate}
                        style={{ width: '100%', textAlign: 'left', color: '#10b981', fontWeight: 600 }}>
                        ➕ Create New Customer
                      </Button>
                    </>
                  )}
                >
                  {allCustomers.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Invoice Date" name="invoice_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Due Date" name="due_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={2} placeholder="Payment terms, bank details, notes..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Items / Services</Divider>

          {invoiceLines.map((line, idx) => (
            <Row gutter={8} key={idx} align="middle" style={{ marginBottom: 8 }}>
              <Col span={9}>
                <Input
                  placeholder="Description"
                  value={line.description}
                  onChange={e => updateInvoiceLine(idx, 'description', e.target.value)}
                />
              </Col>
              <Col span={3}>
                <InputNumber
                  placeholder="Qty"
                  min={0.01}
                  step={0.5}
                  value={line.qty}
                  onChange={v => updateInvoiceLine(idx, 'qty', v || 1)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={3}>
                <Select value={line.unit} onChange={v => updateInvoiceLine(idx, 'unit', v)} style={{ width: '100%' }}>
                  <Select.Option value="service">Service</Select.Option>
                  <Select.Option value="hrs">Hours</Select.Option>
                  <Select.Option value="days">Days</Select.Option>
                  <Select.Option value="EA">Each</Select.Option>
                  <Select.Option value="month">Monthly</Select.Option>
                  <Select.Option value="fixed">Fixed</Select.Option>
                </Select>
              </Col>
              <Col span={4}>
                <InputNumber
                  placeholder="Rate"
                  prefix="R"
                  min={0}
                  step={100}
                  value={line.rate}
                  onChange={v => updateInvoiceLine(idx, 'rate', v || 0)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={3}>
                <Text strong style={{ color: '#10b981' }}>
                  R {((line.qty || 0) * (line.rate || 0)).toLocaleString('en-ZA')}
                </Text>
              </Col>
              <Col span={2}>
                <Button type="text" danger size="small" onClick={() => removeInvoiceLine(idx)}>✕</Button>
              </Col>
            </Row>
          ))}

          <Button type="dashed" icon={<PlusOutlined />} onClick={addInvoiceLine} style={{ width: '100%', marginTop: 4 }}>
            + Add Item / Service
          </Button>

          {invoiceLines.length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 16, padding: '12px 16px', background: '#f6ffed', borderRadius: 8 }}>
              <Text>Subtotal: <Text strong>R {invoiceLines.reduce((s, l) => s + l.qty * l.rate, 0).toLocaleString('en-ZA')}</Text></Text>
              <br />
              <Text>VAT (15%): <Text strong>R {(invoiceLines.reduce((s, l) => s + l.qty * l.rate, 0) * 0.15).toLocaleString('en-ZA')}</Text></Text>
              <br />
              <Text style={{ fontSize: 16 }}>Total: <Text strong style={{ color: '#10b981', fontSize: 18 }}>R {(invoiceLines.reduce((s, l) => s + l.qty * l.rate, 0) * 1.15).toLocaleString('en-ZA')}</Text></Text>
            </div>
          )}
        </Form>
      </Modal>

      {/* Retainer Modal */}
      <Modal
        title="Create Retainer Service"
        open={showRetainerModal}
        onCancel={() => { setShowRetainerModal(false); retainerForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowRetainerModal(false); retainerForm.resetFields(); }}>Cancel</Button>,
          <Button key="create" type="primary" loading={creatingRetainer} onClick={handleCreateRetainer}>
            Create Retainer
          </Button>,
        ]}
        width={640}
      >
        <Form form={retainerForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customer_id" label="Client" rules={[{ required: true, message: 'Select a client' }]}>
                <Select placeholder="Select client" showSearch optionFilterProp="children">
                  {allCustomers.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="retainer_name" label="Service Name" rules={[{ required: true, message: 'Enter service name' }]}>
                <Input placeholder="e.g. Monthly IT Support" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="amount" label="Amount (excl. VAT)" rules={[{ required: true, message: 'Enter amount' }]}>
                <InputNumber prefix="R" min={0} step={100} style={{ width: '100%' }} placeholder="5000" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="billing_frequency" label="Billing Frequency" initialValue="monthly">
                <Select>
                  <Select.Option value="monthly">Monthly</Select.Option>
                  <Select.Option value="quarterly">Quarterly</Select.Option>
                  <Select.Option value="bi-annual">Bi-Annual</Select.Option>
                  <Select.Option value="annual">Annual</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="service_type" label="Service Type" initialValue="monthly">
                <Select>
                  <Select.Option value="monthly">Monthly Retainer</Select.Option>
                  <Select.Option value="project">Project-Based</Select.Option>
                  <Select.Option value="hourly">Hourly Retainer</Select.Option>
                  <Select.Option value="custom">Custom</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="start_date" label="Start Date" rules={[{ required: true, message: 'Select start date' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="end_date" label="End Date (Optional)">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hours_included" label="Hours Included" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0 = unlimited" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Describe the retainer service..." />
          </Form.Item>
          <Form.Item name="auto_invoice" label="Auto-Generate Invoices" valuePropName="checked" initialValue={true}>
            <Select defaultValue={true}>
              <Select.Option value={true}>Yes - Auto-generate invoices</Select.Option>
              <Select.Option value={false}>No - Manual invoicing</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </HubLayout>
  );
};

export default SalesHub;
