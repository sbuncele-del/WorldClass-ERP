import React, { useState } from 'react';
import { Dropdown, Button, Space, Typography, Tag, Avatar, Spin } from 'antd';
import {
  BankOutlined,
  ApartmentOutlined,
  CheckOutlined,
  GlobalOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useEntity } from '../contexts/EntityContext';
import './EntitySwitcher.css';

const { Text } = Typography;

const EntitySwitcher: React.FC = () => {
  const { 
    currentEntity, 
    entities, 
    holdingCompany, 
    switchEntity, 
    switchToHolding,
    isInSubsidiary,
    loading,
  } = useEntity();
  
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="entity-switcher-loading">
        <Spin size="small" />
      </div>
    );
  }

  // Only show if there are multiple entities to switch between
  if (!currentEntity || entities.length === 0) {
    return null;
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'holding': return <BankOutlined />;
      case 'subsidiary': return <ApartmentOutlined />;
      case 'branch': return <GlobalOutlined />;
      default: return <BankOutlined />;
    }
  };

  const getEntityColor = (type: string) => {
    switch (type) {
      case 'holding': return '#1890ff';
      case 'subsidiary': return '#52c41a';
      case 'branch': return '#faad14';
      case 'division': return '#722ed1';
      default: return '#1890ff';
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'holding': return 'Holding Company';
      case 'subsidiary': return 'Subsidiary';
      case 'branch': return 'Branch';
      case 'division': return 'Division';
      default: return 'Company';
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'ZA': '🇿🇦', 'GB': '🇬🇧', 'US': '🇺🇸',
      'AU': '🇦🇺', 'SZ': '🇸🇿', 'BW': '🇧🇼',
    };
    return flags[country] || '🌍';
  };

  // Group entities: holding first, then subsidiaries/branches indented
  const holdingEntities = entities.filter(e => e.entity_type === 'holding' || !e.parent_id);
  const childEntities = entities.filter(e => e.entity_type !== 'holding' && e.parent_id);

  const menuItems = [
    // Header label
    {
      key: 'menu-title',
      label: (
        <div style={{ padding: '4px 0 2px' }}>
          <Text type="secondary" style={{ fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Switch Working Company
          </Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' as const },

    // Holding / top-level companies
    ...holdingEntities.map(entity => ({
      key: entity.id,
      label: (
        <div className={`entity-menu-item ${entity.id === currentEntity?.id ? 'active' : ''}`}>
          <Avatar
            size="small"
            style={{ backgroundColor: getEntityColor(entity.entity_type), flexShrink: 0 }}
            icon={getEntityIcon(entity.entity_type)}
          />
          <div className="entity-info">
            <Space size={4}>
              <Text strong={entity.id === currentEntity?.id} style={{ fontSize: '13px' }}>{entity.name}</Text>
              {entity.id === currentEntity?.id && <CheckOutlined style={{ color: '#52c41a', fontSize: '12px' }} />}
            </Space>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {getCountryFlag(entity.country)} {getEntityTypeLabel(entity.entity_type)} · {entity.code}
            </Text>
          </div>
        </div>
      ),
      onClick: () => { switchEntity(entity.id); setOpen(false); },
    })),

    // Child entities (indented under their parent)
    ...childEntities.map(entity => {
      const parent = entities.find(e => e.id === entity.parent_id);
      return {
        key: entity.id,
        label: (
          <div className={`entity-menu-item entity-menu-child ${entity.id === currentEntity?.id ? 'active' : ''}`}>
            <div className="entity-child-indent">
              <RightOutlined style={{ fontSize: '9px', color: '#bbb' }} />
            </div>
            <Avatar
              size="small"
              style={{ backgroundColor: getEntityColor(entity.entity_type), flexShrink: 0 }}
              icon={getEntityIcon(entity.entity_type)}
            />
            <div className="entity-info">
              <Space size={4}>
                <Text strong={entity.id === currentEntity?.id} style={{ fontSize: '13px' }}>{entity.name}</Text>
                {entity.id === currentEntity?.id && <CheckOutlined style={{ color: '#52c41a', fontSize: '12px' }} />}
              </Space>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {getCountryFlag(entity.country)} {getEntityTypeLabel(entity.entity_type)}{parent ? ` of ${parent.name}` : ''} · {entity.code}
              </Text>
            </div>
          </div>
        ),
        onClick: () => { switchEntity(entity.id); setOpen(false); },
      };
    }),
  ];

  // Button label: show breadcrumb if in subsidiary (e.g. "SGBS_Group › Koinage Engineering")
  const buttonLabel = isInSubsidiary && holdingCompany
    ? `${holdingCompany.name} › ${currentEntity.name}`
    : currentEntity.name;

  const buttonSubLabel = isInSubsidiary && holdingCompany
    ? `Working in ${getEntityTypeLabel(currentEntity.entity_type)}`
    : getEntityTypeLabel(currentEntity.entity_type);

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      overlayClassName="entity-switcher-dropdown"
    >
      <Button
        className={`entity-switcher-button ${isInSubsidiary ? 'subsidiary-mode' : ''}`}
        type="default"
      >
        <Space size={8}>
          <Avatar
            size={28}
            style={{ backgroundColor: getEntityColor(currentEntity.entity_type), flexShrink: 0 }}
            icon={getEntityIcon(currentEntity.entity_type)}
          />
          <div className="entity-button-text">
            <Text
              strong
              className="entity-button-name"
            >
              {buttonLabel}
            </Text>
            <Text className="entity-button-sub">
              {buttonSubLabel}
            </Text>
          </div>
          <DownOutlined className="entity-button-caret" />
        </Space>
      </Button>
    </Dropdown>
  );
};

export default EntitySwitcher;
