import express from 'express';
import {
  submitForApproval,
  approveEntry,
  rejectEntry,
  recallEntry,
  getPendingApprovals,
  getApprovalHistory,
  getApprovalStats
} from '../controllers/approval.controller';

const router = express.Router();

/**
 * Approval Workflow Routes
 * Handles multi-level approval processes for journal entries
 */

// === Approval Actions ===

// POST /api/financial/approvals/submit/:journalEntryId
// Submit journal entry for approval
router.post('/submit/:journalEntryId', submitForApproval);

// POST /api/financial/approvals/approve/:journalEntryId
// Approve entry at current level
router.post('/approve/:journalEntryId', approveEntry);

// POST /api/financial/approvals/reject/:journalEntryId
// Reject entry with reason
router.post('/reject/:journalEntryId', rejectEntry);

// POST /api/financial/approvals/recall/:journalEntryId
// Recall entry (preparer only)
router.post('/recall/:journalEntryId', recallEntry);

// === Approval Queries ===

// GET /api/financial/approvals/pending
// Get entries pending approval (filterable by role/user)
router.get('/pending', getPendingApprovals);

// GET /api/financial/approvals/history/:journalEntryId
// Get approval history for specific entry
router.get('/history/:journalEntryId', getApprovalHistory);

// GET /api/financial/approvals/stats
// Get approval statistics (dashboard metrics)
router.get('/stats', getApprovalStats);

export default router;
