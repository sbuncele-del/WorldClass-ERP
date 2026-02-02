import { Request, Response } from 'express';
import { FinancialReportsService } from './service';

export class FinancialReportsController {
  private service: FinancialReportsService;

  constructor() {
    this.service = new FinancialReportsService();
  }

  /**
   * GET /api/financial-reports/trial-balance
   */
  getTrialBalance = async (req: Request, res: Response) => {
    try {
      const { asOfDate, includeZeroBalances } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001';

      const result = await this.service.getTrialBalance({
        asOfDate: asOfDate as string,
        tenantId,
        includeZeroBalances: includeZeroBalances === 'true',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting trial balance:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get trial balance',
      });
    }
  };

  /**
   * GET /api/financial-reports/balance-sheet
   */
  getBalanceSheet = async (req: Request, res: Response) => {
    try {
      const { asOfDate } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001';

      const result = await this.service.getBalanceSheet({
        asOfDate: asOfDate as string,
        tenantId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting balance sheet:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get balance sheet',
      });
    }
  };

  /**
   * GET /api/financial-reports/profit-loss
   */
  getProfitAndLoss = async (req: Request, res: Response) => {
    try {
      const { fromDate, toDate } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001';

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate are required',
        });
      }

      const result = await this.service.getProfitAndLoss({
        fromDate: fromDate as string,
        toDate: toDate as string,
        tenantId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting profit and loss:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get profit and loss',
      });
    }
  };

  /**
   * GET /api/financial-reports/account-transactions/:accountId
   */
  getAccountTransactions = async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const { fromDate, toDate, limit, offset } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001';

      if (!accountId || isNaN(parseInt(accountId))) {
        return res.status(400).json({
          success: false,
          error: 'Valid accountId is required',
        });
      }

      const result = await this.service.getAccountTransactions({
        accountId: parseInt(accountId),
        fromDate: fromDate as string,
        toDate: toDate as string,
        tenantId,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting account transactions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get account transactions',
      });
    }
  };

  /**
   * GET /api/financial-reports/cash-flow
   */
  getCashFlow = async (req: Request, res: Response) => {
    try {
      const { fromDate, toDate } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001';

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate are required',
        });
      }

      const result = await this.service.getCashFlow({
        fromDate: fromDate as string,
        toDate: toDate as string,
        tenantId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting cash flow:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get cash flow',
      });
    }
  };

  /**
   * GET /api/financial/general-ledger
   * General Ledger - All account transactions with running balances
   */
  getGeneralLedger = async (req: Request, res: Response) => {
    try {
      const { fromDate, toDate, accountId } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001';

      const result = await this.service.getGeneralLedger({
        fromDate: fromDate as string,
        toDate: toDate as string,
        accountId: accountId as string,
        tenantId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting general ledger:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get general ledger',
      });
    }
  };

  /**
   * GET /api/financial/aged-receivables
   * Aged Receivables Report - Customer balances by aging buckets
   */
  getAgedReceivables = async (req: Request, res: Response) => {
    try {
      const { asOfDate } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001';

      const result = await this.service.getAgedReceivables({
        asOfDate: asOfDate as string || new Date().toISOString().split('T')[0],
        tenantId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting aged receivables:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get aged receivables',
      });
    }
  };

  /**
   * GET /api/financial/aged-payables
   * Aged Payables Report - Vendor balances by aging buckets
   */
  getAgedPayables = async (req: Request, res: Response) => {
    try {
      const { asOfDate } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001';

      const result = await this.service.getAgedPayables({
        asOfDate: asOfDate as string || new Date().toISOString().split('T')[0],
        tenantId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting aged payables:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get aged payables',
      });
    }
  };

  /**
   * GET /api/financial/vat-report
   * VAT Report - Input/Output VAT summary for SARS compliance
   */
  getVatReport = async (req: Request, res: Response) => {
    try {
      const { fromDate, toDate } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001';

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'fromDate and toDate are required',
        });
      }

      const result = await this.service.getVatReport({
        fromDate: fromDate as string,
        toDate: toDate as string,
        tenantId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting VAT report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get VAT report',
      });
    }
  };
}
