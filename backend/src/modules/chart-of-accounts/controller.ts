import { Request, Response } from 'express';
import { ChartOfAccountsService } from './service';

export class ChartOfAccountsController {
  private service: ChartOfAccountsService;

  constructor() {
    this.service = new ChartOfAccountsService();
  }

  getAllAccounts = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { accountType, isActive, search } = req.query;

      const filters: any = {};
      if (accountType) filters.accountType = accountType as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (search) filters.search = search as string;

      const accounts = await this.service.getAllAccounts(tenantId, filters);

      res.json({
        success: true,
        data: accounts,
        count: accounts.length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getAccountById = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const accountId = parseInt(req.params.id);
      const account = await this.service.getAccountById(tenantId, accountId);

      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      res.json({ success: true, data: account });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  createAccount = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { account_code, account_name, account_type, parent_account_id, description, is_active } = req.body;

      if (!account_code || !account_name || !account_type) {
        return res.status(400).json({
          success: false,
          error: 'account_code, account_name, and account_type are required',
        });
      }

      const account = await this.service.createAccount(tenantId, {
        account_code,
        account_name,
        account_type,
        parent_account_id,
        description,
        is_active,
      });

      res.status(201).json({ success: true, data: account });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  updateAccount = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const accountId = parseInt(req.params.id);
      const { account_name, description, is_active } = req.body;

      const account = await this.service.updateAccount(tenantId, accountId, {
        account_name,
        description,
        is_active,
      });

      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      res.json({ success: true, data: account });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  deleteAccount = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const accountId = parseInt(req.params.id);
      const deleted = await this.service.deleteAccount(tenantId, accountId);

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Account not found or is a system account' });
      }

      res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getChildAccounts = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const parentId = parseInt(req.params.id);
      const children = await this.service.getChildAccounts(tenantId, parentId);

      res.json({ success: true, data: children, count: children.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getAccountTree = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const tree = await this.service.getAccountTree(tenantId);

      res.json({ success: true, data: tree });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getAccountTypes = async (_req: Request, res: Response) => {
    try {
      const types = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
      res.json({ success: true, data: types });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  seedDefaultAccounts = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const result = await this.service.seedDefaultAccounts(tenantId);

      res.json({
        success: true,
        message: `Created ${result.created} default accounts`,
        data: result.accounts,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
