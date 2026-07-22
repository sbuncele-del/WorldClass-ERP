/**
 * ProjectFlow PM Engine — route scaffold (Phase 0)
 *
 * Mounted at /api/v1/projects/engine. Gated by the same requireModule('projects')
 * guard as the rest of the Projects surface — no new access model.
 * Phase 0 only ships the lifecycle endpoints; WBS/activity/etc. routes are
 * added by the phases that build them.
 */

import { Router } from 'express';
import { tenantMiddleware, requireModule } from '../../middleware/tenant';
import { PfEngineController } from './controller';

const router = Router();
const controller = new PfEngineController();

router.use(tenantMiddleware);
router.use(requireModule('projects'));

router.get('/:projectId/lifecycle', controller.getLifecycle);
router.post('/:projectId/lifecycle/transition', controller.transitionLifecycle);

export default router;
