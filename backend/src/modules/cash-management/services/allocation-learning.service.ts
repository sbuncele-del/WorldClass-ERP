/**
 * Allocation Learning Service
 * 
 * Learns from user's manual bank transaction allocations to auto-suggest
 * GL accounts for future similar transactions.
 * 
 * How it works:
 * 1. When a user allocates a bank transaction to a GL account, we extract
 *    "features" (description keywords, amount range, transaction type)
 * 2. These features + chosen GL account are stored as an "allocation pattern"
 * 3. When new unmatched transactions come in, we score them against all
 *    stored patterns to suggest the most likely GL account
 * 4. Each time a suggestion is accepted, the pattern's weight increases
 * 5. Each time rejected, the weight decreases — the system learns
 * 
 * Created: February 2026
 */

import pool from '../../../config/database';

// ============================================================
// TYPES
// ============================================================

interface AllocationPattern {
  id: string;
  tenant_id: string;
  keywords: string[];            // Extracted from description
  amount_min: number;
  amount_max: number;
  transaction_type: 'debit' | 'credit' | 'both';
  gl_account_id: string;
  gl_account_code: string;
  gl_account_name: string;
  frequency: number;             // How many times this pattern was used
  confidence_score: number;      // 0-100, increases with frequency
  last_used: Date;
  created_by: string;
}

interface AllocationSuggestion {
  gl_account_id: string;
  gl_account_code: string;
  gl_account_name: string;
  confidence: number;
  match_reason: string;
  pattern_id: string;
  learned_from_count: number;
}

// ============================================================
// SERVICE
// ============================================================

class AllocationLearningService {

  /**
   * Ensure the allocation_patterns table exists
   */
  async ensureTable(): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS allocation_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        keywords TEXT[] NOT NULL DEFAULT '{}',
        description_pattern TEXT,
        amount_min NUMERIC(18,2) DEFAULT 0,
        amount_max NUMERIC(18,2) DEFAULT 999999999,
        transaction_type VARCHAR(10) DEFAULT 'both',
        gl_account_id UUID NOT NULL,
        gl_account_code VARCHAR(50),
        gl_account_name VARCHAR(255),
        frequency INT DEFAULT 1,
        confidence_score NUMERIC(5,2) DEFAULT 50,
        accepted_count INT DEFAULT 1,
        rejected_count INT DEFAULT 0,
        last_used TIMESTAMP DEFAULT NOW(),
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_allocation_patterns_tenant 
      ON allocation_patterns(tenant_id)
    `).catch(() => {});

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_allocation_patterns_keywords 
      ON allocation_patterns USING GIN(keywords)
    `).catch(() => {});
  }

  /**
   * Extract meaningful keywords from a bank transaction description
   */
  extractKeywords(description: string): string[] {
    if (!description) return [];
    
    // Normalize
    const normalized = description.toUpperCase().trim();
    
    // Remove common banking noise words
    const noiseWords = new Set([
      'THE', 'AND', 'FOR', 'FROM', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY',
      'EFT', 'INT', 'PMT', 'PAYMENT', 'TRF', 'TRANSFER', 'CREDIT',
      'DEBIT', 'REF', 'REFERENCE', 'DATE', 'NO', 'NUMBER', 'ACC',
      'ACCOUNT', 'FNB', 'ABSA', 'NEDBANK', 'STANDARD', 'CAPITEC',
      'BANK', 'BRANCH', 'POS', 'PURCHASE', 'WITHDRAWAL', 'DEPOSIT',
      'CASH', 'CARD', 'PREPAID', 'AIRTIME', 'ZAR', 'SA', 'PTY', 'LTD',
      'CC', 'INC', 'CO', 'NPC', 'SOC', 'LLC',
    ]);

    // Split on non-alpha characters, filter noise
    const words = normalized
      .replace(/[^A-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !noiseWords.has(w))
      .filter(w => !/^\d+$/.test(w)); // Remove pure numbers

    // Remove duplicates
    return [...new Set(words)];
  }

  /**
   * Record a user's allocation decision as a learned pattern
   */
  async recordAllocation(
    tenantId: string,
    description: string,
    amount: number,
    isDebit: boolean,
    glAccountId: string,
    userId: string
  ): Promise<void> {
    await this.ensureTable();

    const keywords = this.extractKeywords(description);
    if (keywords.length === 0) return; // Nothing to learn from

    const txnType = isDebit ? 'debit' : 'credit';

    // Look up GL account details
    const accountResult = await pool.query(
      `SELECT COALESCE(NULLIF(account_code, ''), code) as account_code, 
              COALESCE(NULLIF(account_name, ''), name) as account_name 
       FROM chart_of_accounts WHERE id = $1`,
      [glAccountId]
    );
    const glCode = accountResult.rows[0]?.account_code || '';
    const glName = accountResult.rows[0]?.account_name || '';

    // Check if a similar pattern already exists
    const existingResult = await pool.query(
      `SELECT id, keywords, frequency, amount_min, amount_max, confidence_score
       FROM allocation_patterns
       WHERE tenant_id = $1 
         AND gl_account_id = $2 
         AND transaction_type IN ($3, 'both')
         AND keywords && $4::text[]
       ORDER BY frequency DESC
       LIMIT 1`,
      [tenantId, glAccountId, txnType, keywords]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      // Merge keywords and widen amount range
      const mergedKeywords = [...new Set([...existing.keywords, ...keywords])];
      const newMin = Math.min(existing.amount_min, amount * 0.5);
      const newMax = Math.max(existing.amount_max, amount * 2.0);
      const newFrequency = existing.frequency + 1;
      // Confidence increases with frequency (asymptotic to 99)
      const newConfidence = Math.min(99, 50 + (newFrequency * 5));

      await pool.query(
        `UPDATE allocation_patterns 
         SET keywords = $3, 
             amount_min = $4, amount_max = $5,
             frequency = $6, confidence_score = $7,
             accepted_count = accepted_count + 1,
             last_used = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [existing.id, tenantId, mergedKeywords, newMin, newMax, newFrequency, newConfidence]
      );
    } else {
      // Create new pattern
      await pool.query(
        `INSERT INTO allocation_patterns 
         (tenant_id, keywords, description_pattern, amount_min, amount_max, 
          transaction_type, gl_account_id, gl_account_code, gl_account_name, 
          frequency, confidence_score, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, 60, $10)`,
        [
          tenantId,
          keywords,
          description,
          amount * 0.5,  // Allow 50% lower
          amount * 2.0,  // Allow 200% higher
          txnType,
          glAccountId,
          glCode,
          glName,
          userId
        ]
      );
    }
  }

  /**
   * Get AI suggestions for a bank transaction based on learned patterns
   */
  async getSuggestions(
    tenantId: string,
    description: string,
    amount: number,
    isDebit: boolean
  ): Promise<AllocationSuggestion[]> {
    await this.ensureTable();

    const keywords = this.extractKeywords(description);
    if (keywords.length === 0) return [];

    const txnType = isDebit ? 'debit' : 'credit';

    // Find patterns that match this transaction
    // Score by: keyword overlap + amount fit + frequency
    const result = await pool.query(
      `SELECT 
         p.*,
         -- Count how many keywords overlap
         (SELECT COUNT(*) FROM unnest(p.keywords) kw WHERE kw = ANY($3::text[])) as keyword_matches,
         array_length(p.keywords, 1) as total_keywords
       FROM allocation_patterns p
       WHERE p.tenant_id = $1
         AND p.transaction_type IN ($2, 'both')
         AND p.keywords && $3::text[]
         AND p.confidence_score > 10
       ORDER BY 
         -- Prioritize: keyword match ratio, then frequency, then confidence
         (SELECT COUNT(*) FROM unnest(p.keywords) kw WHERE kw = ANY($3::text[]))::float / GREATEST(array_length(p.keywords, 1), 1) DESC,
         p.frequency DESC,
         p.confidence_score DESC
       LIMIT 5`,
      [tenantId, txnType, keywords]
    );

    return result.rows.map((pattern: any) => {
      const keywordOverlap = parseInt(pattern.keyword_matches) || 0;
      const totalKeywords = parseInt(pattern.total_keywords) || 1;
      const matchRatio = keywordOverlap / Math.max(totalKeywords, keywords.length);
      
      // Amount fit bonus (0-20 points)
      let amountFit = 0;
      if (amount >= pattern.amount_min && amount <= pattern.amount_max) {
        amountFit = 20;
      } else {
        const dist = Math.min(
          Math.abs(amount - pattern.amount_min),
          Math.abs(amount - pattern.amount_max)
        );
        amountFit = Math.max(0, 20 - (dist / amount) * 20);
      }

      // Calculate final confidence
      const baseConfidence = matchRatio * 60; // Max 60 from keywords
      const frequencyBonus = Math.min(15, pattern.frequency * 3); // Max 15 from frequency
      const confidence = Math.min(99, Math.round(baseConfidence + amountFit + frequencyBonus));

      // Build reason
      const matchedKws = keywords.filter((kw: string) => pattern.keywords.includes(kw));
      const reason = `Matched keywords: ${matchedKws.join(', ')} (${keywordOverlap}/${totalKeywords}) | Used ${pattern.frequency}x before`;

      return {
        gl_account_id: pattern.gl_account_id,
        gl_account_code: pattern.gl_account_code || '',
        gl_account_name: pattern.gl_account_name || '',
        confidence,
        match_reason: reason,
        pattern_id: pattern.id,
        learned_from_count: pattern.frequency
      };
    }).filter((s: AllocationSuggestion) => s.confidence >= 30); // Minimum 30% confidence
  }

  /**
   * Bulk suggest for multiple transactions at once
   */
  async bulkSuggest(
    tenantId: string,
    transactions: Array<{ id: string; description: string; amount: number; is_debit: boolean }>
  ): Promise<Map<string, AllocationSuggestion[]>> {
    const results = new Map<string, AllocationSuggestion[]>();
    
    for (const txn of transactions) {
      const suggestions = await this.getSuggestions(
        tenantId, txn.description, txn.amount, txn.is_debit
      );
      if (suggestions.length > 0) {
        results.set(txn.id, suggestions);
      }
    }
    
    return results;
  }

  /**
   * Record when a user accepts an AI suggestion (positive feedback)
   */
  async recordAcceptance(tenantId: string, patternId: string): Promise<void> {
    await pool.query(
      `UPDATE allocation_patterns 
       SET accepted_count = accepted_count + 1,
           frequency = frequency + 1,
           confidence_score = LEAST(99, confidence_score + 3),
           last_used = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [patternId, tenantId]
    );
  }

  /**
   * Record when a user rejects an AI suggestion (negative feedback)
   */
  async recordRejection(tenantId: string, patternId: string): Promise<void> {
    await pool.query(
      `UPDATE allocation_patterns 
       SET rejected_count = rejected_count + 1,
           confidence_score = GREATEST(5, confidence_score - 5),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [patternId, tenantId]
    );
  }

  /**
   * Get learning stats for a tenant
   */
  async getStats(tenantId: string): Promise<{
    total_patterns: number;
    total_allocations: number;
    top_accounts: Array<{ gl_account_name: string; frequency: number }>;
    accuracy: number;
  }> {
    await this.ensureTable();

    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_patterns,
         SUM(frequency) as total_allocations,
         SUM(accepted_count) as total_accepted,
         SUM(rejected_count) as total_rejected
       FROM allocation_patterns
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const topResult = await pool.query(
      `SELECT gl_account_name, SUM(frequency) as freq
       FROM allocation_patterns
       WHERE tenant_id = $1
       GROUP BY gl_account_name
       ORDER BY freq DESC
       LIMIT 10`,
      [tenantId]
    );

    const stats = statsResult.rows[0];
    const accepted = parseInt(stats.total_accepted) || 0;
    const rejected = parseInt(stats.total_rejected) || 0;
    const total = accepted + rejected;

    return {
      total_patterns: parseInt(stats.total_patterns) || 0,
      total_allocations: parseInt(stats.total_allocations) || 0,
      top_accounts: topResult.rows.map((r: any) => ({
        gl_account_name: r.gl_account_name,
        frequency: parseInt(r.freq)
      })),
      accuracy: total > 0 ? Math.round((accepted / total) * 100) : 0
    };
  }
}

export const allocationLearningService = new AllocationLearningService();
export default allocationLearningService;
