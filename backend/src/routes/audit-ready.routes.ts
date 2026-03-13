/**
 * Audit Ready Routes (V2, tenant-aware)
 * Delegates to tenant-hardened V2 controller.
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import * as AuditReadyControllerV2 from '../controllers/audit-ready.controller.v2';
import * as auditWorkspaceController from '../modules/audit/controllers/audit.workspace.controller';
import * as auditorPortalController from '../controllers/auditor-portal.controller';

const router = express.Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Workspace
router.get('/workspace', auditWorkspaceController.getAuditWorkspace);

// Audit Engagements
router.get('/engagements', AuditReadyControllerV2.getEngagements);
router.get('/engagements/:id', AuditReadyControllerV2.getEngagementById);
router.post('/engagements', AuditReadyControllerV2.createEngagement);
router.put('/engagements/:id/status', AuditReadyControllerV2.updateEngagementStatus);

// Audit Findings
router.get('/findings', AuditReadyControllerV2.getFindings);
router.post('/findings', AuditReadyControllerV2.createFinding);
router.put('/findings/:id', AuditReadyControllerV2.updateFinding);

// Audit Evidence
router.get('/evidence', AuditReadyControllerV2.getEvidence);
router.post('/evidence', AuditReadyControllerV2.addEvidence);

// Checklists
router.get('/checklist-templates', AuditReadyControllerV2.getChecklistTemplates);
router.get('/checklist-items/:templateId', AuditReadyControllerV2.getChecklistItems);

// Permanent Records
router.get('/permanent-records', AuditReadyControllerV2.getPermanentRecords);
router.post('/permanent-records', AuditReadyControllerV2.addPermanentRecord);

// ─── Auditor Portal (packages, info requests, messages) ───
router.get('/portal/packages', auditorPortalController.getPackages);
router.get('/portal/packages/:id', auditorPortalController.getPackageById);
router.post('/portal/packages', auditorPortalController.createPackage);

router.get('/portal/requests', auditorPortalController.getRequests);
router.post('/portal/requests', auditorPortalController.createRequest);
router.put('/portal/requests/:id', auditorPortalController.updateRequest);

router.get('/portal/messages', auditorPortalController.getMessages);
router.post('/portal/messages', auditorPortalController.sendMessage);
router.put('/portal/messages/mark-read', auditorPortalController.markMessagesRead);

router.get('/portal/dashboard', auditorPortalController.getDashboard);

export default router;
