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
  gl_account_id: number;
  gl_account_code: string;
  gl_account_name: string;
  frequency: number;             // How many times this pattern was used
  confidence_score: number;      // 0-100, increases with frequency
  last_used: Date;
  created_by: string;
}

interface AllocationSuggestion {
  gl_account_id: number;
  gl_account_code: string;
  gl_account_name: string;
  confidence: number;
  match_reason: string;
  pattern_id: string;
  learned_from_count: number;
  accepted_count: number;
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
        gl_account_id INTEGER NOT NULL REFERENCES chart_of_accounts(account_id),
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

    // Enable pg_trgm for description similarity matching (idempotent)
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`).catch(() => {});

    // AI Configuration table — per-tenant settings for how the AI behaves
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_categorization_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL UNIQUE,
        -- Business context that shapes the AI prompt
        business_type VARCHAR(100),           -- e.g. 'consulting', 'retail', 'construction', 'restaurant'
        business_description TEXT,            -- Freeform: "We are a civil engineering firm..."
        industry_keywords TEXT[] DEFAULT '{}',-- Domain-specific terms: ['subcontractor', 'plant hire', 'BOQ']
        -- Default GL mappings (manual overrides that ALWAYS apply)
        default_rules JSONB DEFAULT '[]',     -- [{pattern: 'VODACOM', gl_account_code: '6510', gl_account_name: 'Telephone'}]
        -- Behavior settings
        auto_allocate_threshold INT DEFAULT 85,     -- Only auto-allocate if confidence >= this
        learning_enabled BOOLEAN DEFAULT true,       -- Whether to learn from manual allocations
        ai_provider_preference VARCHAR(20) DEFAULT 'groq', -- groq | xai | openai | anthropic | rule-based
        -- Audit
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  /**
   * Consolidate duplicate patterns that have the same GL account and overlapping keywords.
   * Call this periodically or after bulk imports to clean up fragmentation.
   */
  async consolidatePatterns(tenantId: string): Promise<{ merged: number; remaining: number }> {
    // Find duplicate groups: same tenant + GL account + transaction type
    const groups = await pool.query(
      `SELECT gl_account_id, transaction_type, COUNT(*) as cnt,
              array_agg(id ORDER BY frequency DESC) as pattern_ids
       FROM allocation_patterns
       WHERE tenant_id = $1
       GROUP BY gl_account_id, transaction_type
       HAVING COUNT(*) > 1`,
      [tenantId]
    );

    let merged = 0;
    for (const group of groups.rows) {
      const ids = group.pattern_ids;
      const keepId = ids[0]; // Keep the highest-frequency pattern
      const removeIds = ids.slice(1);

      // Merge all keywords and stats into the keeper
      const mergeResult = await pool.query(
        `SELECT 
           array_agg(DISTINCT kw) as all_keywords,
           SUM(frequency) as total_freq,
           SUM(accepted_count) as total_accepted,
           SUM(rejected_count) as total_rejected,
           MIN(amount_min) as min_amt,
           MAX(amount_max) as max_amt
         FROM allocation_patterns, unnest(keywords) as kw
         WHERE id = ANY($1::uuid[])`,
        [[keepId, ...removeIds]]
      );

      const m = mergeResult.rows[0];
      const newConfidence = Math.min(99, 40 + Math.min(50, parseInt(m.total_freq) * 8));

      await pool.query(
        `UPDATE allocation_patterns 
         SET keywords = $2, frequency = $3, confidence_score = $4,
             accepted_count = $5, rejected_count = $6,
             amount_min = $7, amount_max = $8, updated_at = NOW()
         WHERE id = $1`,
        [keepId, m.all_keywords, parseInt(m.total_freq), newConfidence,
         parseInt(m.total_accepted), parseInt(m.total_rejected),
         parseFloat(m.min_amt), parseFloat(m.max_amt)]
      );

      await pool.query(
        `DELETE FROM allocation_patterns WHERE id = ANY($1::uuid[])`,
        [removeIds]
      );

      merged += removeIds.length;
    }

    const remaining = await pool.query(
      `SELECT COUNT(*) FROM allocation_patterns WHERE tenant_id = $1`, [tenantId]
    );

    return { merged, remaining: parseInt(remaining.rows[0].count) };
  }

  /**
   * Get or create AI configuration for a tenant
   */
  async getConfig(tenantId: string): Promise<any> {
    await this.ensureTable();
    const result = await pool.query(
      `SELECT * FROM ai_categorization_config WHERE tenant_id = $1`, [tenantId]
    );
    if (result.rows.length > 0) return result.rows[0];

    // Create default config
    await pool.query(
      `INSERT INTO ai_categorization_config (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId]
    );
    const newResult = await pool.query(
      `SELECT * FROM ai_categorization_config WHERE tenant_id = $1`, [tenantId]
    );
    return newResult.rows[0];
  }

  /**
   * Update AI configuration for a tenant
   */
  async updateConfig(tenantId: string, config: {
    business_type?: string;
    business_description?: string;
    industry_keywords?: string[];
    default_rules?: any[];
    auto_allocate_threshold?: number;
    learning_enabled?: boolean;
    ai_provider_preference?: string;
  }): Promise<any> {
    await this.ensureTable();

    const fields: string[] = [];
    const values: any[] = [tenantId];
    let idx = 2;

    if (config.business_type !== undefined) { fields.push(`business_type = $${idx++}`); values.push(config.business_type); }
    if (config.business_description !== undefined) { fields.push(`business_description = $${idx++}`); values.push(config.business_description); }
    if (config.industry_keywords !== undefined) { fields.push(`industry_keywords = $${idx++}`); values.push(config.industry_keywords); }
    if (config.default_rules !== undefined) { fields.push(`default_rules = $${idx++}`); values.push(JSON.stringify(config.default_rules)); }
    if (config.auto_allocate_threshold !== undefined) { fields.push(`auto_allocate_threshold = $${idx++}`); values.push(config.auto_allocate_threshold); }
    if (config.learning_enabled !== undefined) { fields.push(`learning_enabled = $${idx++}`); values.push(config.learning_enabled); }
    if (config.ai_provider_preference !== undefined) { fields.push(`ai_provider_preference = $${idx++}`); values.push(config.ai_provider_preference); }

    fields.push('updated_at = NOW()');

    await pool.query(
      `INSERT INTO ai_categorization_config (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId]
    );

    await pool.query(
      `UPDATE ai_categorization_config SET ${fields.join(', ')} WHERE tenant_id = $1`,
      values
    );

    return this.getConfig(tenantId);
  }

  /**
   * Extract meaningful keywords from a bank transaction description
   *
   * IMPROVED: Less aggressive noise filtering - keeps banking-specific terms
   * that are actually useful for pattern matching (e.g. EFT, SALARY, DEBIT ORDER)
   */
  extractKeywords(description: string): string[] {
    if (!description) return [];

    // Normalize
    const normalized = description.toUpperCase().trim();

    // Banking noise words: these appear in almost every transaction and carry NO
    // identifying value. The REAL signal is the payee/vendor name.
    const noiseWords = new Set([
      'THE', 'AND', 'FOR', 'FROM', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY',
      'REF', 'REFERENCE', 'DATE', 'NO', 'NUMBER', 'PAYMENT', 'PAY',
      'ZAR', 'PTY', 'LTD', 'CC', 'INC', 'CO', 'NPC', 'SOC', 'LLC',
      'NOT', 'PROVIDED', 'UNKNOWN', 'PAYSHAP',
      // SA banking generics that don't help identify WHO/WHAT
      'EFT', 'ACB', 'MAGTAPE', 'INSTANT', 'MONEY',
    ]);

    // Split on non-alpha characters, filter noise
    const words = normalized
      .replace(/[^A-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !noiseWords.has(w))
      .filter(w => !/^\d{4,}$/.test(w)); // Remove number sequences 4+ digits (refs, account numbers)

    // Extract compound terms that ARE useful identifiers
    const compoundTerms: string[] = [];
    const compounds = [
      'DEBIT ORDER', 'BANK CHARGE', 'SERVICE FEE', 'ACCOUNT FEE',
      'MONTHLY FEE', 'ADMIN FEE', 'RECURRING PAYMENT',
      'SALARY PAYMENT', 'NETT PAY', 'NET PAY', 'STOP ORDER',
      'OVERDRAFT FEE', 'MEMBERSHIP FEE', 'MANAGEMENT FEE',
    ];
    for (const term of compounds) {
      if (normalized.includes(term)) {
        compoundTerms.push(term.replace(/\s+/g, '_'));
      }
    }

    // Extract the payee/vendor name from common SA bank description formats:
    // "IB PAYMENT FROM JOHN SMITH" → extract "JOHN SMITH"
    // "DEBIT ORDER VODACOM" → extract "VODACOM"
    // "PAYSHAP PAYMENT FROM ENGEN" → extract "ENGEN"
    const payeePatterns = [
      /(?:PAYMENT|PAY|PAYSHAP)\s+(?:FROM|TO)\s+(.+?)(?:\s+REF|\s+\d{4,}|$)/i,
      /(?:DEBIT ORDER|STOP ORDER)\s+(.+?)(?:\s+REF|\s+\d{4,}|$)/i,
      /(?:EFT|ACB|MAGTAPE)\s+(?:FROM|TO)\s+(.+?)(?:\s+REF|\s+\d{4,}|$)/i,
    ];
    for (const pattern of payeePatterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        const payeeName = match[1].trim().replace(/[^A-Z0-9\s]/g, '').trim();
        if (payeeName.length >= 3) {
          // Add the full payee name as a compound keyword (most valuable signal)
          compoundTerms.push('PAYEE:' + payeeName.replace(/\s+/g, '_'));
        }
      }
    }

    // Remove duplicates, combine single words and compound terms
    const result = [...new Set([...words, ...compoundTerms])];
    return result.length > 0 ? result : words; // Fallback to unfiltered words if nothing left
  }

  /**
   * Record a user's allocation decision as a learned pattern
   */
  async recordAllocation(
    tenantId: string,
    description: string,
    amount: number,
    isDebit: boolean,
    glAccountId: number,
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
    // IMPROVED: Use description_pattern similarity + GL account match, not just keyword overlap.
    // This prevents fragmented patterns (18 separate "IB PAYMENT FROM" entries).
    const existingResult = await pool.query(
      `SELECT id, keywords, frequency, amount_min, amount_max, confidence_score, description_pattern
       FROM allocation_patterns
       WHERE tenant_id = $1 
         AND gl_account_id = $2 
         AND transaction_type IN ($3, 'both')
         AND (
           -- Match on keywords overlap
           keywords && $4::text[]
           -- OR match on similar description pattern
           OR similarity(COALESCE(description_pattern, ''), $5) > 0.4
         )
       ORDER BY frequency DESC
       LIMIT 1`,
      [tenantId, glAccountId, txnType, keywords, description]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      // Merge keywords and gently widen amount range (tight: 0.8x-1.3x)
      const mergedKeywords = [...new Set([...existing.keywords, ...keywords])];
      const newMin = Math.min(existing.amount_min, amount * 0.8);
      const newMax = Math.max(existing.amount_max, amount * 1.3);
      const newFrequency = existing.frequency + 1;
      // Confidence increases with frequency but requires more repetitions
      // Starts meaningful at 3+ matches, reaches 80+ at 6+ matches
      const newConfidence = Math.min(99, 40 + Math.min(50, newFrequency * 8));

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
      // Create new pattern with tight amount range
      await pool.query(
        `INSERT INTO allocation_patterns
         (tenant_id, keywords, description_pattern, amount_min, amount_max,
          transaction_type, gl_account_id, gl_account_code, gl_account_name,
          frequency, confidence_score, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, 45, $10)`,
        [
          tenantId,
          keywords,
          description,
          amount * 0.8,  // Allow 20% lower
          amount * 1.3,  // Allow 30% higher
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
   * Calculate description similarity (simple trigram-based approach)
   */
  private descriptionSimilarity(desc1: string, desc2: string): number {
    if (!desc1 || !desc2) return 0;
    const a = desc1.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const b = desc2.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (a.length < 3 || b.length < 3) return 0;

    // Generate trigrams
    const trigramsA = new Set<string>();
    for (let i = 0; i <= a.length - 3; i++) trigramsA.add(a.substring(i, i + 3));
    const trigramsB = new Set<string>();
    for (let i = 0; i <= b.length - 3; i++) trigramsB.add(b.substring(i, i + 3));

    let overlap = 0;
    trigramsA.forEach(t => { if (trigramsB.has(t)) overlap++; });

    return overlap / Math.max(trigramsA.size, trigramsB.size);
  }

  /**
   * Get AI suggestions for a bank transaction based on learned patterns
   *
   * IMPROVED: Better scoring with description similarity, stricter keyword overlap,
   * and amount relevance weighting.
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
      const totalPatternKeywords = parseInt(pattern.total_keywords) || 1;

      // Keyword overlap ratio: how much of the pattern's keywords match the input
      const patternCoverage = keywordOverlap / totalPatternKeywords;
      // Also check reverse: how much of input keywords matched pattern
      const inputCoverage = keywordOverlap / Math.max(keywords.length, 1);
      // Use the geometric mean for balanced scoring
      const matchRatio = Math.sqrt(patternCoverage * inputCoverage);

      // Require at least 2 keyword matches or 50% overlap for decent score
      const keywordScore = (keywordOverlap >= 2 || patternCoverage >= 0.5)
        ? matchRatio * 50  // Max 50 from keywords
        : matchRatio * 25; // Penalize single-keyword matches

      // Amount fit (0-20 points)
      let amountFit = 0;
      if (amount >= pattern.amount_min && amount <= pattern.amount_max) {
        // Perfect if within range, bonus for being close to center
        const center = (parseFloat(pattern.amount_min) + parseFloat(pattern.amount_max)) / 2;
        const range = parseFloat(pattern.amount_max) - parseFloat(pattern.amount_min);
        const distFromCenter = Math.abs(amount - center) / (range || 1);
        amountFit = 20 - (distFromCenter * 5); // 15-20 when in range
      } else {
        const dist = Math.min(
          Math.abs(amount - parseFloat(pattern.amount_min)),
          Math.abs(amount - parseFloat(pattern.amount_max))
        );
        amountFit = Math.max(0, 10 - (dist / Math.max(amount, 1)) * 20);
      }

      // Description similarity (0-15 points) - trigram-based
      const descSimilarity = this.descriptionSimilarity(description, pattern.description_pattern);
      const descScore = descSimilarity * 15;

      // Frequency bonus (0-15 points) - more generous for well-established patterns
      const frequencyBonus = Math.min(15, Math.log2(Math.max(pattern.frequency, 1) + 1) * 5);

      // Calculate final confidence. Floor it at the pattern's own
      // confidence_score (the number that actually grows with every accept
      // via recordAllocation) - without this, a well-established pattern
      // (e.g. 20 accepts, confidence_score 93) could still show a LOWER
      // per-transaction score here (this formula's own keyword/amount/
      // description/frequency weighting caps out well below that for a
      // single-word description like "Melon"), which reads as the system
      // forgetting what it already learned rather than growing.
      const patternConfidence = parseFloat(pattern.confidence_score) || 0;
      const confidence = Math.min(99, Math.max(patternConfidence, Math.round(keywordScore + amountFit + descScore + frequencyBonus)));

      // Build reason
      const matchedKws = keywords.filter((kw: string) => pattern.keywords.includes(kw));
      const reason = `Matched keywords: ${matchedKws.join(', ')} (${keywordOverlap}/${totalPatternKeywords}) | ` +
        `${descSimilarity > 0.3 ? `Similar description (${Math.round(descSimilarity * 100)}%) | ` : ''}` +
        `Used ${pattern.frequency}x before`;

      return {
        gl_account_id: pattern.gl_account_id,
        gl_account_code: pattern.gl_account_code || '',
        gl_account_name: pattern.gl_account_name || '',
        confidence,
        match_reason: reason,
        pattern_id: pattern.id,
        learned_from_count: pattern.frequency,
        accepted_count: parseInt(pattern.accepted_count) || 0
      };
    }).filter((s: AllocationSuggestion) => s.confidence >= 35); // Minimum 35% confidence
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
   * After a transaction is accepted and its pattern is reinforced (see
   * recordAllocation), find OTHER still-pending statement lines that share
   * that pattern's keywords and rescore + persist their suggestions too.
   *
   * Without this, accepting one "Melon" transaction updated the learned
   * pattern's confidence in the database, but every OTHER already-loaded
   * "Melon" suggestion on the review screen kept showing its original,
   * stale confidence forever - nothing ever told them to recompute, and
   * re-running full "AI Categorize" (which re-calls Groq/Claude for
   * everything) is the only thing that previously would have refreshed
   * them. This targets just the handful of transactions actually affected,
   * using patterns-only scoring (no AI provider calls, fast and free).
   */
  async refreshRelatedSuggestions(
    tenantId: string,
    justAcceptedDescription: string
  ): Promise<Array<{ line_id: string } & AllocationSuggestion>> {
    const keywords = this.extractKeywords(justAcceptedDescription);
    if (keywords.length === 0) return [];

    // Capped to a screen's worth, not "every pending line matching this
    // keyword" - a common vendor (Uber: 426 pending rows in one real tenant)
    // made this rescan hundreds of rows on every single accept. Sequential
    // per-row scoring at that volume was measured taking over a minute,
    // and repeated accepts before it finished piled up multiple overlapping
    // requests, so the visible rows a user was actually looking at often
    // never got reached within any single call's LIMIT.
    //
    // Ordering by suggested_at ASC (never-refreshed rows first, via NULLS
    // FIRST) rather than transaction_date DESC matters just as much as the
    // limit itself: with a "most recent transaction" order, any vendor with
    // more than 40 pending rows has a permanently-stale tail - accepting a
    // newer Uber transaction keeps re-refreshing the same newest 40 rows
    // forever, while older pending rows (confirmed live: some hadn't been
    // touched since before this pattern reached its current confidence)
    // never get their turn. Oldest-refreshed-first guarantees every pending
    // row eventually gets covered as more accepts happen, converging on
    // full coverage instead of repeatedly hitting the same subset.
    const pendingLines = await pool.query(
      `SELECT l.line_id, l.description,
              COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0) as amount,
              CASE WHEN COALESCE(l.debit_amount, 0) > 0 THEN true ELSE false END as is_debit
       FROM cash_bank_statement_lines l
       JOIN cash_bank_statements s ON l.statement_id = s.statement_id
       WHERE s.tenant_id = $1
         AND l.is_matched = false
         AND EXISTS (
           SELECT 1 FROM unnest($2::text[]) kw
           WHERE UPPER(l.description) LIKE '%' || kw || '%'
         )
       ORDER BY l.suggested_at ASC NULLS FIRST
       LIMIT 40`,
      [tenantId, keywords]
    );

    if (pendingLines.rows.length === 0) return [];

    // Score + persist all matched lines concurrently instead of one DB
    // round-trip at a time - the dominant cost here is network latency to
    // Postgres, not CPU, so this is safe to parallelize at this batch size.
    const results = await Promise.all(pendingLines.rows.map(async (line) => {
      const suggestions = await this.getSuggestions(tenantId, line.description, line.amount, line.is_debit);
      const top = suggestions[0];
      if (!top) return null;

      await pool.query(
        `UPDATE cash_bank_statement_lines
         SET suggested_gl_account_id = $1,
             suggested_gl_account_code = $2,
             suggested_gl_account_name = $3,
             suggestion_confidence = $4,
             suggestion_reason = $5,
             suggestion_pattern_id = $6,
             suggestion_human_confirmed = $7,
             suggestion_ai_provider = 'learned',
             suggested_at = NOW()
         WHERE line_id = $8 AND tenant_id = $9`,
        [top.gl_account_id, top.gl_account_code, top.gl_account_name, top.confidence, top.match_reason, top.pattern_id, top.accepted_count >= 1, line.line_id, tenantId]
      );
      return { line_id: String(line.line_id), ...top };
    }));

    const updates = results.filter((r): r is { line_id: string } & AllocationSuggestion => r !== null);

    return updates;
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
