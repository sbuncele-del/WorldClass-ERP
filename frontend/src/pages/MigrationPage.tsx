import React from 'react';
import MigrationWizard from '../components/MigrationWizard';

const MigrationPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0A1F3E', margin: 0 }}>
          Data Migration
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Import your data from QuickBooks, Xero, Sage, Pastel, or CSV files.
        </p>
      </div>
      <MigrationWizard />
    </div>
  );
};

export default MigrationPage;
