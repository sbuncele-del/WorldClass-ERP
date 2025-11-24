import React, { useState, useEffect } from 'react';
import CostCentersManager from '../modules/financial/components/CostCentersManager';
import DepartmentsManager from '../modules/financial/components/DepartmentsManager';
import ProjectsManager from '../modules/financial/components/ProjectsManager';
import ProductsManager from '../modules/financial/components/ProductsManager';
import LocationsManager from '../modules/financial/components/LocationsManager';
import './Dimensions.css';

interface DimensionSummary {
  cost_centers: number;
  departments: number;
  projects: number;
  products: number;
  locations: number;
}

const Dimensions: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cost-centers');
  const [summary, setSummary] = useState<DimensionSummary | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/financial/dimensions/summary');
      const result = await response.json();
      if (result.success) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const tabs = [
    { id: 'cost-centers', label: '💰 Cost Centers', count: summary?.cost_centers },
    { id: 'departments', label: '🏢 Departments', count: summary?.departments },
    { id: 'projects', label: '📋 Projects', count: summary?.projects },
    { id: 'products', label: '📦 Products', count: summary?.products },
    { id: 'locations', label: '📍 Locations', count: summary?.locations },
  ];

  return (
    <div className="dimensions-page">
      <div className="dimensions-header">
        <div>
          <h1>Financial Dimensions</h1>
          <p className="page-description">
            Manage cost centers, departments, projects, products, and locations for multi-dimensional reporting
          </p>
        </div>
      </div>

      <div className="dimensions-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="dimensions-content">
        {activeTab === 'cost-centers' && <CostCentersManager />}
        {activeTab === 'departments' && <DepartmentsManager />}
        {activeTab === 'projects' && <ProjectsManager />}
        {activeTab === 'products' && <ProductsManager />}
        {activeTab === 'locations' && <LocationsManager />}
      </div>
    </div>
  );
};

export default Dimensions;
