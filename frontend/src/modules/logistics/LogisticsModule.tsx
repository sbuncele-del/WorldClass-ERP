import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LogisticsCommandCenter from './LogisticsCommandCenter';
import LoadPlanner from './LoadPlanner';
import FleetManagementEnhanced from './FleetManagementEnhanced';
import DriverManagementEnhanced from './DriverManagementEnhanced';
import TripManagementEnhanced from './TripManagementEnhanced';
import CreateTrip from './CreateTrip';
import TripDetails from './TripDetails';
import LoadPlanningEnhanced from './LoadPlanningEnhanced';
import FuelManagement from './FuelManagement';
import LogisticsReports from './LogisticsReports';
import DocumentProcessing from './DocumentProcessing';

const LogisticsModule: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/logistics/dashboard" replace />} />
      <Route path="/dashboard" element={<LogisticsCommandCenter />} />
      <Route path="/planner" element={<LoadPlanner />} />
      <Route path="/fleet" element={<FleetManagementEnhanced />} />
      <Route path="/drivers" element={<DriverManagementEnhanced />} />
      <Route path="/trips" element={<TripManagementEnhanced />} />
      <Route path="/trips/new" element={<CreateTrip />} />
      <Route path="/planning" element={<LoadPlanningEnhanced />} />
      <Route path="/fuel" element={<FuelManagement />} />
      <Route path="/reports" element={<LogisticsReports />} />
      <Route path="/documents" element={<DocumentProcessing />} />
      <Route path="/reports" element={<LogisticsReports />} />
    </Routes>
  );
};

export default LogisticsModule;
