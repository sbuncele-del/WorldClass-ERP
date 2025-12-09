/**
 * AetherOS AI Assistant Service
 * 
 * Converts natural language into accounting and business operations.
 * This is the core differentiator - making ERP accessible to business owners.
 * 
 * Model: OpenAI GPT-4o-mini (best balance of cost/quality for structured tasks)
 * Estimated cost: ~R0.50-2 per customer per month at typical usage
 */

import OpenAI from 'openai';
import { EventEmitter } from 'events';

// Types
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  action?: AIAction;
  confirmationRequired?: boolean;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
    estimatedCost: number; // in USD cents
  };
}

export interface AIAction {
  type: AIActionType;
  status: 'pending' | 'confirmed' | 'executed' | 'cancelled';
  data: Record<string, any>;
  description: string;
  requiresConfirmation: boolean;
  validations?: AIValidation[];
}

export interface AIValidation {
  field: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  value?: any;
}

export type AIActionType = 
  | 'create_invoice'
  | 'create_quote'
  | 'create_purchase_order'
  | 'record_payment'
  | 'process_refund'
  | 'check_inventory'
  | 'check_customer_balance'
  | 'create_journal_entry'
  | 'run_report'
  | 'create_expense'
  | 'process_payroll'
  | 'update_stock'
  | 'create_customer'
  | 'create_supplier'
  | 'schedule_delivery'
  | 'general_query'
  | 'unknown';

export interface ConversationContext {
  tenantId: string;
  userId: string;
  sessionId: string;
  messages: AIMessage[];
  currentAction?: AIAction;
}

export interface AIAssistantConfig {
  openaiApiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// System prompt that defines the AI's behavior
const SYSTEM_PROMPT = `You are the AetherOS AI Assistant - an intelligent business operations assistant that helps business owners manage their company through natural language.

YOUR ROLE:
- Convert natural language requests into structured business operations
- Always verify critical information before executing actions
- Explain what you're doing in simple, non-accounting terms
- Protect the business from errors (credit limits, stock availability, compliance)

CAPABILITIES:
1. Sales & Invoicing: Create invoices, quotes, record payments, process refunds
2. Purchasing: Create purchase orders, record supplier invoices
3. Inventory: Check stock levels, update quantities, transfer between locations
4. Customers: Check balances, credit limits, payment history
5. Finance: Create journal entries, run reports, check cash position
6. HR: Process payroll, manage leave, update employee info
7. Logistics: Schedule deliveries, track shipments

RESPONSE FORMAT:
Always respond with a JSON object:
{
  "message": "Your conversational response to the user",
  "action": {
    "type": "action_type",
    "requiresConfirmation": true/false,
    "data": { /* action-specific data */ },
    "description": "Human-readable description of what will happen"
  },
  "validations": [
    {
      "field": "field_name",
      "status": "pass|warning|fail",
      "message": "Validation message",
      "value": "actual value"
    }
  ],
  "followUp": "Optional follow-up question if more info needed"
}

CONFIRMATION RULES:
- ALWAYS require confirmation for: invoices > R10,000, payments, refunds, journal entries, payroll
- WARN but don't block: approaching credit limit, low stock after transaction
- BLOCK and explain: exceeds credit limit, insufficient stock, missing required fields

CONTEXT AWARENESS:
- Remember previous messages in the conversation
- Use context to fill in missing details
- Ask for clarification when genuinely ambiguous

COMPLIANCE:
- All financial transactions must be audit-ready
- Mention relevant compliance (VAT, POPIA) when applicable
- Never skip required validations`;

// Mock data service (replace with real database queries)
class MockDataService {
  async getCustomer(name: string) {
    // Simulated customer lookup
    const customers: Record<string, any> = {
      'abc corp': {
        id: 'CUST001',
        name: 'ABC Corp',
        creditLimit: 75000,
        currentBalance: 32500,
        availableCredit: 42500,
        paymentTerms: 'Net 30',
        vatNumber: '4123456789',
        email: 'accounts@abccorp.co.za'
      },
      'xyz industries': {
        id: 'CUST002',
        name: 'XYZ Industries',
        creditLimit: 100000,
        currentBalance: 15000,
        availableCredit: 85000,
        paymentTerms: 'Net 14',
        vatNumber: '4987654321',
        email: 'finance@xyz.co.za'
      }
    };
    return customers[name.toLowerCase()] || null;
  }

  async getProduct(name: string) {
    const products: Record<string, any> = {
      'product a': {
        id: 'PROD001',
        name: 'Product A',
        sku: 'PA-001',
        unitPrice: 100,
        costPrice: 65,
        stockOnHand: 847,
        warehouse: 'Warehouse A',
        vatRate: 15,
        category: 'Electronics'
      },
      'widget pro': {
        id: 'PROD002',
        name: 'Widget Pro',
        sku: 'WP-500',
        unitPrice: 250,
        costPrice: 150,
        stockOnHand: 324,
        warehouse: 'Warehouse A',
        vatRate: 15,
        category: 'Components'
      }
    };
    return products[name.toLowerCase()] || null;
  }

  async getInventoryLevel(productId: string) {
    return {
      productId,
      stockOnHand: 847,
      reserved: 50,
      available: 797,
      reorderPoint: 100,
      warehouse: 'Warehouse A'
    };
  }

  async getCashPosition() {
    return {
      totalCash: 1250000,
      bankAccounts: [
        { name: 'FNB Business', balance: 850000 },
        { name: 'Nedbank', balance: 400000 }
      ],
      pendingReceivables: 320000,
      pendingPayables: 180000,
      netPosition: 1390000
    };
  }
}

export class AIAssistantService extends EventEmitter {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private dataService: MockDataService;
  private conversations: Map<string, ConversationContext> = new Map();

  constructor(config: AIAssistantConfig) {
    super();
    
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
    
    this.model = config.model || 'gpt-4o-mini';
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.3; // Lower for more consistent outputs
    this.dataService = new MockDataService();
  }

  /**
   * Process a user message and return AI response with actions
   */
  async processMessage(
    message: string,
    context: {
      tenantId: string;
      userId: string;
      sessionId: string;
    }
  ): Promise<AIMessage> {
    const startTime = Date.now();
    
    // Get or create conversation context
    let conversation = this.conversations.get(context.sessionId);
    if (!conversation) {
      conversation = {
        ...context,
        messages: []
      };
      this.conversations.set(context.sessionId, conversation);
    }

    // Add user message to history
    const userMessage: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    try {
      // Enrich the message with relevant data
      const enrichedContext = await this.enrichContext(message);
      
      // Build messages for OpenAI
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `CURRENT CONTEXT:\n${JSON.stringify(enrichedContext, null, 2)}` },
        ...conversation.messages.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      ];

      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const usage = completion.usage;
      
      // Parse AI response
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch {
        parsedResponse = {
          message: responseText,
          action: null
        };
      }

      // Calculate token cost (GPT-4o-mini pricing)
      const inputCost = (usage?.prompt_tokens || 0) * 0.00015 / 1000;
      const outputCost = (usage?.completion_tokens || 0) * 0.0006 / 1000;
      const totalCostUSD = inputCost + outputCost;

      // Build AI message
      const aiMessage: AIMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: parsedResponse.message || 'I processed your request.',
        timestamp: new Date(),
        action: parsedResponse.action ? {
          type: parsedResponse.action.type || 'unknown',
          status: 'pending',
          data: parsedResponse.action.data || {},
          description: parsedResponse.action.description || '',
          requiresConfirmation: parsedResponse.action.requiresConfirmation ?? true,
          validations: parsedResponse.validations || []
        } : undefined,
        confirmationRequired: parsedResponse.action?.requiresConfirmation,
        tokenUsage: {
          prompt: usage?.prompt_tokens || 0,
          completion: usage?.completion_tokens || 0,
          total: usage?.total_tokens || 0,
          estimatedCost: totalCostUSD * 100 // Convert to cents
        }
      };

      // Store in conversation
      conversation.messages.push(aiMessage);
      if (aiMessage.action) {
        conversation.currentAction = aiMessage.action;
      }

      // Emit event for tracking
      this.emit('message_processed', {
        sessionId: context.sessionId,
        processingTime: Date.now() - startTime,
        tokenUsage: aiMessage.tokenUsage
      });

      return aiMessage;

    } catch (error: any) {
      console.error('AI Assistant Error:', error);
      
      const errorMessage: AIMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `I encountered an issue processing your request. Please try again or rephrase your question. Error: ${error.message}`,
        timestamp: new Date()
      };
      
      conversation.messages.push(errorMessage);
      return errorMessage;
    }
  }

  /**
   * Confirm and execute a pending action
   */
  async confirmAction(sessionId: string): Promise<AIMessage> {
    const conversation = this.conversations.get(sessionId);
    
    if (!conversation?.currentAction) {
      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'There is no pending action to confirm.',
        timestamp: new Date()
      };
    }

    const action = conversation.currentAction;
    
    try {
      // Execute the action based on type
      const result = await this.executeAction(action, conversation);
      
      action.status = 'executed';
      
      const confirmMessage: AIMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        action: {
          ...action,
          status: 'executed'
        }
      };
      
      conversation.messages.push(confirmMessage);
      conversation.currentAction = undefined;
      
      return confirmMessage;
      
    } catch (error: any) {
      action.status = 'cancelled';
      
      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Failed to execute action: ${error.message}`,
        timestamp: new Date(),
        action: {
          ...action,
          status: 'cancelled'
        }
      };
    }
  }

  /**
   * Cancel a pending action
   */
  async cancelAction(sessionId: string): Promise<AIMessage> {
    const conversation = this.conversations.get(sessionId);
    
    if (!conversation?.currentAction) {
      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'There is no pending action to cancel.',
        timestamp: new Date()
      };
    }

    conversation.currentAction.status = 'cancelled';
    const cancelledAction = conversation.currentAction;
    conversation.currentAction = undefined;

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: 'Action cancelled. How else can I help you?',
      timestamp: new Date(),
      action: cancelledAction
    };
  }

  /**
   * Enrich context with relevant data based on message content
   */
  private async enrichContext(message: string): Promise<Record<string, any>> {
    const context: Record<string, any> = {
      currentDate: new Date().toISOString().split('T')[0],
      currency: 'ZAR',
      vatRate: 15
    };

    const lowerMessage = message.toLowerCase();

    // Check for customer mentions
    if (lowerMessage.includes('abc corp')) {
      context.customer = await this.dataService.getCustomer('abc corp');
    } else if (lowerMessage.includes('xyz')) {
      context.customer = await this.dataService.getCustomer('xyz industries');
    }

    // Check for product mentions
    if (lowerMessage.includes('product a')) {
      context.product = await this.dataService.getProduct('product a');
    } else if (lowerMessage.includes('widget')) {
      context.product = await this.dataService.getProduct('widget pro');
    }

    // Check for financial queries
    if (lowerMessage.includes('cash') || lowerMessage.includes('balance') || lowerMessage.includes('money')) {
      context.cashPosition = await this.dataService.getCashPosition();
    }

    return context;
  }

  /**
   * Execute a confirmed action
   */
  private async executeAction(
    action: AIAction,
    context: ConversationContext
  ): Promise<{ success: boolean; message: string; data?: any }> {
    
    switch (action.type) {
      case 'create_invoice':
        // In production, this would call the actual invoice service
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
        return {
          success: true,
          message: `✅ Invoice ${invoiceNumber} created successfully!\n\n` +
            `• Customer: ${action.data.customer}\n` +
            `• Amount: R${action.data.total?.toLocaleString()}\n` +
            `• Due Date: ${action.data.dueDate || '30 days from now'}\n\n` +
            `The invoice has been saved and is ready to send. Would you like me to email it to the customer?`,
          data: { invoiceNumber }
        };

      case 'check_inventory':
        return {
          success: true,
          message: `📦 Inventory Status:\n\n` +
            `• Product: ${action.data.product}\n` +
            `• Stock on Hand: ${action.data.stockOnHand} units\n` +
            `• Location: ${action.data.warehouse}\n` +
            `• Status: ${action.data.stockOnHand > 100 ? '✅ Healthy' : '⚠️ Low Stock'}`,
          data: action.data
        };

      case 'record_payment':
        const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;
        return {
          success: true,
          message: `✅ Payment recorded successfully!\n\n` +
            `• Receipt: ${receiptNumber}\n` +
            `• Amount: R${action.data.amount?.toLocaleString()}\n` +
            `• Customer: ${action.data.customer}\n` +
            `• Method: ${action.data.method || 'EFT'}\n\n` +
            `The customer's balance has been updated.`,
          data: { receiptNumber }
        };

      case 'create_quote':
        const quoteNumber = `QUO-${Date.now().toString().slice(-6)}`;
        return {
          success: true,
          message: `✅ Quote ${quoteNumber} created!\n\n` +
            `• Customer: ${action.data.customer}\n` +
            `• Total: R${action.data.total?.toLocaleString()}\n` +
            `• Valid for: 30 days\n\n` +
            `Would you like me to email this quote to the customer?`,
          data: { quoteNumber }
        };

      case 'run_report':
        return {
          success: true,
          message: `📊 Report Generated: ${action.data.reportType}\n\n` +
            `The report is ready. You can view it in the Reports section or I can summarize the key findings for you.`,
          data: action.data
        };

      default:
        return {
          success: true,
          message: `Action completed: ${action.description}`,
          data: action.data
        };
    }
  }

  /**
   * Get conversation history
   */
  getConversation(sessionId: string): ConversationContext | undefined {
    return this.conversations.get(sessionId);
  }

  /**
   * Clear conversation history
   */
  clearConversation(sessionId: string): void {
    this.conversations.delete(sessionId);
  }

  /**
   * Get total token usage for a session (for billing)
   */
  getSessionTokenUsage(sessionId: string): { tokens: number; estimatedCostUSD: number } {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) {
      return { tokens: 0, estimatedCostUSD: 0 };
    }

    let totalTokens = 0;
    let totalCost = 0;

    for (const msg of conversation.messages) {
      if (msg.tokenUsage) {
        totalTokens += msg.tokenUsage.total;
        totalCost += msg.tokenUsage.estimatedCost;
      }
    }

    return {
      tokens: totalTokens,
      estimatedCostUSD: totalCost / 100 // Convert from cents
    };
  }
}

// Factory function for easy instantiation
export function createAIAssistant(apiKey?: string): AIAssistantService {
  const key = apiKey || process.env.OPENAI_API_KEY;
  
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new AIAssistantService({
    openaiApiKey: key,
    model: 'gpt-4o-mini',
    maxTokens: 1000,
    temperature: 0.3
  });
}

export default AIAssistantService;
