/**
 * Bank Categorization Service
 *
 * Suggests a GL account for unmatched bank statement lines. Tries Groq first
 * (fast, free); anything Groq leaves unmatched or under-confident gets
 * escalated to Claude for a second pass. Falls back to keyword-based rules
 * (plus learned patterns from past manual allocations) when no AI provider
 * is configured or all of them fail.
 *
 * Extracted from the POST /cash-management/reconciliation/ai-categorize route
 * so the same logic can run from a scheduled job without duplicating it.
 */

import { query } from '../../../config/database';

export interface CategorizationTxn {
  line_id: number | string;
  description: string;
  amount: number | string;
  is_debit: boolean;
}

export interface CategorizationSuggestion {
  line_id: number | string;
  description: string;
  amount: number | string;
  suggested_account_id: number | null;
  suggested_account_code: string | null;
  suggested_account_name: string | null;
  confidence: number;
  reason: string;
}

export interface CategorizationResult {
  suggestions: CategorizationSuggestion[];
  ai_provider: string;
}

const ESCALATION_CONFIDENCE_THRESHOLD = 65;

export async function categorizeTransactions(
  tenantId: string,
  transactionsToProcess: CategorizationTxn[]
): Promise<CategorizationResult> {
  if (transactionsToProcess.length === 0) {
    return { suggestions: [], ai_provider: 'none' };
  }

  // Get GL accounts for suggestions - use COALESCE to handle both column naming conventions
  const accountsResult = await query(
    `SELECT id,
            COALESCE(NULLIF(code, ''), account_code) as code,
            COALESCE(NULLIF(name, ''), account_name) as name,
            account_type as type
     FROM chart_of_accounts
     WHERE tenant_id = $1 AND is_active = true
       AND (code IS NOT NULL AND code != '' OR account_code IS NOT NULL AND account_code != '')
     ORDER BY COALESCE(NULLIF(code, ''), account_code)`,
    [tenantId]
  );

  // Fetch learned patterns to inject into AI prompt and for learned-first matching
  let learnedPatternsText = '';
  let learnedPatterns: any[] = [];
  try {
    const patternsResult = await query(
      `SELECT gl_account_code, gl_account_name, keywords, frequency, transaction_type, confidence_score, description_pattern, amount_min, amount_max, gl_account_id
       FROM allocation_patterns
       WHERE tenant_id = $1 AND confidence_score >= 40
       ORDER BY frequency DESC
       LIMIT 30`,
      [tenantId]
    );
    learnedPatterns = patternsResult.rows || [];
    if (learnedPatterns.length > 0) {
      learnedPatternsText = learnedPatterns.map((p: any) =>
        `  ${p.transaction_type.toUpperCase()}: keywords [${(p.keywords || []).join(', ')}] → ${p.gl_account_code} "${p.gl_account_name}" (used ${p.frequency}x, confidence ${p.confidence_score}%)`
      ).join('\n');
    }
  } catch { /* allocation_patterns table may not exist yet */ }

  let aiProvider = 'rules';
  let suggestions: any[] = [];

  const accountList = accountsResult.rows.map((a: any) => `${a.code}: ${a.name} (${a.type})`).join('\n');

  const buildPrompt = (txns: any[]): string => {
    const transactionList = txns.map((t: any, i: number) =>
      `${i + 1}. [ID:${t.line_id}] ${t.is_debit ? 'DEBIT' : 'CREDIT'} R${Math.abs(parseFloat(t.amount as any)).toFixed(2)} - "${t.description}" (${t.reference || 'No ref'})`
    ).join('\n');

    let prompt = `You are a South African accounting expert helping categorize bank transactions.

CRITICAL RULES:
- DEBIT transactions are money going OUT (expenses, supplier payments, bank charges, salaries)
- CREDIT transactions are money coming IN (customer payments, refunds, interest)
- When a description matches a learned pattern below, ALWAYS use that pattern's GL account
- Be specific: use the most precise GL account available, not generic ones

AVAILABLE GL ACCOUNTS:
${accountList}`;

    if (learnedPatternsText) {
      prompt += `

PREVIOUSLY LEARNED PATTERNS (the user has manually categorized similar transactions before - YOU MUST follow these patterns when keywords match):
${learnedPatternsText}`;
    }

    prompt += `

TRANSACTIONS TO CATEGORIZE:
${transactionList}

For each transaction, respond with a JSON array containing objects with:
- line_id: the transaction ID
- suggested_account_code: best matching GL account code
- confidence: 1-100 how confident you are
- reason: brief explanation

Categorization tips:
- Bank charges/fees → Bank Charges account
- Salaries/wages → Salaries & Wages
- Rent payments → Rent expense
- Insurance → Insurance expense
- Electricity/water → Utilities
- Fuel/petrol → Vehicle expenses or Fuel
- Sales receipts/customer payments → Revenue accounts
- Supplier payments → Accounts payable clearing

Respond ONLY with valid JSON array, no other text.`;
    return prompt;
  };

  const parseAndMapAISuggestions = (content: string, txns: any[]): any[] => {
    let aiSuggestions: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        aiSuggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.warn('Failed to parse AI response, falling back to rules:', parseErr);
      return [];
    }
    if (aiSuggestions.length === 0) return [];
    return txns.map((line: any) => {
      const aiSuggestion = aiSuggestions.find((s: any) => String(s.line_id) === String(line.line_id));
      const suggestedAccount = aiSuggestion ?
        accountsResult.rows.find((a: any) => a.code === aiSuggestion.suggested_account_code) : null;
      return {
        line_id: line.line_id,
        description: line.description,
        amount: line.amount,
        suggested_account_id: suggestedAccount?.id || null,
        suggested_account_code: suggestedAccount?.code || aiSuggestion?.suggested_account_code || null,
        suggested_account_name: suggestedAccount?.name || null,
        confidence: aiSuggestion?.confidence || 0,
        reason: aiSuggestion?.reason || 'AI could not categorize'
      };
    });
  };

  const callGroq = async (txns: any[]): Promise<any[]> => {
    const OpenAI = require('openai');
    const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a financial transaction categorization assistant. Respond only with valid JSON.' },
        { role: 'user', content: buildPrompt(txns) }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });
    return parseAndMapAISuggestions(response.choices[0].message.content || '[]', txns);
  };

  const callClaude = async (txns: any[]): Promise<any[]> => {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0.3,
      system: 'You are a financial transaction categorization assistant. Respond only with valid JSON.',
      messages: [{ role: 'user', content: buildPrompt(txns) }]
    });
    const content = response.content?.[0]?.type === 'text' ? response.content[0].text : '[]';
    return parseAndMapAISuggestions(content, txns);
  };

  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;

  if (hasGroq) {
    try {
      suggestions = await callGroq(transactionsToProcess);
      aiProvider = suggestions.length > 0 ? 'groq' : 'rules';
    } catch (aiErr: any) {
      console.error('Groq AI error:', aiErr.message);
      suggestions = [];
      aiProvider = 'rules';
    }

    if (hasClaude) {
      const escalationCandidates = transactionsToProcess.filter((line: any) => {
        const g = suggestions.find((s: any) => s.line_id === line.line_id);
        return !g || !g.suggested_account_id || (g.confidence || 0) < ESCALATION_CONFIDENCE_THRESHOLD;
      });

      if (escalationCandidates.length > 0) {
        try {
          const claudeSuggestions = await callClaude(escalationCandidates);
          let claudeImproved = 0;
          for (const c of claudeSuggestions) {
            if (!c.suggested_account_id) continue;
            const idx = suggestions.findIndex((s: any) => s.line_id === c.line_id);
            const existing = idx >= 0 ? suggestions[idx] : null;
            if (!existing || !existing.suggested_account_id || c.confidence > (existing.confidence || 0)) {
              if (idx >= 0) suggestions[idx] = c; else suggestions.push(c);
              claudeImproved++;
            }
          }
          if (claudeImproved > 0) {
            aiProvider = aiProvider === 'groq' ? 'groq+claude' : 'claude';
          }
        } catch (aiErr: any) {
          console.error('Claude escalation error:', aiErr.message);
        }
      }
    }
  } else if (hasClaude) {
    try {
      suggestions = await callClaude(transactionsToProcess);
      aiProvider = suggestions.length > 0 ? 'claude' : 'rules';
    } catch (aiErr: any) {
      console.error('Claude AI error:', aiErr.message);
      aiProvider = 'rules';
    }
  }

  // Fallback: First try learned patterns, then rule-based categorization
  if (aiProvider === 'rules' || suggestions.length === 0) {
    suggestions = transactionsToProcess.map((line: any) => {
      const desc = (line.description || '').toLowerCase();
      const isDebit = line.is_debit;
      const amount = Math.abs(parseFloat(line.amount as any));
      let suggestedAccount = null;
      let confidence = 0;
      let reason = '';

      // === FIRST: Check learned patterns ===
      if (learnedPatterns.length > 0) {
        const descUpper = (line.description || '').toUpperCase();
        let bestPattern: any = null;
        let bestScore = 0;

        for (const pattern of learnedPatterns) {
          const txnType = isDebit ? 'debit' : 'credit';
          if (pattern.transaction_type !== txnType && pattern.transaction_type !== 'both') continue;

          const patternKeywords: string[] = pattern.keywords || [];
          const matchedKws = patternKeywords.filter((kw: string) => descUpper.includes(kw));
          if (matchedKws.length === 0) continue;

          const overlapRatio = matchedKws.length / patternKeywords.length;
          const inRange = amount >= parseFloat(pattern.amount_min) && amount <= parseFloat(pattern.amount_max);
          const amountBonus = inRange ? 15 : 0;
          const score = (overlapRatio * 60) + amountBonus + Math.min(15, pattern.frequency * 2);

          if (score > bestScore && score >= 30) {
            bestScore = score;
            bestPattern = pattern;
          }
        }

        if (bestPattern) {
          const matchedAccount = accountsResult.rows.find((a: any) => a.code === bestPattern.gl_account_code);
          if (matchedAccount) {
            suggestedAccount = matchedAccount;
            confidence = Math.min(95, Math.round(bestScore));
            reason = `Learned pattern: "${bestPattern.gl_account_name}" (used ${bestPattern.frequency}x)`;
          }
        }
      }

      // === SECOND: Rule-based pattern matching (if no learned pattern matched) ===
      if (!suggestedAccount) {
        if (desc.includes('bank charge') || desc.includes('service fee') || desc.includes('account fee') || desc.includes('monthly fee') || desc.includes('overdraft') || desc.includes('fee-unpaid') || desc.includes('insuff fund') || desc.includes('declined insuff')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('bank fee') || a.name.toLowerCase().includes('bank charge') || a.code === '5600');
          confidence = 95;
          reason = 'Bank fees/charges pattern detected';
        } else if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wages') || desc.includes('nett pay') || desc.includes('staff')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('salaries') || a.name.toLowerCase().includes('wages') || a.code === '5200');
          confidence = 90;
          reason = 'Payroll payment pattern';
        } else if (desc.includes('rent') || desc.includes('lease') || desc.includes('rental')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('rent') || a.code === '5300');
          confidence = 88;
          reason = 'Rent/lease payment pattern';
        } else if (desc.includes('insurance') || desc.includes('premium')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('insurance') || a.code === '5900' || a.code === '5800');
          confidence = 85;
          reason = 'Insurance premium pattern';
        } else if (desc.includes('telephone') || desc.includes('telkom') || desc.includes('vodacom') || desc.includes('mtn') || desc.includes('cell c') || desc.includes('cellc') || desc.includes('airtime') || desc.includes('data bundle')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('telephone') || a.name.toLowerCase().includes('communication') || a.name.toLowerCase().includes('office') || a.code === '5700');
          confidence = 85;
          reason = 'Telecommunications pattern';
        } else if (desc.includes('electricity') || desc.includes('eskom') || desc.includes('city power') || desc.includes('water') || desc.includes('municipal')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('utilit') || a.name.toLowerCase().includes('electricity') || a.name.toLowerCase().includes('water') || a.code === '5400');
          confidence = 90;
          reason = 'Utility payment pattern';
        } else if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('diesel') || desc.includes('engen') || desc.includes('shell') || desc.includes('sasol') || desc.includes('caltex') || desc.includes('total energies')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('fuel') || a.name.toLowerCase().includes('travel') || a.name.toLowerCase().includes('vehicle') || a.name.toLowerCase().includes('motor') || a.code === '5800');
          confidence = 85;
          reason = 'Fuel purchase pattern';
        } else if (desc.includes('uber') || desc.includes('bolt') || desc.includes('transport') || desc.includes('taxi') || desc.includes('gautrain')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('travel') || a.name.toLowerCase().includes('transport') || a.code === '5800');
          confidence = 80;
          reason = 'Transport/travel pattern';
        } else if (desc.includes('motor expense') || desc.includes('motor vehicle')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('motor vehicle') || a.name.toLowerCase().includes('vehicle'));
          confidence = 85;
          reason = 'Motor vehicle expense pattern';
        } else if (desc.includes('cell c') || desc.includes('melon') || desc.includes('vodacom') || desc.includes('mtn') || desc.includes('telkom') || desc.includes('rain mobile')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('telephone') || a.name.toLowerCase().includes('internet') || a.name.toLowerCase().includes('communication'));
          confidence = 85;
          reason = 'Telecommunications provider pattern';
        } else if (desc.includes('itunes') || desc.includes('spotify') || desc.includes('audible') || desc.includes('netflix') || desc.includes('canva') || desc.includes('microsoft') || desc.includes('adobe') || desc.includes('google ') || desc.includes('dropbox')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('subscription'));
          confidence = 80;
          reason = 'Digital subscription pattern';
        } else if (desc.includes('paystack') || desc.includes('dlocal') || desc.includes('payfast') || desc.includes('peach payments') || desc.includes('yoco')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('bank fee') || a.name.toLowerCase().includes('bank charge'));
          confidence = 75;
          reason = 'Payment gateway fee pattern';
        } else if (desc.includes('cipc') || desc.includes('sheriff') || desc.includes('attorneys')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('legal'));
          confidence = 78;
          reason = 'Statutory/legal cost pattern';
        } else if (desc.includes('donation') || desc.includes('family support') || desc.includes('community development')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('donation'));
          confidence = 75;
          reason = 'Donation/community support pattern';
        } else if (desc.includes('sars') || desc.includes('tax') || desc.includes('vat') || desc.includes('paye') || desc.includes('uif') || desc.includes('sdl')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('tax') || a.name.toLowerCase().includes('sars') || a.name.toLowerCase().includes('vat') || a.code === '2120');
          confidence = 90;
          reason = 'Tax/SARS payment pattern';
        } else if (desc.includes('office') || desc.includes('stationery') || desc.includes('supplies') || desc.includes('stapler') || desc.includes('printer') || desc.includes('paper')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('office') || a.code === '5700');
          confidence = 80;
          reason = 'Office supplies/expenses pattern';
        } else if (desc.includes('legal') || desc.includes('audit') || desc.includes('consulting') || desc.includes('professional') || desc.includes('accounting') || desc.includes('attorney')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('professional') || a.code === '5900');
          confidence = 82;
          reason = 'Professional fees pattern';
        } else if (desc.includes('depreciation') || desc.includes('amortisation') || desc.includes('amortization')) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('depreciation') || a.code === '5500');
          confidence = 90;
          reason = 'Depreciation pattern';
        } else if (desc.includes('debit transfer') || desc.includes('payment') || desc.includes('account payment')) {
          if (isDebit) {
            suggestedAccount = accountsResult.rows.find((a: any) =>
              a.name.toLowerCase().includes('office') || a.code === '5700');
            confidence = 40;
            reason = 'Generic debit payment - needs review';
          }
        } else if (desc.includes('rtd-not provided') || desc.includes('debit order return') || desc.includes('returned')) {
          if (!isDebit) {
            suggestedAccount = accountsResult.rows.find((a: any) =>
              a.name.toLowerCase().includes('bank fee') || a.name.toLowerCase().includes('bank charge') || a.code === '5600');
            confidence = 60;
            reason = 'Returned debit order - bank charges related';
          }
        } else if (desc.includes('interest') && !isDebit) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('interest') && (a.type?.toLowerCase() === 'revenue' || a.code?.startsWith('4')));
          confidence = 80;
          reason = 'Interest income pattern';
        } else if (!isDebit) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.code === '4100' || a.code === '4200' || (a.type?.toLowerCase() === 'revenue' && a.code?.startsWith('4') && a.code !== '4000'));
          confidence = 45;
          reason = 'Credit transaction - possible revenue (needs review)';
        } else if (isDebit) {
          suggestedAccount = accountsResult.rows.find((a: any) =>
            a.name.toLowerCase().includes('office') || a.code === '5700' || a.code === '5100');
          confidence = 30;
          reason = 'Unrecognized debit - manual categorization recommended';
        }
      }

      return {
        line_id: line.line_id,
        description: line.description,
        amount: line.amount,
        suggested_account_id: suggestedAccount?.id || null,
        suggested_account_code: suggestedAccount?.code || null,
        suggested_account_name: suggestedAccount?.name || null,
        confidence: suggestedAccount ? confidence : 0,
        reason: suggestedAccount ? reason : 'No pattern matched - manual categorization required'
      };
    });
  }

  return { suggestions, ai_provider: aiProvider };
}
