/**
 * AI Assistant Routes
 * API endpoints for AI agent interactions
 */

import express from 'express';
import {
    getAgents,
    getAgent,
    chat,
    streamChat,
    getConversations,
    getConversationHistory,
    archiveConversation,
    getSuggestions,
    updateSuggestionStatus,
    getAgentCapabilities,
    salesAssistant,
    complianceAssistant,
    financeAssistant
} from '../controllers/ai-assistant.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ================================================
// GENERAL AI AGENT ROUTES
// ================================================

/**
 * GET /api/ai/agents
 * List all available AI agents
 */
router.get('/agents', getAgents);

/**
 * GET /api/ai/agents/:agentCode
 * Get specific agent details
 */
router.get('/agents/:agentCode', getAgent);

/**
 * GET /api/ai/agents/:agentCode/capabilities
 * Get agent capabilities
 */
router.get('/agents/:agentCode/capabilities', getAgentCapabilities);

/**
 * POST /api/ai/agents/:agentCode/chat
 * Chat with an AI agent
 * Body: { message: string, contextData?: object }
 */
router.post('/agents/:agentCode/chat', chat);

/**
 * POST /api/ai/agents/:agentCode/stream
 * Stream chat with an AI agent (Server-Sent Events)
 * Body: { message: string, contextData?: object }
 */
router.post('/agents/:agentCode/stream', streamChat);

// ================================================
// CONVERSATION MANAGEMENT
// ================================================

/**
 * GET /api/ai/conversations
 * Get user's conversations
 * Query: ?includeArchived=true
 */
router.get('/conversations', getConversations);

/**
 * GET /api/ai/conversations/:conversationId/history
 * Get conversation message history
 * Query: ?limit=50
 */
router.get('/conversations/:conversationId/history', getConversationHistory);

/**
 * POST /api/ai/conversations/:conversationId/archive
 * Archive a conversation
 */
router.post('/conversations/:conversationId/archive', archiveConversation);

// ================================================
// AI SUGGESTIONS
// ================================================

/**
 * GET /api/ai/suggestions
 * Get AI-generated suggestions for user
 */
router.get('/suggestions', getSuggestions);

/**
 * PATCH /api/ai/suggestions/:suggestionId
 * Update suggestion status
 * Body: { status: 'VIEWED' | 'ACTIONED' | 'DISMISSED' }
 */
router.patch('/suggestions/:suggestionId', updateSuggestionStatus);

// ================================================
// SALES ASSISTANT - SPECIFIC ENDPOINTS
// ================================================

/**
 * POST /api/ai/sales/analyze-customer/:customerId
 * Analyze customer for upsell opportunities
 */
router.post('/sales/analyze-customer/:customerId', salesAssistant.analyzeCustomer);

/**
 * POST /api/ai/sales/generate-quotation
 * Generate quotation with AI assistance
 * Body: { customerId: string, items: array }
 */
router.post('/sales/generate-quotation', salesAssistant.generateQuotation);

/**
 * GET /api/ai/sales/forecast
 * Forecast sales
 * Query: ?period=month|quarter|year
 */
router.get('/sales/forecast', salesAssistant.forecastSales);

// ================================================
// COMPLIANCE ASSISTANT - SPECIFIC ENDPOINTS
// ================================================

/**
 * GET /api/ai/compliance/check
 * Check current compliance status
 */
router.get('/compliance/check', complianceAssistant.checkCompliance);

/**
 * GET /api/ai/compliance/assess-risk
 * Assess compliance risks
 * Query: ?area=financial|operational|regulatory
 */
router.get('/compliance/assess-risk', complianceAssistant.assessRisk);

// ================================================
// FINANCE ASSISTANT - SPECIFIC ENDPOINTS
// ================================================

/**
 * GET /api/ai/finance/explain-variance
 * Explain account variance
 * Query: ?accountCode=xxx&period=2024-01
 */
router.get('/finance/explain-variance', financeAssistant.explainVariance);

/**
 * POST /api/ai/finance/reconcile/:accountCode
 * Help reconcile account
 */
router.post('/finance/reconcile/:accountCode', financeAssistant.reconcileAccount);

// ================================================
// ADDITIONAL MODULE-SPECIFIC ROUTES
// (Can be extended for other assistants)
// ================================================

/**
 * POST /api/ai/procurement/optimize-po
 * Procurement assistant - optimize purchase order
 */
router.post('/procurement/optimize-po', async (req, res) => {
    // TODO: Implement procurement-specific logic
    res.status(501).json({ message: 'Coming soon' });
});

/**
 * POST /api/ai/hr/onboard-employee
 * HR assistant - guide employee onboarding
 */
router.post('/hr/onboard-employee', async (req, res) => {
    // TODO: Implement HR-specific logic
    res.status(501).json({ message: 'Coming soon' });
});

/**
 * GET /api/ai/analytics/insights
 * Analytics assistant - generate data insights
 */
router.get('/analytics/insights', async (req, res) => {
    // TODO: Implement analytics-specific logic
    res.status(501).json({ message: 'Coming soon' });
});

/**
 * GET /api/ai/treasury/optimize-cash
 * Treasury assistant - optimize cash position
 */
router.get('/treasury/optimize-cash', async (req, res) => {
    // TODO: Implement treasury-specific logic
    res.status(501).json({ message: 'Coming soon' });
});

export default router;
