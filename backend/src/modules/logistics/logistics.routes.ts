import { Router } from 'express';
import * as logisticsController from './logistics.controller';
import * as logisticsWorkspaceController from './controllers/logistics.workspace.controller';
import documentsRouter from '../../routes/logistics/documents';
import tripsRouter from '../../routes/logistics/trips';

const router = Router();

// ============================================================================
// WORKSPACE
// ============================================================================
router.get('/workspace', logisticsWorkspaceController.getLogisticsWorkspace);

// ============================================================================
// DOCUMENT PROCESSING (OCR)
// ============================================================================
router.use('/documents', documentsRouter);

// ============================================================================
// VEHICLES / FLEET
// ============================================================================
router.get('/vehicles', logisticsController.getVehicles);
router.get('/vehicles/:id', logisticsController.getVehicleById);
router.post('/vehicles', logisticsController.createVehicle);
router.put('/vehicles/:id', logisticsController.updateVehicle);
router.delete('/vehicles/:id', logisticsController.deleteVehicle);

// ============================================================================
// DRIVERS
// ============================================================================
router.get('/drivers', logisticsController.getDrivers);
router.get('/drivers/:id', logisticsController.getDriverById);
router.post('/drivers', logisticsController.createDriver);
router.put('/drivers/:id', logisticsController.updateDriver);
router.delete('/drivers/:id', logisticsController.deleteDriver);

// ============================================================================
// TRIPS API (Database-driven)
// ============================================================================
router.use('/trips', tripsRouter);

// Legacy trip routes (kept for backward compatibility)
// router.get('/trips', logisticsController.getTrips);
// router.get('/trips/:id', logisticsController.getTripById);
// router.post('/trips', logisticsController.createTrip);
// router.put('/trips/:id', logisticsController.updateTrip);
// router.post('/trips/:id/start', logisticsController.startTrip);
// router.post('/trips/:id/complete', logisticsController.completeTrip);

// ============================================================================
// FUEL MANAGEMENT
// ============================================================================
router.get('/fuel', logisticsController.getFuelTransactions);
router.post('/fuel', logisticsController.createFuelTransaction);
router.post('/fuel/:id/reconcile', logisticsController.reconcileFuelTransaction);

// ============================================================================
// LOAD PLANNING
// ============================================================================
router.get('/loads', logisticsController.getLoads);
router.get('/loads/:id', logisticsController.getLoadById);
router.post('/loads', logisticsController.createLoad);
router.put('/loads/:id/status', logisticsController.updateLoadStatus);

// ============================================================================
// MAINTENANCE
// ============================================================================
router.get('/maintenance', logisticsController.getMaintenanceRecords);
router.post('/maintenance', logisticsController.createMaintenanceRecord);

// ============================================================================
// DASHBOARD
// ============================================================================
router.get('/dashboard', logisticsController.getDashboardStats);

export default router;
