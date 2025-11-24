import { Router, RequestHandler } from 'express';
import SubscriptionController from '../controllers/subscription.controller';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

/**
 * Subscription Routes (all require authentication)
 */

// Get current subscription details
router.get('/', tenantMiddleware as RequestHandler, SubscriptionController.getCurrentSubscription as RequestHandler);

// Get usage statistics
router.get('/usage', tenantMiddleware as RequestHandler, SubscriptionController.getUsageStatistics as RequestHandler);

// Check subscription status
router.get('/status', tenantMiddleware as RequestHandler, SubscriptionController.checkSubscriptionStatus as RequestHandler);

// Upgrade to higher plan
router.post('/upgrade', tenantMiddleware as RequestHandler, SubscriptionController.upgradePlan as RequestHandler);

// Schedule downgrade to lower plan
router.post('/downgrade', tenantMiddleware as RequestHandler, SubscriptionController.downgradePlan as RequestHandler);

// Cancel subscription (effective at period end)
router.post('/cancel', tenantMiddleware as RequestHandler, SubscriptionController.cancelSubscription as RequestHandler);

// Reactivate cancelled subscription
router.post('/reactivate', tenantMiddleware as RequestHandler, SubscriptionController.reactivateSubscription as RequestHandler);

// Update payment method
router.put('/payment-method', tenantMiddleware as RequestHandler, SubscriptionController.updatePaymentMethod as RequestHandler);

export default router;
