/**
 * AI Assistant Controller V2
 * Tenant-hardened API for AI agent interactions
 * 
 * Features:
 * - List AI agents
 * - Chat with agents (sync and streaming)
 * - Conversation management
 * - AI suggestions
 * - Specialized assistants (Sales, Compliance, Finance)
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import aiAgentService from '../services/ai-agent.service';
import { pool } from '../config/database';
import { integrationService } from '../services/integration.service';
import { customerRepository, invoiceRepository } from '../repositories/sales';
import { supplierRepository, purchaseInvoiceRepository } from '../repositories/purchase';

/**
 * Tenant context helper
 */
function getTenantContext(req: TenantRequest): { tenantId: string; userId: string } {
  const tenantId = req.tenant?.id;
  const userId = req.user?.id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId: userId || '' };
}

// ============================================================================
// AI AGENTS
// ============================================================================

/**
 * List all available AI agents
 */
export const getAgents = async (req: TenantRequest, res: Response) => {
  try {
    getTenantContext(req); // Verify tenant context
    const agents = await aiAgentService.listAgents();
    res.json({ success: true, data: agents });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get agents error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agents' });
  }
};

/**
 * Get specific agent details
 */
export const getAgent = async (req: TenantRequest, res: Response) => {
  try {
    getTenantContext(req);
    const { agentCode } = req.params;

    const agent = await aiAgentService.getAgent(agentCode);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.json({ success: true, data: agent });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get agent error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agent' });
  }
};

/**
 * Get agent capabilities
 */
export const getAgentCapabilities = async (req: TenantRequest, res: Response) => {
  try {
    getTenantContext(req);
    const { agentCode } = req.params;

    const capabilities = await aiAgentService.getAgentCapabilities(agentCode);
    res.json({ success: true, data: { capabilities } });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get capabilities error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch capabilities' });
  }
};

// ============================================================================
// CHAT
// ============================================================================

/**
 * Chat with an AI agent
 */
export const chat = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { agentCode } = req.params;
    const { message, contextData } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const result = await aiAgentService.chatWithAgent(
      agentCode,
      tenantId,
      userId,
      message,
      contextData || {}
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process chat' });
  }
};

/**
 * Stream chat with an AI agent (SSE)
 */
export const streamChat = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { agentCode } = req.params;
    const { message, contextData } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = aiAgentService.streamChatWithAgent(
      agentCode,
      tenantId,
      userId,
      message,
      contextData || {}
    );

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Stream chat error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process chat' });
  }
};

// ============================================================================
// CONVERSATIONS
// ============================================================================

/**
 * Get user's conversations
 */
export const getConversations = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const includeArchived = req.query.includeArchived === 'true';

    const conversations = await aiAgentService.getUserConversations(tenantId, userId, includeArchived);
    res.json({ success: true, data: conversations });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
};

/**
 * Get conversation history
 */
export const getConversationHistory = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify conversation belongs to tenant
    const conversationCheck = await pool.query(
      `SELECT conversation_id FROM ai_conversations WHERE conversation_id = $1 AND tenant_id = $2`,
      [conversationId, tenantId]
    );

    if (conversationCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const history = await aiAgentService.getConversationHistory(conversationId, limit);
    res.json({ success: true, data: history });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get conversation history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation history' });
  }
};

/**
 * Archive a conversation
 */
export const archiveConversation = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { conversationId } = req.params;

    // Verify conversation belongs to tenant before archiving
    const conversationCheck = await pool.query(
      `SELECT conversation_id FROM ai_conversations WHERE conversation_id = $1 AND tenant_id = $2`,
      [conversationId, tenantId]
    );

    if (conversationCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    await aiAgentService.archiveConversation(conversationId);
    res.json({ success: true, message: 'Conversation archived successfully' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Archive conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to archive conversation' });
  }
};

// ============================================================================
// SUGGESTIONS
// ============================================================================

/**
 * Get AI suggestions for user
 */
export const getSuggestions = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);

    // Simple query - just return from ai_suggestions table without complex joins
    const result = await pool.query(
      `SELECT id, suggestion_type, suggestion_text, status, created_at
       FROM ai_suggestions
       WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL)
       AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 20`,
      [tenantId, userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get suggestions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suggestions' });
  }
};

/**
 * Update suggestion status
 */
export const updateSuggestionStatus = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { suggestionId } = req.params;
    const { status } = req.body;

    if (!['VIEWED', 'ACTIONED', 'DISMISSED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Verify suggestion belongs to tenant
    const result = await pool.query(
      `UPDATE ai_suggestions 
       SET status = $1, updated_at = NOW()
       WHERE suggestion_id = $2 AND tenant_id = $3
       RETURNING *`,
      [status, suggestionId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' });
    }

    res.json({ success: true, message: 'Suggestion status updated' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Update suggestion status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update suggestion status' });
  }
};

// ============================================================================
// SPECIALIZED ASSISTANTS
// ============================================================================

/**
 * Sales Assistant - Analyze customer
 */
export const salesAnalyzeCustomer = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { customerId } = req.params;

    const contextData = { customerId, action: 'analyze_customer' };
    const message = `Analyze customer ${customerId} and suggest upsell opportunities based on their purchase history.`;

    const result = await aiAgentService.chatWithAgent(
      'SALES_ASSISTANT',
      tenantId,
      userId,
      message,
      contextData
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Sales analyze customer error:', error);
    res.status(500).json({ success: false, error: 'Failed to analyze customer' });
  }
};

/**
 * Sales Assistant - Generate quotation
 */
export const salesGenerateQuotation = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { customerId, items } = req.body;

    const contextData = { customerId, items, action: 'generate_quotation' };
    const message = `Create a professional quotation for customer ${customerId} with these items: ${JSON.stringify(items)}`;

    const result = await aiAgentService.chatWithAgent(
      'SALES_ASSISTANT',
      tenantId,
      userId,
      message,
      contextData
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Sales generate quotation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate quotation' });
  }
};

/**
 * Sales Assistant - Forecast sales
 */
export const salesForecast = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { period } = req.query;

    const message = `Generate a sales forecast for the next ${period || 'month'} based on historical data and current trends.`;

    const result = await aiAgentService.chatWithAgent(
      'SALES_ASSISTANT',
      tenantId,
      userId,
      message,
      { action: 'forecast_sales', period }
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Sales forecast error:', error);
    res.status(500).json({ success: false, error: 'Failed to forecast sales' });
  }
};

/**
 * Compliance Assistant - Check compliance
 */
export const complianceCheck = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);

    const message = 'Check current compliance status and highlight any overdue items or upcoming deadlines.';

    const result = await aiAgentService.chatWithAgent(
      'COMPLIANCE_ASSISTANT',
      tenantId,
      userId,
      message,
      { action: 'check_compliance' }
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Compliance check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check compliance' });
  }
};

/**
 * Compliance Assistant - Risk assessment
 */
export const complianceRiskAssess = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { area } = req.query;

    const message = `Perform a risk assessment for ${area || 'all areas'} and suggest mitigation strategies.`;

    const result = await aiAgentService.chatWithAgent(
      'COMPLIANCE_ASSISTANT',
      tenantId,
      userId,
      message,
      { action: 'assess_risk', area }
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Compliance risk assess error:', error);
    res.status(500).json({ success: false, error: 'Failed to assess risk' });
  }
};

/**
 * Finance Assistant - Explain variance
 */
export const financeExplainVariance = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { accountCode, period } = req.query;

    const message = `Explain the variance in account ${accountCode} for ${period}. Analyze the contributing factors and suggest corrective actions if needed.`;

    const result = await aiAgentService.chatWithAgent(
      'FINANCE_ASSISTANT',
      tenantId,
      userId,
      message,
      { action: 'explain_variance', accountCode, period }
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Finance explain variance error:', error);
    res.status(500).json({ success: false, error: 'Failed to explain variance' });
  }
};

/**
 * Finance Assistant - Reconcile account
 */
export const financeReconcile = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { accountCode } = req.params;

    const message = `Help me reconcile account ${accountCode}. Identify any discrepancies and suggest how to resolve them.`;

    const result = await aiAgentService.chatWithAgent(
      'FINANCE_ASSISTANT',
      tenantId,
      userId,
      message,
      { action: 'reconcile_account', accountCode }
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Finance reconcile error:', error);
    res.status(500).json({ success: false, error: 'Failed to reconcile account' });
  }
};

// ============================================================================
// ACTIONABLE AI - Execute Commands (Natural Language → Transactions)
// ============================================================================

/**
 * Intent types that the AI can recognize and execute
 */
type AIIntent = 
  | 'CREATE_INVOICE'
  | 'CREATE_QUOTE'
  | 'RECORD_PAYMENT'
  | 'CREATE_EXPENSE'
  | 'CREATE_PURCHASE_ORDER'
  | 'CREATE_JOURNAL_ENTRY'
  | 'QUERY_DATA'
  | 'GENERATE_REPORT'
  | 'UNKNOWN';

interface ParsedCommand {
  intent: AIIntent;
  confidence: number;
  entities: {
    customer?: string;
    supplier?: string;
    amount?: number;
    description?: string;
    items?: Array<{ description: string; quantity: number; unitPrice: number }>;
    date?: string;
    account?: string;
  };
  rawText: string;
}

/**
 * Simple NLP parser for common ERP commands
 * In production, this would be replaced with a proper NLP model
 */
function parseNaturalLanguage(text: string): ParsedCommand {
  const lowerText = text.toLowerCase();
  
  // Extract amounts (R format or numbers)
  const amountMatch = text.match(/r\s?([\d,]+(?:\.\d{2})?)|(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[0].replace(/[r,\s]/gi, '')) : undefined;
  
  // Extract customer/supplier names (after "for", "to", "from")
  const entityMatch = text.match(/(?:for|to|from)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+for|\s+of|\s*$|,)/i);
  const entityName = entityMatch ? entityMatch[1].trim() : undefined;
  
  // Determine intent
  let intent: AIIntent = 'UNKNOWN';
  let confidence = 0;
  
  if (lowerText.includes('invoice') || lowerText.includes('bill')) {
    if (lowerText.includes('create') || lowerText.includes('new') || lowerText.includes('generate')) {
      intent = 'CREATE_INVOICE';
      confidence = 0.9;
    }
  } else if (lowerText.includes('quote') || lowerText.includes('quotation')) {
    intent = 'CREATE_QUOTE';
    confidence = 0.85;
  } else if (lowerText.includes('payment') || lowerText.includes('paid') || lowerText.includes('received')) {
    intent = 'RECORD_PAYMENT';
    confidence = 0.9;
  } else if (lowerText.includes('expense') || lowerText.includes('cost')) {
    intent = 'CREATE_EXPENSE';
    confidence = 0.85;
  } else if (lowerText.includes('purchase order') || lowerText.includes('po')) {
    intent = 'CREATE_PURCHASE_ORDER';
    confidence = 0.85;
  } else if (lowerText.includes('journal') || lowerText.includes('entry')) {
    intent = 'CREATE_JOURNAL_ENTRY';
    confidence = 0.8;
  } else if (lowerText.includes('show') || lowerText.includes('list') || lowerText.includes('what') || lowerText.includes('how much')) {
    intent = 'QUERY_DATA';
    confidence = 0.75;
  } else if (lowerText.includes('report') || lowerText.includes('summary')) {
    intent = 'GENERATE_REPORT';
    confidence = 0.75;
  }
  
  return {
    intent,
    confidence,
    entities: {
      customer: intent === 'CREATE_INVOICE' || intent === 'CREATE_QUOTE' ? entityName : undefined,
      supplier: intent === 'CREATE_PURCHASE_ORDER' || intent === 'CREATE_EXPENSE' ? entityName : undefined,
      amount,
      description: text
    },
    rawText: text
  };
}

/**
 * Execute a natural language command
 * Converts text to actual ERP transactions
 */
export const executeCommand = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { command, confirm } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }
    
    // Parse the natural language command
    const parsed = parseNaturalLanguage(command);
    
    // If confidence is too low, ask for clarification
    if (parsed.confidence < 0.7) {
      return res.json({
        success: true,
        data: {
          status: 'clarification_needed',
          message: "I'm not sure what you want me to do. Could you be more specific? Try phrases like:",
          suggestions: [
            "Create an invoice for [Customer] for R[amount]",
            "Record a payment of R[amount] from [Customer]",
            "Create a purchase order for [Supplier]",
            "Show me outstanding invoices",
            "Generate a profit and loss report"
          ],
          parsed
        }
      });
    }
    
    // If not confirmed, return what we're about to do
    if (!confirm) {
      return res.json({
        success: true,
        data: {
          status: 'pending_confirmation',
          message: `I understood: ${getIntentDescription(parsed)}`,
          intent: parsed.intent,
          entities: parsed.entities,
          confidence: parsed.confidence,
          confirmationRequired: true,
          nextStep: 'Call this endpoint again with confirm: true to execute'
        }
      });
    }
    
    // Execute the command
    const result = await executeIntent(tenantId, userId, parsed);
    
    res.json({
      success: true,
      data: {
        status: 'executed',
        message: result.message,
        result: result.data
      }
    });
    
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Execute command error:', error);
    res.status(500).json({ success: false, error: 'Failed to execute command' });
  }
};

function getIntentDescription(parsed: ParsedCommand): string {
  switch (parsed.intent) {
    case 'CREATE_INVOICE':
      return `Create a sales invoice${parsed.entities.customer ? ` for ${parsed.entities.customer}` : ''}${parsed.entities.amount ? ` for R${parsed.entities.amount.toFixed(2)}` : ''}`;
    case 'CREATE_QUOTE':
      return `Create a quotation${parsed.entities.customer ? ` for ${parsed.entities.customer}` : ''}`;
    case 'RECORD_PAYMENT':
      return `Record a payment${parsed.entities.amount ? ` of R${parsed.entities.amount.toFixed(2)}` : ''}`;
    case 'CREATE_EXPENSE':
      return `Record an expense${parsed.entities.supplier ? ` from ${parsed.entities.supplier}` : ''}`;
    case 'CREATE_PURCHASE_ORDER':
      return `Create a purchase order${parsed.entities.supplier ? ` for ${parsed.entities.supplier}` : ''}`;
    case 'CREATE_JOURNAL_ENTRY':
      return `Create a journal entry${parsed.entities.amount ? ` for R${parsed.entities.amount.toFixed(2)}` : ''}`;
    case 'QUERY_DATA':
      return `Retrieve data: ${parsed.rawText}`;
    case 'GENERATE_REPORT':
      return `Generate report: ${parsed.rawText}`;
    default:
      return parsed.rawText;
  }
}

async function executeIntent(
  tenantId: string,
  userId: string,
  parsed: ParsedCommand
): Promise<{ message: string; data?: any }> {
  const ctx = { tenantId, userId };
  
  switch (parsed.intent) {
    case 'CREATE_INVOICE': {
      // Find or create customer
      let customerId: string | undefined;
      if (parsed.entities.customer) {
        const customers = await customerRepository.search(ctx, parsed.entities.customer, { page: 1, limit: 1 });
        if (customers.data.length > 0) {
          customerId = String(customers.data[0].customer_id || customers.data[0].id);
        }
      }
      
      if (!customerId) {
        return {
          message: `Customer "${parsed.entities.customer || 'Unknown'}" not found. Please create the customer first or specify an existing customer.`,
          data: { status: 'customer_not_found' }
        };
      }
      
      const invoice = await invoiceRepository.createInvoiceWithLines(
        ctx,
        {
          customer_id: customerId,
          invoice_date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          total_amount: parsed.entities.amount || 0,
          subtotal: parsed.entities.amount || 0,
          status: 'draft',
          notes: `Created via AI Assistant: "${parsed.rawText}"`
        },
        parsed.entities.items || [{
          description: parsed.entities.description || 'Services rendered',
          quantity: 1,
          unit_price: parsed.entities.amount || 0,
          line_total: parsed.entities.amount || 0
        }]
      );
      
      return {
        message: `Invoice ${invoice.invoice_number} created for ${parsed.entities.customer}`,
        data: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, amount: invoice.total_amount }
      };
    }
    
    case 'RECORD_PAYMENT': {
      // This would need invoice ID to be specified - for now return guidance
      return {
        message: 'To record a payment, please specify the invoice number. Use: "Record payment of R[amount] for invoice INV-001"',
        data: { status: 'need_invoice_reference' }
      };
    }
    
    case 'QUERY_DATA': {
      // Return summary data based on query
      const query = parsed.rawText.toLowerCase();
      
      if (query.includes('outstanding') || query.includes('unpaid')) {
        const result = await pool.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(balance_due), 0) as total 
           FROM sales_invoices WHERE tenant_id = $1 AND status != 'paid' AND balance_due > 0`,
          [tenantId]
        );
        return {
          message: `You have ${result.rows[0].count} outstanding invoices totaling R${parseFloat(result.rows[0].total).toFixed(2)}`,
          data: result.rows[0]
        };
      }
      
      if (query.includes('revenue') || query.includes('sales')) {
        const result = await pool.query(
          `SELECT COALESCE(SUM(total_amount), 0) as total 
           FROM sales_invoices 
           WHERE tenant_id = $1 AND status = 'paid' 
           AND EXTRACT(MONTH FROM invoice_date) = EXTRACT(MONTH FROM CURRENT_DATE)`,
          [tenantId]
        );
        return {
          message: `Revenue this month: R${parseFloat(result.rows[0].total).toFixed(2)}`,
          data: result.rows[0]
        };
      }
      
      return {
        message: 'I can help you query: outstanding invoices, monthly revenue, expenses, customer balances',
        data: { status: 'query_guidance' }
      };
    }
    
    default:
      return {
        message: `The "${parsed.intent}" action is not yet fully implemented. This is a demonstration of the AI command execution capability.`,
        data: { status: 'not_implemented', intent: parsed.intent }
      };
  }
}

// ============================================================================
// LEARNING & FEEDBACK (Machine Learning)
// ============================================================================

/**
 * Record feedback on an AI response
 */
export const recordFeedback = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { conversationId } = req.params;
    const { wasHelpful, feedback } = req.body;

    if (typeof wasHelpful !== 'boolean') {
      return res.status(400).json({ success: false, error: 'wasHelpful (boolean) is required' });
    }

    // Update the conversation feedback in database
    const result = await pool.query(
      `UPDATE ai_conversations 
       SET was_helpful = $1, feedback = $2
       WHERE id = $3 AND tenant_id = $4
       RETURNING id`,
      [wasHelpful, feedback || null, conversationId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.json({ 
      success: true, 
      message: 'Thank you for your feedback! This helps me improve.' 
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Record feedback error:', error);
    res.status(500).json({ success: false, error: 'Failed to record feedback' });
  }
};

/**
 * Get FAQs - frequently asked questions learned from conversations
 */
export const getFAQs = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const category = req.query.category as string | undefined;

    const result = await pool.query(
      `SELECT id, question, answer, category, helpful_count, is_featured
       FROM ai_faq
       WHERE (tenant_id = $1 OR tenant_id IS NULL)
       ${category ? 'AND category = $2' : ''}
       ORDER BY is_featured DESC, helpful_count DESC
       LIMIT 20`,
      category ? [tenantId, category] : [tenantId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get FAQs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch FAQs' });
  }
};

/**
 * Get AI analytics for admin dashboard
 */
export const getAIAnalytics = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);

    // Total conversations
    const totalConvResult = await pool.query(
      `SELECT COUNT(*) as count FROM ai_conversations WHERE tenant_id = $1`,
      [tenantId]
    );

    // Helpful rate
    const helpfulResult = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE was_helpful = true) as helpful,
         COUNT(*) FILTER (WHERE was_helpful IS NOT NULL) as rated
       FROM ai_conversations WHERE tenant_id = $1`,
      [tenantId]
    );

    // Top categories
    const categoriesResult = await pool.query(
      `SELECT topic_category as category, COUNT(*) as count 
       FROM ai_conversations 
       WHERE tenant_id = $1 AND topic_category IS NOT NULL
       GROUP BY topic_category 
       ORDER BY count DESC 
       LIMIT 5`,
      [tenantId]
    );

    // Recent activity
    const activityResult = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM ai_conversations
       WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [tenantId]
    );

    const rated = parseInt(helpfulResult.rows[0]?.rated || '0');
    const helpful = parseInt(helpfulResult.rows[0]?.helpful || '0');

    res.json({
      success: true,
      data: {
        totalConversations: parseInt(totalConvResult.rows[0]?.count || '0'),
        helpfulRate: rated > 0 ? (helpful / rated * 100).toFixed(1) + '%' : 'N/A',
        topCategories: categoriesResult.rows,
        activityLastWeek: activityResult.rows,
        learningStatus: 'Active - Improving with every conversation'
      }
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get AI analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
};

/**
 * Get ERP knowledge base for help center
 */
export const getKnowledgeBase = async (req: TenantRequest, res: Response) => {
  try {
    getTenantContext(req);
    const module = req.query.module as string | undefined;

    // Import ERP knowledge dynamically
    const { ERP_KNOWLEDGE } = await import('../services/ai/ERPKnowledgeBase');
    
    if (module && ERP_KNOWLEDGE.modules[module]) {
      res.json({ 
        success: true, 
        data: {
          module: ERP_KNOWLEDGE.modules[module],
          glossary: ERP_KNOWLEDGE.glossary,
          workflows: ERP_KNOWLEDGE.workflows
        }
      });
    } else {
      // Return overview
      res.json({ 
        success: true, 
        data: {
          systemOverview: ERP_KNOWLEDGE.systemOverview,
          modules: Object.entries(ERP_KNOWLEDGE.modules).map(([key, m]) => ({
            key,
            name: m.name,
            description: m.description,
            navigation: m.navigation
          })),
          glossary: ERP_KNOWLEDGE.glossary,
          compliance: ERP_KNOWLEDGE.compliance
        }
      });
    }
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get knowledge base error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch knowledge base' });
  }
};

/**
 * Search the knowledge base
 */
export const searchKnowledgeBase = async (req: TenantRequest, res: Response) => {
  try {
    getTenantContext(req);
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query (q) is required' });
    }

    // Import search function
    const { searchKnowledge } = await import('../services/ai/ERPKnowledgeBase');
    
    const results = searchKnowledge(query);
    
    res.json({ 
      success: true, 
      data: {
        query,
        results,
        resultsCount: results.length
      }
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Search knowledge base error:', error);
    res.status(500).json({ success: false, error: 'Failed to search knowledge base' });
  }
};

export default {
  getAgents,
  getAgent,
  getAgentCapabilities,
  chat,
  streamChat,
  getConversations,
  getConversationHistory,
  archiveConversation,
  getSuggestions,
  updateSuggestionStatus,
  salesAnalyzeCustomer,
  salesGenerateQuotation,
  salesForecast,
  complianceCheck,
  complianceRiskAssess,
  financeExplainVariance,
  financeReconcile,
  executeCommand,
  // Machine Learning & Knowledge
  recordFeedback,
  getFAQs,
  getAIAnalytics,
  getKnowledgeBase,
  searchKnowledgeBase
};
