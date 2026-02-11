import React, { useState } from 'react';
import { Dropdown, Button, Space, Typography, Tag, Avatar, Divider, Spin } from 'antd';
import {
  SwapOutlined,
  BankOutlined,
  ApartmentOutlined,
  CheckOutlined,
  GlobalOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useEntity, Entity } from '../contexts/EntityContext';
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
    getEntityPath 
  } = useEntity();
  
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="entity-switcher-loading">
        <Spin size="small" />
      </div>
    );
  }

  if (!currentEntity || entities.length === 0) {
    return null;
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'holding':
        return <BankOutlined />;
      case 'subsidiary':
        return <ApartmentOutlined />;
      case 'branch':
        return <GlobalOutlined />;
      default:
        return <BankOutlined />;
    }
  };

  const getEntityColor = (type: string) => {
    switch (type) {
      case 'holding':
        return '#1890ff';
      case 'subsidiary':
        return '#52c41a';
      case 'branch':
        return '#faad14';
      case 'division':
        return '#722ed1';
      default:
        return '#1890ff';
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'ZA': '🇿🇦',
      'GB': '🇬🇧',
      'US': '🇺🇸',
      'AU': '🇦🇺',
      'SZ': '🇸🇿',
      'BW': '🇧🇼',
    };
    return flags[country] || '🌍';
  };

  const entityPath = getEntityPath();

  const menuItems = [
    // Breadcrumb path
    ...(entityPath.length > 1 ? [
      {
        key: 'path',
        label: (
          <div className="entity-path">
            {entityPath.map((e, i) => (
              <span key={e.id}>
                <Text type="secondary" style={{ fontSize: '12px' }}>{e.name}</Text>
                {i < entityPath.length - 1 && <RightOutlined style={{ fontSize: '10px', margin: '0 4px' }} />}
              </span>
            ))}
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' as const },
    ] : []),
    
    // Holding company (if in subsidiary)
    ...(isInSubsidiary && holdingCompany ? [
      {
        key: 'back-to-holding',
        label: (
          <div className="entity-menu-item holding">
            <Avatar 
              size="small" 
              style={{ backgroundColor: getEntityColor('holding') }}
              icon={<BankOutlined />}
            />
            <div className="entity-info">
              <Text strong>← Back to {holdingCompany.name}</Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>Holding Company</Text>
            </div>
          </div>
        ),
        onClick: () => {
          switchToHolding();
          setOpen(false);
        },
      },
      { type: 'divider' as const },
    ] : []),

    // Section header
    {
      key: 'header',
      label: <Text type="secondary" style={{ fontSize: '11px' }}>SWITCH COMPANY</Text>,
      disabled: true,
    },

    // All entities
    ...entities.map(entity => ({
      key: entity.id,
      label: (
        <div className={`entity-menu-item ${entity.id === currentEntity?.id ? 'active' : ''}`}>
          <Avatar 
            size="small" 
            style={{ backgroundColor: getEntityColor(entity.entity_type) }}
            icon={getEntityIcon(entity.entity_type)}
          />
          <div className="entity-info">
            <Space>
              <Text strong={entity.id === currentEntity?.id}>{entity.name}</Text>
              {entity.id === currentEntity?.id && <CheckOutlined style={{ color: '#52c41a' }} />}
            </Space>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {getCountryFlag(entity.country)} {entity.code}
              </Text>
              <Tag 
                color={getEntityColor(entity.entity_type)} 
                style={{ fontSize: '10px', margin: 0, padding: '0 4px' }}
              >
                {entity.entity_type}
              </Tag>
            </Space>
          </div>
        </div>
      ),
      onClick: () => {
        switchEntity(entity.id);
        setOpen(false);
      },
    })),
  ];

  return (
    <div className="entity-switcher-container">
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        open={open}
        onOpenChange={setOpen}
        placement="bottomRight"
        overlayClassName="entity-switcher-dropdown"
      >
        <Button 
          className={`entity-switcher-button ${isInSubsidiary ? 'subsidiary-mode' : ''}`}
          type={isInSubsidiary ? 'primary' : 'default'}
        >
          <Space>
            <Avatar 
              size="small" 
              style={{ 
                backgroundColor: getEntityColor(currentEntity.entity_type),
                width: 24,
                height: 24,
                lineHeight: '24px',
                fontSize: '12px',
              }}
              icon={getEntityIcon(currentEntity.entity_type)}
            />
            <div className="entity-button-text">
              <Text 
                strong 
                style={{ 
                  color: isInSubsidiary ? 'white' : 'inherit',
                  fontSize: '13px',
                  display: 'block',
                  lineHeight: '1.2',
                }}
              >
                {currentEntity.name}
              </Text>
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: '10px',
                  color: isInSubsidiary ? 'rgba(255,255,255,0.8)' : undefined,
                }}
              >
                {getCountryFlag(currentEntity.country)} {currentEntity.code} • {currentEntity.entity_type}
              </Text>
            </div>
            <SwapOutlined style={{ color: isInSubsidiary ? 'white' : undefined }} />
          </Space>
        </Button>
      </Dropdown>
      
      {isInSubsidiary && (
        <Tag color="green" className="subsidiary-indicator">
          Working in Subsidiary
        </Tag>
      )}
    </div>
  );
};

export default EntitySwitcher;
