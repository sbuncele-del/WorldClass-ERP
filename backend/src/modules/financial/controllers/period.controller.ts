/**
 * Period Management Controller
 * REST API endpoints for fiscal years and accounting periods
 */

import { Response } from 'express';
import { PeriodService } from '../services/period.service';
import { TenantRequest } from '../../../types';

function getTenantContext(req: TenantRequest): { tenantId: string; userId: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) throw new Error('Tenant context required');
  const userId = req.user?.id || req.body.user_id || 'system';
  return { tenantId, userId };
}

const periodService = new PeriodService();

// ===== FISCAL YEARS =====

export const getAllFiscalYears = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const fiscalYears = await periodService.getAllFiscalYears(tenantId);
    res.json({
      success: true,
      data: fiscalYears,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getFiscalYear = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const fiscalYear = await periodService.getFiscalYearById(tenantId, id);

    if (!fiscalYear) {
      res.status(404).json({
        success: false,
        error: 'Fiscal year not found',
      });
      return;
    }

    res.json({
      success: true,
      data: fiscalYear,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getCurrentFiscalYear = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const fiscalYear = await periodService.getCurrentFiscalYear(tenantId);

    if (!fiscalYear) {
      res.status(404).json({
        success: false,
        error: 'No current fiscal year set',
      });
      return;
    }

    res.json({
      success: true,
      data: fiscalYear,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const createFiscalYear = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const data = {
      ...req.body,
      user_id: userId,
    };

    const id = await periodService.createFiscalYear(tenantId, data);

    res.status(201).json({
      success: true,
      data: { id },
      message: 'Fiscal year created successfully',
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const setCurrentFiscalYear = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;

    await periodService.setCurrentFiscalYear(tenantId, id, userId);

    res.json({
      success: true,
      message: 'Current fiscal year updated successfully',
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const closeFiscalYear = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;

    await periodService.closeFiscalYear(tenantId, id, userId);

    res.json({
      success: true,
      message: 'Fiscal year closed successfully',
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getFiscalYearWithPeriods = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const fiscalYearWithPeriods = await periodService.getFiscalYearWithPeriods(tenantId, id);

    if (!fiscalYearWithPeriods) {
      res.status(404).json({
        success: false,
        error: 'Fiscal year not found',
      });
      return;
    }

    res.json({
      success: true,
      data: fiscalYearWithPeriods,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// ===== ACCOUNTING PERIODS =====

export const getAllPeriods = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const { fiscal_year_id } = req.query;
    const periods = await periodService.getAllPeriods(tenantId, fiscal_year_id as string);

    res.json({
      success: true,
      data: periods,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getPeriod = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const period = await periodService.getPeriodById(tenantId, id);

    if (!period) {
      res.status(404).json({
        success: false,
        error: 'Period not found',
      });
      return;
    }

    res.json({
      success: true,
      data: period,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getCurrentPeriod = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const period = await periodService.getCurrentPeriod(tenantId);

    if (!period) {
      res.status(404).json({
        success: false,
        error: 'No current period set',
      });
      return;
    }

    res.json({
      success: true,
      data: period,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getOpenPeriods = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const { fiscal_year_id } = req.query;
    const periods = await periodService.getOpenPeriods(tenantId, fiscal_year_id as string);

    res.json({
      success: true,
      data: periods,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const createPeriod = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const data = {
      ...req.body,
      user_id: userId,
    };

    const id = await periodService.createPeriod(tenantId, data);

    res.status(201).json({
      success: true,
      data: { id },
      message: 'Period created successfully',
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const openPeriod = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;

    await periodService.openPeriod(tenantId, id, userId);

    res.json({
      success: true,
      message: 'Period opened successfully',
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const closePeriod = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;
    const force = req.body.force || false;

    await periodService.closePeriod(tenantId, id, userId, force);

    res.json({
      success: true,
      message: 'Period closed successfully',
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const lockPeriod = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;

    await periodService.lockPeriod(tenantId, id, userId);

    res.json({
      success: true,
      message: 'Period locked successfully',
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const setCurrentPeriod = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;

    await periodService.setCurrentPeriod(tenantId, id, userId);

    res.json({
      success: true,
      message: 'Current period updated successfully',
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const validatePeriodClose = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const validation = await periodService.validatePeriodClose(tenantId, id);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// ===== SUMMARY & UTILITIES =====

export const getPeriodSummary = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const summary = await periodService.getPeriodSummary(tenantId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(error instanceof Error && error.message.includes('context') ? 401 : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};
