/**
 * AI Transaction Categorization Service
 * Uses AI (OpenAI, Anthropic, or x.ai/Grok) to categorize bank transactions
 * 
 * Created: January 2026
 */

import pool from '../../../config/database';

interface TransactionForCategorization {
  line_id: number;
  description: string;
  amount: number;
  is_debit: boolean;
  transaction_date: string;
  reference?: string;
}

interface CategorySuggestion {
  line_id: number;
  suggested_category: string;
  category_description: string;
  confidence: number;
  reasoning: string;
  gl_account?: string;
}

interface AIProvider {
  name: 'openai' | 'anthropic' | 'xai' | 'groq';
  client: any;
}

class AICategorizationService {
  private provider: AIProvider | null = null;

  constructor() {
    this.initializeProvider();
  }

  private async initializeProvider() {
    // Try Groq first (FREE and fast!)
    if (process.env.GROQ_API_KEY) {
      try {
        const OpenAI = require('openai');
        this.provider = {
          name: 'groq',
          client: new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1'
          })
        };
        console.log('AI Categorization: Using Groq (FREE)');
        return;
      } catch (error) {
        console.warn('Failed to initialize Groq:', error);
      }
    }

    // Try x.ai/Grok (if configured)
    if (process.env.XAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        this.provider = {
          name: 'xai',
          client: new OpenAI({
            apiKey: process.env.XAI_API_KEY,
            baseURL: 'https://api.x.ai/v1'
          })
        };
        console.log('AI Categorization: Using x.ai/Grok');
        return;
      } catch (error) {
        console.warn('Failed to initialize x.ai:', error);
      }
    }

    // Try OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        this.provider = {
          name: 'openai',
          client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        };
        console.log('AI Categorization: Using OpenAI');
        return;
      } catch (error) {
        console.warn('Failed to initialize OpenAI:', error);
      }
    }

    // Try Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        this.provider = {
          name: 'anthropic',
          client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        };
        console.log('AI Categorization: Using Anthropic');
        return;
      } catch (error) {
        console.warn('Failed to initialize Anthropic:', error);
      }
    }

    console.log('AI Categorization: No AI provider configured. Falling back to rule-based matching.');
  }

  /**
   * Check if AI is available
   */
  isAvailable(): boolean {
    return this.provider !== null;
  }

  /**
   * Get available categories for a tenant
   */
  async getCategories(tenantId: string): Promise<{ category: string; description: string; type: string }[]> {
    const result = await pool.query(`
      SELECT category_code as category, category_name as description, category_type as type 
      FROM cash_flow_categories 
      WHERE tenant_id = $1 OR tenant_id = '00000000-0000-0000-0000-000000000000'
      ORDER BY category_type, category_code
    `, [tenantId]);
    
    return result.rows;
  }

  /**
   * Get learned patterns from previous allocations to feed into AI
   * IMPROVED: Include description_pattern for better AI context
   */
  private async getLearnedPatterns(tenantId: string): Promise<string> {
    try {
      const result = await pool.query(`
        SELECT gl_account_code, gl_account_name, keywords, frequency, transaction_type, confidence_score, description_pattern
        FROM allocation_patterns
        WHERE tenant_id = $1 AND confidence_score >= 40
        ORDER BY frequency DESC
        LIMIT 30
      `, [tenantId]);

      if (result.rows.length === 0) return '';

      return result.rows.map((p: any) => {
        const desc = p.description_pattern ? ` example: "${p.description_pattern.substring(0, 60)}"` : '';
        return `  ${p.transaction_type.toUpperCase()}: keywords [${(p.keywords || []).join(', ')}]${desc} → ${p.gl_account_code} "${p.gl_account_name}" (used ${p.frequency}x, confidence ${p.confidence_score}%)`;
      }).join('\n');
    } catch {
      return ''; // Table may not exist yet
    }
  }

  /**
   * Get chart of accounts for proper GL mapping
   */
  private async getChartOfAccounts(tenantId: string): Promise<string> {
    try {
      const result = await pool.query(`
        SELECT COALESCE(NULLIF(account_code, ''), code) as account_code,
               COALESCE(NULLIF(account_name, ''), name) as account_name,
               account_type
        FROM chart_of_accounts
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY account_code
        LIMIT 50
      `, [tenantId]);

      if (result.rows.length === 0) return '';

      return result.rows.map((a: any) =>
        `  ${a.account_code}: ${a.account_name} (${a.account_type})`
      ).join('\n');
    } catch {
      return '';
    }
  }

  /**
   * AI-powered transaction categorization
   */
  async categorizeTransactions(
    transactions: TransactionForCategorization[],
    tenantId: string
  ): Promise<CategorySuggestion[]> {

    // Get available categories
    const categories = await this.getCategories(tenantId);
    const categoryList = categories.map(c => `${c.category}: ${c.description} (${c.type})`).join('\n');

    // If no AI provider, use rule-based fallback
    if (!this.provider) {
      return this.ruleBasedCategorize(transactions, categories);
    }

    // Get learned patterns, chart of accounts, and tenant AI config for context
    const [learnedPatterns, chartOfAccounts, tenantConfig] = await Promise.all([
      this.getLearnedPatterns(tenantId),
      this.getChartOfAccounts(tenantId),
      this.getTenantConfig(tenantId)
    ]);

    // Build prompt with full context including business context
    const prompt = this.buildCategorizationPrompt(transactions, categoryList, learnedPatterns, chartOfAccounts, tenantConfig);

    try {
      let suggestions: CategorySuggestion[];

      if (this.provider.name === 'anthropic') {
        suggestions = await this.categorizeWithAnthropic(prompt, transactions);
      } else {
        // OpenAI or x.ai (both use OpenAI-compatible API)
        suggestions = await this.categorizeWithOpenAI(prompt, transactions);
      }

      // Apply tenant default rules (these override AI suggestions)
      if (tenantConfig?.default_rules) {
        suggestions = this.applyDefaultRules(suggestions, transactions, tenantConfig.default_rules);
      }

      // Save suggestions to database
      await this.saveSuggestions(suggestions, tenantId);

      return suggestions;
    } catch (error: any) {
      console.error('AI categorization error:', error.message);
      // Fall back to rule-based
      return this.ruleBasedCategorize(transactions, categories);
    }
  }

  /**
   * Get tenant-specific AI configuration
   */
  private async getTenantConfig(tenantId: string): Promise<any> {
    try {
      const result = await pool.query(
        `SELECT * FROM ai_categorization_config WHERE tenant_id = $1`,
        [tenantId]
      );
      return result.rows[0] || null;
    } catch {
      return null; // Table may not exist yet
    }
  }

  /**
   * Apply tenant's manually-defined default rules (these override AI)
   * Rules format: [{pattern: 'VODACOM', gl_account_code: '6510', gl_account_name: 'Telephone', category: 'TELEPHONE'}]
   */
  private applyDefaultRules(
    suggestions: CategorySuggestion[],
    transactions: TransactionForCategorization[],
    rules: any[]
  ): CategorySuggestion[] {
    if (!Array.isArray(rules) || rules.length === 0) return suggestions;

    return suggestions.map(suggestion => {
      const txn = transactions.find(t => t.line_id === suggestion.line_id);
      if (!txn) return suggestion;

      const desc = txn.description.toUpperCase();
      for (const rule of rules) {
        if (rule.pattern && desc.includes(rule.pattern.toUpperCase())) {
          return {
            ...suggestion,
            suggested_category: rule.category || suggestion.suggested_category,
            gl_account: rule.gl_account_code || suggestion.gl_account,
            confidence: 98,
            reasoning: `Matched tenant rule: "${rule.pattern}" → ${rule.gl_account_name || rule.gl_account_code}`
          };
        }
      }
      return suggestion;
    });
  }

  private buildCategorizationPrompt(
    transactions: TransactionForCategorization[],
    categoryList: string,
    learnedPatterns: string,
    chartOfAccounts: string,
    tenantConfig?: any
  ): string {
    const transactionList = transactions.map((t, i) =>
      `${i + 1}. [ID:${t.line_id}] ${t.is_debit ? 'DEBIT (expense/payment)' : 'CREDIT (income/receipt)'} R${Math.abs(t.amount).toFixed(2)} - "${t.description}" (${t.reference || 'No ref'})`
    ).join('\n');

    let prompt = `You are a South African chartered accountant categorizing bank transactions`;

    // Add business context if configured
    if (tenantConfig?.business_type || tenantConfig?.business_description) {
      prompt += ` for a ${tenantConfig.business_type || 'business'}`;
      if (tenantConfig.business_description) {
        prompt += `.\n\nBUSINESS CONTEXT: ${tenantConfig.business_description}`;
      }
      if (tenantConfig.industry_keywords?.length > 0) {
        prompt += `\nINDUSTRY TERMS: ${tenantConfig.industry_keywords.join(', ')}`;
      }
    } else {
      prompt += ` for a small/medium business`;
    }

    prompt += `.

CRITICAL RULES:
- DEBIT transactions are money going OUT (expenses, supplier payments, bank charges, salaries, rent)
- CREDIT transactions are money coming IN (customer payments, refunds, interest earned, deposits)
- Do NOT categorize debit transactions as revenue/income
- Do NOT categorize credit transactions as expenses
- Bank charges, fees, and levies are ALWAYS expenses (debit)
- EFT payments OUT are supplier/creditor payments, NOT revenue
- Customer EFT payments IN are customer receipts, NOT expenses
- When unsure, use the most specific category available, not generic ones

AVAILABLE CATEGORIES:
${categoryList}`;

    if (chartOfAccounts) {
      prompt += `

CHART OF ACCOUNTS (use these GL account codes when possible):
${chartOfAccounts}`;
    }

    if (learnedPatterns) {
      prompt += `

PREVIOUSLY LEARNED PATTERNS (the user has manually categorized similar transactions before - follow these patterns):
${learnedPatterns}`;
    }

    prompt += `

TRANSACTIONS TO CATEGORIZE:
${transactionList}

For each transaction, respond with a JSON array. Each item must have:
- line_id: The ID from the transaction
- suggested_category: The category code from the AVAILABLE CATEGORIES list
- gl_account: The GL account code from Chart of Accounts if applicable
- confidence: 0-100 confidence score
- reasoning: Brief explanation of why this category was chosen

Respond ONLY with a valid JSON array, no other text.`;

    return prompt;
  }

  private async categorizeWithOpenAI(
    prompt: string,
    transactions: TransactionForCategorization[]
  ): Promise<CategorySuggestion[]> {
    // Select model based on provider
    let model: string;
    switch (this.provider!.name) {
      case 'groq':
        model = 'llama-3.3-70b-versatile';
        break;
      case 'xai':
        model = 'grok-4-latest';
        break;
      default:
        model = 'gpt-4o-mini';
    }
    
    const response = await this.provider!.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a financial transaction categorization assistant. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    return this.parseAIResponse(content, transactions);
  }

  private async categorizeWithAnthropic(
    prompt: string,
    transactions: TransactionForCategorization[]
  ): Promise<CategorySuggestion[]> {
    const response = await this.provider!.client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0].text;
    return this.parseAIResponse(content, transactions);
  }

  private parseAIResponse(
    content: string,
    transactions: TransactionForCategorization[]
  ): CategorySuggestion[] {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return parsed.map((item: any) => ({
        line_id: item.line_id,
        suggested_category: item.suggested_category || 'UNCATEGORIZED',
        category_description: item.category_description || '',
        confidence: Math.min(100, Math.max(0, item.confidence || 50)),
        reasoning: item.reasoning || 'AI categorization',
        gl_account: item.gl_account || undefined
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Return uncategorized for all
      return transactions.map(t => ({
        line_id: t.line_id,
        suggested_category: 'UNCATEGORIZED',
        category_description: 'Unable to categorize',
        confidence: 0,
        reasoning: 'AI response parsing failed'
      }));
    }
  }

  /**
   * Rule-based categorization fallback (no AI)
   */
  private ruleBasedCategorize(
    transactions: TransactionForCategorization[],
    categories: { category: string; description: string; type: string }[]
  ): CategorySuggestion[] {
    // South African bank transaction patterns
    const patterns: { pattern: RegExp; category: string; confidence: number }[] = [
      // Bank charges
      { pattern: /bank (charge|fee)|service fee|monthly fee|admin fee/i, category: 'BANK_CHARGES', confidence: 90 },
      { pattern: /debit order charge|reject.*fee/i, category: 'BANK_FEES', confidence: 85 },
      
      // Utilities
      { pattern: /eskom|electricity|power|prepaid.*elec/i, category: 'ELECTRICITY', confidence: 90 },
      { pattern: /water|municipal.*water/i, category: 'WATER', confidence: 90 },
      { pattern: /gas|petrosa|sasol.*gas/i, category: 'GAS', confidence: 85 },
      { pattern: /telkom|vodacom|mtn|cell\s?c|internet|fibre|wifi/i, category: 'TELEPHONE', confidence: 85 },
      
      // Insurance
      { pattern: /insurance|oldmutual|sanlam|discovery.*insure|momentum|liberty/i, category: 'INSURANCE', confidence: 85 },
      
      // Salary/Payroll
      { pattern: /salary|wages?|payroll|net\s?pay/i, category: 'PAYROLL', confidence: 90 },
      
      // Transfers
      { pattern: /transfer (in|from)|incoming|trf|int payment/i, category: 'TRANSFER_IN', confidence: 80 },
      { pattern: /transfer (out|to)|outgoing|payment/i, category: 'TRANSFER_OUT', confidence: 80 },
      
      // Retail purchases (common SA stores)
      { pattern: /woolworths|pick.*pay|checkers|spar|shoprite|clicks|dischem|game|makro|builders/i, category: 'SUPPLIES', confidence: 75 },
      
      // Fuel
      { pattern: /engen|shell|caltex|bp|sasol|total|fuel/i, category: 'TRAVEL', confidence: 80 },
      
      // Rent
      { pattern: /rent|lease|property|landlord/i, category: 'RENT', confidence: 85 },
      
      // Professional services
      { pattern: /accountant|legal|attorney|lawyer|consultant|audit/i, category: 'PROFESSIONAL_FEES', confidence: 80 },
      
      // Customer payments (credits)
      { pattern: /payment.*receiv|customer.*pay|debtor|eft.*in/i, category: 'CUSTOMER_PAYMENT', confidence: 80 },
      
      // Supplier payments (debits)
      { pattern: /supplier|creditor|vendor|purchase/i, category: 'SUPPLIER_PAYMENT', confidence: 75 },
      
      // Interest
      { pattern: /interest.*credit|int.*earn|interest.*receiv/i, category: 'INTEREST', confidence: 85 },
      
      // Cash
      { pattern: /cash.*deposit|atm.*deposit/i, category: 'OTHER_INCOME', confidence: 70 },
      { pattern: /cash.*withdraw|atm/i, category: 'GENERAL', confidence: 70 },
    ];

    return transactions.map(txn => {
      const description = txn.description.toLowerCase();
      
      // Find matching pattern
      for (const { pattern, category, confidence } of patterns) {
        if (pattern.test(txn.description)) {
          const categoryInfo = categories.find(c => c.category === category);
          return {
            line_id: txn.line_id,
            suggested_category: category,
            category_description: categoryInfo?.description || category,
            confidence,
            reasoning: `Matched pattern: ${pattern.source.substring(0, 30)}...`
          };
        }
      }

      // Default to uncategorized
      return {
        line_id: txn.line_id,
        suggested_category: 'UNCATEGORIZED',
        category_description: 'Review Required',
        confidence: 0,
        reasoning: 'No matching pattern found'
      };
    });
  }

  /**
   * Save AI suggestions to database
   */
  private async saveSuggestions(suggestions: CategorySuggestion[], tenantId: string): Promise<void> {
    const client = await pool.connect();
    try {
      for (const suggestion of suggestions) {
        await client.query(`
          UPDATE cash_bank_statement_lines
          SET auto_category = $1,
              match_confidence = $2
          WHERE line_id = $3
        `, [suggestion.suggested_category, suggestion.confidence, suggestion.line_id]);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Categorize unmatched lines for a statement
   */
  async categorizeStatementLines(statementId: number, tenantId: string): Promise<CategorySuggestion[]> {
    // Get uncategorized lines
    const result = await pool.query(`
      SELECT 
        l.line_id,
        l.description,
        CASE WHEN l.debit_amount > 0 THEN l.debit_amount ELSE l.credit_amount END as amount,
        l.debit_amount > 0 as is_debit,
        l.transaction_date::text,
        l.reference
      FROM cash_bank_statement_lines l
      JOIN cash_bank_statements s ON l.statement_id = s.statement_id
      JOIN cash_bank_accounts a ON s.account_id = a.account_id
      WHERE l.statement_id = $1
      AND a.tenant_id = $2
      AND l.is_matched = false
      AND (l.auto_category IS NULL OR l.auto_category = 'UNCATEGORIZED')
      ORDER BY l.line_number
    `, [statementId, tenantId]);

    if (result.rows.length === 0) {
      return [];
    }

    return this.categorizeTransactions(result.rows, tenantId);
  }
}

export const aiCategorizationService = new AICategorizationService();
export default aiCategorizationService;
