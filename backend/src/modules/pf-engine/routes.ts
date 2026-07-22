/**
 * ProjectFlow PM Engine — routes
 *
 * Mounted at /api/v1/projects/engine. Gated by the same requireModule('projects')
 * guard as the rest of the Projects surface — no new access model.
 * Phase 0: lifecycle. Phase 1: WBS + activities + scope statement.
 * Phase 2: CPM/PERT scheduling + dependencies.
 * Phase 3: resources, cost, baseline.
 * Phase 4: Earned Value + change control.
 */

import { Router } from 'express';
import { tenantMiddleware, requireModule } from '../../middleware/tenant';
import { PfEngineController } from './controller';
import { WbsController } from './wbs.controller';
import { ScheduleController } from './schedule.controller';
import { ResourceController } from './resource.controller';
import { BaselineController } from './baseline.controller';
import { EvaController } from './eva.controller';
import { ChangeController } from './change.controller';

const router = Router();
const controller = new PfEngineController();
const wbs = new WbsController();
const schedule = new ScheduleController();
const resource = new ResourceController();
const baseline = new BaselineController();
const eva = new EvaController();
const change = new ChangeController();

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

// Resources are tenant-wide, not nested under a project id.
router.get('/resources', resource.list);
router.post('/resources', resource.create);
router.put('/resources/:resourceId', resource.update);
router.delete('/resources/:resourceId', resource.delete);

router.post('/:projectId/activities/:activityId/assignments', resource.assign);
router.delete('/:projectId/assignments/:assignmentId', resource.unassign);
router.get('/:projectId/cost-summary', resource.getCostSummary);

router.post('/:projectId/baseline', baseline.freeze);
router.get('/:projectId/baseline', baseline.getCurrent);
router.post('/:projectId/activities/:activityId/simulate', baseline.simulate);

router.get('/:projectId/eva', eva.getSnapshot);
router.get('/:projectId/eva/curve', eva.getCurve);
router.post('/:projectId/activities/:activityId/progress', eva.recordProgress);

router.get('/:projectId/changes', change.list);
router.post('/:projectId/changes', change.log);
router.post('/:projectId/changes/:changeId/decide', change.decide);
router.post('/:projectId/changes/:changeId/implement', change.implement);

export default router;
