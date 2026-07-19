/**
 * Dimensions Controller
 * REST API endpoints for financial dimensions management
 */

import { Response } from 'express';
import { TenantRequest } from '../../../types';
import { DimensionsService } from '../services/dimensions.service';

const dimensionsService = new DimensionsService();

// ===== COST CENTERS =====

export const getAllCostCenters = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { include_inactive = 'false' } = req.query;
    const costCenters = await dimensionsService.getAllCostCenters(tenantId, include_inactive === 'true');

    res.json({
      success: true,
      data: costCenters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getCostCenter = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const costCenter = await dimensionsService.getCostCenterByCode(tenantId, code);

    if (!costCenter) {
      res.status(404).json({
        success: false,
        error: 'Cost center not found',
      });
      return;
    }

    res.json({
      success: true,
      data: costCenter,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const createCostCenter = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.userId || req.body.user_id || 'system';
    const id = await dimensionsService.createCostCenter(tenantId, req.body, userId);

    res.status(201).json({
      success: true,
      data: { id },
      message: 'Cost center created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const updateCostCenter = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const userId = req.userId || req.body.user_id || 'system';
    await dimensionsService.updateCostCenter(tenantId, code, req.body, userId);

    res.json({
      success: true,
      message: 'Cost center updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const deleteCostCenter = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    await dimensionsService.deleteCostCenter(tenantId, code);

    res.json({
      success: true,
      message: 'Cost center deactivated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// ===== DEPARTMENTS =====

export const getAllDepartments = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { include_inactive = 'false' } = req.query;
    const departments = await dimensionsService.getAllDepartments(tenantId, include_inactive === 'true');

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getDepartment = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const department = await dimensionsService.getDepartmentByCode(tenantId, code);

    if (!department) {
      res.status(404).json({
        success: false,
        error: 'Department not found',
      });
      return;
    }

    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const createDepartment = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.userId || req.body.user_id || 'system';
    const id = await dimensionsService.createDepartment(tenantId, req.body, userId);

    res.status(201).json({
      success: true,
      data: { id },
      message: 'Department created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const updateDepartment = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const userId = req.userId || req.body.user_id || 'system';
    await dimensionsService.updateDepartment(tenantId, code, req.body, userId);

    res.json({
      success: true,
      message: 'Department updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const deleteDepartment = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    await dimensionsService.deleteDepartment(tenantId, code);

    res.json({
      success: true,
      message: 'Department deactivated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// ===== PROJECTS =====

export const getAllProjects = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { include_inactive = 'false' } = req.query;
    const projects = await dimensionsService.getAllProjects(tenantId, include_inactive === 'true');

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getProject = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const project = await dimensionsService.getProjectByCode(tenantId, code);

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const createProject = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.userId || req.body.user_id || 'system';
    const id = await dimensionsService.createProject(tenantId, req.body, userId);

    res.status(201).json({
      success: true,
      data: { id },
      message: 'Project created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const updateProject = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const userId = req.userId || req.body.user_id || 'system';
    await dimensionsService.updateProject(tenantId, code, req.body, userId);

    res.json({
      success: true,
      message: 'Project updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const deleteProject = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    await dimensionsService.deleteProject(tenantId, code);

    res.json({
      success: true,
      message: 'Project deactivated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// ===== PRODUCTS =====

export const getAllProducts = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { include_inactive = 'false' } = req.query;
    const products = await dimensionsService.getAllProducts(tenantId, include_inactive === 'true');

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getProduct = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const product = await dimensionsService.getProductByCode(tenantId, code);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found',
      });
      return;
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const createProduct = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.userId || req.body.user_id || 'system';
    const id = await dimensionsService.createProduct(tenantId, req.body, userId);

    res.status(201).json({
      success: true,
      data: { id },
      message: 'Product created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const updateProduct = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const userId = req.userId || req.body.user_id || 'system';
    await dimensionsService.updateProduct(tenantId, code, req.body, userId);

    res.json({
      success: true,
      message: 'Product updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const deleteProduct = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    await dimensionsService.deleteProduct(tenantId, code);

    res.json({
      success: true,
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// ===== LOCATIONS =====

export const getAllLocations = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { include_inactive = 'false' } = req.query;
    const locations = await dimensionsService.getAllLocations(tenantId, include_inactive === 'true');

    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const getLocation = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const location = await dimensionsService.getLocationByCode(tenantId, code);

    if (!location) {
      res.status(404).json({
        success: false,
        error: 'Location not found',
      });
      return;
    }

    res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const createLocation = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.userId || req.body.user_id || 'system';
    const id = await dimensionsService.createLocation(tenantId, req.body, userId);

    res.status(201).json({
      success: true,
      data: { id },
      message: 'Location created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const updateLocation = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    const userId = req.userId || req.body.user_id || 'system';
    await dimensionsService.updateLocation(tenantId, code, req.body, userId);

    res.json({
      success: true,
      message: 'Location updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const deleteLocation = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const { code } = req.params;
    await dimensionsService.deleteLocation(tenantId, code);

    res.json({
      success: true,
      message: 'Location deactivated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// ===== SUMMARY =====

export const getDimensionSummary = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenant!.id;
    const summary = await dimensionsService.getDimensionSummary(tenantId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};
