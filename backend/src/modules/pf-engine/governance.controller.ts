import { Response } from 'express';
import { TenantRequest } from '../../types';
import { GovernanceService } from './governance.service';

const notFound = (error: any) => /not found/i.test(error?.message || '');
// The DB CHECK constraints already enforce this range, but validating here
// turns a bad request into a clean 400 instead of a raw 500 from a
// constraint violation.
const isScore1to5 = (value: any) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5;

export class GovernanceController {
  private service: GovernanceService;

  constructor() {
    this.service = new GovernanceService();
  }

  // ── Risk register ──────────────────────────────────────────────────────

  listRisks = async (req: TenantRequest, res: Response) => {
    try {
      const risks = await this.service.listRisks(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: risks });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createRisk = async (req: TenantRequest, res: Response) => {
    try {
      const { title, description, category, probability, impact } = req.body;
      if (!title || probability == null || impact == null) {
        res.status(400).json({ success: false, error: 'title, probability and impact are required' });
        return;
      }
      if (!isScore1to5(probability) || !isScore1to5(impact)) {
        res.status(400).json({ success: false, error: 'probability and impact must be whole numbers from 1 to 5' });
        return;
      }
      const risk = await this.service.createRisk(req.tenant!.id, req.params.projectId, { title, description, category, probability, impact });
      res.status(201).json({ success: true, data: risk });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  updateRisk = async (req: TenantRequest, res: Response) => {
    try {
      const { title, description, category, probability, impact, responseStrategy, responsePlan, owner, status } = req.body;
      if ((probability != null && !isScore1to5(probability)) || (impact != null && !isScore1to5(impact))) {
        res.status(400).json({ success: false, error: 'probability and impact must be whole numbers from 1 to 5' });
        return;
      }
      const risk = await this.service.updateRisk(req.tenant!.id, req.params.riskId, {
        title, description, category, probability, impact, responseStrategy, responsePlan, owner, status,
      });
      res.json({ success: true, data: risk });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  deleteRisk = async (req: TenantRequest, res: Response) => {
    try {
      await this.service.deleteRisk(req.tenant!.id, req.params.riskId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  // ── Stakeholders ──────────────────────────────────────────────────────

  listStakeholders = async (req: TenantRequest, res: Response) => {
    try {
      const stakeholders = await this.service.listStakeholders(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: stakeholders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createStakeholder = async (req: TenantRequest, res: Response) => {
    try {
      const { name, role, power, interest, engagementCurrent, engagementDesired, strategy } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: 'name is required' });
        return;
      }
      const stakeholder = await this.service.createStakeholder(req.tenant!.id, req.params.projectId, {
        name, role, power: power || 'medium', interest: interest || 'medium',
        engagementCurrent: engagementCurrent || 'unaware', engagementDesired: engagementDesired || 'supportive', strategy,
      });
      res.status(201).json({ success: true, data: stakeholder });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  updateStakeholder = async (req: TenantRequest, res: Response) => {
    try {
      const { name, role, power, interest, engagementCurrent, engagementDesired, strategy } = req.body;
      const stakeholder = await this.service.updateStakeholder(req.tenant!.id, req.params.stakeholderId, {
        name, role, power, interest, engagementCurrent, engagementDesired, strategy,
      });
      res.json({ success: true, data: stakeholder });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  deleteStakeholder = async (req: TenantRequest, res: Response) => {
    try {
      await this.service.deleteStakeholder(req.tenant!.id, req.params.stakeholderId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  // ── Comms plan ────────────────────────────────────────────────────────

  listCommsItems = async (req: TenantRequest, res: Response) => {
    try {
      const items = await this.service.listCommsItems(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createCommsItem = async (req: TenantRequest, res: Response) => {
    try {
      const { stakeholderId, audience, message, method, frequency, owner, nextDue } = req.body;
      if (!audience || !message) {
        res.status(400).json({ success: false, error: 'audience and message are required' });
        return;
      }
      const item = await this.service.createCommsItem(req.tenant!.id, req.params.projectId, {
        stakeholderId, audience, message, method, frequency, owner, nextDue,
      });
      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  deleteCommsItem = async (req: TenantRequest, res: Response) => {
    try {
      await this.service.deleteCommsItem(req.tenant!.id, req.params.itemId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  // ── RACI ──────────────────────────────────────────────────────────────

  getRaciGrid = async (req: TenantRequest, res: Response) => {
    try {
      const grid = await this.service.getRaciGrid(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: grid });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  setRaciCell = async (req: TenantRequest, res: Response) => {
    try {
      const { taskLabel, person, roleCode } = req.body;
      if (!taskLabel || !person || !['R', 'A', 'C', 'I'].includes(roleCode)) {
        res.status(400).json({ success: false, error: 'taskLabel, person and a valid roleCode (R/A/C/I) are required' });
        return;
      }
      const entry = await this.service.setRaciCell(req.tenant!.id, req.params.projectId, taskLabel, person, roleCode);
      res.status(201).json({ success: true, data: entry });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  clearRaciCell = async (req: TenantRequest, res: Response) => {
    try {
      const { taskLabel, person } = req.body;
      await this.service.clearRaciCell(req.tenant!.id, req.params.projectId, taskLabel, person);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // ── Procurement ───────────────────────────────────────────────────────

  listProcurementItems = async (req: TenantRequest, res: Response) => {
    try {
      const items = await this.service.listProcurementItems(req.tenant!.id, req.params.projectId);
      res.json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createProcurementItem = async (req: TenantRequest, res: Response) => {
    try {
      const { itemName, description, procurementType, estimatedValue } = req.body;
      if (!itemName) {
        res.status(400).json({ success: false, error: 'itemName is required' });
        return;
      }
      const item = await this.service.createProcurementItem(req.tenant!.id, req.params.projectId, {
        itemName, description, procurementType, estimatedValue,
      });
      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  addVendorOption = async (req: TenantRequest, res: Response) => {
    try {
      const { vendor, price, qualityScore, deliveryScore } = req.body;
      if (!vendor || price == null || qualityScore == null || deliveryScore == null) {
        res.status(400).json({ success: false, error: 'vendor, price, qualityScore and deliveryScore are required' });
        return;
      }
      if (Number(price) < 0) {
        res.status(400).json({ success: false, error: 'price cannot be negative' });
        return;
      }
      if (!isScore1to5(qualityScore) || !isScore1to5(deliveryScore)) {
        res.status(400).json({ success: false, error: 'qualityScore and deliveryScore must be whole numbers from 1 to 5' });
        return;
      }
      const item = await this.service.addVendorOption(req.tenant!.id, req.params.itemId, {
        vendor, price: Number(price), quality_score: Number(qualityScore), delivery_score: Number(deliveryScore),
      });
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  awardProcurementItem = async (req: TenantRequest, res: Response) => {
    try {
      const { vendor } = req.body;
      if (!vendor) {
        res.status(400).json({ success: false, error: 'vendor is required' });
        return;
      }
      const item = await this.service.awardProcurementItem(req.tenant!.id, req.params.itemId, vendor);
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };

  deleteProcurementItem = async (req: TenantRequest, res: Response) => {
    try {
      await this.service.deleteProcurementItem(req.tenant!.id, req.params.itemId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(notFound(error) ? 404 : 500).json({ success: false, error: error.message });
    }
  };
}
