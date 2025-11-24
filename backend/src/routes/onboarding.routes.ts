import { Router } from 'express';
import OnboardingController from '../controllers/onboarding.controller';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// All onboarding endpoints require authentication
router.use(tenantMiddleware);

/**
 * GET /api/onboarding/status
 * Get current onboarding status
 */
router.get('/status', OnboardingController.getStatus);

/**
 * PATCH /api/onboarding
 * Update onboarding data
 */
router.patch('/', OnboardingController.update);

/**
 * POST /api/onboarding/complete
 * Complete onboarding
 */
router.post('/complete', OnboardingController.complete);

/**
 * POST /api/onboarding/skip
 * Skip onboarding
 */
router.post('/skip', OnboardingController.skip);

export default router;
