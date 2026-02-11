/**
 * EMAIL INTEGRATION ROUTES - TENANT-AWARE IMAP/SMTP
 *
 * These routes serve the CommunicationsHub frontend at /api/email/*.
 * All routes require authentication and tenant context.
 *
 * Endpoints:
 *  GET    /accounts           - List connected email accounts
 *  POST   /accounts           - Add a new IMAP/SMTP email account
 *  DELETE /accounts/:id       - Remove an email account
 *  GET    /inbox              - Fetch emails (supports folder & search)
 *  GET    /message/:id        - Get single email detail
 *  PUT    /message/:id/star   - Toggle star on an email
 *  DELETE /message/:id        - Move to trash / permanently delete
 *  POST   /message/:id/restore - Restore from trash
 *  POST   /draft              - Save a draft email
 *  POST   /send               - Send an email via SMTP
 *  POST   /sync               - Trigger IMAP sync
 *  GET    /folder-counts      - Get counts per folder
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import * as EmailController from '../controllers/email.controller';

const router = Router();

// All email routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// ===== ACCOUNT MANAGEMENT =====
router.get('/accounts', EmailController.getAccounts);
router.post('/accounts', EmailController.addAccount);
router.delete('/accounts/:id', EmailController.deleteAccount);

// ===== INBOX & MESSAGES =====
router.get('/inbox', EmailController.getInbox);
router.get('/message/:id', EmailController.getMessage);
router.put('/message/:id/star', EmailController.toggleStar);
router.delete('/message/:id', EmailController.deleteMessage);
router.post('/message/:id/restore', EmailController.restoreMessage);

// ===== COMPOSE & DRAFTS =====
router.post('/draft', EmailController.saveDraft);
router.post('/send', EmailController.sendEmail);

// ===== SYNC & FOLDER COUNTS =====
router.post('/sync', EmailController.syncEmails);
router.get('/folder-counts', EmailController.getFolderCounts);

export default router;
