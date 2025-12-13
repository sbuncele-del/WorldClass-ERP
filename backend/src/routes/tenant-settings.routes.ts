import express, { RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import * as TenantSettingsController from '../controllers/tenant-settings.controller';

const router = express.Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Tenant settings routes
router.get('/settings', TenantSettingsController.getTenantSettings as unknown as RequestHandler);
router.patch('/settings', TenantSettingsController.updateTenantSettings as unknown as RequestHandler);

// Module configuration routes
router.get('/modules', TenantSettingsController.getModuleConfig as unknown as RequestHandler);
router.patch('/modules', TenantSettingsController.updateModuleConfig as unknown as RequestHandler);

// Team management routes
router.get('/team', TenantSettingsController.getTeamMembers as unknown as RequestHandler);
router.post('/team/invite', TenantSettingsController.inviteTeamMember as unknown as RequestHandler);
router.delete('/team/:memberId', TenantSettingsController.removeTeamMember as unknown as RequestHandler);

export default router;
