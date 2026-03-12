/**
 * AI Agent Service
 * Core service for AI-powered assistants with function-calling (tool use).
 * Supports: Groq (FREE), x.ai/Grok, OpenAI, Anthropic
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import pool from '../config/database';
import { getOpenAITools } from './ai-tools/tool-registry';
import { executeTool, confirmAction, ToolResult } from './ai-tools/tool-executor';
import { UsageCapService } from './usage-cap.service';

interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

interface AgentConfig {
    agent_id: string;
    agent_code: string;
    agent_name: string;
    module_name: string;
    system_prompt: string;
    capabilities: string[];
    model_name: string;
    temperature: number;
    max_tokens: number;
}

interface ConversationContext {
    conversation_id: string;
    tenant_id: string;
    user_id: string;
    agent_id: string;
    context_data: any;
}

class AIAgentService {
    private openaiClient: OpenAI | null = null;
    private anthropicClient: Anthropic | null = null;
    private xaiClient: OpenAI | null = null;  // x.ai uses OpenAI-compatible API
    private groqClient: OpenAI | null = null;  // Groq uses OpenAI-compatible API
    private activeProvider: 'groq' | 'xai' | 'openai' | 'anthropic' | null = null;

    constructor() {
        // Initialize Groq FIRST (FREE and fast!)
        if (process.env.GROQ_API_KEY) {
            this.groqClient = new OpenAI({
                apiKey: process.env.GROQ_API_KEY,
                baseURL: 'https://api.groq.com/openai/v1',
            });
            this.activeProvider = 'groq';
            console.log('🤖 AI Agent: Using Groq (FREE)');
        }
        // Then try x.ai/Grok
        else if (process.env.XAI_API_KEY) {
            this.xaiClient = new OpenAI({
                apiKey: process.env.XAI_API_KEY,
                baseURL: 'https://api.x.ai/v1',
            });
            this.activeProvider = 'xai';
            console.log('🤖 AI Agent: Using x.ai/Grok');
        }
        // Then try OpenAI
        else if (process.env.OPENAI_API_KEY) {
            this.openaiClient = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            this.activeProvider = 'openai';
            console.log('🤖 AI Agent: Using OpenAI');
        }
        // Finally try Anthropic
        else if (process.env.ANTHROPIC_API_KEY) {
            this.anthropicClient = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
            this.activeProvider = 'anthropic';
            console.log('🤖 AI Agent: Using Anthropic');
        } else {
            console.warn('⚠️ AI Agent: No AI provider configured (GROQ_API_KEY, XAI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)');
        }
    }

    /**
     * Check if AI is available
     */
    isAvailable(): boolean {
        return this.activeProvider !== null;
    }

    /**
     * Get active provider name
     */
    getProvider(): string {
        return this.activeProvider || 'none';
    }

    /**
     * Default agent configs — used when ai_agents table doesn't exist yet
     */
    private static DEFAULT_AGENTS: Record<string, AgentConfig> = {
        general: {
            agent_id: 'default-general',
            agent_code: 'general',
            agent_name: 'SiyaBusa AI Assistant',
            module_name: 'General',
            system_prompt: `You are SiyaBusa AI Assistant, an ERP helper for South African businesses. You have access to tools that let you query real business data (customers, invoices, products, employees, accounts, stock levels) and create records (invoices, quotes, journal entries, purchase orders, payments, stock adjustments). Always use your tools to get real data — never make up numbers. When a user asks about their data, call the appropriate tool. For write actions, preview first and ask for confirmation. Be concise and professional. Currency is ZAR (Rands). Mention SARS compliance where relevant.`,
            capabilities: ['query_data', 'create_records', 'financial_reports'],
            model_name: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 2048,
        },
        financial: {
            agent_id: 'default-financial',
            agent_code: 'financial',
            agent_name: 'Financial Assistant',
            module_name: 'Financial Accounting',
            system_prompt: `You are SiyaBusa Financial Assistant specializing in accounting and finance. You can query chart of accounts, journal entries, account balances, invoices, and payments. You help with financial reporting, reconciliation, and SARS compliance. Always use tools to fetch real data. Currency is ZAR.`,
            capabilities: ['financial_queries', 'journal_entries', 'reporting'],
            model_name: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            max_tokens: 2048,
        },
        sales: {
            agent_id: 'default-sales',
            agent_code: 'sales',
            agent_name: 'Sales Assistant',
            module_name: 'Sales & CRM',
            system_prompt: `You are SiyaBusa Sales Assistant. You help with customer management, invoicing, quotes, and sales reporting. Always use tools to query real customer and invoice data. Currency is ZAR.`,
            capabilities: ['customer_queries', 'invoicing', 'quotes'],
            model_name: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 2048,
        },
    };

    /**
     * Get AI agent configuration — falls back to hardcoded defaults if DB table missing
     */
    async getAgent(agentCode: string): Promise<AgentConfig | null> {
        try {
            const result = await pool.query(
                'SELECT * FROM ai_agents WHERE agent_code = $1 AND is_active = true',
                [agentCode]
            );
            if (result.rows.length > 0) return result.rows[0];
        } catch (err: any) {
            // Table doesn't exist — use defaults
            if (err.code !== '42P01') console.error('[AI] getAgent DB error:', err.message);
        }
        return AIAgentService.DEFAULT_AGENTS[agentCode] || AIAgentService.DEFAULT_AGENTS['general'] || null;
    }

    /**
     * Create or get conversation — gracefully degrades if tables don't exist
     */
    async getOrCreateConversation(
        tenantId: string,
        userId: string,
        agentCode: string,
        contextData: any = {}
    ): Promise<string> {
        try {
            const agent = await this.getAgent(agentCode);
            const agentId = agent?.agent_id || 'default-general';

            const existingResult = await pool.query(
                `SELECT conversation_id FROM ai_conversations 
                 WHERE tenant_id = $1 AND user_id = $2 AND agent_id = $3 
                 AND is_archived = false 
                 ORDER BY last_message_at DESC LIMIT 1`,
                [tenantId, userId, agentId]
            );

            if (existingResult.rows.length > 0) {
                return existingResult.rows[0].conversation_id;
            }

            const newResult = await pool.query(
                `INSERT INTO ai_conversations (tenant_id, agent_id, user_id, context_data)
                 VALUES ($1, $2, $3, $4) RETURNING conversation_id`,
                [tenantId, agentId, userId, JSON.stringify(contextData)]
            );

            return newResult.rows[0].conversation_id;
        } catch (err: any) {
            // Tables don't exist — return ephemeral ID, chat still works
            return `ephemeral_${tenantId}_${Date.now()}`;
        }
    }

    /**
     * Get conversation history — returns empty if tables missing
     */
    async getConversationHistory(conversationId: string, limit: number = 50): Promise<Message[]> {
        if (conversationId.startsWith('ephemeral_')) return [];
        try {
            const result = await pool.query(
                `SELECT role, content FROM ai_messages 
                 WHERE conversation_id = $1 
                 ORDER BY created_at ASC LIMIT $2`,
                [conversationId, limit]
            );
            return result.rows;
        } catch {
            return [];
        }
    }

    /**
     * Save message to conversation — silently skips if tables missing
     */
    async saveMessage(
        conversationId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        tokensUsed?: number,
        functionCalls?: any
    ): Promise<void> {
        if (conversationId.startsWith('ephemeral_')) return;
        try {
            await pool.query(
                `INSERT INTO ai_messages (conversation_id, role, content, tokens_used, function_calls)
                 VALUES ($1, $2, $3, $4, $5)`,
                [conversationId, role, content, tokensUsed || null, functionCalls ? JSON.stringify(functionCalls) : null]
            );
            await pool.query(
                'UPDATE ai_conversations SET last_message_at = CURRENT_TIMESTAMP WHERE conversation_id = $1',
                [conversationId]
            );
        } catch {
            // Tables don't exist yet — that's OK, chat still works
        }
    }

    /**
     * Chat with agent — with function-calling tool loop
     */
    async chatWithAgent(
        agentCode: string,
        tenantId: string,
        userId: string,
        userMessage: string,
        contextData: any = {}
    ): Promise<{ response: string; conversationId: string; pending_action_id?: string }> {
        if (!this.groqClient && !this.xaiClient && !this.openaiClient && !this.anthropicClient) {
            throw new Error('No AI provider configured. Set GROQ_API_KEY, XAI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY');
        }

        const agent = await this.getAgent(agentCode);
        if (!agent) throw new Error('Agent not found');

        // ── Usage cap check ──────────────────────────────────────
        const usageCheck = await UsageCapService.checkUsage(tenantId, null, 'ai_queries');
        if (usageCheck.blocked) {
            return {
                response: `You've reached your monthly AI query limit (${usageCheck.limit} queries). ` +
                    `Upgrade your plan or contact support to increase your limit.`,
                conversationId: '',
            };
        }

        const conversationId = await this.getOrCreateConversation(tenantId, userId, agentCode, contextData);

        // Check if user is confirming a pending write action
        const confirmMatch = userMessage.match(/^(?:yes|confirm|go ahead|do it|create it|record it|post it|adjust it)/i);
        if (confirmMatch && contextData?.pending_action_id) {
            const result = await confirmAction(contextData.pending_action_id);
            const response = result.success
                ? (result.data?.message || JSON.stringify(result.data))
                : `Error: ${result.error}`;
            await this.saveMessage(conversationId, 'user', userMessage);
            await this.saveMessage(conversationId, 'assistant', response);
            return { response, conversationId };
        }

        // Save user message
        await this.saveMessage(conversationId, 'user', userMessage);

        // Get conversation history
        const history = await this.getConversationHistory(conversationId);

        // Build messages array
        const messages: any[] = [
            { role: 'system', content: agent.system_prompt + '\n\nYou have access to real ERP tools. Use them to look up data and perform actions. Always use tools rather than guessing data.' },
            ...history.slice(-10),
        ];

        // Select the OpenAI-compatible client + model
        const client = this.groqClient || this.xaiClient || this.openaiClient;
        let model: string;
        if (this.groqClient) model = 'llama-3.3-70b-versatile';
        else if (this.xaiClient) model = 'grok-4-latest';
        else model = agent.model_name || 'gpt-4';

        const tools = getOpenAITools();
        let totalTokens = 0;
        let pendingActionId: string | undefined;

        // Function-calling loop (max 5 iterations to prevent runaway)
        const MAX_TOOL_ROUNDS = 5;
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            let completion: any;

            if (client) {
                completion = await client.chat.completions.create({
                    model,
                    messages,
                    temperature: agent.temperature || 0.7,
                    max_tokens: agent.max_tokens || 2000,
                    tools: tools.length > 0 ? tools : undefined,
                    tool_choice: tools.length > 0 ? 'auto' : undefined,
                });
                totalTokens += completion.usage?.total_tokens || 0;
            } else if (this.anthropicClient) {
                // Anthropic uses a different API — fall back to plain chat
                const anthropicResult = await this.anthropicClient.messages.create({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: agent.max_tokens || 2000,
                    system: agent.system_prompt,
                    messages: history.slice(-10).map(m => ({
                        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
                        content: m.content
                    })),
                });
                const anthropicText = anthropicResult.content[0].type === 'text' ? anthropicResult.content[0].text : '';
                totalTokens += anthropicResult.usage.input_tokens + anthropicResult.usage.output_tokens;
                await this.saveMessage(conversationId, 'assistant', anthropicText, totalTokens);
                await this.updateUsageAnalytics(tenantId, agent.agent_id, totalTokens);
                return { response: anthropicText, conversationId };
            } else {
                throw new Error('No AI provider available');
            }

            const choice = completion.choices[0];
            const msg = choice.message;

            // If the model wants to call tools
            if (msg.tool_calls && msg.tool_calls.length > 0) {
                // Add the assistant message (with tool_calls) to context
                messages.push(msg);

                // Execute each tool call
                for (const toolCall of msg.tool_calls) {
                    const fnName = toolCall.function.name;
                    let fnArgs: Record<string, string> = {};
                    try { fnArgs = JSON.parse(toolCall.function.arguments); } catch { /* empty */ }

                    const toolResult: ToolResult = await executeTool(fnName, fnArgs, tenantId, userId);

                    // If the tool needs confirmation, short-circuit — return preview to user
                    if (toolResult.needs_confirmation) {
                        const preview = toolResult.preview || 'Please confirm this action.';
                        pendingActionId = toolResult.pending_action_id;
                        await this.saveMessage(conversationId, 'assistant', preview, totalTokens, [{ tool: fnName, args: fnArgs }]);
                        await this.updateUsageAnalytics(tenantId, agent.agent_id, totalTokens);
                        return { response: preview, conversationId, pending_action_id: pendingActionId };
                    }

                    // Feed tool result back to the model
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(toolResult.data ?? toolResult.error ?? 'No result'),
                    });
                }

                // Continue loop — model will process tool results and may call more tools
                continue;
            }

            // No tool calls — model is finished, return the text response
            const assistantResponse = msg.content || '';
            await this.saveMessage(conversationId, 'assistant', assistantResponse, totalTokens);
            await this.updateUsageAnalytics(tenantId, agent.agent_id, totalTokens);
            // Record AI usage
            await UsageCapService.recordUsage(tenantId, userId, 'ai_queries', 1, { agent: agentCode, tokens: totalTokens });
            return { response: assistantResponse, conversationId };
        }

        // Safety: if we exceeded max rounds, return what we have
        const fallback = 'I gathered the data but hit a processing limit. Please try a simpler question.';
        await this.saveMessage(conversationId, 'assistant', fallback, totalTokens);
        await UsageCapService.recordUsage(tenantId, userId, 'ai_queries', 1, { agent: agentCode, tokens: totalTokens });
        return { response: fallback, conversationId };
    }

    /**
     * Stream chat response (for real-time UX)
     */
    async *streamChatWithAgent(
        agentCode: string,
        tenantId: string,
        userId: string,
        userMessage: string,
        contextData: any = {}
    ): AsyncGenerator<string, void, unknown> {
        // Streaming works with Groq, x.ai/Grok, or OpenAI (all use OpenAI-compatible API)
        const client = this.groqClient || this.xaiClient || this.openaiClient;
        if (!client) {
            throw new Error('Streaming requires Groq, x.ai, or OpenAI API');
        }

        const agent = await this.getAgent(agentCode);
        if (!agent) throw new Error('Agent not found');

        const conversationId = await this.getOrCreateConversation(tenantId, userId, agentCode, contextData);
        await this.saveMessage(conversationId, 'user', userMessage);

        const history = await this.getConversationHistory(conversationId);
        const messages: Message[] = [
            { role: 'system', content: agent.system_prompt },
            ...history.slice(-10),
        ];

        // Select model based on provider
        let model: string;
        if (this.groqClient) {
            model = 'llama-3.3-70b-versatile';
        } else if (this.xaiClient) {
            model = 'grok-4-latest';
        } else {
            model = agent.model_name || 'gpt-4';
        }
        
        const stream = await client.chat.completions.create({
            model,
            messages: messages as any,
            temperature: agent.temperature || 0.7,
            max_tokens: agent.max_tokens || 2000,
            stream: true,
        });

        let fullResponse = '';
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullResponse += content;
                yield content;
            }
        }

        // Save complete response
        await this.saveMessage(conversationId, 'assistant', fullResponse);
    }

    /**
     * Generate proactive suggestion
     */
    async generateSuggestion(
        tenantId: string,
        agentCode: string,
        userId: string | null,
        suggestionType: string,
        title: string,
        description: string,
        actionUrl?: string,
        priority: string = 'MEDIUM'
    ): Promise<string> {
        const agent = await this.getAgent(agentCode);
        if (!agent) throw new Error('Agent not found');

        const result = await pool.query(
            `INSERT INTO ai_suggestions 
             (tenant_id, agent_id, user_id, suggestion_type, title, description, action_url, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING suggestion_id`,
            [tenantId, agent.agent_id, userId, suggestionType, title, description, actionUrl, priority]
        );

        return result.rows[0].suggestion_id;
    }

    /**
     * Get pending suggestions for user
     */
    async getUserSuggestions(tenantId: string, userId: string): Promise<any[]> {
        const result = await pool.query(
            `SELECT s.*, a.agent_name, a.agent_code 
             FROM ai_suggestions s
             JOIN ai_agents a ON s.agent_id = a.agent_id
             WHERE s.tenant_id = $1 AND (s.user_id = $2 OR s.user_id IS NULL)
             AND s.status = 'PENDING'
             AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)
             ORDER BY 
                CASE s.priority 
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    ELSE 4
                END,
                s.created_at DESC`,
            [tenantId, userId]
        );

        return result.rows;
    }

    /**
     * Update usage analytics
     */
    private async updateUsageAnalytics(tenantId: string, agentId: string, tokensUsed: number): Promise<void> {
        await pool.query(
            `INSERT INTO ai_usage_analytics (tenant_id, agent_id, usage_date, total_messages, total_tokens)
             VALUES ($1, $2, CURRENT_DATE, 1, $3)
             ON CONFLICT (tenant_id, agent_id, usage_date) 
             DO UPDATE SET 
                total_messages = ai_usage_analytics.total_messages + 1,
                total_tokens = ai_usage_analytics.total_tokens + $3`,
            [tenantId, agentId, tokensUsed]
        );
    }

    /**
     * Get agent capabilities
     */
    async getAgentCapabilities(agentCode: string): Promise<string[]> {
        const agent = await this.getAgent(agentCode);
        return agent?.capabilities || [];
    }

    /**
     * List all available agents — falls back to defaults if table missing
     */
    async listAgents(): Promise<AgentConfig[]> {
        try {
            const result = await pool.query(
                'SELECT * FROM ai_agents WHERE is_active = true ORDER BY module_name, agent_name'
            );
            if (result.rows.length > 0) return result.rows;
        } catch {
            // Table doesn't exist
        }
        return Object.values(AIAgentService.DEFAULT_AGENTS);
    }

    /**
     * Archive conversation
     */
    async archiveConversation(conversationId: string): Promise<void> {
        try {
            await pool.query(
                'UPDATE ai_conversations SET is_archived = true WHERE conversation_id = $1',
                [conversationId]
            );
        } catch { /* table might not exist */ }
    }

    /**
     * Get user's conversations — returns empty if tables missing
     */
    async getUserConversations(tenantId: string, userId: string, includeArchived: boolean = false): Promise<any[]> {
        try {
            const query = includeArchived
                ? `SELECT c.*, a.agent_name, a.agent_code, a.module_name,
                          (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = c.conversation_id) as message_count
                   FROM ai_conversations c
                   JOIN ai_agents a ON c.agent_id = a.agent_id
                   WHERE c.tenant_id = $1 AND c.user_id = $2
                   ORDER BY c.last_message_at DESC`
                : `SELECT c.*, a.agent_name, a.agent_code, a.module_name,
                          (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = c.conversation_id) as message_count
                   FROM ai_conversations c
                   JOIN ai_agents a ON c.agent_id = a.agent_id
                   WHERE c.tenant_id = $1 AND c.user_id = $2 AND c.is_archived = false
                   ORDER BY c.last_message_at DESC`;

            const result = await pool.query(query, [tenantId, userId]);
            return result.rows;
        } catch {
            return [];
        }
    }
}

export default new AIAgentService();
