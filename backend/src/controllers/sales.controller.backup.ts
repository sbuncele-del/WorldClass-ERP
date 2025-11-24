import { Request, Response } from 'express';
import pool from '../config/database';

// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      status, 
      customer_group, 
      sales_person,
      is_vip,
      credit_hold,
      limit = 50, 
      offset = 0 
    } = req.query;

    // SIMPLIFIED: Query real database table directly
    let query = `
      SELECT 
        customer_id as id,
        company_name as customer_name,
        CONCAT('CUST-', LPAD(customer_id::text, 3, '0')) as customer_code,
        contact_person,
        email,
        phone,
        vat_number,
        customer_type as customer_group,
        status,
        created_at,
        0 as order_count,
        0 as invoice_count,
        0 as total_sales,
        0 as total_outstanding
      FROM sales.customers
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (company_name ILIKE $${paramCount} OR contact_person ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (customer_group) {
      query += ` AND customer_type = $${paramCount}`;
      params.push(customer_group);
      paramCount++;
    }

    query += ` ORDER BY company_name ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM sales.customers WHERE 1=1');
    
    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customerResult = await pool.query(
      'SELECT * FROM customer_summary WHERE id = $1',
      [id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get contacts
    const contactsResult = await pool.query(
      'SELECT * FROM customer_contacts WHERE customer_id = $1 ORDER BY is_primary DESC, contact_name ASC',
      [id]
    );

    // Get recent orders
    const ordersResult = await pool.query(
      `SELECT * FROM sales_orders 
       WHERE customer_id = $1 
       ORDER BY order_date DESC 
       LIMIT 10`,
      [id]
    );

    // Get recent invoices
    const invoicesResult = await pool.query(
      `SELECT * FROM sales_invoices 
       WHERE customer_id = $1 
       ORDER BY invoice_date DESC 
       LIMIT 10`,
      [id]
    );

    res.json({
      customer: customerResult.rows[0],
      contacts: contactsResult.rows,
      recent_orders: ordersResult.rows,
      recent_invoices: invoicesResult.rows
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      customer_code,
      customer_name,
      customer_type,
      primary_contact,
      email,
      phone,
      mobile,
      website,
      billing_address_line1,
      billing_address_line2,
      billing_city,
      billing_state,
      billing_postal_code,
      billing_country,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_country,
      vat_number,
      tax_exempt,
      tax_rate,
      credit_limit,
      payment_terms,
      currency_code,
      customer_group,
      sales_person,
      territory,
      industry,
      lead_source,
      notes,
      tags,
      contacts
    } = req.body;

    // Validate required fields
    if (!customer_code || !customer_name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Customer code and name are required' });
    }

    // Check for duplicate customer code
    const duplicateCheck = await client.query(
      'SELECT id FROM customers WHERE customer_code = $1',
      [customer_code]
    );

    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Customer code already exists' });
    }

    // Insert customer
    const customerResult = await client.query(
      `INSERT INTO customers (
        customer_code, customer_name, customer_type, primary_contact,
        email, phone, mobile, website,
        billing_address_line1, billing_address_line2, billing_city, 
        billing_state, billing_postal_code, billing_country,
        shipping_address_line1, shipping_address_line2, shipping_city,
        shipping_state, shipping_postal_code, shipping_country,
        vat_number, tax_exempt, tax_rate,
        credit_limit, payment_terms, currency_code,
        customer_group, sales_person, territory, industry,
        lead_source, notes, tags, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33, $34
      ) RETURNING *`,
      [
        customer_code, customer_name, customer_type || 'INDIVIDUAL', primary_contact,
        email, phone, mobile, website,
        billing_address_line1, billing_address_line2, billing_city,
        billing_state, billing_postal_code, billing_country || 'South Africa',
        shipping_address_line1, shipping_address_line2, shipping_city,
        shipping_state, shipping_postal_code, shipping_country || 'South Africa',
        vat_number, tax_exempt || false, tax_rate || 15.00,
        credit_limit || 0, payment_terms || 30, currency_code || 'ZAR',
        customer_group, sales_person, territory, industry,
        lead_source, notes, tags, req.body.user_id || 1
      ]
    );

    const customerId = customerResult.rows[0].id;

    // Insert contacts if provided
    if (contacts && Array.isArray(contacts)) {
      for (const contact of contacts) {
        await client.query(
          `INSERT INTO customer_contacts (
            customer_id, contact_name, position, email, phone, mobile, is_primary, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            customerId,
            contact.contact_name,
            contact.position,
            contact.email,
            contact.phone,
            contact.mobile,
            contact.is_primary || false,
            contact.notes
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Customer created successfully',
      customer: customerResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  } finally {
    client.release();
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const updates = req.body;

    // Remove non-updatable fields
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;

    // Build dynamic update query
    const fields = Object.keys(updates).filter(key => key !== 'contacts');
    const values = fields.map(field => updates[field]);
    
    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await client.query(
      `UPDATE customers SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Update contacts if provided
    if (updates.contacts && Array.isArray(updates.contacts)) {
      // Delete existing contacts
      await client.query('DELETE FROM customer_contacts WHERE customer_id = $1', [id]);

      // Insert new contacts
      for (const contact of updates.contacts) {
        await client.query(
          `INSERT INTO customer_contacts (
            customer_id, contact_name, position, email, phone, mobile, is_primary, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            contact.contact_name,
            contact.position,
            contact.email,
            contact.phone,
            contact.mobile,
            contact.is_primary || false,
            contact.notes
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Customer updated successfully',
      customer: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  } finally {
    client.release();
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check for related records
    const ordersCheck = await pool.query(
      'SELECT COUNT(*) FROM sales_orders WHERE customer_id = $1',
      [id]
    );

    if (parseInt(ordersCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing orders. Consider marking as inactive instead.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM customers WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

// ============================================================================
// LEADS MANAGEMENT
// ============================================================================

export const getLeads = async (req: Request, res: Response) => {
  try {
    const { search, status, source, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        lead_id as id,
        lead_name,
        company,
        contact_person,
        email,
        phone,
        source,
        lead_score as score,
        estimated_value as est_value,
        status,
        assigned_to,
        created_at
      FROM sales.leads
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (lead_name ILIKE $${paramCount} OR company ILIKE $${paramCount} OR contact_person ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (source) {
      query += ` AND source = $${paramCount}`;
      params.push(source);
      paramCount++;
    }

    query += ` ORDER BY lead_score DESC, created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM sales.leads WHERE 1=1');

    res.json({
      leads: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

// ============================================================================
// OPPORTUNITIES MANAGEMENT
// ============================================================================

export const getOpportunities = async (req: Request, res: Response) => {
  try {
    const { search, status, stage, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        o.opportunity_id as id,
        o.opportunity_name,
        o.amount,
        o.stage,
        o.probability,
        o.expected_close_date,
        o.lead_source as source,
        o.assigned_to,
        o.status,
        o.created_at,
        c.company_name as customer_name,
        c.customer_id
      FROM sales.opportunities o
      LEFT JOIN sales.customers c ON o.customer_id = c.customer_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (o.opportunity_name ILIKE $${paramCount} OR c.company_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (stage) {
      query += ` AND o.stage = $${paramCount}`;
      params.push(stage);
      paramCount++;
    }

    query += ` ORDER BY o.expected_close_date ASC, o.probability DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM sales.opportunities WHERE 1=1');

    res.json({
      opportunities: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
};

// ============================================================================
// QUOTATION MANAGEMENT
// ============================================================================

export const getQuotations = async (req: Request, res: Response) => {
  try {
    const { 
      search,
      customer_id,
      status,
      sales_person,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        q.*,
        c.company_name as customer_name,
        CONCAT('CUST-', LPAD(c.customer_id::text, 3, '0')) as customer_code
      FROM sales.quotations q
      LEFT JOIN sales.customers c ON q.customer_id = c.customer_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (q.quotation_number ILIKE $${paramCount} OR c.customer_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (customer_id) {
      query += ` AND q.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    if (status) {
      query += ` AND q.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (sales_person) {
      query += ` AND q.sales_person = $${paramCount}`;
      params.push(sales_person);
      paramCount++;
    }

    if (date_from) {
      query += ` AND q.quotation_date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND q.quotation_date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    query += ` ORDER BY q.quotation_date DESC, q.id DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM sales.quotations');
    
    res.json({
      quotations: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
};

export const getQuotationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quotationResult = await pool.query(
      `SELECT q.*, c.customer_name, c.customer_code, c.email, c.phone
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.id = $1`,
      [id]
    );

    if (quotationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Get line items
    const linesResult = await pool.query(
      'SELECT * FROM quotation_lines WHERE quotation_id = $1 ORDER BY line_number',
      [id]
    );

    res.json({
      quotation: quotationResult.rows[0],
      lines: linesResult.rows
    });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
};

export const createQuotation = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      customer_id,
      quotation_date,
      valid_until,
      reference,
      customer_reference,
      payment_terms,
      delivery_terms,
      notes,
      terms_and_conditions,
      sales_person,
      probability,
      expected_close_date,
      lines
    } = req.body;

    // Validate
    if (!customer_id || !lines || lines.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Customer and line items are required' });
    }

    // Generate quotation number
    const numberResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 5) AS INTEGER)), 0) + 1 as next_num
       FROM quotations 
       WHERE quotation_number LIKE 'QUO-%'`
    );
    const quotationNumber = `QUO-${String(numberResult.rows[0].next_num).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;

    for (const line of lines) {
      const lineTotal = line.quantity * line.unit_price;
      const discountAmount = line.discount_percentage 
        ? lineTotal * (line.discount_percentage / 100)
        : line.discount_amount || 0;
      const taxableAmount = lineTotal - discountAmount;
      const taxAmount = taxableAmount * ((line.tax_rate || 15) / 100);
      
      subtotal += lineTotal;
      totalTax += taxAmount;
    }

    const totalAmount = subtotal + totalTax;

    // Insert quotation
    const quotationResult = await client.query(
      `INSERT INTO quotations (
        quotation_number, customer_id, quotation_date, valid_until,
        reference, customer_reference, subtotal, tax_amount, total_amount,
        payment_terms, delivery_terms, notes, terms_and_conditions,
        sales_person, probability, expected_close_date, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *`,
      [
        quotationNumber, customer_id, quotation_date || new Date(), valid_until,
        reference, customer_reference, subtotal, totalTax, totalAmount,
        payment_terms || 30, delivery_terms, notes, terms_and_conditions,
        sales_person, probability || 0, expected_close_date, req.body.user_id || 1
      ]
    );

    const quotationId = quotationResult.rows[0].id;

    // Insert line items
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTotal = line.quantity * line.unit_price;
      const discountAmount = line.discount_percentage 
        ? lineTotal * (line.discount_percentage / 100)
        : line.discount_amount || 0;
      const taxableAmount = lineTotal - discountAmount;
      const taxAmount = taxableAmount * ((line.tax_rate || 15) / 100);
      const finalLineTotal = taxableAmount + taxAmount;

      await client.query(
        `INSERT INTO quotation_lines (
          quotation_id, line_number, item_code, description,
          quantity, unit_of_measure, unit_price,
          discount_percentage, discount_amount,
          tax_rate, tax_amount, line_total, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          quotationId, i + 1, line.item_code, line.description,
          line.quantity, line.unit_of_measure || 'EA', line.unit_price,
          line.discount_percentage || 0, discountAmount,
          line.tax_rate || 15, taxAmount, finalLineTotal, line.notes
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Quotation created successfully',
      quotation: quotationResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating quotation:', error);
    res.status(500).json({ error: 'Failed to create quotation' });
  } finally {
    client.release();
  }
};

export const updateQuotationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approval_status } = req.body;

    const updates: string[] = [];
    const values: any[] = [id];
    let paramCount = 2;

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (approval_status) {
      updates.push(`approval_status = $${paramCount}`);
      values.push(approval_status);
      paramCount++;

      if (approval_status === 'APPROVED') {
        updates.push(`approved_by = $${paramCount}`);
        values.push(req.body.user_id || 1);
        paramCount++;
        updates.push(`approved_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No status to update' });
    }

    const result = await pool.query(
      `UPDATE quotations SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    res.json({
      message: 'Quotation status updated successfully',
      quotation: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating quotation status:', error);
    res.status(500).json({ error: 'Failed to update quotation status' });
  }
};

export const convertQuotationToOrder = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Get quotation with lines
    const quotationResult = await client.query(
      'SELECT * FROM quotations WHERE id = $1',
      [id]
    );

    if (quotationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const quotation = quotationResult.rows[0];

    if (quotation.converted_to_order) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Quotation already converted to order' });
    }

    // Generate order number
    const numberResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1 as next_num
       FROM sales_orders 
       WHERE order_number LIKE 'SO-%'`
    );
    const orderNumber = `SO-${String(numberResult.rows[0].next_num).padStart(6, '0')}`;

    // Create sales order
    const orderResult = await client.query(
      `INSERT INTO sales_orders (
        order_number, customer_id, quotation_id, order_date,
        reference, customer_po_number, subtotal, tax_amount, total_amount,
        payment_terms, delivery_terms, notes, sales_person, created_by
      ) VALUES (
        $1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        orderNumber, quotation.customer_id, quotation.id,
        quotation.reference, quotation.customer_reference,
        quotation.subtotal, quotation.tax_amount, quotation.total_amount,
        quotation.payment_terms, quotation.delivery_terms, quotation.notes,
        quotation.sales_person, req.body.user_id || 1
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Copy line items
    const linesResult = await client.query(
      'SELECT * FROM quotation_lines WHERE quotation_id = $1 ORDER BY line_number',
      [id]
    );

    for (const line of linesResult.rows) {
      await client.query(
        `INSERT INTO sales_order_lines (
          order_id, line_number, item_code, description,
          quantity, unit_of_measure, unit_price,
          discount_percentage, discount_amount,
          tax_rate, tax_amount, line_total, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          orderId, line.line_number, line.item_code, line.description,
          line.quantity, line.unit_of_measure, line.unit_price,
          line.discount_percentage, line.discount_amount,
          line.tax_rate, line.tax_amount, line.line_total, line.notes
        ]
      );
    }

    // Update quotation
    await client.query(
      `UPDATE quotations 
       SET converted_to_order = true, sales_order_id = $1, 
           converted_at = CURRENT_TIMESTAMP, status = 'WON'
       WHERE id = $2`,
      [orderId, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Quotation converted to order successfully',
      order: orderResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error converting quotation to order:', error);
    res.status(500).json({ error: 'Failed to convert quotation to order' });
  } finally {
    client.release();
  }
};

// ============================================================================
// SALES ORDER MANAGEMENT
// ============================================================================

export const getSalesOrders = async (req: Request, res: Response) => {
  try {
    const {
      search,
      customer_id,
      status,
      sales_person,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        so.*,
        c.company_name as customer_name,
        CONCAT('CUST-', LPAD(c.customer_id::text, 3, '0')) as customer_code
      FROM sales.sales_orders so
      LEFT JOIN sales.customers c ON so.customer_id = c.customer_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (so.order_number ILIKE $${paramCount} OR c.customer_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (customer_id) {
      query += ` AND so.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    if (status) {
      query += ` AND so.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (sales_person) {
      query += ` AND so.sales_person = $${paramCount}`;
      params.push(sales_person);
      paramCount++;
    }

    if (date_from) {
      query += ` AND so.order_date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND so.order_date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    query += ` ORDER BY so.order_date DESC, so.id DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query('SELECT COUNT(*) FROM sales.sales_orders');
    
    res.json({
      orders: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
};

export const getSalesOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(
      `SELECT so.*, c.customer_name, c.customer_code, c.email, c.phone
       FROM sales_orders so
       LEFT JOIN customers c ON so.customer_id = c.id
       WHERE so.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    const linesResult = await pool.query(
      'SELECT * FROM sales_order_lines WHERE order_id = $1 ORDER BY line_number',
      [id]
    );

    res.json({
      order: orderResult.rows[0],
      lines: linesResult.rows
    });
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ error: 'Failed to fetch sales order' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE sales_orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    res.json({
      message: 'Order status updated successfully',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// ============================================================================
// INVOICE MANAGEMENT
// ============================================================================

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const {
      search,
      customer_id,
      status,
      payment_status,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        si.*,
        c.company_name as customer_name,
        CONCAT('CUST-', LPAD(c.customer_id::text, 3, '0')) as customer_code
      FROM financial.invoices si
      LEFT JOIN sales.customers c ON si.customer_id = c.customer_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (si.invoice_number ILIKE $${paramCount} OR c.customer_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (customer_id) {
      query += ` AND si.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    if (status) {
      query += ` AND si.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (payment_status) {
      query += ` AND si.payment_status = $${paramCount}`;
      params.push(payment_status);
      paramCount++;
    }

    if (date_from) {
      query += ` AND si.invoice_date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND si.invoice_date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    query += ` ORDER BY si.invoice_date DESC, si.id DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query('SELECT COUNT(*) FROM financial.invoices');
    
    res.json({
      invoices: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const createInvoiceFromOrder = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { order_id, invoice_date, due_date } = req.body;

    // Get order
    const orderResult = await client.query(
      'SELECT * FROM sales_orders WHERE id = $1',
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sales order not found' });
    }

    const order = orderResult.rows[0];

    // Generate invoice number
    const numberResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) + 1 as next_num
       FROM sales_invoices 
       WHERE invoice_number LIKE 'INV-%'`
    );
    const invoiceNumber = `INV-${String(numberResult.rows[0].next_num).padStart(6, '0')}`;

    // Calculate due date if not provided
    const calculatedDueDate = due_date || new Date(Date.now() + order.payment_terms * 24 * 60 * 60 * 1000);

    // Create invoice
    const invoiceResult = await client.query(
      `INSERT INTO sales_invoices (
        invoice_number, customer_id, order_id, invoice_date, due_date,
        reference, customer_po_number, subtotal, tax_amount, total_amount,
        amount_due, payment_terms, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        invoiceNumber, order.customer_id, order_id,
        invoice_date || new Date(), calculatedDueDate,
        order.reference, order.customer_po_number,
        order.subtotal, order.tax_amount, order.total_amount, order.total_amount,
        order.payment_terms, req.body.user_id || 1
      ]
    );

    const invoiceId = invoiceResult.rows[0].id;

    // Copy line items
    const linesResult = await client.query(
      'SELECT * FROM sales_order_lines WHERE order_id = $1 ORDER BY line_number',
      [order_id]
    );

    for (const line of linesResult.rows) {
      await client.query(
        `INSERT INTO sales_invoice_lines (
          invoice_id, order_line_id, line_number, item_code, description,
          quantity, unit_of_measure, unit_price,
          discount_percentage, discount_amount,
          tax_rate, tax_amount, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          invoiceId, line.id, line.line_number, line.item_code, line.description,
          line.quantity, line.unit_of_measure, line.unit_price,
          line.discount_percentage, line.discount_amount,
          line.tax_rate, line.tax_amount, line.line_total
        ]
      );
    }

    // Update order
    await client.query(
      `UPDATE sales_orders 
       SET invoiced = true, invoice_id = $1, invoiced_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [invoiceId, order_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: invoiceResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    client.release();
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      customer_id,
      invoice_id,
      payment_date,
      payment_amount,
      payment_method,
      reference,
      bank_account,
      notes
    } = req.body;

    // Validate
    if (!customer_id || !payment_amount || !payment_method) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Customer, amount, and payment method are required' });
    }

    // Generate payment number
    const numberResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 4) AS INTEGER)), 0) + 1 as next_num
       FROM sales_payments 
       WHERE payment_number LIKE 'PAY-%'`
    );
    const paymentNumber = `PAY-${String(numberResult.rows[0].next_num).padStart(6, '0')}`;

    // Record payment
    const paymentResult = await client.query(
      `INSERT INTO sales_payments (
        payment_number, customer_id, invoice_id, payment_date,
        payment_amount, payment_method, reference, bank_account, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        paymentNumber, customer_id, invoice_id, payment_date || new Date(),
        payment_amount, payment_method, reference, bank_account, notes, req.body.user_id || 1
      ]
    );

    // Update invoice if specified
    if (invoice_id) {
      await client.query(
        `UPDATE sales_invoices 
         SET amount_paid = amount_paid + $1,
             amount_due = amount_due - $1,
             payment_status = CASE 
               WHEN amount_due - $1 <= 0 THEN 'PAID'
               WHEN amount_paid + $1 > 0 THEN 'PARTIALLY_PAID'
               ELSE payment_status
             END
         WHERE id = $2`,
        [payment_amount, invoice_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: paymentResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  } finally {
    client.release();
  }
};

export const getAgedReceivables = async (req: Request, res: Response) => {
  try {
    const { customer_id } = req.query;

    let query = 'SELECT * FROM aged_receivables WHERE 1=1';
    const params: any[] = [];

    if (customer_id) {
      query += ' AND customer_id = $1';
      params.push(customer_id);
    }

    query += ' ORDER BY days_overdue DESC';

    const result = await pool.query(query, params);

    // Group by aging bucket
    const summary = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_90_plus: 0,
      total: 0
    };

    result.rows.forEach(row => {
      const amount = parseFloat(row.amount_due);
      summary.total += amount;

      switch (row.aging_bucket) {
        case 'CURRENT':
          summary.current += amount;
          break;
        case '1-30 DAYS':
          summary.days_1_30 += amount;
          break;
        case '31-60 DAYS':
          summary.days_31_60 += amount;
          break;
        case '61-90 DAYS':
          summary.days_61_90 += amount;
          break;
        case '90+ DAYS':
          summary.days_90_plus += amount;
          break;
      }
    });

    res.json({
      details: result.rows,
      summary
    });
  } catch (error) {
    console.error('Error fetching aged receivables:', error);
    res.status(500).json({ error: 'Failed to fetch aged receivables' });
  }
};

// ============================================================================
// ANALYTICS
// ============================================================================

export const getSalesPipeline = async (req: Request, res: Response) => {
  try {
    const { sales_person } = req.query;

    let query = 'SELECT * FROM sales_pipeline WHERE 1=1';
    const params: any[] = [];

    if (sales_person) {
      query += ' AND sales_person = $1';
      params.push(sales_person);
    }

    query += ' ORDER BY stage_order, expected_close_date';

    const result = await pool.query(query, params);

    // Calculate summary
    const summary = {
      draft: { count: 0, value: 0 },
      sent: { count: 0, value: 0 },
      negotiation: { count: 0, value: 0 },
      won: { count: 0, value: 0 },
      total_value: 0,
      weighted_value: 0
    };

    result.rows.forEach(row => {
      const amount = parseFloat(row.total_amount);
      const probability = parseFloat(row.probability) / 100;

      summary.total_value += amount;
      summary.weighted_value += amount * probability;

      switch (row.status) {
        case 'DRAFT':
          summary.draft.count++;
          summary.draft.value += amount;
          break;
        case 'SENT':
          summary.sent.count++;
          summary.sent.value += amount;
          break;
        case 'NEGOTIATION':
          summary.negotiation.count++;
          summary.negotiation.value += amount;
          break;
        case 'WON':
          summary.won.count++;
          summary.won.value += amount;
          break;
      }
    });

    res.json({
      pipeline: result.rows,
      summary
    });
  } catch (error) {
    console.error('Error fetching sales pipeline:', error);
    res.status(500).json({ error: 'Failed to fetch sales pipeline' });
  }
};

export const getSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = 'month', sales_person, customer_id } = req.query;

    // Sales by period
    const salesResult = await pool.query(`
      SELECT 
        DATE_TRUNC($1, invoice_date) as period,
        COUNT(*) as invoice_count,
        SUM(total_amount) as total_sales,
        SUM(amount_paid) as total_collected,
        SUM(amount_due) as total_outstanding
      FROM sales_invoices
      WHERE status = 'POSTED'
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `, [period]);

    // Top customers
    const topCustomersResult = await pool.query(`
      SELECT 
        c.id,
        c.customer_name,
        COUNT(si.id) as invoice_count,
        SUM(si.total_amount) as total_sales
      FROM customers c
      INNER JOIN sales_invoices si ON c.id = si.customer_id
      WHERE si.status = 'POSTED'
      GROUP BY c.id, c.customer_name
      ORDER BY total_sales DESC
      LIMIT 10
    `);

    // Sales by product (if item tracking available)
    const productSalesResult = await pool.query(`
      SELECT 
        item_code,
        description,
        SUM(quantity) as total_quantity,
        SUM(line_total) as total_sales
      FROM sales_invoice_lines
      WHERE item_code IS NOT NULL
      GROUP BY item_code, description
      ORDER BY total_sales DESC
      LIMIT 10
    `);

    res.json({
      sales_by_period: salesResult.rows,
      top_customers: topCustomersResult.rows,
      top_products: productSalesResult.rows
    });
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
};
