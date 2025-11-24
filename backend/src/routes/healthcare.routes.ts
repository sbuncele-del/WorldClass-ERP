import express from 'express';
import * as healthcareController from '../controllers/healthcare.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * ================================================
 * OPERATIONS DASHBOARD ROUTES
 * ================================================
 */
router.get('/facilities/:facilityId/operations/status', healthcareController.getFacilityOperationsStatus);
router.get('/facilities/:facilityId/operations/kpis', healthcareController.getFacilityKPIs);

/**
 * ================================================
 * DASHBOARD & WORKSPACE ROUTES
 * ================================================
 */
router.get('/facilities/:facilityId/dashboard/command-center', healthcareController.getOperationsCommandCenterDashboard);
router.get('/facilities/:facilityId/workspace/patients', healthcareController.getPatientWorkspace);
router.get('/facilities/:facilityId/workspace/clinical', healthcareController.getClinicalWorkspace);
router.get('/facilities/:facilityId/workspace/resources', healthcareController.getResourceWorkspace);
router.get('/facilities/:facilityId/workspace/analytics', healthcareController.getAnalyticsWorkspace);
router.get('/facilities/:facilityId/stats/quick', healthcareController.getQuickStats);

/**
 * ================================================
 * PATIENT JOURNEY ROUTES
 * ================================================
 */
router.get('/facilities/:facilityId/appointments/today', healthcareController.getTodayAppointments);
router.get('/facilities/:facilityId/patients/active', healthcareController.getActivePatientsInFacility);
router.get('/facilities/:facilityId/patient-flow/bottlenecks', healthcareController.getPatientFlowBottlenecks);
router.post('/facilities/:facilityId/patients/:patientId/check-in', healthcareController.checkInPatient);
router.put('/facilities/:facilityId/visits/:visitId/stage', healthcareController.updatePatientJourneyStage);

/**
 * ================================================
 * PATIENT MANAGEMENT ROUTES
 * ================================================
 */
router.get('/facilities/:facilityId/patients', healthcareController.getPatients);
router.get('/patients/:patientId', healthcareController.getPatient);
router.post('/patients', healthcareController.createPatient);
router.put('/patients/:patientId', healthcareController.updatePatient);

/**
 * ================================================
 * CLINICAL WORKFLOWS ROUTES
 * ================================================
 */
// Vitals
router.post('/patients/:patientId/vitals', healthcareController.recordVitals);

// Triage
router.post('/patients/:patientId/triage', healthcareController.createTriage);

// Lab Orders
router.post('/patients/:patientId/lab-orders', healthcareController.createLabOrder);
router.get('/patients/:patientId/lab-orders', healthcareController.getPatientLabOrders);
router.put('/lab-orders/:orderId/results', healthcareController.updateLabResults);

// Prescriptions
router.post('/patients/:patientId/prescriptions', healthcareController.createPrescription);
router.get('/patients/:patientId/prescriptions', healthcareController.getPatientPrescriptions);

/**
 * ================================================
 * BED MANAGEMENT ROUTES
 * ================================================
 */
router.get('/facilities/:facilityId/beds', healthcareController.getBedStatus);
router.post('/beds/:bedId/assign', healthcareController.assignBed);
router.post('/beds/:bedId/release', healthcareController.releaseBed);

/**
 * ================================================
 * APPOINTMENTS ROUTES
 * ================================================
 */
router.post('/appointments', healthcareController.createAppointment);
router.put('/appointments/:appointmentId/status', healthcareController.updateAppointmentStatus);

/**
 * ================================================
 * STAFF MANAGEMENT ROUTES (Integration with HR Module)
 * ================================================
 */
router.get('/facilities/:facilityId/staff/schedule', healthcareController.getTodayStaffSchedule);
router.get('/facilities/:facilityId/staff/utilization', healthcareController.getStaffUtilization);

/**
 * ================================================
 * EQUIPMENT ROUTES (Integration with Asset Management)
 * ================================================
 */
router.get('/facilities/:facilityId/equipment/status', healthcareController.getMedicalEquipmentStatus);

/**
 * ================================================
 * COMMUNICATIONS ROUTES
 * ================================================
 */
router.get('/facilities/:facilityId/communications', healthcareController.getFacilityCommunications);
router.get('/facilities/:facilityId/service-requests', healthcareController.getServiceRequests);
router.post('/facilities/:facilityId/service-requests', healthcareController.createServiceRequest);

/**
 * ================================================
 * GOODX INTEGRATION ROUTES
 * ================================================
 */
router.get('/facilities/:facilityId/goodx/revenue', healthcareController.getGoodXRevenue);
router.get('/facilities/:facilityId/goodx/sync-status', healthcareController.getGoodXSyncStatus);

/**
 * ================================================
 * INVENTORY ROUTES (Integration with Inventory Module)
 * ================================================
 */
router.get('/facilities/:facilityId/inventory/status', healthcareController.getInventoryStatus);
router.get('/facilities/:facilityId/inventory/alerts', healthcareController.getInventoryAlerts);
router.get('/facilities/:facilityId/inventory/reorders', healthcareController.getPendingReorders);
router.post('/facilities/:facilityId/inventory/reorders', healthcareController.createReorderRequest);

/**
 * ================================================
 * FACILITIES ROUTES
 * ================================================
 */
router.get('/facilities', healthcareController.getFacilities);
router.get('/facilities/:facilityId/locations', healthcareController.getFacilityLocations);

export default router;
