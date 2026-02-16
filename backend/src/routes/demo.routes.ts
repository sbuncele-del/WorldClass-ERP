import { Router } from 'express';
import { requestDemo, trackDemoActivity, getDemoLeads, getLeadAnalytics } from '../services/demo-lead.service';

const router = Router();

/**
 * Demo Lead Routes
 * 
 * Public routes (no auth):
 *   POST /api/demo/request    - Submit demo request form
 *   POST /api/demo/track      - Track demo activity
 * 
 * Protected routes (super admin only):
 *   GET  /api/demo/leads            - List all demo leads
 *   GET  /api/demo/leads/:id/analytics - Lead analytics detail
 */

// ---- PUBLIC ROUTES (no auth required) ----

// Demo request form submission
router.post('/request', requestDemo);

// Track demo user activity
router.post('/track', trackDemoActivity);

// ---- PROTECTED ROUTES (super admin) ----
// These are accessed from the platform admin panel
// Auth is handled at the router mount level in index.ts

// List all demo leads with stats
router.get('/leads', getDemoLeads);

// Get analytics for a specific lead
router.get('/leads/:id/analytics', getLeadAnalytics);

export default router;
