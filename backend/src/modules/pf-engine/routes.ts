/**
 * ProjectFlow PM Engine — routes
 *
 * Mounted at /api/v1/projects/engine. Gated by the same requireModule('projects')
 * guard as the rest of the Projects surface — no new access model.
 * Phase 0: lifecycle. Phase 1: WBS + activities + scope statement.
 * Phase 2: CPM/PERT scheduling + dependencies.
 */

import { Router } from 'express';
import { tenantMiddleware, requireModule } from '../../middleware/tenant';
import { PfEngineController } from './controller';
import { WbsController } from './wbs.controller';
import { ScheduleController } from './schedule.controller';

const router = Router();
const controller = new PfEngineController();
const wbs = new WbsController();
const schedule = new ScheduleController();

router.use(tenantMiddleware);
router.use(requireModule('projects'));

router.get('/:projectId/lifecycle', controller.getLifecycle);
router.post('/:projectId/lifecycle/transition', controller.transitionLifecycle);

router.get('/:projectId/scope', wbs.getScopeStatement);
router.put('/:projectId/scope', wbs.updateScopeStatement);

router.get('/:projectId/wbs', wbs.getTree);
router.post('/:projectId/wbs', wbs.createElement);
router.put('/:projectId/wbs/:elementId', wbs.renameElement);
router.post('/:projectId/wbs/:elementId/move', wbs.moveElement);
router.delete('/:projectId/wbs/:elementId', wbs.deleteElement);

router.post('/:projectId/wbs/:elementId/activities', wbs.createActivity);
router.put('/:projectId/activities/:activityId', wbs.updateActivity);
router.delete('/:projectId/activities/:activityId', wbs.deleteActivity);

router.get('/:projectId/schedule', schedule.getSchedule);
router.put('/:projectId/activities/:activityId/duration', schedule.updateDuration);
router.post('/:projectId/dependencies', schedule.addDependency);
router.delete('/:projectId/dependencies/:dependencyId', schedule.removeDependency);

export default router;
