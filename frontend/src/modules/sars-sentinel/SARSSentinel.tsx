import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SARSDashboardEnhanced from './SARSDashboardEnhanced';
import CorrespondencePage from './CorrespondencePage';

const SARSSentinel: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/sars-sentinel/dashboard" replace />} />
      <Route path="/dashboard" element={<SARSDashboardEnhanced />} />
      <Route path="/correspondence" element={<CorrespondencePage />} />
    </Routes>
  );
};

export default SARSSentinel;
