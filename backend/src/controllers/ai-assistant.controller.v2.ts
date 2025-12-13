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

    const suggestions = await aiAgentService.getUserSuggestions(tenantId, userId);
    res.json({ success: true, data: suggestions });
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
  financeReconcile
};
