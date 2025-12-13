/**
 * Multi-Entity Routes
 * API endpoints for entity management
 */

import express from 'express';
import {
    getEntities,
    getEntityById,
    createEntity,
    updateEntity,
    getEntityAncestors,
    getEntityDescendants,
    getUserEntities,
    grantEntityPermission,
    getInterEntityTransactions,
    createInterEntityTransaction,
    getConsolidatedData
} from '../controllers/multi-entity.controller';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = express.Router();

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// ================================================
// ENTITY MANAGEMENT
// ================================================

/**
 * GET /api/entities
 * Get all entities for tenant
 * Query: ?includeInactive=true&entityType=BRANCH
 */
router.get('/', getEntities);

/**
 * GET /api/entities/user
 * Get user's accessible entities
 */
router.get('/user', getUserEntities);

/**
 * GET /api/entities/:entityId
 * Get entity by ID with settings
 */
router.get('/:entityId', getEntityById);

/**
 * POST /api/entities
 * Create new entity
 * Body: { entity_code, entity_name, entity_type, ... }
 */
router.post('/', createEntity);

/**
 * PUT /api/entities/:entityId
 * Update entity
 */
router.put('/:entityId', updateEntity);

/**
 * GET /api/entities/:entityId/ancestors
 * Get entity hierarchy (parent, grandparent, etc.)
 */
router.get('/:entityId/ancestors', getEntityAncestors);

/**
 * GET /api/entities/:entityId/descendants
 * Get entity children (subsidiaries, branches)
 */
router.get('/:entityId/descendants', getEntityDescendants);

// ================================================
// ENTITY PERMISSIONS
// ================================================

/**
 * POST /api/entities/permissions
 * Grant entity permission to user
 * Body: { user_id, entity_id, can_view, can_create, ... }
 */
router.post('/permissions', grantEntityPermission);

// ================================================
// INTER-ENTITY TRANSACTIONS
// ================================================

/**
 * GET /api/entities/transactions/inter-entity
 * Get inter-entity transactions
 * Query: ?entityId=xxx&eliminationStatus=PENDING&startDate=2024-01-01
 */
router.get('/transactions/inter-entity', getInterEntityTransactions);

/**
 * POST /api/entities/transactions/inter-entity
 * Create inter-entity transaction
 * Body: { source_entity_id, destination_entity_id, transaction_type, amount, ... }
 */
router.post('/transactions/inter-entity', createInterEntityTransaction);

// ================================================
// CONSOLIDATION & REPORTING
// ================================================

/**
 * GET /api/entities/reports/consolidated
 * Get consolidated financial data across entities
 * Query: ?startDate=2024-01-01&endDate=2024-12-31&entityIds[]=xxx
 */
router.get('/reports/consolidated', getConsolidatedData);

export default router;
