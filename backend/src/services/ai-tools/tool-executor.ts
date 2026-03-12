/**
 * AI Tool Executor
 * Executes AI tool calls against the real database.
 * READ tools run immediately. WRITE tools return a preview for confirmation.
 */

import pool from '../../config/database';
import { requiresConfirmation } from './tool-registry';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  /** If true, the AI should ask the user to confirm before proceeding */
  needs_confirmation?: boolean;
  /** Human-readable preview of what the write operation will do */
  preview?: string;
  /** Pending action ID — pass back to confirm_action to execute */
  pending_action_id?: string;
}

// Pending write actions awaiting confirmation (in-memory, keyed by ID)
const pendingActions = new Map<string, { tool: string; args: any; tenantId: string; userId: string; created: Date }>();

// Clean up stale pending actions older than 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, action] of pendingActions) {
    if (now - action.created.getTime() > 5 * 60 * 1000) pendingActions.delete(id);
  }
}, 60_000);

/**
 * Execute an AI tool call
 */
export async function executeTool(
  toolName: string,
  args: Record<string, string>,
  tenantId: string,
  userId: string
): Promise<ToolResult> {
  try {
    // Write tools → return preview, don't execute yet
    if (requiresConfirmation(toolName)) {
      return await previewWriteTool(toolName, args, tenantId, userId);
    }
    // Read tools → execute immediately
    return await executeReadTool(toolName, args, tenantId);
  } catch (err: any) {
    return { success: false, error: err.message || 'Tool execution failed' };
  }
}

/**
 * Confirm and execute a pending write action
 */
export async function confirmAction(actionId: string): Promise<ToolResult> {
  const action = pendingActions.get(actionId);
  if (!action) return { success: false, error: 'Action expired or not found. Please try again.' };

  pendingActions.delete(actionId);

  try {
    return await executeWriteTool(action.tool, action.args, action.tenantId, action.userId);
  } catch (err: any) {
    return { success: false, error: err.message || 'Write operation failed' };
  }
}

// ─── READ TOOL IMPLEMENTATIONS ────────────────────────────────────────

async function executeReadTool(tool: string, args: Record<string, string>, tenantId: string): Promise<ToolResult> {
  switch (tool) {

    case 'lookup_customer': {
      const search = `%${args.search}%`;
      const result = await pool.query(
        `SELECT customer_id, customer_name, email, phone, credit_limit, 
                COALESCE(outstanding_balance, 0) as outstanding_balance, status
         FROM customers 
         WHERE tenant_id = $1 
           AND (customer_name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)
         ORDER BY customer_name LIMIT 5`,
        [tenantId, search]
      );
      if (result.rows.length === 0) return { success: true, data: 'No customers found matching that search.' };
      return { success: true, data: result.rows };
    }

    case 'get_customer_balance': {
      const result = await pool.query(
        `SELECT c.customer_id, c.customer_name, c.credit_limit,
                COALESCE(c.outstanding_balance, 0) as outstanding_balance,
                c.credit_limit - COALESCE(c.outstanding_balance, 0) as available_credit,
                (SELECT COUNT(*) FROM invoices WHERE customer_id = c.customer_id AND tenant_id = $1 AND status = 'overdue') as overdue_count,
                (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE customer_id = c.customer_id AND tenant_id = $1 AND status = 'overdue') as overdue_amount
         FROM customers c
         WHERE c.tenant_id = $1 AND c.customer_id = $2`,
        [tenantId, args.customer_id]
      );
      if (result.rows.length === 0) return { success: true, data: 'Customer not found.' };
      return { success: true, data: result.rows[0] };
    }

    case 'list_invoices': {
      let query = `SELECT invoice_id, invoice_number, customer_name, total_amount, status, 
                          due_date, issue_date, currency
                   FROM invoices i
                   LEFT JOIN customers c ON i.customer_id = c.customer_id AND c.tenant_id = i.tenant_id
                   WHERE i.tenant_id = $1`;
      const params: any[] = [tenantId];
      let paramIdx = 2;

      if (args.status) { query += ` AND i.status = $${paramIdx++}`; params.push(args.status); }
      if (args.customer_id) { query += ` AND i.customer_id = $${paramIdx++}`; params.push(args.customer_id); }
      if (args.date_from) { query += ` AND i.issue_date >= $${paramIdx++}`; params.push(args.date_from); }
      if (args.date_to) { query += ` AND i.issue_date <= $${paramIdx++}`; params.push(args.date_to); }

      query += ` ORDER BY i.issue_date DESC LIMIT $${paramIdx}`;
      params.push(parseInt(args.limit || '10', 10));

      const result = await pool.query(query, params);
      return { success: true, data: result.rows.length > 0 ? result.rows : 'No invoices found.' };
    }

    case 'get_invoice': {
      const result = await pool.query(
        `SELECT i.*, c.customer_name, c.email as customer_email
         FROM invoices i
         LEFT JOIN customers c ON i.customer_id = c.customer_id AND c.tenant_id = i.tenant_id
         WHERE i.tenant_id = $1 AND (i.invoice_number ILIKE $2 OR i.invoice_id::text = $2)`,
        [tenantId, args.invoice_number]
      );
      if (result.rows.length === 0) return { success: true, data: 'Invoice not found.' };

      // Get line items
      const lines = await pool.query(
        `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY line_number`,
        [result.rows[0].invoice_id]
      );
      return { success: true, data: { ...result.rows[0], line_items: lines.rows } };
    }

    case 'get_account_balance': {
      let query = `SELECT account_code, account_name, account_type, 
                          COALESCE(current_balance, 0) as balance
                   FROM chart_of_accounts 
                   WHERE tenant_id = $1`;
      const params: any[] = [tenantId];

      if (args.account_code) { query += ` AND account_code = $2`; params.push(args.account_code); }
      else if (args.account_name) { query += ` AND account_name ILIKE $2`; params.push(`%${args.account_name}%`); }
      else { query += ` ORDER BY account_code LIMIT 20`; }

      const result = await pool.query(query, params);
      return { success: true, data: result.rows.length > 0 ? result.rows : 'No accounts found.' };
    }

    case 'get_trial_balance': {
      const result = await pool.query(
        `SELECT account_code, account_name, account_type,
                CASE WHEN COALESCE(current_balance, 0) >= 0 THEN COALESCE(current_balance, 0) ELSE 0 END as debit,
                CASE WHEN COALESCE(current_balance, 0) < 0 THEN ABS(COALESCE(current_balance, 0)) ELSE 0 END as credit
         FROM chart_of_accounts
         WHERE tenant_id = $1 AND COALESCE(current_balance, 0) != 0
         ORDER BY account_code`,
        [tenantId]
      );
      const totalDebit = result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.debit || 0), 0);
      const totalCredit = result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.credit || 0), 0);
      return { success: true, data: { accounts: result.rows, total_debit: totalDebit, total_credit: totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 } };
    }

    case 'get_income_statement': {
      const dateFrom = args.date_from || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const dateTo = args.date_to || new Date().toISOString().split('T')[0];

      const revenue = await pool.query(
        `SELECT account_code, account_name, ABS(COALESCE(current_balance, 0)) as amount
         FROM chart_of_accounts WHERE tenant_id = $1 AND account_type = 'revenue' AND COALESCE(current_balance, 0) != 0
         ORDER BY account_code`, [tenantId]);
      const expenses = await pool.query(
        `SELECT account_code, account_name, ABS(COALESCE(current_balance, 0)) as amount
         FROM chart_of_accounts WHERE tenant_id = $1 AND account_type = 'expense' AND COALESCE(current_balance, 0) != 0
         ORDER BY account_code`, [tenantId]);

      const totalRevenue = revenue.rows.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
      const totalExpenses = expenses.rows.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);

      return {
        success: true,
        data: {
          period: `${dateFrom} to ${dateTo}`,
          revenue: revenue.rows, total_revenue: totalRevenue,
          expenses: expenses.rows, total_expenses: totalExpenses,
          net_profit: totalRevenue - totalExpenses,
        },
      };
    }

    case 'get_balance_sheet': {
      const assets = await pool.query(
        `SELECT account_code, account_name, COALESCE(current_balance, 0) as balance
         FROM chart_of_accounts WHERE tenant_id = $1 AND account_type = 'asset' AND COALESCE(current_balance, 0) != 0
         ORDER BY account_code`, [tenantId]);
      const liabilities = await pool.query(
        `SELECT account_code, account_name, ABS(COALESCE(current_balance, 0)) as balance
         FROM chart_of_accounts WHERE tenant_id = $1 AND account_type = 'liability' AND COALESCE(current_balance, 0) != 0
         ORDER BY account_code`, [tenantId]);
      const equity = await pool.query(
        `SELECT account_code, account_name, ABS(COALESCE(current_balance, 0)) as balance
         FROM chart_of_accounts WHERE tenant_id = $1 AND account_type = 'equity' AND COALESCE(current_balance, 0) != 0
         ORDER BY account_code`, [tenantId]);

      const totalAssets = assets.rows.reduce((s: number, r: any) => s + parseFloat(r.balance || 0), 0);
      const totalLiabilities = liabilities.rows.reduce((s: number, r: any) => s + parseFloat(r.balance || 0), 0);
      const totalEquity = equity.rows.reduce((s: number, r: any) => s + parseFloat(r.balance || 0), 0);

      return {
        success: true,
        data: {
          as_at: args.as_at_date || new Date().toISOString().split('T')[0],
          assets: assets.rows, total_assets: totalAssets,
          liabilities: liabilities.rows, total_liabilities: totalLiabilities,
          equity: equity.rows, total_equity: totalEquity,
          balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
        },
      };
    }

    case 'check_stock_level': {
      const result = await pool.query(
        `SELECT i.item_id, i.item_name, i.sku, i.unit_of_measure,
                COALESCE(i.quantity_on_hand, 0) as quantity_on_hand,
                COALESCE(i.reorder_level, 0) as reorder_level,
                COALESCE(i.unit_cost, 0) as unit_cost,
                COALESCE(i.selling_price, 0) as selling_price
         FROM items i WHERE i.tenant_id = $1 AND (i.item_name ILIKE $2 OR i.sku ILIKE $2)
         ORDER BY i.item_name LIMIT 5`,
        [tenantId, `%${args.item_name}%`]
      );
      return { success: true, data: result.rows.length > 0 ? result.rows : 'No items found matching that name.' };
    }

    case 'list_products': {
      let query = `SELECT item_id, item_name, sku, category, unit_of_measure,
                          COALESCE(quantity_on_hand, 0) as quantity_on_hand,
                          COALESCE(selling_price, 0) as selling_price, status
                   FROM items WHERE tenant_id = $1`;
      const params: any[] = [tenantId];
      let idx = 2;

      if (args.search) { query += ` AND (item_name ILIKE $${idx} OR sku ILIKE $${idx})`; params.push(`%${args.search}%`); idx++; }
      if (args.category) { query += ` AND category = $${idx}`; params.push(args.category); idx++; }
      if (args.low_stock === 'true') { query += ` AND quantity_on_hand <= reorder_level`; }

      query += ` ORDER BY item_name LIMIT 20`;
      const result = await pool.query(query, params);
      return { success: true, data: result.rows };
    }

    case 'list_employees': {
      let query = `SELECT employee_id, first_name, last_name, email, department, position, status
                   FROM employees WHERE tenant_id = $1`;
      const params: any[] = [tenantId];
      let idx = 2;

      if (args.department) { query += ` AND department ILIKE $${idx}`; params.push(`%${args.department}%`); idx++; }
      if (args.status) { query += ` AND status = $${idx}`; params.push(args.status); idx++; }
      if (args.search) { query += ` AND (first_name ILIKE $${idx} OR last_name ILIKE $${idx})`; params.push(`%${args.search}%`); idx++; }

      query += ` ORDER BY last_name, first_name LIMIT 20`;
      const result = await pool.query(query, params);
      return { success: true, data: result.rows };
    }

    case 'get_bank_balance': {
      let query = `SELECT account_id, account_name, bank_name, account_number, 
                          COALESCE(current_balance, 0) as balance, currency
                   FROM bank_accounts WHERE tenant_id = $1`;
      const params: any[] = [tenantId];
      if (args.account_name) { query += ` AND account_name ILIKE $2`; params.push(`%${args.account_name}%`); }
      query += ` ORDER BY account_name`;
      const result = await pool.query(query, params);
      return { success: true, data: result.rows.length > 0 ? result.rows : 'No bank accounts found.' };
    }

    case 'get_overdue_invoices': {
      const minDays = parseInt(args.days_overdue || '1', 10);
      const result = await pool.query(
        `SELECT i.invoice_number, c.customer_name, i.total_amount, i.due_date,
                CURRENT_DATE - i.due_date as days_overdue, c.email, c.phone
         FROM invoices i
         LEFT JOIN customers c ON i.customer_id = c.customer_id AND c.tenant_id = i.tenant_id
         WHERE i.tenant_id = $1 AND i.status = 'overdue' AND CURRENT_DATE - i.due_date >= $2
         ORDER BY days_overdue DESC`,
        [tenantId, minDays]
      );
      return { success: true, data: result.rows.length > 0 ? result.rows : 'No overdue invoices.' };
    }

    case 'get_supplier_list': {
      let query = `SELECT supplier_id, supplier_name, email, phone, 
                          COALESCE(outstanding_balance, 0) as outstanding_balance, status
                   FROM suppliers WHERE tenant_id = $1`;
      const params: any[] = [tenantId];
      if (args.search) { query += ` AND supplier_name ILIKE $2`; params.push(`%${args.search}%`); }
      query += ` ORDER BY supplier_name LIMIT 20`;
      const result = await pool.query(query, params);
      return { success: true, data: result.rows };
    }

    case 'get_cash_flow_summary': {
      const dateFrom = args.date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const dateTo = args.date_to || new Date().toISOString().split('T')[0];

      const inflows = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM bank_transactions WHERE tenant_id = $1 AND transaction_type = 'credit'
           AND transaction_date BETWEEN $2 AND $3`, [tenantId, dateFrom, dateTo]);
      const outflows = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM bank_transactions WHERE tenant_id = $1 AND transaction_type = 'debit'
           AND transaction_date BETWEEN $2 AND $3`, [tenantId, dateFrom, dateTo]);

      return {
        success: true,
        data: {
          period: `${dateFrom} to ${dateTo}`,
          inflows: parseFloat(inflows.rows[0].total),
          outflows: parseFloat(outflows.rows[0].total),
          net_cash: parseFloat(inflows.rows[0].total) - parseFloat(outflows.rows[0].total),
        },
      };
    }

    default:
      return { success: false, error: `Unknown tool: ${tool}` };
  }
}

// ─── WRITE TOOL PREVIEWS ──────────────────────────────────────────────

async function previewWriteTool(tool: string, args: Record<string, string>, tenantId: string, userId: string): Promise<ToolResult> {
  const actionId = `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  switch (tool) {

    case 'create_invoice': {
      const customer = await pool.query(
        'SELECT customer_name, credit_limit, outstanding_balance FROM customers WHERE tenant_id = $1 AND customer_id = $2',
        [tenantId, args.customer_id]);
      if (customer.rows.length === 0) return { success: false, error: 'Customer not found.' };

      const items = JSON.parse(args.items);
      const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
      const vat = subtotal * 0.15;
      const total = subtotal + vat;

      const preview = [
        `📄 **New Invoice Preview**`,
        `Customer: ${customer.rows[0].customer_name}`,
        `Items:`,
        ...items.map((i: any, idx: number) => `  ${idx + 1}. ${i.description} — ${i.quantity} × R${i.unit_price.toFixed(2)} = R${(i.quantity * i.unit_price).toFixed(2)}`),
        `Subtotal: R${subtotal.toFixed(2)}`,
        `VAT (15%): R${vat.toFixed(2)}`,
        `**Total: R${total.toFixed(2)}**`,
        `Payment terms: ${args.due_days || 30} days`,
        ``,
        `Say **"Yes, create it"** to confirm or **"Cancel"** to abort.`,
      ].join('\n');

      pendingActions.set(actionId, { tool, args, tenantId, userId, created: new Date() });
      return { success: true, needs_confirmation: true, preview, pending_action_id: actionId };
    }

    case 'create_quote': {
      const customer = await pool.query(
        'SELECT customer_name FROM customers WHERE tenant_id = $1 AND customer_id = $2',
        [tenantId, args.customer_id]);
      if (customer.rows.length === 0) return { success: false, error: 'Customer not found.' };

      const items = JSON.parse(args.items);
      const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
      const vat = subtotal * 0.15;

      const preview = [
        `📝 **New Quotation Preview**`,
        `Customer: ${customer.rows[0].customer_name}`,
        `Items:`,
        ...items.map((i: any, idx: number) => `  ${idx + 1}. ${i.description} — ${i.quantity} × R${i.unit_price.toFixed(2)}`),
        `Subtotal: R${subtotal.toFixed(2)} | VAT: R${vat.toFixed(2)} | **Total: R${(subtotal + vat).toFixed(2)}**`,
        `Valid for: ${args.valid_days || 30} days`,
        ``,
        `Say **"Yes, create it"** to confirm or **"Cancel"** to abort.`,
      ].join('\n');

      pendingActions.set(actionId, { tool, args, tenantId, userId, created: new Date() });
      return { success: true, needs_confirmation: true, preview, pending_action_id: actionId };
    }

    case 'record_payment': {
      const invoice = await pool.query(
        `SELECT i.invoice_number, i.total_amount, c.customer_name,
                i.total_amount - COALESCE(i.amount_paid, 0) as outstanding
         FROM invoices i LEFT JOIN customers c ON i.customer_id = c.customer_id AND c.tenant_id = i.tenant_id
         WHERE i.tenant_id = $1 AND (i.invoice_id::text = $2 OR i.invoice_number ILIKE $2)`,
        [tenantId, args.invoice_id]);
      if (invoice.rows.length === 0) return { success: false, error: 'Invoice not found.' };

      const inv = invoice.rows[0];
      const preview = [
        `💰 **Payment Preview**`,
        `Invoice: ${inv.invoice_number} — ${inv.customer_name}`,
        `Invoice total: R${parseFloat(inv.total_amount).toFixed(2)}`,
        `Outstanding: R${parseFloat(inv.outstanding).toFixed(2)}`,
        `Payment: R${parseFloat(args.amount).toFixed(2)} via ${args.payment_method || 'EFT'}`,
        args.reference ? `Reference: ${args.reference}` : '',
        ``,
        `Say **"Yes, record it"** to confirm or **"Cancel"** to abort.`,
      ].filter(Boolean).join('\n');

      pendingActions.set(actionId, { tool, args, tenantId, userId, created: new Date() });
      return { success: true, needs_confirmation: true, preview, pending_action_id: actionId };
    }

    case 'create_journal_entry': {
      const lines = JSON.parse(args.lines);
      const totalDebit = lines.reduce((s: number, l: any) => s + parseFloat(l.debit || 0), 0);
      const totalCredit = lines.reduce((s: number, l: any) => s + parseFloat(l.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return { success: false, error: `Journal entry doesn't balance. Debits: R${totalDebit.toFixed(2)}, Credits: R${totalCredit.toFixed(2)}` };
      }

      const preview = [
        `📖 **Journal Entry Preview**`,
        `Date: ${args.date || 'Today'}`,
        `Description: ${args.description}`,
        ``,
        `| Account | Debit | Credit |`,
        `|---------|-------|--------|`,
        ...lines.map((l: any) => `| ${l.account_code} - ${l.description || ''} | ${l.debit ? 'R' + parseFloat(l.debit).toFixed(2) : ''} | ${l.credit ? 'R' + parseFloat(l.credit).toFixed(2) : ''} |`),
        `| **Total** | **R${totalDebit.toFixed(2)}** | **R${totalCredit.toFixed(2)}** |`,
        ``,
        `Say **"Yes, post it"** to confirm or **"Cancel"** to abort.`,
      ].join('\n');

      pendingActions.set(actionId, { tool, args, tenantId, userId, created: new Date() });
      return { success: true, needs_confirmation: true, preview, pending_action_id: actionId };
    }

    case 'create_purchase_order': {
      const supplier = await pool.query(
        'SELECT supplier_name FROM suppliers WHERE tenant_id = $1 AND supplier_id = $2',
        [tenantId, args.supplier_id]);
      if (supplier.rows.length === 0) return { success: false, error: 'Supplier not found.' };

      const items = JSON.parse(args.items);
      const total = items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);

      const preview = [
        `🛒 **Purchase Order Preview**`,
        `Supplier: ${supplier.rows[0].supplier_name}`,
        `Items:`,
        ...items.map((i: any, idx: number) => `  ${idx + 1}. ${i.description} — ${i.quantity} × R${i.unit_price.toFixed(2)}`),
        `**Total: R${(total * 1.15).toFixed(2)} (incl. VAT)**`,
        ``,
        `Say **"Yes, create it"** to confirm or **"Cancel"** to abort.`,
      ].join('\n');

      pendingActions.set(actionId, { tool, args, tenantId, userId, created: new Date() });
      return { success: true, needs_confirmation: true, preview, pending_action_id: actionId };
    }

    case 'adjust_stock': {
      const item = await pool.query(
        'SELECT item_name, quantity_on_hand FROM items WHERE tenant_id = $1 AND item_id = $2',
        [tenantId, args.item_id]);
      if (item.rows.length === 0) return { success: false, error: 'Item not found.' };

      const qty = parseInt(args.quantity, 10);
      const newQty = parseFloat(item.rows[0].quantity_on_hand || 0) + qty;

      const preview = [
        `📦 **Stock Adjustment Preview**`,
        `Item: ${item.rows[0].item_name}`,
        `Current stock: ${item.rows[0].quantity_on_hand}`,
        `Adjustment: ${qty > 0 ? '+' : ''}${qty}`,
        `New stock: ${newQty}`,
        `Reason: ${args.reason}`,
        ``,
        `Say **"Yes, adjust it"** to confirm or **"Cancel"** to abort.`,
      ].join('\n');

      pendingActions.set(actionId, { tool, args, tenantId, userId, created: new Date() });
      return { success: true, needs_confirmation: true, preview, pending_action_id: actionId };
    }

    default:
      return { success: false, error: `No preview handler for tool: ${tool}` };
  }
}

// ─── WRITE TOOL EXECUTION (after confirmation) ────────────────────────

async function executeWriteTool(tool: string, args: Record<string, string>, tenantId: string, userId: string): Promise<ToolResult> {
  switch (tool) {

    case 'create_invoice': {
      const items = JSON.parse(args.items);
      const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
      const vat = subtotal * 0.15;
      const total = subtotal + vat;

      // Generate invoice number
      const countResult = await pool.query(
        `SELECT COUNT(*) as cnt FROM invoices WHERE tenant_id = $1`, [tenantId]);
      const num = parseInt(countResult.rows[0].cnt, 10) + 1;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const inv = await client.query(
          `INSERT INTO invoices (tenant_id, invoice_number, customer_id, subtotal, vat_amount, total_amount, 
                                 status, issue_date, due_date, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'draft', CURRENT_DATE, CURRENT_DATE + $7::integer, $8, $9)
           RETURNING invoice_id, invoice_number`,
          [tenantId, invoiceNumber, args.customer_id, subtotal, vat, total, 
           parseInt(args.due_days || '30', 10), args.notes || null, userId]
        );

        for (let i = 0; i < items.length; i++) {
          await client.query(
            `INSERT INTO invoice_items (invoice_id, line_number, description, quantity, unit_price, amount, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [inv.rows[0].invoice_id, i + 1, items[i].description, items[i].quantity, items[i].unit_price, items[i].quantity * items[i].unit_price, tenantId]
          );
        }

        await client.query('COMMIT');
        return { success: true, data: { invoice_number: inv.rows[0].invoice_number, total, message: `Invoice ${invoiceNumber} created successfully (R${total.toFixed(2)}).` } };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    case 'create_quote': {
      const items = JSON.parse(args.items);
      const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
      const vat = subtotal * 0.15;
      const total = subtotal + vat;

      const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM quotes WHERE tenant_id = $1`, [tenantId]);
      const num = parseInt(countResult.rows[0].cnt, 10) + 1;
      const quoteNumber = `QT-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;

      const result = await pool.query(
        `INSERT INTO quotes (tenant_id, quote_number, customer_id, subtotal, vat_amount, total_amount,
                             status, issue_date, valid_until, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft', CURRENT_DATE, CURRENT_DATE + $7::integer, $8, $9)
         RETURNING quote_number`,
        [tenantId, quoteNumber, args.customer_id, subtotal, vat, total,
         parseInt(args.valid_days || '30', 10), args.notes || null, userId]
      );
      return { success: true, data: { quote_number: result.rows[0].quote_number, total, message: `Quote ${quoteNumber} created (R${total.toFixed(2)}).` } };
    }

    case 'record_payment': {
      const amount = parseFloat(args.amount);
      const result = await pool.query(
        `UPDATE invoices SET amount_paid = COALESCE(amount_paid, 0) + $1,
                             status = CASE WHEN COALESCE(amount_paid, 0) + $1 >= total_amount THEN 'paid' ELSE status END 
         WHERE tenant_id = $2 AND (invoice_id::text = $3 OR invoice_number ILIKE $3)
         RETURNING invoice_number, total_amount, amount_paid, status`,
        [amount, tenantId, args.invoice_id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Invoice not found.' };
      const inv = result.rows[0];
      return { success: true, data: { message: `Payment of R${amount.toFixed(2)} recorded on ${inv.invoice_number}. Status: ${inv.status}. Paid: R${parseFloat(inv.amount_paid).toFixed(2)}/${parseFloat(inv.total_amount).toFixed(2)}` } };
    }

    case 'create_journal_entry': {
      const lines = JSON.parse(args.lines);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const je = await client.query(
          `INSERT INTO journal_entries (tenant_id, entry_date, description, status, created_by)
           VALUES ($1, $2, $3, 'posted', $4) RETURNING journal_entry_id`,
          [tenantId, args.date || new Date().toISOString().split('T')[0], args.description, userId]
        );

        for (const line of lines) {
          await client.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_code, description, debit_amount, credit_amount, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [je.rows[0].journal_entry_id, line.account_code, line.description || '', parseFloat(line.debit || 0), parseFloat(line.credit || 0), tenantId]
          );

          // Update account balance
          const netEffect = parseFloat(line.debit || 0) - parseFloat(line.credit || 0);
          await client.query(
            `UPDATE chart_of_accounts SET current_balance = COALESCE(current_balance, 0) + $1 
             WHERE tenant_id = $2 AND account_code = $3`,
            [netEffect, tenantId, line.account_code]
          );
        }

        await client.query('COMMIT');
        return { success: true, data: { message: `Journal entry posted successfully.` } };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    case 'create_purchase_order': {
      const items = JSON.parse(args.items);
      const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
      const total = subtotal * 1.15;

      const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM purchase_orders WHERE tenant_id = $1`, [tenantId]);
      const num = parseInt(countResult.rows[0].cnt, 10) + 1;
      const poNumber = `PO-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;

      const result = await pool.query(
        `INSERT INTO purchase_orders (tenant_id, po_number, supplier_id, subtotal, vat_amount, total_amount,
                                      status, order_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft', CURRENT_DATE, $7, $8)
         RETURNING po_number`,
        [tenantId, poNumber, args.supplier_id, subtotal, subtotal * 0.15, total, args.notes || null, userId]
      );
      return { success: true, data: { po_number: result.rows[0].po_number, total, message: `Purchase order ${poNumber} created (R${total.toFixed(2)}).` } };
    }

    case 'adjust_stock': {
      const qty = parseInt(args.quantity, 10);
      const result = await pool.query(
        `UPDATE items SET quantity_on_hand = COALESCE(quantity_on_hand, 0) + $1 
         WHERE tenant_id = $2 AND item_id = $3
         RETURNING item_name, quantity_on_hand`,
        [qty, tenantId, args.item_id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Item not found.' };

      // Audit trail
      await pool.query(
        `INSERT INTO stock_adjustments (tenant_id, item_id, quantity, reason, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, args.item_id, qty, args.reason, userId]
      );

      return { success: true, data: { message: `Stock adjusted. ${result.rows[0].item_name}: now ${result.rows[0].quantity_on_hand} units.` } };
    }

    default:
      return { success: false, error: `No write handler for tool: ${tool}` };
  }
}
