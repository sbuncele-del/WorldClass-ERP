import { Router } from 'express';
import {
  getBudgetScenarios,
  createBudgetScenario,
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetVsActual,
  getVarianceAnalysis,
  generateForecast,
  getBudgetDashboard
} from '../controllers/financial-forecasting.controller';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// Apply tenant middleware to all financial forecasting routes
router.use(tenantMiddleware);

// Budget Scenarios
router.get('/scenarios', getBudgetScenarios);
router.post('/scenarios', createBudgetScenario);

// Budgets
router.get('/budgets', getBudgets);
router.get('/budgets/:id', getBudgetById);
router.post('/budgets', createBudget);
router.put('/budgets/:id', updateBudget);
router.delete('/budgets/:id', deleteBudget);

// Budget vs Actual
router.get('/budgets/:budget_id/vs-actual', getBudgetVsActual);
router.get('/variance-analysis', getVarianceAnalysis);

// Forecasting
router.post('/forecast/generate', generateForecast);

// Dashboard
router.get('/dashboard', getBudgetDashboard);

export default router;
