import { Router } from 'express';
import taxSettingsController from '../controllers/tax-settings.controller';

const router = Router();

// Get tax configuration
router.get('/configuration', taxSettingsController.getTaxSettings.bind(taxSettingsController));

// Update tax configuration
router.put('/configuration', taxSettingsController.updateTaxSettings.bind(taxSettingsController));

// Get tax account mappings
router.get('/accounts', taxSettingsController.getTaxAccounts.bind(taxSettingsController));

// Update specific tax account mapping
router.put('/accounts/:tax_type', taxSettingsController.updateTaxAccount.bind(taxSettingsController));

// Validate tax setup completeness
router.get('/validate', taxSettingsController.validateTaxSetup.bind(taxSettingsController));

// Test SARS eFiling connection
router.post('/efiling/test-connection', taxSettingsController.testSarsConnection.bind(taxSettingsController));

// Update SARS eFiling configuration
router.put('/efiling/configuration', taxSettingsController.updateEfilingConfig.bind(taxSettingsController));

export default router;
