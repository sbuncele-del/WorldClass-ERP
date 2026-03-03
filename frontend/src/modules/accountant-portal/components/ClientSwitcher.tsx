import React, { useState, useEffect, useMemo } from 'react';
import {
  Space,
  Button,
  Select,
  Tag,
  Typography,
  Divider,
  message,
  Dropdown,
} from 'antd';
import {
  SwapOutlined,
  BankOutlined,
  ArrowRightOutlined,
  LogoutOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Text } = Typography;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ClientContext {
  clientTenantId: string;
  clientName: string;
  firmTenantId: string;
}

interface ClientListItem {
  tenant_id: string;
  company_name: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ClientSwitcher: React.FC = () => {
  const [clientContext, setClientContext] = useState<ClientContext | null>(null);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [switching, setSwitching] = useState(false);

  // Check if we're in a client context
  useEffect(() => {
    const stored = localStorage.getItem('accountantClientContext');
    if (stored) {
      try {
        setClientContext(JSON.parse(stored));
      } catch {
        setClientContext(null);
      }
    }
  }, []);

  // Load client list for quick switching
  useEffect(() => {
    if (!clientContext) return;
    (async () => {
      try {
        // Use the firm token to fetch client list
        const firmToken = localStorage.getItem('firmToken');
        if (!firmToken) return;
        const res = await fetch('/api/v2/accountant-portal/clients', {
          headers: {
            'Authorization': `Bearer ${firmToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const json = await res.json();
          setClients((json.data || []).filter((c: ClientListItem) => c.tenant_id !== clientContext.clientTenantId));
        }
      } catch (err) {
        console.error('Failed to load client list for switcher:', err);
      }
    })();
  }, [clientContext]);

  /* ---------- switch back ---------- */
  const handleSwitchBack = () => {
    const firmToken = localStorage.getItem('firmToken');
    if (firmToken) {
      localStorage.setItem('token', firmToken);
      localStorage.removeItem('firmToken');
      localStorage.removeItem('accountantClientContext');
      window.location.href = '/app/accountant-portal';
    }
  };

  /* ---------- quick switch ---------- */
  const handleQuickSwitch = async (clientTenantId: string) => {
    setSwitching(true);
    try {
      // First switch back to firm context
      const firmToken = localStorage.getItem('firmToken');
      if (!firmToken) {
        message.error('No firm token found');
        return;
      }

      // Use the firm's token to switch to the new client
      const res = await fetch(`/api/v2/accountant-portal/switch/${clientTenantId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firmToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success) {
        // Keep firmToken as-is (already stored)
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem(
          'accountantClientContext',
          JSON.stringify({
            clientTenantId,
            clientName: data.data.tenant?.name,
            firmTenantId: data.data.firmTenantId,
          }),
        );
        window.location.href = '/app';
      } else {
        message.error(data.message || 'Failed to switch client');
      }
    } catch {
      message.error('Failed to switch to client');
    } finally {
      setSwitching(false);
    }
  };

  // Don't render anything if not in client context
  if (!clientContext) return null;

  const firmName = 'Your Firm'; // Could be stored in context or fetched
  const clientName = clientContext.clientName || 'Client';

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'header',
      label: <Text strong style={{ fontSize: 12 }}>Switch to another client</Text>,
      disabled: true,
    },
    { type: 'divider' },
    ...clients.slice(0, 10).map((c) => ({
      key: c.tenant_id,
      label: c.company_name,
      icon: <BankOutlined />,
      onClick: () => handleQuickSwitch(c.tenant_id),
    })),
    ...(clients.length === 0
      ? [{ key: 'empty', label: <Text type="secondary">No other clients</Text>, disabled: true }]
      : []),
    { type: 'divider' as const },
    {
      key: 'back',
      label: 'Return to Firm Portal',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleSwitchBack,
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)',
        border: '1px solid #91d5ff',
        borderRadius: 6,
        padding: '6px 16px',
        gap: 12,
      }}
    >
      <Tag color="blue" icon={<SwapOutlined />} style={{ margin: 0 }}>
        Client View
      </Tag>

      <Text style={{ fontSize: 13 }}>
        Working as: <Text strong>{firmName}</Text>
        <ArrowRightOutlined style={{ margin: '0 6px', fontSize: 10, color: '#1890ff' }} />
        <Text strong style={{ color: '#1890ff' }}>{clientName}</Text>
      </Text>

      <Divider type="vertical" style={{ height: 24, margin: '0 4px' }} />

      <Dropdown menu={{ items: dropdownItems }} trigger={['click']} disabled={switching}>
        <Button size="small" icon={<SwapOutlined />} loading={switching}>
          Switch <DownOutlined />
        </Button>
      </Dropdown>

      <Button
        size="small"
        type="primary"
        danger
        icon={<LogoutOutlined />}
        onClick={handleSwitchBack}
      >
        Switch Back
      </Button>
    </div>
  );
};

export default ClientSwitcher;
