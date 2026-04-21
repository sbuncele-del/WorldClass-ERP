/**
 * AccountantEntitySwitcher
 *
 * Always-visible entity/client switcher for accountant users.
 * Renders as a compact inline button inside the top bar.
 *
 * Behaviour:
 *  - Firm context (default): shows firm name, dropdown lists all clients
 *  - Client context: shows current client name with a "Return to Firm" option
 *    and the full client list for quick switching
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dropdown, Spin, Typography, Avatar, Tag, Divider, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  BankOutlined,
  SwapOutlined,
  CheckOutlined,
  ArrowLeftOutlined,
  DownOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientContext {
  clientTenantId: string;
  clientName: string;
  firmTenantId: string;
}

interface FirmInfo {
  id: string;
  firm_name: string;
}

interface ClientItem {
  tenant_id: string;
  company_name: string;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authHeaders = (token?: string | null) => ({
  Authorization: `Bearer ${token ?? localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// ─── Component ────────────────────────────────────────────────────────────────

const ClientSwitcher: React.FC = () => {
  const [firm, setFirm]                 = useState<FirmInfo | null>(null);
  const [clients, setClients]           = useState<ClientItem[]>([]);
  const [clientCtx, setClientCtx]       = useState<ClientContext | null>(null);
  const [loading, setLoading]           = useState(true);
  const [switching, setSwitching]       = useState(false);
  const [open, setOpen]                 = useState(false);

  // ── Load firm info and client list ──────────────────────────────────────────

  const loadFirmAndClients = useCallback(async () => {
    // Determine which token to use for the firm API call
    const firmToken = localStorage.getItem('firmToken') ?? localStorage.getItem('token');

    try {
      const firmRes = await fetch('/api/v2/accountant-portal/firm', {
        headers: authHeaders(firmToken),
      });
      if (!firmRes.ok) {
        // Not an accountant user — hide switcher
        setLoading(false);
        return;
      }
      const firmJson = await firmRes.json();
      setFirm(firmJson.data ?? null);

      // Load client list
      const clientRes = await fetch('/api/v2/accountant-portal/clients?limit=100', {
        headers: authHeaders(firmToken),
      });
      if (clientRes.ok) {
        const clientJson = await clientRes.json();
        const list: ClientItem[] = clientJson.data?.clients ?? clientJson.data ?? [];
        setClients(list.filter((c: ClientItem) => c.status === 'active'));
      }
    } catch {
      // Silently ignore — not an accountant user
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Read client context from localStorage
    const stored = localStorage.getItem('accountantClientContext');
    if (stored) {
      try { setClientCtx(JSON.parse(stored)); } catch { /* ignore */ }
    }
    loadFirmAndClients();
  }, [loadFirmAndClients]);

  // ── Switch to a client ──────────────────────────────────────────────────────

  const handleSwitchToClient = async (clientTenantId: string, clientName: string) => {
    if (switching) return;
    setSwitching(true);
    setOpen(false);
    try {
      const firmToken = localStorage.getItem('firmToken') ?? localStorage.getItem('token');
      const res = await fetch(`/api/v2/accountant-portal/switch/${clientTenantId}`, {
        method: 'POST',
        headers: authHeaders(firmToken),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message ?? 'Switch failed');

      // Store firm token for switching back, set client-scoped token as active
      if (!localStorage.getItem('firmToken')) {
        localStorage.setItem('firmToken', localStorage.getItem('token') ?? '');
      }
      localStorage.setItem('token', data.data.accessToken);
      localStorage.setItem(
        'accountantClientContext',
        JSON.stringify({
          clientTenantId,
          clientName: data.data.tenant?.name ?? clientName,
          firmTenantId: data.data.firmTenantId,
        }),
      );
      window.location.href = '/app';
    } catch (err: any) {
      message.error(err.message ?? 'Failed to switch to client');
      setSwitching(false);
    }
  };

  // ── Switch back to firm ─────────────────────────────────────────────────────

  const handleSwitchToFirm = () => {
    const firmToken = localStorage.getItem('firmToken');
    if (firmToken) {
      localStorage.setItem('token', firmToken);
      localStorage.removeItem('firmToken');
    }
    localStorage.removeItem('accountantClientContext');
    window.location.href = '/app';
  };

  // ── Don't render if not an accountant firm user ─────────────────────────────

  if (loading) return <Spin size="small" style={{ marginRight: 8 }} />;
  if (!firm) return null;

  // ── Build dropdown items ─────────────────────────────────────────────────────

  const isInClient = !!clientCtx;
  const currentLabel = isInClient ? clientCtx.clientName : firm.firm_name;

  const dropdownItems: MenuProps['items'] = [
    // Section: Your Firm
    {
      key: 'firm-header',
      label: (
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Your Firm
        </Text>
      ),
      disabled: true,
    },
    {
      key: 'firm',
      icon: isInClient ? <ArrowLeftOutlined /> : <CheckOutlined style={{ color: '#52c41a' }} />,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontWeight: isInClient ? 400 : 600 }}>{firm.firm_name}</span>
          {!isInClient && <Tag color="green" style={{ margin: 0, fontSize: 10 }}>Active</Tag>}
        </div>
      ),
      onClick: isInClient ? handleSwitchToFirm : undefined,
    },
    { type: 'divider' as const },
    // Section: Clients
    {
      key: 'clients-header',
      label: (
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <TeamOutlined style={{ marginRight: 4 }} />
          Your Clients ({clients.length})
        </Text>
      ),
      disabled: true,
    },
    ...(clients.length === 0
      ? [{ key: 'no-clients', label: <Text type="secondary" style={{ fontSize: 12 }}>No active clients yet</Text>, disabled: true }]
      : clients.map(c => ({
          key: c.tenant_id,
          icon: isInClient && c.tenant_id === clientCtx.clientTenantId
            ? <CheckOutlined style={{ color: '#52c41a' }} />
            : <BankOutlined />,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: isInClient && c.tenant_id === clientCtx.clientTenantId ? 600 : 400 }}>
                {c.company_name}
              </span>
              {isInClient && c.tenant_id === clientCtx.clientTenantId && (
                <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Active</Tag>
              )}
            </div>
          ),
          onClick: () => {
            if (isInClient && c.tenant_id === clientCtx.clientTenantId) return;
            handleSwitchToClient(c.tenant_id, c.company_name);
          },
        }))
    ),
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dropdown
      menu={{ items: dropdownItems, style: { minWidth: 260 } }}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      disabled={switching}
      placement="bottomLeft"
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: 8,
          border: isInClient ? '1px solid #91d5ff' : '1px solid #d9d9d9',
          background: isInClient
            ? 'linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)'
            : '#fafafa',
          transition: 'all 0.2s',
          userSelect: 'none',
          maxWidth: 220,
        }}
      >
        <Avatar
          size={22}
          style={{
            background: isInClient ? '#1890ff' : '#667eea',
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {isInClient ? <UserOutlined /> : <BankOutlined />}
        </Avatar>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {isInClient && (
            <span style={{ fontSize: 10, color: '#8c8c8c', lineHeight: 1.2 }}>Client view</span>
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isInClient ? '#1890ff' : '#1e293b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}
          >
            {switching ? 'Switching…' : currentLabel}
          </span>
        </div>
        <DownOutlined style={{ fontSize: 10, color: '#8c8c8c', flexShrink: 0 }} />
      </div>
    </Dropdown>
  );
};

export default ClientSwitcher;

