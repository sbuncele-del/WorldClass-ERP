import { Request, Response } from 'express';
import { pool } from '../config/database';

/**
 * Purchase Management Controller
 * Handles vendors, purchase requisitions, POs, GRNs, vendor invoices, and payments
 */

// ==================== VENDOR MANAGEMENT ====================

/**
 * Get all vendors with optional filters
 */
export async function getVendors(req: Request, res: Response) {
  try {
    const { 
      status, 
      vendor_group, 
      search, 
      rating_min,
      rating_max 
    } = req.query;

    let query = `
      SELECT v.*,
        COUNT(DISTINCT po.id) as total_pos,
        COALESCE(SUM(po.total_amount), 0) as total_spend,
        COUNT(DISTINCT vi.id) as total_invoices,
        COALESCE(SUM(CASE WHEN vi.status = 'OVERDUE' THEN vi.amount_due ELSE 0 END), 0) as overdue_amount
      FROM vendors v
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      LEFT JOIN vendor_invoices vi ON v.id = vi.vendor_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status === 'active') {
      query += ` AND v.is_active = true`;
    } else if (status === 'inactive') {
      query += ` AND v.is_active = false`;
    }

    if (vendor_group) {
      query += ` AND v.vendor_group = $${paramCount}`;
      params.push(vendor_group);
      paramCount++;
    }

    if (search) {
      query += ` AND (v.company_name ILIKE $${paramCount} OR v.vendor_code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (rating_min) {
      query += ` AND v.rating >= $${paramCount}`;
      params.push(rating_min);
      paramCount++;
    }

    if (rating_max) {
      query += ` AND v.rating <= $${paramCount}`;
      params.push(rating_max);
      paramCount++;
    }

    query += ` GROUP BY v.id ORDER BY v.company_name`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: (error as Error).message
    });
  }
}

/**
 * Get vendor by ID with contacts
 */
export async function getVendorById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const vendorResult = await pool.query(
      'SELECT * FROM vendors WHERE id = $1',
      [id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const contactsResult = await pool.query(
      'SELECT * FROM vendor_contacts WHERE vendor_id = $1 ORDER BY is_primary DESC, contact_name',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...vendorResult.rows[0],
        contacts: contactsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
      error: (error as Error).message
    });
  }
}

/**
 * Create new vendor
 */
export async function createVendor(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      company_name,
      tax_number,
      registration_number,
      vendor_group,
      payment_terms,
      credit_limit,
      currency,
      bank_name,
      bank_account,
      bank_branch,
      billing_address,
      shipping_address,
      contact_person,
      contact_email,
      contact_phone,
      rating,
      notes,
      contacts
    } = req.body;

    // Generate vendor code
    const codeResult = await client.query(
      "SELECT vendor_code FROM vendors ORDER BY vendor_code DESC LIMIT 1"
    );

    let newCode = 'VEND-0001';
    if (codeResult.rows.length > 0) {
      const lastCode = codeResult.rows[0].vendor_code;
      const lastNumber = parseInt(lastCode.split('-')[1]);
      newCode = `VEND-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    // Insert vendor
    const vendorResult = await client.query(
      `INSERT INTO vendors (
        vendor_code, company_name, tax_number, registration_number,
        vendor_group, payment_terms, credit_limit, currency,
        bank_name, bank_account, bank_branch,
        billing_address, shipping_address,
        contact_person, contact_email, contact_phone,
        rating, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        newCode, company_name, tax_number, registration_number,
        vendor_group, payment_terms || '30 Days', credit_limit || 0, currency || 'ZAR',
        bank_name, bank_account, bank_branch,
        JSON.stringify(billing_address), JSON.stringify(shipping_address),
        contact_person, contact_email, contact_phone,
        rating, notes
      ]
    );

    const vendorId = vendorResult.rows[0].id;

    // Insert contacts if provided
    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        await client.query(
          `INSERT INTO vendor_contacts (
            vendor_id, contact_name, position, email, phone, mobile, is_primary
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            vendorId,
            contact.contact_name,
            contact.position,
            contact.email,
            contact.phone,
            contact.mobile,
            contact.is_primary || false
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: vendorResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor',
      error: (error as Error).message
    });
  } finally {
    client.release();
  }
}

/**
 * Update vendor
 */
export async function updateVendor(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'vendor_code' && key !== 'contacts') {
        if (key === 'billing_address' || key === 'shipping_address') {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(updates[key]));
        } else {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
        }
        paramCount++;
      }
    });

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE vendors 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor',
      error: (error as Error).message
    });
  }
}

/**
 * Delete vendor (soft delete)
 */
export async function deleteVendor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE vendors SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      message: 'Vendor deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor',
      error: (error as Error).message
    });
  }
}

// ==================== PURCHASE REQUISITIONS ====================

/**
 * Get all purchase requisitions
 */
export async function getPurchaseRequisitions(req: Request, res: Response) {
  try {
    const { status, department, requested_by, priority } = req.query;

    let query = `
      SELECT pr.*,
        COUNT(prl.id) as line_count,
        COALESCE(SUM(prl.estimated_total), 0) as total_estimate
      FROM purchase_requisitions pr
      LEFT JOIN purchase_requisition_lines prl ON pr.id = prl.requisition_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND pr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (department) {
      query += ` AND pr.department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (requested_by) {
      query += ` AND pr.requested_by = $${paramCount}`;
      params.push(requested_by);
      paramCount++;
    }

    if (priority) {
      query += ` AND pr.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    query += ` GROUP BY pr.id ORDER BY pr.request_date DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requisitions',
      error: (error as Error).message
    });
  }
}

/**
 * Get requisition by ID with line items
 */
export async function getRequisitionById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const requisitionResult = await pool.query(
      'SELECT * FROM purchase_requisitions WHERE id = $1',
      [id]
    );

    if (requisitionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Requisition not found'
      });
    }

    const linesResult = await pool.query(
      'SELECT * FROM purchase_requisition_lines WHERE requisition_id = $1 ORDER BY line_number',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...requisitionResult.rows[0],
        lines: linesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching requisition:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requisition',
      error: (error as Error).message
    });
  }
}

/**
 * Create purchase requisition
 */
export async function createPurchaseRequisition(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      requested_by,
      department,
      request_date,
      required_date,
      priority,
      notes,
      lines
    } = req.body;

    // Generate requisition number
    const codeResult = await client.query(
      "SELECT requisition_number FROM purchase_requisitions ORDER BY requisition_number DESC LIMIT 1"
    );

    let newNumber = 'PR-0001';
    if (codeResult.rows.length > 0) {
      const lastNumber = codeResult.rows[0].requisition_number;
      const lastNum = parseInt(lastNumber.split('-')[1]);
      newNumber = `PR-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Insert requisition
    const requisitionResult = await client.query(
      `INSERT INTO purchase_requisitions (
        requisition_number, requested_by, department, request_date,
        required_date, priority, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT')
      RETURNING *`,
      [newNumber, requested_by, department, request_date, required_date, priority || 'Medium', notes]
    );

    const requisitionId = requisitionResult.rows[0].id;

    // Insert line items
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const estimatedTotal = (line.quantity || 0) * (line.estimated_unit_price || 0);

        await client.query(
          `INSERT INTO purchase_requisition_lines (
            requisition_id, line_number, item_description, quantity,
            unit_of_measure, estimated_unit_price, estimated_total, justification
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            requisitionId,
            i + 1,
            line.item_description,
            line.quantity,
            line.unit_of_measure,
            line.estimated_unit_price,
            estimatedTotal,
            line.justification
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Purchase requisition created successfully',
      data: requisitionResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating requisition:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create requisition',
      error: (error as Error).message
    });
  } finally {
    client.release();
  }
}

/**
 * Update requisition status (Submit/Approve/Reject)
 */
export async function updateRequisitionStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, approved_by, rejection_reason } = req.body;

    let query = `
      UPDATE purchase_requisitions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    const params: any[] = [status];
    let paramCount = 2;

    if (status === 'APPROVED') {
      query += `, approved_by = $${paramCount}, approval_date = CURRENT_TIMESTAMP, approval_status = 'APPROVED'`;
      params.push(approved_by);
      paramCount++;
    } else if (status === 'REJECTED') {
      query += `, rejection_reason = $${paramCount}, approval_status = 'REJECTED'`;
      params.push(rejection_reason);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Requisition not found'
      });
    }

    res.json({
      success: true,
      message: `Requisition ${status.toLowerCase()} successfully`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating requisition status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update requisition status',
      error: (error as Error).message
    });
  }
}

// ==================== PURCHASE ORDERS ====================

/**
 * Get all purchase orders
 */
export async function getPurchaseOrders(req: Request, res: Response) {
  try {
    const { status, vendor_id, from_date, to_date } = req.query;

    let query = `
      SELECT po.*, v.company_name as vendor_name, v.vendor_code
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND po.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (vendor_id) {
      query += ` AND po.vendor_id = $${paramCount}`;
      params.push(vendor_id);
      paramCount++;
    }

    if (from_date) {
      query += ` AND po.po_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND po.po_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    query += ` ORDER BY po.po_date DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase orders',
      error: (error as Error).message
    });
  }
}

/**
 * Get PO by ID with line items
 */
export async function getPurchaseOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const poResult = await pool.query(
      `SELECT po.*, v.company_name as vendor_name, v.vendor_code
       FROM purchase_orders po
       JOIN vendors v ON po.vendor_id = v.id
       WHERE po.id = $1`,
      [id]
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    const linesResult = await pool.query(
      'SELECT * FROM purchase_order_lines WHERE po_id = $1 ORDER BY line_number',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...poResult.rows[0],
        lines: linesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order',
      error: (error as Error).message
    });
  }
}

/**
 * Create purchase order
 */
export async function createPurchaseOrder(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      vendor_id,
      requisition_id,
      po_date,
      delivery_date,
      payment_terms,
      delivery_address,
      shipping_method,
      terms_and_conditions,
      notes,
      created_by,
      lines
    } = req.body;

    // Generate PO number
    const codeResult = await client.query(
      "SELECT po_number FROM purchase_orders ORDER BY po_number DESC LIMIT 1"
    );

    let newNumber = 'PO-0001';
    if (codeResult.rows.length > 0) {
      const lastNumber = codeResult.rows[0].po_number;
      const lastNum = parseInt(lastNumber.split('-')[1]);
      newNumber = `PO-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    if (lines && lines.length > 0) {
      lines.forEach((line: any) => {
        const lineTotal = line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100);
        const lineTax = lineTotal * (line.tax_rate || 15) / 100;
        subtotal += lineTotal;
        taxAmount += lineTax;
      });
    }

    const totalAmount = subtotal + taxAmount;

    // Insert PO
    const poResult = await client.query(
      `INSERT INTO purchase_orders (
        po_number, vendor_id, requisition_id, po_date, delivery_date,
        payment_terms, subtotal, tax_amount, total_amount,
        delivery_address, shipping_method, terms_and_conditions,
        notes, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'DRAFT')
      RETURNING *`,
      [
        newNumber, vendor_id, requisition_id, po_date, delivery_date,
        payment_terms, subtotal, taxAmount, totalAmount,
        JSON.stringify(delivery_address), shipping_method, terms_and_conditions,
        notes, created_by
      ]
    );

    const poId = poResult.rows[0].id;

    // Insert line items
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineTotal = line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100);

        await client.query(
          `INSERT INTO purchase_order_lines (
            po_id, line_number, item_description, quantity_ordered,
            unit_of_measure, unit_price, discount_percent, tax_rate, line_total, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            poId,
            i + 1,
            line.item_description,
            line.quantity,
            line.unit_of_measure,
            line.unit_price,
            line.discount_percent || 0,
            line.tax_rate || 15,
            lineTotal,
            line.notes
          ]
        );
      }
    }

    // Update requisition status if linked
    if (requisition_id) {
      await client.query(
        `UPDATE purchase_requisitions SET status = 'CONVERTED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [requisition_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: poResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: (error as Error).message
    });
  } finally {
    client.release();
  }
}

/**
 * Update PO status
 */
export async function updatePurchaseOrderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let query = `
      UPDATE purchase_orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    const params: any[] = [status];
    let paramCount = 2;

    if (status === 'SENT') {
      query += `, sent_date = CURRENT_TIMESTAMP`;
    } else if (status === 'ACKNOWLEDGED') {
      query += `, acknowledged_date = CURRENT_TIMESTAMP`;
    }

    query += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      message: `Purchase order status updated to ${status}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating PO status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update PO status',
      error: (error as Error).message
    });
  }
}

// ==================== GOODS RECEIVED NOTES ====================

/**
 * Get all GRNs
 */
export async function getGoodsReceivedNotes(req: Request, res: Response) {
  try {
    const { status, vendor_id, po_id } = req.query;

    let query = `
      SELECT grn.*, v.company_name as vendor_name, po.po_number
      FROM goods_received_notes grn
      JOIN vendors v ON grn.vendor_id = v.id
      JOIN purchase_orders po ON grn.po_id = po.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND grn.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (vendor_id) {
      query += ` AND grn.vendor_id = $${paramCount}`;
      params.push(vendor_id);
      paramCount++;
    }

    if (po_id) {
      query += ` AND grn.po_id = $${paramCount}`;
      params.push(po_id);
      paramCount++;
    }

    query += ` ORDER BY grn.received_date DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GRNs',
      error: (error as Error).message
    });
  }
}

/**
 * Create GRN
 */
export async function createGoodsReceivedNote(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      po_id,
      vendor_id,
      received_date,
      received_by,
      delivery_note_number,
      inspection_notes,
      quality_status,
      warehouse_location,
      notes,
      lines
    } = req.body;

    // Generate GRN number
    const codeResult = await client.query(
      "SELECT grn_number FROM goods_received_notes ORDER BY grn_number DESC LIMIT 1"
    );

    let newNumber = 'GRN-0001';
    if (codeResult.rows.length > 0) {
      const lastNumber = codeResult.rows[0].grn_number;
      const lastNum = parseInt(lastNumber.split('-')[1]);
      newNumber = `GRN-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Insert GRN
    const grnResult = await client.query(
      `INSERT INTO goods_received_notes (
        grn_number, po_id, vendor_id, received_date, received_by,
        delivery_note_number, inspection_notes, quality_status,
        warehouse_location, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'RECEIVED')
      RETURNING *`,
      [
        newNumber, po_id, vendor_id, received_date, received_by,
        delivery_note_number, inspection_notes, quality_status,
        warehouse_location, notes
      ]
    );

    const grnId = grnResult.rows[0].id;

    // Insert GRN line items and update PO line quantities
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        await client.query(
          `INSERT INTO goods_received_note_lines (
            grn_id, po_line_id, line_number, item_description,
            quantity_ordered, quantity_received, quantity_accepted,
            quantity_rejected, rejection_reason, unit_of_measure, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            grnId,
            line.po_line_id,
            i + 1,
            line.item_description,
            line.quantity_ordered,
            line.quantity_received,
            line.quantity_accepted || line.quantity_received,
            line.quantity_rejected || 0,
            line.rejection_reason,
            line.unit_of_measure,
            line.notes
          ]
        );

        // Update PO line quantity received
        await client.query(
          `UPDATE purchase_order_lines 
           SET quantity_received = quantity_received + $1
           WHERE id = $2`,
          [line.quantity_received, line.po_line_id]
        );
      }
    }

    // Check if PO is fully received and update status
    const poLinesCheck = await client.query(
      `SELECT 
        SUM(quantity_ordered) as total_ordered,
        SUM(quantity_received) as total_received
       FROM purchase_order_lines
       WHERE po_id = $1`,
      [po_id]
    );

    if (poLinesCheck.rows[0].total_ordered <= poLinesCheck.rows[0].total_received) {
      await client.query(
        `UPDATE purchase_orders SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [po_id]
      );
    } else {
      await client.query(
        `UPDATE purchase_orders SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [po_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'GRN created successfully',
      data: grnResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating GRN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create GRN',
      error: (error as Error).message
    });
  } finally {
    client.release();
  }
}

// ==================== VENDOR INVOICES ====================

/**
 * Get all vendor invoices
 */
export async function getVendorInvoices(req: Request, res: Response) {
  try {
    const { status, match_status, vendor_id, from_date, to_date } = req.query;

    let query = `
      SELECT vi.*, v.company_name as vendor_name, v.vendor_code,
        po.po_number, grn.grn_number
      FROM vendor_invoices vi
      JOIN vendors v ON vi.vendor_id = v.id
      LEFT JOIN purchase_orders po ON vi.po_id = po.id
      LEFT JOIN goods_received_notes grn ON vi.grn_id = grn.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND vi.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (match_status) {
      query += ` AND vi.match_status = $${paramCount}`;
      params.push(match_status);
      paramCount++;
    }

    if (vendor_id) {
      query += ` AND vi.vendor_id = $${paramCount}`;
      params.push(vendor_id);
      paramCount++;
    }

    if (from_date) {
      query += ` AND vi.invoice_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND vi.invoice_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    query += ` ORDER BY vi.invoice_date DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching vendor invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor invoices',
      error: (error as Error).message
    });
  }
}

/**
 * Create vendor invoice with 3-way matching
 */
export async function createVendorInvoice(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      invoice_number,
      vendor_id,
      po_id,
      grn_id,
      invoice_date,
      due_date,
      payment_terms,
      account_id,
      notes,
      lines
    } = req.body;

    // Generate internal reference
    const codeResult = await client.query(
      "SELECT internal_reference FROM vendor_invoices ORDER BY internal_reference DESC LIMIT 1"
    );

    let newReference = 'VI-0001';
    if (codeResult.rows.length > 0) {
      const lastRef = codeResult.rows[0].internal_reference;
      const lastNum = parseInt(lastRef.split('-')[1]);
      newReference = `VI-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Calculate totals and variance
    let subtotal = 0;
    let taxAmount = 0;
    let totalVariance = 0;

    if (lines && lines.length > 0) {
      for (const line of lines) {
        const lineTotal = line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100);
        const lineTax = lineTotal * (line.tax_rate || 15) / 100;
        subtotal += lineTotal;
        taxAmount += lineTax;

        // Calculate variance if PO line is linked
        if (line.po_line_id) {
          const poLineResult = await client.query(
            'SELECT unit_price, quantity_ordered FROM purchase_order_lines WHERE id = $1',
            [line.po_line_id]
          );

          if (poLineResult.rows.length > 0) {
            const poLine = poLineResult.rows[0];
            const poLineTotal = poLine.quantity_ordered * poLine.unit_price;
            const variance = lineTotal - poLineTotal;
            totalVariance += variance;
          }
        }
      }
    }

    const totalAmount = subtotal + taxAmount;
    const amountDue = totalAmount;

    // Determine match status
    let matchStatus = 'UNMATCHED';
    if (po_id && grn_id) {
      if (Math.abs(totalVariance) < 0.01) {
        matchStatus = 'MATCHED';
      } else {
        matchStatus = 'VARIANCE';
      }
    }

    // Insert vendor invoice
    const invoiceResult = await client.query(
      `INSERT INTO vendor_invoices (
        invoice_number, internal_reference, vendor_id, po_id, grn_id,
        invoice_date, due_date, payment_terms, subtotal, tax_amount,
        total_amount, amount_due, variance_amount, match_status,
        account_id, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'PENDING_APPROVAL')
      RETURNING *`,
      [
        invoice_number, newReference, vendor_id, po_id, grn_id,
        invoice_date, due_date, payment_terms, subtotal, taxAmount,
        totalAmount, amountDue, totalVariance, matchStatus,
        account_id, notes
      ]
    );

    const invoiceId = invoiceResult.rows[0].id;

    // Insert invoice line items
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineTotal = line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100);

        let lineVariance = 0;
        if (line.po_line_id) {
          const poLineResult = await client.query(
            'SELECT unit_price, quantity_ordered FROM purchase_order_lines WHERE id = $1',
            [line.po_line_id]
          );

          if (poLineResult.rows.length > 0) {
            const poLine = poLineResult.rows[0];
            const poLineTotal = poLine.quantity_ordered * poLine.unit_price;
            lineVariance = lineTotal - poLineTotal;
          }
        }

        await client.query(
          `INSERT INTO vendor_invoice_lines (
            invoice_id, po_line_id, grn_line_id, line_number,
            item_description, quantity, unit_price, discount_percent,
            tax_rate, line_total, variance_amount, account_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            invoiceId,
            line.po_line_id,
            line.grn_line_id,
            i + 1,
            line.item_description,
            line.quantity,
            line.unit_price,
            line.discount_percent || 0,
            line.tax_rate || 15,
            lineTotal,
            lineVariance,
            line.account_id
          ]
        );

        // Update PO line quantity invoiced
        if (line.po_line_id) {
          await client.query(
            `UPDATE purchase_order_lines 
             SET quantity_invoiced = quantity_invoiced + $1
             WHERE id = $2`,
            [line.quantity, line.po_line_id]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Vendor invoice created successfully',
      data: {
        ...invoiceResult.rows[0],
        match_status: matchStatus,
        variance_amount: totalVariance
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating vendor invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor invoice',
      error: (error as Error).message
    });
  } finally {
    client.release();
  }
}

/**
 * Approve vendor invoice
 */
export async function approveVendorInvoice(req: Request, res: Response) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { approved_by, variance_approved } = req.body;

    // Update invoice status
    const invoiceResult = await client.query(
      `UPDATE vendor_invoices 
       SET status = 'APPROVED',
           match_status = CASE WHEN match_status = 'VARIANCE' AND $1 = true THEN 'APPROVED' ELSE match_status END,
           approved_by = $2,
           approval_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [variance_approved, approved_by, id]
    );

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Vendor invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];

    // Post to GL: Debit Expense/Asset, Credit AP
    if (invoice.account_id) {
      // Get or create AP account
      const apAccountResult = await client.query(
        `SELECT id FROM chart_of_accounts 
         WHERE code = '2100' AND account_type = 'Liability'
         LIMIT 1`
      );

      if (apAccountResult.rows.length > 0) {
        const apAccountId = apAccountResult.rows[0].id;

        // Create journal entry
        const journalResult = await client.query(
          `INSERT INTO journal_entries (
            entry_number, entry_date, entry_type, reference,
            description, total_debit, total_credit, status, posted_by
          ) VALUES (
            (SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 
             FROM journal_entries WHERE entry_number LIKE 'JE-%'),
            $1, 'Purchase', $2, $3, $4, $4, 'Posted', $5
          ) RETURNING id`,
          [
            invoice.invoice_date,
            invoice.internal_reference,
            `Vendor Invoice - ${invoice.invoice_number}`,
            invoice.total_amount,
            approved_by
          ]
        );

        const journalId = journalResult.rows[0].id;

        // Debit Expense/Asset account (from invoice lines)
        const invoiceLines = await client.query(
          'SELECT * FROM vendor_invoice_lines WHERE invoice_id = $1',
          [id]
        );

        for (const line of invoiceLines.rows) {
          if (line.account_id) {
            await client.query(
              `INSERT INTO journal_entry_lines (
                entry_id, line_number, account_id, description,
                debit_amount, credit_amount
              ) VALUES ($1, $2, $3, $4, $5, 0)`,
              [
                journalId,
                line.line_number,
                line.account_id,
                line.item_description,
                line.line_total + (line.line_total * line.tax_rate / 100)
              ]
            );
          }
        }

        // Credit AP account
        await client.query(
          `INSERT INTO journal_entry_lines (
            entry_id, line_number, account_id, description,
            debit_amount, credit_amount
          ) VALUES ($1, $2, $3, $4, 0, $5)`,
          [
            journalId,
            invoiceLines.rows.length + 1,
            apAccountId,
            `Accounts Payable - ${invoice.invoice_number}`,
            invoice.total_amount
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Vendor invoice approved and posted to GL',
      data: invoiceResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving vendor invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve vendor invoice',
      error: (error as Error).message
    });
  } finally {
    client.release();
  }
}

// ==================== VENDOR PAYMENTS ====================

/**
 * Create vendor payment
 */
export async function createVendorPayment(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      vendor_id,
      payment_date,
      payment_method,
      reference_number,
      total_amount,
      currency,
      bank_account_id,
      gl_account_id,
      notes,
      allocations
    } = req.body;

    // Generate payment number
    const codeResult = await client.query(
      "SELECT payment_number FROM vendor_payments ORDER BY payment_number DESC LIMIT 1"
    );

    let newNumber = 'VP-0001';
    if (codeResult.rows.length > 0) {
      const lastNumber = codeResult.rows[0].payment_number;
      const lastNum = parseInt(lastNumber.split('-')[1]);
      newNumber = `VP-${String(lastNum + 1).padStart(4, '0')}`;
    }

    // Insert payment
    const paymentResult = await client.query(
      `INSERT INTO vendor_payments (
        payment_number, vendor_id, payment_date, payment_method,
        reference_number, total_amount, currency, bank_account_id,
        gl_account_id, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PROCESSED')
      RETURNING *`,
      [
        newNumber, vendor_id, payment_date, payment_method,
        reference_number, total_amount, currency || 'ZAR', bank_account_id,
        gl_account_id, notes
      ]
    );

    const paymentId = paymentResult.rows[0].id;

    // Allocate payment to invoices
    if (allocations && allocations.length > 0) {
      for (const allocation of allocations) {
        await client.query(
          `INSERT INTO vendor_payment_allocations (
            payment_id, invoice_id, allocated_amount
          ) VALUES ($1, $2, $3)`,
          [paymentId, allocation.invoice_id, allocation.allocated_amount]
        );

        // Update invoice amounts
        await client.query(
          `UPDATE vendor_invoices 
           SET amount_paid = amount_paid + $1,
               amount_due = amount_due - $1,
               status = CASE 
                 WHEN amount_due - $1 <= 0 THEN 'PAID'
                 ELSE status
               END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [allocation.allocated_amount, allocation.invoice_id]
        );
      }
    }

    // Post to GL: Debit AP, Credit Cash/Bank
    if (gl_account_id) {
      const apAccountResult = await client.query(
        `SELECT id FROM chart_of_accounts 
         WHERE code = '2100' AND account_type = 'Liability'
         LIMIT 1`
      );

      if (apAccountResult.rows.length > 0) {
        const apAccountId = apAccountResult.rows[0].id;

        // Create journal entry
        const journalResult = await client.query(
          `INSERT INTO journal_entries (
            entry_number, entry_date, entry_type, reference,
            description, total_debit, total_credit, status, posted_by
          ) VALUES (
            (SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 
             FROM journal_entries WHERE entry_number LIKE 'JE-%'),
            $1, 'Payment', $2, $3, $4, $4, 'Posted', 'System'
          ) RETURNING id`,
          [
            payment_date,
            newNumber,
            `Vendor Payment - ${newNumber}`,
            total_amount
          ]
        );

        const journalId = journalResult.rows[0].id;

        // Debit AP
        await client.query(
          `INSERT INTO journal_entry_lines (
            entry_id, line_number, account_id, description,
            debit_amount, credit_amount
          ) VALUES ($1, 1, $2, $3, $4, 0)`,
          [
            journalId,
            apAccountId,
            `Payment to Vendor - ${newNumber}`,
            total_amount
          ]
        );

        // Credit Cash/Bank
        await client.query(
          `INSERT INTO journal_entry_lines (
            entry_id, line_number, account_id, description,
            debit_amount, credit_amount
          ) VALUES ($1, 2, $2, $3, 0, $4)`,
          [
            journalId,
            gl_account_id,
            `Payment - ${payment_method} ${reference_number}`,
            total_amount
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Vendor payment created and posted to GL',
      data: paymentResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating vendor payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor payment',
      error: (error as Error).message
    });
  } finally {
    client.release();
  }
}

// ==================== ANALYTICS ====================

/**
 * Get aged payables report
 */
export async function getAgedPayables(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT * FROM aged_payables
      ORDER BY days_overdue DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching aged payables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch aged payables',
      error: (error as Error).message
    });
  }
}

/**
 * Get 3-way match status dashboard
 */
export async function getThreeWayMatchStatus(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT * FROM three_way_match_status
      ORDER BY po_id DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching 3-way match status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch 3-way match status',
      error: (error as Error).message
    });
  }
}

/**
 * Get vendor spend analysis
 */
export async function getVendorSpendAnalysis(req: Request, res: Response) {
  try {
    const { from_date, to_date, limit } = req.query;

    let query = `
      SELECT 
        v.id,
        v.vendor_code,
        v.company_name,
        v.vendor_group,
        COUNT(DISTINCT po.id) as total_pos,
        SUM(po.total_amount) as total_spend,
        AVG(po.total_amount) as avg_po_value,
        COUNT(DISTINCT vi.id) as total_invoices,
        SUM(vi.total_amount) as total_invoiced,
        SUM(vi.amount_paid) as total_paid,
        SUM(vi.amount_due) as total_outstanding
      FROM vendors v
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      LEFT JOIN vendor_invoices vi ON v.id = vi.vendor_id
      WHERE v.is_active = true
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (from_date) {
      query += ` AND po.po_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND po.po_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    query += ` GROUP BY v.id, v.vendor_code, v.company_name, v.vendor_group
               ORDER BY total_spend DESC NULLS LAST`;

    if (limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching vendor spend analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor spend analysis',
      error: (error as Error).message
    });
  }
}
