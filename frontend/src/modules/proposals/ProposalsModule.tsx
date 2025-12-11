import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spin } from 'antd';

// Lazy load pages
const ProposalsDashboard = lazy(() => import('./pages/ProposalsDashboard'));
const ProposalsList = lazy(() => import('./pages/ProposalsList'));
const ProposalEditor = lazy(() => import('./pages/ProposalEditor'));
const ProposalPreview = lazy(() => import('./pages/ProposalPreview'));
const Templates = lazy(() => import('./pages/Templates'));
const PricingLibrary = lazy(() => import('./pages/PricingLibrary'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
    <Spin size="large" />
  </div>
);

const ProposalsModule: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<ProposalsDashboard />} />
        <Route path="/list" element={<ProposalsList />} />
        <Route path="/new" element={<ProposalEditor />} />
        <Route path="/edit/:id" element={<ProposalEditor />} />
        <Route path="/preview/:id" element={<ProposalPreview />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/pricing" element={<PricingLibrary />} />
        <Route path="/portal/:id" element={<ClientPortal />} />
      </Routes>
    </Suspense>
  );
};

export default ProposalsModule;
