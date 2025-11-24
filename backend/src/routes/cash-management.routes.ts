/**
 * Cash Management Routes
 * 
 * API routes for bank reconciliation
 */

import express from 'express';
import * as cashManagementController from '../modules/cash-management/controllers/cash-management.controller';
import * as cashManagementWorkspaceController from '../modules/cash-management/controllers/cash-management.workspace.controller';
import * as multiLineMatchingController from '../modules/cash-management/controllers/multi-line-matching.controller';
import * as partialReconciliationController from '../modules/cash-management/controllers/partial-reconciliation.controller';
import * as bulkOperationsController from '../modules/cash-management/controllers/bulk-operations.controller';

const router = express.Router();

// ============================================================
// WORKSPACE
// ============================================================
router.get('/workspace', cashManagementWorkspaceController.getCashManagementWorkspace);

// ============================================================
// BANKS
// ============================================================
router.get('/banks', cashManagementController.getBanks);
router.get('/banks/:bankCode/csv-preset', cashManagementController.getCSVPreset);

// ============================================================
// BANK ACCOUNTS
// ============================================================
router.get('/bank-accounts', cashManagementController.getBankAccounts);
router.get('/bank-accounts/:id', cashManagementController.getBankAccountById);
router.post('/bank-accounts', cashManagementController.createBankAccount);
router.put('/bank-accounts/:id', cashManagementController.updateBankAccount);

// ============================================================
// STATEMENTS
// ============================================================
router.get('/statements', cashManagementController.getStatements);
router.post('/statements/import', cashManagementController.importStatement);
router.post('/statements/parse-csv', cashManagementController.parseCSVPreview);

// ============================================================
// STATEMENT LINES
// ============================================================
router.get('/statement-lines', cashManagementController.getStatementLines);

// ============================================================
// RECONCILIATION RULES
// ============================================================
router.get('/rules', cashManagementController.getReconciliationRules);
router.post('/rules', cashManagementController.createReconciliationRule);

// ============================================================
// MATCHING
// ============================================================
router.post('/statements/:statementId/auto-match', cashManagementController.runAutoMatching);
router.post('/matches', cashManagementController.createMatch);
router.post('/matches/unmatch', cashManagementController.unmatch);

// ============================================================
// MULTI-LINE MATCHING
// ============================================================
router.post('/multi-line-matching/find', multiLineMatchingController.findMultiLineMatches);
router.post('/multi-line-matching/create', multiLineMatchingController.createMultiLineMatch);
router.delete('/multi-line-matching/:groupId', multiLineMatchingController.unmatchMultiLineGroup);
router.get('/multi-line-matching/groups', multiLineMatchingController.getMultiLineMatchGroups);

// ============================================================
// PARTIAL RECONCILIATION
// ============================================================
router.post('/partial-matching/accept', partialReconciliationController.acceptPartialMatch);
router.get('/partial-matching/:bankLineId/suggestions', partialReconciliationController.findPartialMatchSuggestions);
router.post('/partial-matching/check-tolerance', partialReconciliationController.checkTolerance);
router.get('/partial-matching/tolerance-settings', partialReconciliationController.getToleranceSettings);

// ============================================================
// DUPLICATE DETECTION
// ============================================================
router.post('/duplicates/check', cashManagementController.checkDuplicates);
router.get('/duplicates/find', cashManagementController.findPotentialDuplicates);

// ============================================================
// BULK OPERATIONS
// ============================================================
router.post('/bulk/auto-match', bulkOperationsController.bulkAutoMatch);
router.post('/bulk/accept-suggestions', bulkOperationsController.bulkAcceptSuggestions);
router.post('/bulk/unmatch', bulkOperationsController.bulkUnmatch);
router.get('/bulk/stats/:statementId', bulkOperationsController.getBulkStats);

// ============================================================
// RECONCILIATION WORKSPACE
// ============================================================
router.get('/statements/:statementId/workspace', cashManagementController.getReconciliationWorkspace);

// ============================================================
// DASHBOARD/SUMMARY
// ============================================================
router.get('/summary', cashManagementController.getCashManagementSummary);

export default router;
