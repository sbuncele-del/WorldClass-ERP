/**
 * Cash Management Controllers
 * 
 * REST API controllers for bank reconciliation
 */

import { Request, Response } from 'express';
import bankReconciliationService from '../services/bank-reconciliation.service';
import matchingService from '../services/matching.service';

/**
 * Bank Controllers
 */
export const getBanks = async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active_only !== 'false';
    const banks = await bankReconciliationService.getBanks(activeOnly);
    
    res.json({
      success: true,
      data: banks,
      count: banks.length
    });
  } catch (error: any) {
    console.error('Error fetching banks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getCSVPreset = async (req: Request, res: Response) => {
  try {
    const { bankCode } = req.params;
    const preset = bankReconciliationService.getCSVPresetForBank(bankCode.toUpperCase());
    
    if (!preset) {
      return res.status(404).json({
        success: false,
        error: `No CSV preset found for bank code: ${bankCode}`
      });
    }
    
    res.json({
      success: true,
      data: preset
    });
  } catch (error: any) {
    console.error('Error fetching CSV preset:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Bank Account Controllers
 */
export const getBankAccounts = async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const accounts = await bankReconciliationService.getBankAccounts(includeInactive);
    
    res.json({
      success: true,
      data: accounts,
      count: accounts.length
    });
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getBankAccountById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const account = await bankReconciliationService.getBankAccountById(id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
    }
    
    res.json({
      success: true,
      data: account
    });
  } catch (error: any) {
    console.error('Error fetching bank account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const createBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id; // Assuming auth middleware sets req.user
    const account = await bankReconciliationService.createBankAccount(req.body, userId);
    
    res.status(201).json({
      success: true,
      data: account,
      message: 'Bank account created successfully'
    });
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id = parseInt(req.params.id);
    
    const account = await bankReconciliationService.updateBankAccount(
      { ...req.body, id },
      userId
    );
    
    res.json({
      success: true,
      data: account,
      message: 'Bank account updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating bank account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Statement Controllers
 */
export const getStatements = async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    
    if (req.query.bank_account_id) {
      filter.bank_account_id = parseInt(req.query.bank_account_id as string);
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.from_date) {
      filter.from_date = new Date(req.query.from_date as string);
    }
    if (req.query.to_date) {
      filter.to_date = new Date(req.query.to_date as string);
    }
    
    const statements = await bankReconciliationService.getStatements(filter);
    
    res.json({
      success: true,
      data: statements,
      count: statements.length
    });
  } catch (error: any) {
    console.error('Error fetching statements:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const importStatement = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { statement, csvData, columnMapping } = req.body;
    
    // Parse CSV
    const parsedLines = bankReconciliationService.parseCSV(csvData, columnMapping);
    
    // Import statement
    const importedStatement = await bankReconciliationService.importStatement(
      statement,
      parsedLines,
      userId
    );
    
    res.status(201).json({
      success: true,
      data: importedStatement,
      message: `Statement imported successfully with ${parsedLines.length} lines`
    });
  } catch (error: any) {
    console.error('Error importing statement:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const parseCSVPreview = async (req: Request, res: Response) => {
  try {
    const { csvData, columnMapping } = req.body;
    
    const parsedLines = bankReconciliationService.parseCSV(csvData, columnMapping);
    
    // Return only first 10 lines for preview
    const preview = parsedLines.slice(0, 10);
    
    res.json({
      success: true,
      data: {
        total_lines: parsedLines.length,
        preview_lines: preview,
        errors: parsedLines.filter(l => l.parsing_errors && l.parsing_errors.length > 0).length
      }
    });
  } catch (error: any) {
    console.error('Error parsing CSV:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Statement Line Controllers
 */
export const getStatementLines = async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    
    if (req.query.bank_statement_id) {
      filter.bank_statement_id = parseInt(req.query.bank_statement_id as string);
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.is_reconciled !== undefined) {
      filter.is_reconciled = req.query.is_reconciled === 'true';
    }
    
    const lines = await bankReconciliationService.getStatementLines(filter);
    
    res.json({
      success: true,
      data: lines,
      count: lines.length
    });
  } catch (error: any) {
    console.error('Error fetching statement lines:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reconciliation Rule Controllers
 */
export const getReconciliationRules = async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.active_only !== 'false';
    const rules = await bankReconciliationService.getReconciliationRules(activeOnly);
    
    res.json({
      success: true,
      data: rules,
      count: rules.length
    });
  } catch (error: any) {
    console.error('Error fetching reconciliation rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const createReconciliationRule = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const rule = await bankReconciliationService.createReconciliationRule(req.body, userId);
    
    res.status(201).json({
      success: true,
      data: rule,
      message: 'Reconciliation rule created successfully'
    });
  } catch (error: any) {
    console.error('Error creating reconciliation rule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Matching Controllers
 */
export const runAutoMatching = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const statementId = parseInt(req.params.statementId);
    
    const result = await matchingService.runAutoMatching(statementId, userId);
    
    res.json({
      success: true,
      data: result,
      message: `Auto-matching complete: ${result.matched} matched, ${result.autoCreated} auto-created, ${result.suggestions.length} suggestions`
    });
  } catch (error: any) {
    console.error('Error running auto-matching:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const createMatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const match = await matchingService.createMatch(req.body, userId);
    
    res.status(201).json({
      success: true,
      data: match,
      message: 'Match created successfully'
    });
  } catch (error: any) {
    console.error('Error creating match:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const unmatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    await matchingService.unmatch(req.body, userId);
    
    res.json({
      success: true,
      message: 'Transaction unmatched successfully'
    });
  } catch (error: any) {
    console.error('Error unmatching transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reconciliation Workspace Controller
 */
export const getReconciliationWorkspace = async (req: Request, res: Response) => {
  try {
    const statementId = parseInt(req.params.statementId);
    const workspace = await matchingService.getReconciliationWorkspace(statementId);
    
    res.json({
      success: true,
      data: workspace
    });
  } catch (error: any) {
    console.error('Error fetching reconciliation workspace:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Dashboard/Summary Controllers
 */
export const getCashManagementSummary = async (req: Request, res: Response) => {
  try {
    const accounts = await bankReconciliationService.getBankAccounts(false);
    const statements = await bankReconciliationService.getStatements({});
    const rules = await bankReconciliationService.getReconciliationRules(true);
    
    // Calculate totals
    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(String(acc.current_balance)), 0);
    const unreconciledStatements = statements.filter(s => s.status !== 'RECONCILED').length;
    
    res.json({
      success: true,
      data: {
        total_bank_accounts: accounts.length,
        active_bank_accounts: accounts.filter(a => a.is_active).length,
        total_balance: totalBalance,
        total_statements: statements.length,
        unreconciled_statements: unreconciledStatements,
        active_rules: rules.length,
        accounts: accounts.map(a => ({
          id: a.id,
          name: a.account_name,
          bank: a.account_name || (a.bank as any)?.bank_name,
          balance: a.current_balance,
          last_reconciled: a.last_reconciled_date
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching cash management summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Duplicate Detection Controllers
 */
export const checkDuplicates = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { bankStatementLineId, journalEntryLineId } = req.body;

    if (!bankStatementLineId || !journalEntryLineId) {
      return res.status(400).json({
        success: false,
        error: 'bankStatementLineId and journalEntryLineId are required'
      });
    }

    const result = await matchingService.checkDuplicates(
      bankStatementLineId,
      journalEntryLineId,
      tenantId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const findPotentialDuplicates = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const options = {
      dateRange: req.query.dateRange ? parseInt(req.query.dateRange as string) : undefined,
      amountTolerance: req.query.amountTolerance ? parseFloat(req.query.amountTolerance as string) : undefined,
      includeMatched: req.query.includeMatched === 'true'
    };

    const duplicates = await matchingService.findPotentialDuplicates(tenantId, options);

    res.json({
      success: true,
      data: duplicates,
      count: duplicates.length
    });
  } catch (error: any) {
    console.error('Error finding potential duplicates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

