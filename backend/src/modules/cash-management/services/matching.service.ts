/**
 * Cash Management Service - Part 2: Matching Algorithms
 * 
 * Auto-matching logic for bank reconciliation
 */

import pool from '../../../config/database';
import {
  BankStatementLine,
  BankReconciliationRule,
  BankReconciliationMatch,
  SuggestedMatch,
  ReconciliationWorkspaceData,
  ReconciliationStatistics,
  CreateMatchDto,
  UnmatchDto,
  MatchType,
  StatementLineStatus,
  MatchStatus,
  RuleActionType,
  ReconciliationRuleType
} from '../models/cash-management.model';

export class MatchingService {
  
  // ============================================================
  // AUTO-MATCHING ALGORITHMS
  // ============================================================
  
  /**
   * Run auto-matching for a bank statement
   */
  async runAutoMatching(statementId: number, userId?: string, tenantId?: string): Promise<{
    matched: number;
    suggestions: SuggestedMatch[];
    autoCreated: number;
  }> {
    if (!tenantId) throw new Error('Tenant ID is required');
    const client = await pool.connect();
    
    try {
      // Ensure statement belongs to tenant
      const stmtCheck = await client.query(
        'SELECT tenant_id FROM bank_statements WHERE id = $1',
        [statementId]
      );
      const stmtTenant = stmtCheck.rows[0]?.tenant_id;
      if (!stmtTenant || stmtTenant !== tenantId) {
        throw new Error('Statement not found for tenant');
      }
      
      await client.query('BEGIN');
      
      // Get unmatched lines
      const linesResult = await client.query(`
        SELECT * FROM bank_statement_lines
        WHERE bank_statement_id = $1 
        AND status = $2
        AND is_ignored = false
        ORDER BY transaction_date ASC, line_number ASC
      `, [statementId, StatementLineStatus.UNMATCHED]);
      
      const lines = linesResult.rows;
      
      // Get active rules (ordered by priority)
      const rulesResult = await client.query(`
        SELECT * FROM bank_reconciliation_rules
        WHERE is_active = true
        AND (apply_to_all_accounts = true OR specific_bank_account_id = (
          SELECT bank_account_id FROM bank_statements WHERE id = $1
        ))
        ORDER BY priority DESC
      `, [statementId]);
      
      const rules = rulesResult.rows;
      
      let matchedCount = 0;
      let autoCreatedCount = 0;
      const suggestions: SuggestedMatch[] = [];
      
      // Process each line
      for (const line of lines) {
        let matchedThisLine = false;
        
        // Try each rule (in priority order)
        for (const rule of rules) {
          if (matchedThisLine) break; // Already matched by higher priority rule
          
          const matches = await this.applyRule(line, rule, client);
          
          if (matches.length > 0) {
            if (rule.action_type === RuleActionType.AUTO_MATCH && matches[0].confidence_score >= 90) {
              // Auto-match with high confidence
              await this.createMatch({
                bank_statement_line_id: line.id,
                journal_entry_id: matches[0].journal_entry.id,
                journal_entry_line_id: matches[0].journal_entry.line_id,
                match_type: MatchType.AUTO,
                rule_id: rule.id,
                confidence_score: matches[0].confidence_score
              }, userId, undefined, client);
              
              matchedCount++;
              matchedThisLine = true;
              
              // Update rule stats
              await client.query(`
                UPDATE bank_reconciliation_rules
                SET times_applied = times_applied + 1, last_applied_at = NOW()
                WHERE id = $1
              `, [rule.id]);
              
            } else if (rule.action_type === RuleActionType.CREATE_JOURNAL && rule.auto_create_journal) {
              // Auto-create journal entry
              const journalEntry = await this.createJournalFromLine(line, rule, client, userId);
              
              if (journalEntry) {
                await this.createMatch({
                  bank_statement_line_id: line.id,
                  journal_entry_id: journalEntry.id,
                  journal_entry_line_id: journalEntry.line_id,
                  match_type: MatchType.SYSTEM,
                  rule_id: rule.id,
                  confidence_score: rule.confidence_score
                }, userId, undefined, client);
                
                matchedCount++;
                autoCreatedCount++;
                matchedThisLine = true;
              }
            } else {
              // Add as suggestion
              suggestions.push(...matches);
            }
          }
        }
      }
      
      // Update statement statistics
      await client.query(`
        UPDATE bank_statements SET
          matched_lines = (
            SELECT COUNT(*) FROM bank_statement_lines
            WHERE bank_statement_id = $1 AND status = $2
          ),
          unmatched_lines = (
            SELECT COUNT(*) FROM bank_statement_lines
            WHERE bank_statement_id = $1 AND status = $3
          ),
          status = CASE
            WHEN (SELECT COUNT(*) FROM bank_statement_lines WHERE bank_statement_id = $1 AND status = $3) = 0
            THEN 'RECONCILED'
            ELSE 'IN_PROGRESS'
          END
        WHERE id = $1
      `, [statementId, StatementLineStatus.MATCHED, StatementLineStatus.UNMATCHED]);
      
      await client.query('COMMIT');
      
      return {
        matched: matchedCount,
        suggestions,
        autoCreated: autoCreatedCount
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Apply a single rule to a statement line
   */
  private async applyRule(
    line: BankStatementLine,
    rule: BankReconciliationRule,
    client: any
  ): Promise<SuggestedMatch[]> {
    
    // Determine the amount to match
    const lineAmount = line.debit_amount > 0 ? line.debit_amount : line.credit_amount;
    const lineType = line.debit_amount > 0 ? 'DEBIT' : 'CREDIT';
    
    // Check transaction type filter
    if (rule.transaction_type_filter && rule.transaction_type_filter !== lineType) {
      return [];
    }
    
    // Check amount range filter
    if (rule.min_amount && lineAmount < rule.min_amount) {
      return [];
    }
    if (rule.max_amount && lineAmount > rule.max_amount) {
      return [];
    }
    
    // Apply rule type specific matching
    switch (rule.rule_type) {
      case ReconciliationRuleType.EXACT_AMOUNT:
        return await this.matchByExactAmount(line, rule, client);
        
      case ReconciliationRuleType.REFERENCE_MATCH:
        return await this.matchByReference(line, rule, client);
        
      case ReconciliationRuleType.PAYEE_MATCH:
        return await this.matchByPayee(line, rule, client);
        
      case ReconciliationRuleType.KEYWORD:
        return await this.matchByKeyword(line, rule, client);
        
      case ReconciliationRuleType.COMBINED:
        // Combined rules use multiple criteria
        return await this.matchByCombined(line, rule, client);
        
      default:
        return [];
    }
  }
  
  /**
   * Match by exact amount (within tolerance)
   */
  private async matchByExactAmount(
    line: BankStatementLine,
    rule: BankReconciliationRule,
    client: any
  ): Promise<SuggestedMatch[]> {
    
    const lineAmount = line.debit_amount > 0 ? line.debit_amount : line.credit_amount;
    const tolerance = rule.amount_tolerance || 0.01;
    
    // Get the bank account's GL code
    const bankAccountResult = await client.query(`
      SELECT ba.gl_account_code
      FROM bank_statements s
      INNER JOIN bank_accounts ba ON s.bank_account_id = ba.id
      WHERE s.id = $1
    `, [line.bank_statement_id]);
    
    const bankGLCode = bankAccountResult.rows[0]?.gl_account_code;
    
    // Find journal entry lines with matching amount (opposite side)
    // If statement line is DEBIT (money out), look for CREDIT in GL
    // If statement line is CREDIT (money in), look for DEBIT in GL
    const oppositeField = line.debit_amount > 0 ? 'debit_amount' : 'credit_amount';
    
    const dateOffset = rule.date_offset_days || 3;
    const minDate = new Date(line.transaction_date);
    minDate.setDate(minDate.getDate() - dateOffset);
    const maxDate = new Date(line.transaction_date);
    maxDate.setDate(maxDate.getDate() + dateOffset);
    
    const query = `
      SELECT 
        je.id as journal_entry_id,
        je.journal_number,
        je.description as journal_description,
        je.journal_date,
        jel.id as line_id,
        jel.${oppositeField} as amount,
        jel.line_description,
        jel.reference,
        jel.account_code
      FROM journal_entry_lines jel
      INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_code = $1
      AND je.status = 'POSTED'
      AND jel.is_reconciled = false
      AND jel.${oppositeField} >= $2
      AND jel.${oppositeField} <= $3
      AND je.journal_date >= $4
      AND je.journal_date <= $5
      LIMIT 10
    `;
    
    const result = await client.query(query, [
      bankGLCode,
      lineAmount - tolerance,
      lineAmount + tolerance,
      minDate,
      maxDate
    ]);
    
    // Calculate confidence scores
    const matches: SuggestedMatch[] = result.rows.map((row: any) => {
      const amountDiff = Math.abs(row.amount - lineAmount);
      const amountScore = Math.max(0, 100 - (amountDiff / lineAmount * 100));
      
      const dateDiff = Math.abs(
        new Date(line.transaction_date).getTime() - new Date(row.journal_date).getTime()
      ) / (1000 * 60 * 60 * 24); // Days
      const dateScore = Math.max(0, 100 - (dateDiff * 10)); // -10 points per day
      
      const confidence = (amountScore * 0.7 + dateScore * 0.3);
      
      return {
        statement_line: line,
        journal_entry: row,
        confidence_score: Math.min(confidence, rule.confidence_score),
        rule_name: rule.rule_name,
        match_reasons: [
          `Amount match: R${row.amount.toFixed(2)} (±R${tolerance.toFixed(2)})`,
          `Date within ${dateOffset} days`,
          `GL Account: ${row.account_code}`
        ]
      };
    });
    
    return matches.sort((a, b) => b.confidence_score - a.confidence_score);
  }
  
  /**
   * Match by reference number
   */
  private async matchByReference(
    line: BankStatementLine,
    rule: BankReconciliationRule,
    client: any
  ): Promise<SuggestedMatch[]> {
    
    if (!line.reference_number) {
      return [];
    }
    
    const bankAccountResult = await client.query(`
      SELECT ba.gl_account_code
      FROM bank_statements s
      INNER JOIN bank_accounts ba ON s.bank_account_id = ba.id
      WHERE s.id = $1
    `, [line.bank_statement_id]);
    
    const bankGLCode = bankAccountResult.rows[0]?.gl_account_code;
    
    // Search for reference in journal entry lines
    const query = `
      SELECT 
        je.id as journal_entry_id,
        je.journal_number,
        je.description as journal_description,
        je.journal_date,
        jel.id as line_id,
        jel.debit_amount + jel.credit_amount as amount,
        jel.line_description,
        jel.reference,
        jel.account_code
      FROM journal_entry_lines jel
      INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_code = $1
      AND je.status = 'POSTED'
      AND jel.is_reconciled = false
      AND (jel.reference ILIKE $2 OR je.source_document_number ILIKE $2)
      LIMIT 10
    `;
    
    const result = await client.query(query, [
      bankGLCode,
      `%${line.reference_number}%`
    ]);
    
    const matches: SuggestedMatch[] = result.rows.map((row: any) => ({
      statement_line: line,
      journal_entry: row,
      confidence_score: rule.confidence_score,
      rule_name: rule.rule_name,
      match_reasons: [
        `Reference number match: ${line.reference_number}`,
        `Journal: ${row.journal_number}`,
        `GL Account: ${row.account_code}`
      ]
    }));
    
    return matches;
  }
  
  /**
   * Match by payee/payer name (fuzzy matching)
   */
  private async matchByPayee(
    line: BankStatementLine,
    rule: BankReconciliationRule,
    client: any
  ): Promise<SuggestedMatch[]> {
    
    if (!line.payee_payer) {
      return [];
    }
    
    // Simple fuzzy matching - search for keywords from payee name
    const keywords = line.payee_payer.split(' ').filter(word => word.length > 3);
    
    if (keywords.length === 0) {
      return [];
    }
    
    const bankAccountResult = await client.query(`
      SELECT ba.gl_account_code
      FROM bank_statements s
      INNER JOIN bank_accounts ba ON s.bank_account_id = ba.id
      WHERE s.id = $1
    `, [line.bank_statement_id]);
    
    const bankGLCode = bankAccountResult.rows[0]?.gl_account_code;
    
    // Build ILIKE query for each keyword
    const likeConditions = keywords.map((_, i) => `jel.line_description ILIKE $${i + 3}`).join(' OR ');
    const likeParams = keywords.map(k => `%${k}%`);
    
    const query = `
      SELECT 
        je.id as journal_entry_id,
        je.journal_number,
        je.description as journal_description,
        je.journal_date,
        jel.id as line_id,
        jel.debit_amount + jel.credit_amount as amount,
        jel.line_description,
        jel.reference,
        jel.account_code
      FROM journal_entry_lines jel
      INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_code = $1
      AND je.status = 'POSTED'
      AND jel.is_reconciled = false
      AND (${likeConditions})
      LIMIT 10
    `;
    
    const result = await client.query(query, [bankGLCode, line.bank_statement_id, ...likeParams]);
    
    const matches: SuggestedMatch[] = result.rows.map((row: any) => ({
      statement_line: line,
      journal_entry: row,
      confidence_score: rule.confidence_score,
      rule_name: rule.rule_name,
      match_reasons: [
        `Payee match: ${line.payee_payer}`,
        `Journal description: ${row.journal_description}`,
        `GL Account: ${row.account_code}`
      ]
    }));
    
    return matches;
  }
  
  /**
   * Match by keyword in description
   */
  private async matchByKeyword(
    line: BankStatementLine,
    rule: BankReconciliationRule,
    client: any
  ): Promise<SuggestedMatch[]> {
    
    if (!line.description || !rule.match_value) {
      return [];
    }
    
    // Check if description contains any of the keywords (pipe-separated)
    const keywords = rule.match_value.split('|').map(k => k.trim().toLowerCase());
    const descLower = line.description.toLowerCase();
    
    const matched = keywords.some(keyword => descLower.includes(keyword));
    
    if (!matched) {
      return [];
    }
    
    // Keyword matched - this is typically for auto-journal creation
    // Return empty array (will be handled by CREATE_JOURNAL action)
    return [];
  }
  
  /**
   * Match by combined criteria
   */
  private async matchByCombined(
    line: BankStatementLine,
    rule: BankReconciliationRule,
    client: any
  ): Promise<SuggestedMatch[]> {
    
    // Combined rules check multiple conditions
    // For now, just apply amount and date range checks
    return await this.matchByExactAmount(line, rule, client);
  }
  
  // ============================================================
  // MANUAL MATCHING
  // ============================================================
  
  /**
   * Create a manual match
   */
  async createMatch(
    dto: CreateMatchDto | any,
    userId?: string,
    tenantId?: string,
    client?: any
  ): Promise<BankReconciliationMatch> {
    if (!tenantId) throw new Error('Tenant ID is required');
    
    // Normalize parameter names (frontend uses camelCase, DB uses snake_case)
    const normalizedDto = {
      bank_statement_line_id: dto.bank_statement_line_id || dto.bankLineId,
      journal_entry_line_id: dto.journal_entry_line_id || dto.journalLineId,
      journal_entry_id: dto.journal_entry_id || dto.journalId || null,
      match_type: dto.match_type || dto.matchType || 'SIMPLE',
      rule_id: dto.rule_id || dto.ruleId || null,
      confidence_score: dto.confidence_score || dto.confidenceScore || null,
      notes: dto.notes || null,
    };
    
    const shouldRelease = !client;
    if (!client) {
      client = await pool.connect();
    }
    
    try {
      if (shouldRelease) {
        await client.query('BEGIN');
      }
      
      // Get amounts
      const lineResult = await client.query(
        `SELECT bsl.debit_amount, bsl.credit_amount, bs.tenant_id
         FROM bank_statement_lines bsl
         JOIN bank_statements bs ON bsl.bank_statement_id = bs.id
         WHERE bsl.id = $1`,
        [normalizedDto.bank_statement_line_id]
      );
      
      const line = lineResult.rows[0];
      if (!line) {
        throw new Error(`Bank statement line with ID ${normalizedDto.bank_statement_line_id} not found`);
      }
      if (line.tenant_id !== tenantId) {
        throw new Error('Bank statement line does not belong to tenant');
      }
      const statementAmount = line.debit_amount > 0 ? line.debit_amount : line.credit_amount;
      
      const jeLineResult = await client.query(
        'SELECT debit_amount, credit_amount, entry_id FROM journal_entry_lines WHERE line_id = $1',
        [normalizedDto.journal_entry_line_id]
      );
      
      const jeLine = jeLineResult.rows[0];
      if (!jeLine) {
        throw new Error(`Journal entry line with ID ${normalizedDto.journal_entry_line_id} not found`);
      }
      const journalAmount = jeLine.debit_amount > 0 ? jeLine.debit_amount : jeLine.credit_amount;
      
      // Use entry_id from journal line if not provided
      if (!normalizedDto.journal_entry_id) {
        normalizedDto.journal_entry_id = jeLine.entry_id;
      }
      
      // Create match
      const matchQuery = `
        INSERT INTO bank_reconciliation_matches (
          bank_statement_line_id, journal_entry_id, journal_entry_line_id,
          match_type, matched_by, rule_id, confidence_score,
          statement_amount, journal_amount, status, notes, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const matchValues = [
        normalizedDto.bank_statement_line_id,
        normalizedDto.journal_entry_id,
        normalizedDto.journal_entry_line_id || null,
        normalizedDto.match_type,
        userId || null,
        normalizedDto.rule_id || null,
        normalizedDto.confidence_score || null,
        statementAmount,
        journalAmount,
        MatchStatus.ACTIVE,
        normalizedDto.notes || null,
        tenantId
      ];
      
      const matchResult = await client.query(matchQuery, matchValues);
      
      // Update statement line status
      await client.query(`
        UPDATE bank_statement_lines
        SET status = $1,
            matched_journal_entry_id = $2,
            matched_journal_line_id = $3,
            matched_at = NOW(),
            matched_by = $4,
            matching_rule_id = $5,
            matching_confidence = $6,
            is_reconciled = true
        WHERE id = $7
      `, [
        StatementLineStatus.MATCHED,
        dto.journal_entry_id,
        dto.journal_entry_line_id,
        userId,
        dto.rule_id,
        dto.confidence_score,
        dto.bank_statement_line_id
      ]);
      
      // Update journal entry line
      await client.query(`
        UPDATE journal_entry_lines
        SET is_reconciled = true,
            reconciled_at = NOW()
        WHERE line_id = $1
      `, [normalizedDto.journal_entry_line_id]);
      
      // Post bank clearing entry to GL (only if not already posted by the journal entry)
      // Get bank account GL code and journal entry details
      const bankGLResult = await client.query(`
        SELECT 
          ba.gl_account_code,
          ba.account_id as bank_account_gl_id,
          COALESCE(bsl.debit_amount, 0) as debit_amount,
          COALESCE(bsl.credit_amount, 0) as credit_amount,
          bsl.transaction_type,
          je.entry_id,
          je.entry_number,
          bsl.tenant_id,
          jel.account_id as journal_line_account_id
        FROM bank_statement_lines bsl
        JOIN bank_statements bs ON bsl.bank_statement_id = bs.id
        JOIN bank_accounts ba ON bs.bank_account_id = ba.id
        LEFT JOIN journal_entry_lines jel ON jel.line_id = $1
        LEFT JOIN journal_entries je ON jel.entry_id = je.entry_id
        WHERE bsl.id = $2
      `, [normalizedDto.journal_entry_line_id, normalizedDto.bank_statement_line_id]);
      
      if (bankGLResult.rows.length > 0) {
        const { gl_account_code, bank_account_gl_id, debit_amount, credit_amount, transaction_type, entry_id, entry_number, tenant_id, journal_line_account_id } = bankGLResult.rows[0];
        const line_amount = parseFloat(debit_amount) > 0 ? parseFloat(debit_amount) : parseFloat(credit_amount);
        
        // Get GL account ID for bank account
        const glAccountResult = await client.query(
          'SELECT account_id FROM chart_of_accounts WHERE account_code = $1',
          [gl_account_code || '1100']
        );
        
        if (glAccountResult.rows.length > 0) {
          const accountId = glAccountResult.rows[0].account_id;
          
          // CRITICAL FIX: Check if the matched journal entry already posted to this bank account
          // If the journal line's account_id matches the bank account's GL account_id,
          // then the journal entry already recorded the bank transaction - skip posting
          const journalAlreadyPostedToBank = journal_line_account_id === accountId;
          
          if (!journalAlreadyPostedToBank) {
            // Only post GL transaction if journal entry didn't already post to bank
            const matchId = matchResult.rows[0].id;
            
            // Post clearing transaction
            // If bank line is CREDIT (money in), debit bank account
            // If bank line is DEBIT (money out), credit bank account
            await client.query(`
              INSERT INTO gl_transactions (
                transaction_date, posting_date, account_id, source_type, source_id,
                description, reference_number, debit_amount, credit_amount, 
                tenant_id, posted_at, journal_entry_id
              )
              VALUES (CURRENT_DATE, CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
            `, [
              accountId,
              'BANK_RECONCILIATION',
              matchId,
              `Bank reconciliation - Match #${matchId} - ${entry_number || 'Manual Entry'}`,
              `RECON-${matchId}`,
              transaction_type === 'CREDIT' ? line_amount : 0, // Money in = debit bank
              transaction_type === 'DEBIT' ? line_amount : 0,  // Money out = credit bank
              tenant_id,
              entry_id
            ]);
            
            // Update account balance
            await client.query(`
              INSERT INTO account_balances (
                account_id, tenant_id, current_balance, ytd_debit, ytd_credit, last_updated
              )
              VALUES ($1, $2, $3, $4, $5, NOW())
              ON CONFLICT (account_id, tenant_id)
              DO UPDATE SET
                current_balance = account_balances.current_balance + EXCLUDED.current_balance,
                ytd_debit = account_balances.ytd_debit + EXCLUDED.ytd_debit,
                ytd_credit = account_balances.ytd_credit + EXCLUDED.ytd_credit,
                last_updated = NOW()
            `, [
              accountId,
              tenant_id,
              transaction_type === 'CREDIT' ? line_amount : -line_amount, // Debit increases asset, credit decreases
              transaction_type === 'CREDIT' ? line_amount : 0,
              transaction_type === 'DEBIT' ? line_amount : 0
            ]);
          }
        }
      }
      
      if (shouldRelease) {
        await client.query('COMMIT');
      }
      
      return matchResult.rows[0];
      
    } catch (error) {
      if (shouldRelease) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }
  
  /**
   * Unmatch a transaction
   */
  async unmatch(dto: UnmatchDto, userId?: string, tenantId?: string): Promise<void> {
    if (!tenantId) throw new Error('Tenant ID is required');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get match details
      const matchResult = await client.query(
        'SELECT * FROM bank_reconciliation_matches WHERE id = $1 AND tenant_id = $2',
        [dto.match_id, tenantId]
      );
      
      const match = matchResult.rows[0];
      
      if (!match) {
        throw new Error('Match not found');
      }
      
      // Update match status
      await client.query(`
        UPDATE bank_reconciliation_matches
        SET status = $1,
            unmatched_at = NOW(),
            unmatched_by = $2,
            unmatch_reason = $3
        WHERE id = $4 AND tenant_id = $5
      `, [MatchStatus.UNMATCHED, userId, dto.unmatch_reason, dto.match_id, tenantId]);
      
      // Update statement line
      await client.query(`
        UPDATE bank_statement_lines
        SET status = $1,
            matched_journal_entry_id = NULL,
            matched_journal_line_id = NULL,
            matched_at = NULL,
            matched_by = NULL,
            matching_rule_id = NULL,
            matching_confidence = NULL,
            is_reconciled = false
        WHERE id = $2
      `, [StatementLineStatus.UNMATCHED, match.bank_statement_line_id]);
      
      // Update journal entry line
      await client.query(`
        UPDATE journal_entry_lines
        SET is_reconciled = false,
            reconciled_at = NULL
        WHERE id = $1
      `, [match.journal_entry_line_id]);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create journal entry from statement line (for auto-journal rules)
   */
  private async createJournalFromLine(
    line: BankStatementLine,
    rule: BankReconciliationRule,
    client: any,
    userId?: string
  ): Promise<any> {
    
    if (!rule.default_account_code) {
      return null;
    }
    
    // Get bank account GL code
    const bankAccountResult = await client.query(`
      SELECT ba.gl_account_code, ba.account_name
      FROM bank_statements s
      INNER JOIN bank_accounts ba ON s.bank_account_id = ba.id
      WHERE s.id = $1
    `, [line.bank_statement_id]);
    
    const bankGLCode = bankAccountResult.rows[0]?.gl_account_code;
    const bankAccountName = bankAccountResult.rows[0]?.account_name;
    
    // Generate journal number
    const journalNumber = `BNK-${Date.now()}`;
    
    // Determine amounts
    const amount = line.debit_amount > 0 ? line.debit_amount : line.credit_amount;
    const isDebit = line.debit_amount > 0;
    
    // Create journal entry
    const jeQuery = `
      INSERT INTO journal_entries (
        journal_number, journal_date, posting_date, source_type,
        description, status, fiscal_year, fiscal_period,
        total_debit, total_credit, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const jeResult = await client.query(jeQuery, [
      journalNumber,
      line.transaction_date,
      line.transaction_date,
      'BANK',
      `Auto-created: ${line.description}`,
      'POSTED',
      currentYear,
      currentMonth,
      amount,
      amount,
      userId
    ]);
    
    const journalEntryId = jeResult.rows[0].id;
    
    // Create lines (one for bank account, one for expense/income)
    const line1Query = `
      INSERT INTO journal_entry_lines (
        journal_entry_id, line_number, account_id, account_code, account_name,
        debit_amount, credit_amount, line_description
      ) VALUES (
        $1, 1, (SELECT account_id FROM chart_of_accounts WHERE account_code = $2), $2,
        $3, $4, $5, $6
      ) RETURNING id
    `;
    
    // Line 1: Bank account (opposite of statement line)
    await client.query(line1Query, [
      journalEntryId,
      bankGLCode,
      bankAccountName,
      isDebit ? 0 : amount,  // If statement shows debit (money out), credit the bank
      isDebit ? amount : 0,  // If statement shows credit (money in), debit the bank
      line.description
    ]);
    
    // Line 2: Expense/Income account
    const line2Result = await client.query(line1Query, [
      journalEntryId,
      rule.default_account_code,
      rule.default_account_code,
      isDebit ? amount : 0,  // If statement shows debit (expense), debit expense account
      isDebit ? 0 : amount,  // If statement shows credit (income), credit income account
      line.description
    ]);
    
    return {
      id: journalEntryId,
      line_id: line2Result.rows[0].id
    };
  }
  
  // ============================================================
  // RECONCILIATION WORKSPACE
  // ============================================================
  
  /**
   * Get reconciliation workspace data for a statement
   */
  async getReconciliationWorkspace(statementId: number, tenantId?: string): Promise<ReconciliationWorkspaceData> {
    if (!tenantId) throw new Error('Tenant ID is required');
    const client = await pool.connect();
    
    try {
      // Get statement
      const statementResult = await client.query(
        'SELECT * FROM bank_statements WHERE id = $1 AND tenant_id = $2',
        [statementId, tenantId]
      );
      const statement = statementResult.rows[0];
      if (!statement) {
        throw new Error('Statement not found for tenant');
      }
      
      // Get all lines
      const linesResult = await client.query(
        'SELECT * FROM bank_statement_lines WHERE bank_statement_id = $1 ORDER BY line_number',
        [statementId]
      );
      const statement_lines = linesResult.rows;
      
      // Get unmatched lines
      const unmatchedLines = statement_lines.filter(
        (l: BankStatementLine) => l.status === StatementLineStatus.UNMATCHED
      );
      
      // Get GL transactions for the period (from bank account)
      const bankAccountResult = await client.query(`
        SELECT ba.gl_account_code
        FROM bank_statements s
        INNER JOIN bank_accounts ba ON s.bank_account_id = ba.id
        WHERE s.id = $1
      `, [statementId]);
      
      const bankGLCode = bankAccountResult.rows[0]?.gl_account_code;
      
      const glResult = await client.query(`
        SELECT 
          je.id,
          je.journal_number,
          je.journal_date,
          je.description,
          jel.id as line_id,
          jel.debit_amount,
          jel.credit_amount,
          jel.line_description,
          jel.reference,
          jel.is_reconciled
        FROM journal_entry_lines jel
        INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_code = $1
        AND je.journal_date >= $2
        AND je.journal_date <= $3
        AND je.status = 'POSTED'
        ORDER BY je.journal_date DESC
      `, [bankGLCode, statement.from_date, statement.to_date]);
      
      const gl_transactions = glResult.rows;
      
      // Get suggested matches (run auto-matching but don't save)
      const suggested_matches: SuggestedMatch[] = [];
      
      // Calculate statistics
      const statistics: ReconciliationStatistics = {
        total_lines: statement_lines.length,
        matched_lines: statement_lines.filter((l: BankStatementLine) => l.status === StatementLineStatus.MATCHED).length,
        unmatched_lines: unmatchedLines.length,
        ignored_lines: statement_lines.filter((l: BankStatementLine) => l.is_ignored).length,
        manual_entries_needed: unmatchedLines.filter((l: BankStatementLine) => l.requires_manual_review).length,
        total_matched_amount: statement_lines
          .filter((l: BankStatementLine) => l.status === StatementLineStatus.MATCHED)
          .reduce((sum: number, l: BankStatementLine) => sum + (l.debit_amount || 0) + (l.credit_amount || 0), 0),
        total_unmatched_amount: unmatchedLines
          .reduce((sum: number, l: BankStatementLine) => sum + (l.debit_amount || 0) + (l.credit_amount || 0), 0),
        reconciliation_percentage: statement_lines.length > 0
          ? (statement_lines.filter((l: BankStatementLine) => l.status === StatementLineStatus.MATCHED).length / statement_lines.length) * 100
          : 0
      };
      
      return {
        statement,
        statement_lines,
        unmatched_lines: unmatchedLines,
        gl_transactions,
        suggested_matches,
        statistics
      };
      
    } finally {
      client.release();
    }
  }

  // ============================================================
  // DUPLICATE DETECTION
  // ============================================================

  /**
   * Check for duplicates before matching
   * Returns warnings if potential duplicates found
   */
  async checkDuplicates(
    bankStatementLineId: number,
    journalEntryLineId: number,
    tenantId?: string
  ): Promise<{
    isDuplicate: boolean;
    warnings: string[];
    duplicateType?: 'BANK_LINE_MATCHED' | 'JOURNAL_LINE_MATCHED' | 'SIMILAR_TRANSACTION';
    duplicateDetails?: any;
  }> {
    if (!tenantId) throw new Error('Tenant ID is required');
    const client = await pool.connect();
    
    try {
      const warnings: string[] = [];
      let isDuplicate = false;
      let duplicateType: 'BANK_LINE_MATCHED' | 'JOURNAL_LINE_MATCHED' | 'SIMILAR_TRANSACTION' | undefined;
      let duplicateDetails: any;

      // Check 1: Bank line already matched?
      const bankLineMatchResult = await client.query(
        `SELECT 
          brm.*,
          u.full_name as matched_by_name,
          u.email as matched_by_email
         FROM bank_reconciliation_matches brm
         LEFT JOIN users u ON brm.matched_by = u.id
         WHERE brm.bank_statement_line_id = $1 
         AND brm.status = 'ACTIVE'
         AND brm.tenant_id = $2`,
        [bankStatementLineId, tenantId]
      );

      if (bankLineMatchResult.rows.length > 0) {
        const existingMatch = bankLineMatchResult.rows[0];
        isDuplicate = true;
        duplicateType = 'BANK_LINE_MATCHED';
        duplicateDetails = existingMatch;
        warnings.push(
          `Bank statement line #${bankStatementLineId} is already matched ` +
          `(Match ID: ${existingMatch.id}, Matched by: ${existingMatch.matched_by_name || 'System'} ` +
          `on ${new Date(existingMatch.match_date).toLocaleDateString()})`
        );
      }

      // Check 2: Journal line already matched?
      const journalLineMatchResult = await client.query(
        `SELECT 
          brm.*,
          bsl.id as bank_line_id,
          bsl.description as bank_description,
          COALESCE(bsl.debit_amount, bsl.credit_amount, 0) as bank_amount,
          u.full_name as matched_by_name
         FROM bank_reconciliation_matches brm
         JOIN bank_statement_lines bsl ON brm.bank_statement_line_id = bsl.id
         LEFT JOIN users u ON brm.matched_by = u.id
         WHERE brm.journal_entry_line_id = $1 
         AND brm.status = 'ACTIVE'
         AND brm.tenant_id = $2`,
        [journalEntryLineId, tenantId]
      );

      if (journalLineMatchResult.rows.length > 0) {
        const existingMatch = journalLineMatchResult.rows[0];
        isDuplicate = true;
        duplicateType = 'JOURNAL_LINE_MATCHED';
        duplicateDetails = existingMatch;
        warnings.push(
          `Journal entry line #${journalEntryLineId} is already matched to ` +
          `bank line #${existingMatch.bank_line_id} ` +
          `(Amount: R${parseFloat(existingMatch.bank_amount).toFixed(2)}, ` +
          `Matched by: ${existingMatch.matched_by_name || 'System'} ` +
          `on ${new Date(existingMatch.match_date).toLocaleDateString()})`
        );
      }

      // Check 3: Similar transaction in last 30 days?
      const bankLineResult = await client.query(
        `SELECT bsl.*, bs.statement_date
         FROM bank_statement_lines bsl
         JOIN bank_statements bs ON bsl.statement_id = bs.id
         WHERE bsl.id = $1`,
        [bankStatementLineId]
      );

      if (bankLineResult.rows.length > 0) {
        const bankLine = bankLineResult.rows[0];
        const amount = parseFloat(bankLine.amount);
        const statementDate = new Date(bankLine.statement_date);
        const thirtyDaysAgo = new Date(statementDate);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const similarResult = await client.query(
          `SELECT 
            bsl.id,
            bsl.description,
            COALESCE(bsl.debit_amount, bsl.credit_amount, 0) as amount,
            bsl.reference_number as reference,
            bs.statement_date,
            brm.id as match_id,
            brm.match_date
           FROM bank_statement_lines bsl
           JOIN bank_statements bs ON bsl.statement_id = bs.id
           LEFT JOIN bank_reconciliation_matches brm ON bsl.id = brm.bank_statement_line_id
             AND brm.journal_entry_line_id = $1
             AND brm.status = 'ACTIVE'
           WHERE bsl.tenant_id = $2
           AND bsl.id != $3
           AND ABS(COALESCE(bsl.debit_amount, bsl.credit_amount, 0) - $4) < 0.01
           AND bs.statement_date BETWEEN $5 AND $6
           ORDER BY bs.statement_date DESC
           LIMIT 5`,
          [journalEntryLineId, tenantId, bankStatementLineId, amount, thirtyDaysAgo, statementDate]
        );

        if (similarResult.rows.length > 0) {
          const similar = similarResult.rows[0];
          
          // Only warn if there's an exact match that was already matched to same journal
          if (similar.match_id) {
            warnings.push(
              `Warning: Similar transaction found (Bank Line #${similar.id}, ` +
              `Amount: R${parseFloat(similar.amount).toFixed(2)}, ` +
              `Date: ${new Date(similar.statement_date).toLocaleDateString()}, ` +
              `Description: "${similar.description}"). ` +
              `This could be a duplicate. Already matched to the same journal entry on ` +
              `${new Date(similar.match_date).toLocaleDateString()}.`
            );
            
            if (!isDuplicate) {
              isDuplicate = true;
              duplicateType = 'SIMILAR_TRANSACTION';
              duplicateDetails = similar;
            }
          } else if (similarResult.rows.length > 1) {
            // Multiple similar transactions (potential recurring payment)
            warnings.push(
              `Info: Found ${similarResult.rows.length} similar transactions in the last 30 days. ` +
              `This might be a recurring payment. Please verify before matching.`
            );
          }
        }
      }

      return {
        isDuplicate,
        warnings,
        duplicateType,
        duplicateDetails
      };

    } finally {
      client.release();
    }
  }

  /**
   * Find potential duplicate transactions
   * Useful for cleanup and auditing
   */
  async findPotentialDuplicates(
    tenantId?: string,
    options: {
      dateRange?: number; // Days, default 30
      amountTolerance?: number; // Default 0.01
      includeMatched?: boolean; // Default false
    } = {}
  ): Promise<any[]> {
    if (!tenantId) throw new Error('Tenant ID is required');
    const {
      dateRange = 30,
      amountTolerance = 0.01,
      includeMatched = false
    } = options;

    const client = await pool.connect();
    
    try {
      const statusFilter = includeMatched ? '' : `AND bsl1.status = 'UNMATCHED'`;

      // Find bank lines with same amount, similar date, and similar description
      const result = await client.query(
        `SELECT 
          bsl1.id as line1_id,
          bsl1.description as line1_description,
          bsl1.amount as line1_amount,
          bsl1.reference as line1_reference,
          bs1.statement_date as line1_date,
          bsl1.status as line1_status,
          bsl2.id as line2_id,
          bsl2.description as line2_description,
          bsl2.amount as line2_amount,
          bsl2.reference as line2_reference,
          bs2.statement_date as line2_date,
          bsl2.status as line2_status,
          ABS(EXTRACT(EPOCH FROM (bs1.statement_date - bs2.statement_date)) / 86400) as days_apart,
          brm1.id as line1_match_id,
          brm2.id as line2_match_id
         FROM bank_statement_lines bsl1
         JOIN bank_statements bs1 ON bsl1.statement_id = bs1.id
         JOIN bank_statement_lines bsl2 ON 
           bsl2.tenant_id = bsl1.tenant_id
           AND bsl2.id > bsl1.id
           AND ABS(bsl2.amount - bsl1.amount) <= $2
         JOIN bank_statements bs2 ON bsl2.statement_id = bs2.id
         LEFT JOIN bank_reconciliation_matches brm1 ON bsl1.id = brm1.bank_statement_line_id 
           AND brm1.status = 'ACTIVE'
         LEFT JOIN bank_reconciliation_matches brm2 ON bsl2.id = brm2.bank_statement_line_id 
           AND brm2.status = 'ACTIVE'
         WHERE bsl1.tenant_id = $1
         ${statusFilter}
         AND ABS(EXTRACT(EPOCH FROM (bs1.statement_date - bs2.statement_date)) / 86400) <= $3
         ORDER BY bs1.statement_date DESC, ABS(bsl1.amount) DESC
         LIMIT 100`,
        [tenantId, amountTolerance, dateRange]
      );

      // Calculate similarity score for each pair
      const duplicates = result.rows.map(row => {
        const desc1 = (row.line1_description || '').toLowerCase();
        const desc2 = (row.line2_description || '').toLowerCase();
        const ref1 = (row.line1_reference || '').toLowerCase();
        const ref2 = (row.line2_reference || '').toLowerCase();

        // Simple similarity: check for common words
        const words1 = desc1.split(/\s+/).filter(w => w.length > 3);
        const words2 = desc2.split(/\s+/).filter(w => w.length > 3);
        const commonWords = words1.filter(w => words2.includes(w)).length;
        const descriptionSimilarity = words1.length > 0 
          ? (commonWords / Math.max(words1.length, words2.length)) * 100
          : 0;

        const referenceSimilarity = ref1 === ref2 && ref1.length > 0 ? 100 : 0;

        const overallSimilarity = (descriptionSimilarity + referenceSimilarity) / 2;

        return {
          ...row,
          description_similarity: descriptionSimilarity.toFixed(1),
          reference_similarity: referenceSimilarity,
          overall_similarity: overallSimilarity.toFixed(1),
          is_likely_duplicate: overallSimilarity > 70 && parseFloat(row.days_apart) <= 7
        };
      });

      // Filter to likely duplicates only
      return duplicates.filter(d => parseFloat(d.overall_similarity) > 50);

    } finally {
      client.release();
    }
  }
}

export default new MatchingService();
