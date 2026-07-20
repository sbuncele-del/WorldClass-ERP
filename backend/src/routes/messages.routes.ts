import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// Apply tenant middleware to all message routes
router.use(tenantMiddleware);

const getPool = (_req: Request) => pool;

/**
 * Message Types:
 * - driver_to_dispatch: Driver sending to office
 * - dispatch_to_driver: Office sending to driver
 * - driver_to_customer: Driver to customer
 * - system: Automated system messages
 * - emergency: SOS/Emergency alerts
 */

// ============================================
// GET /api/messages/conversations
// Get all conversations for current user
// ============================================
router.get('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // For dispatch/admin - see all driver conversations
    // For drivers - see only their conversations
    const isDispatch = ['admin', 'dispatcher', 'manager'].includes(userRole?.toLowerCase() || '');

    const query = isDispatch
      ? `
        SELECT DISTINCT ON (m.sender_id)
          m.message_id as id,
          m.sender_id,
          m.sender_name,
          m.sender_role,
          m.body as last_message,
          m.created_at as last_message_time,
          m.message_type,
          m.is_emergency,
          (SELECT COUNT(*) FROM messages WHERE tenant_id = $1 AND sender_id = m.sender_id AND recipient_id = $2 AND read_at IS NULL) as unread_count
        FROM messages m
        WHERE m.tenant_id = $1 AND (m.recipient_id = $2 OR m.recipient_id IS NULL)
        ORDER BY m.sender_id, m.created_at DESC
      `
      : `
        SELECT DISTINCT ON (COALESCE(m.recipient_id::text, 'dispatch'))
          m.message_id as id,
          COALESCE(m.recipient_id::text, 'dispatch') as conversation_id,
          m.recipient_name,
          m.body as last_message,
          m.created_at as last_message_time,
          m.message_type,
          (SELECT COUNT(*) FROM messages WHERE tenant_id = $1 AND sender_id != $2 AND (recipient_id = $2 OR recipient_id IS NULL) AND read_at IS NULL) as unread_count
        FROM messages m
        WHERE m.tenant_id = $1 AND (m.sender_id = $2 OR m.recipient_id = $2)
        ORDER BY COALESCE(m.recipient_id::text, 'dispatch'), m.created_at DESC
      `;

    const result = await pool.query(query, [tenantId, userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

// ============================================
// GET /api/messages/:conversationId
// Get messages in a conversation
// ============================================
router.get('/:conversationId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id;
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const query = `
      SELECT
        m.message_id as id,
        m.sender_id,
        m.sender_name,
        m.sender_role,
        m.recipient_id,
        m.recipient_name,
        m.body as content,
        m.message_type,
        m.is_emergency,
        m.trip_id,
        m.metadata,
        m.created_at,
        m.read_at
      FROM messages m
      WHERE m.tenant_id = $1
        AND (
          (m.sender_id = $2 AND m.recipient_id::text = $3)
          OR (m.sender_id::text = $3 AND m.recipient_id = $2)
          OR (m.sender_id = $2 AND m.recipient_id IS NULL AND $3 = 'dispatch')
        )
      ORDER BY m.created_at DESC
      LIMIT $4 OFFSET $5
    `;

    const result = await pool.query(query, [tenantId, userId, conversationId, limit, offset]);

    // Mark messages as read
    await pool.query(
      `UPDATE messages SET read_at = NOW() WHERE tenant_id = $1 AND recipient_id = $2 AND sender_id::text = $3 AND read_at IS NULL`,
      [tenantId, userId, conversationId]
    );

    res.json({
      success: true,
      data: result.rows.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// ============================================
// POST /api/messages
// Send a new message
// ============================================
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.firstName + ' ' + ((req as any).user?.lastName || '');
    const userRole = (req as any).user?.role || 'driver';

    const {
      recipient_id,
      recipient_name,
      content,
      message_type = 'driver_to_dispatch',
      trip_id,
      is_emergency = false,
      metadata = {}
    } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    const query = `
      INSERT INTO messages (
        tenant_id,
        sender_id,
        sender_name,
        sender_role,
        recipient_id,
        recipient_name,
        body,
        message_type,
        trip_id,
        is_emergency,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      tenantId,
      userId,
      userName.trim(),
      userRole,
      recipient_id || null,
      recipient_name || 'Dispatch',
      content.trim(),
      message_type,
      trip_id || null,
      is_emergency,
      JSON.stringify(metadata)
    ]);

    const message = result.rows[0];

    // If emergency, create a notification for dispatch
    if (is_emergency) {
      await pool.query(
        `INSERT INTO notifications (tenant_id, user_id, type, title, message, priority, metadata, created_at)
         SELECT $1, id, 'emergency', 'EMERGENCY ALERT', $2, 'critical', $3, NOW()
         FROM users WHERE tenant_id = $1 AND role IN ('admin', 'dispatcher', 'manager')`,
        [tenantId, `Emergency from ${userName}: ${content}`, JSON.stringify({ message_id: message.message_id, sender_id: userId })]
      );
    }

    // TODO: Emit WebSocket event for real-time delivery
    // io.to(`user_${recipient_id}`).emit('new_message', message);
    // io.to('dispatch').emit('new_message', message);

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// ============================================
// POST /api/messages/emergency
// Send emergency alert (high priority)
// ============================================
router.post('/emergency', authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id || 'unknown';
    const userName = (req as any).user?.firstName
      ? `${(req as any).user.firstName} ${(req as any).user.lastName || ''}`.trim()
      : ((req as any).user?.name || (req as any).user?.email || 'Driver');
    const userRole = (req as any).user?.role || 'driver';

    const {
      emergency_type, // 'breakdown', 'security', 'medical', 'accident', 'sos'
      location,
      coordinates,
      trip_id,
      details
    } = req.body;

    const content = `🚨 EMERGENCY ALERT: ${emergency_type?.toUpperCase() || 'SOS'}\nDriver: ${userName}\nLocation: ${location || 'Unknown'}\nDetails: ${details || 'No details provided'}`;

    const metadata = {
      emergency_type: emergency_type || 'sos',
      location,
      coordinates,
      timestamp: new Date().toISOString()
    };

    // Create emergency message
    const messageQuery = `
      INSERT INTO messages (
        tenant_id,
        sender_id,
        sender_name,
        sender_role,
        recipient_id,
        body,
        message_type,
        trip_id,
        is_emergency,
        metadata,
        priority,
        created_at
      ) VALUES ($1, $2, $3, $4, NULL, $5, 'emergency', $6, true, $7, 'critical', NOW())
      RETURNING *
    `;

    const result = await pool.query(messageQuery, [
      tenantId,
      userId,
      userName,
      userRole,
      content,
      trip_id || null,
      JSON.stringify(metadata)
    ]);

    // Create high-priority notification for ALL dispatch users
    await pool.query(
      `INSERT INTO notifications (tenant_id, user_id, type, title, message, priority, metadata, created_at)
       SELECT $1, id, 'emergency', '🚨 DRIVER EMERGENCY', $2, 'critical', $3, NOW()
       FROM users WHERE tenant_id = $1 AND role IN ('admin', 'dispatcher', 'manager', 'supervisor')`,
      [tenantId, content, JSON.stringify(metadata)]
    );

    // Log to audit trail
    await pool.query(
      `INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, new_values, created_at)
       VALUES ($1, $2::uuid, 'EMERGENCY_ALERT', 'driver', $2::text, $3, NOW())`,
      [tenantId, userId, JSON.stringify({ emergency_type, location, trip_id })]
    );

    res.status(201).json({
      success: true,
      message: 'Emergency alert sent to all dispatch personnel',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error sending emergency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send emergency alert'
    });
  }
});

// ============================================
// GET /api/messages/dispatch/inbox
// Get all messages for dispatch (office view)
// ============================================
router.get('/dispatch/inbox', authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const tenantId = (req as any).tenant?.id;
    const userRole = (req as any).user?.role;

    // Only allow dispatch/admin roles
    if (!['admin', 'dispatcher', 'manager', 'supervisor'].includes(userRole?.toLowerCase() || '')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Dispatch role required.'
      });
    }

    const query = `
      SELECT
        m.message_id as id,
        m.sender_id,
        m.sender_name,
        m.sender_role,
        m.body as content,
        m.message_type,
        m.is_emergency,
        m.trip_id,
        m.metadata,
        m.created_at,
        m.read_at
      FROM messages m
      WHERE m.tenant_id = $1
        AND m.message_type IN ('driver_to_dispatch', 'emergency')
        AND m.recipient_id IS NULL
      ORDER BY m.is_emergency DESC, m.created_at DESC
      LIMIT 100
    `;

    const result = await pool.query(query, [tenantId]);

    // Get unread count
    const unreadResult = await pool.query(
      `SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1 AND message_type IN ('driver_to_dispatch', 'emergency') AND recipient_id IS NULL AND read_at IS NULL`,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        messages: result.rows,
        unread_count: parseInt(unreadResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error fetching dispatch inbox:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dispatch inbox'
    });
  }
});

// ============================================
// POST /api/messages/dispatch/reply/:messageId
// Reply to a driver message from dispatch
// ============================================
router.post('/dispatch/reply/:messageId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.firstName || 'Dispatch';
    const { messageId } = req.params;
    const { content } = req.body;

    // Get original message
    const originalMsg = await pool.query(
      `SELECT sender_id, sender_name, trip_id FROM messages WHERE tenant_id = $1 AND message_id = $2`,
      [tenantId, messageId]
    );

    if (originalMsg.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Original message not found'
      });
    }

    const original = originalMsg.rows[0];

    // Insert reply
    const result = await pool.query(
      `INSERT INTO messages (
        tenant_id, sender_id, sender_name, sender_role,
        recipient_id, recipient_name,
        body, message_type, trip_id, created_at
      ) VALUES ($1, $2, $3, 'dispatch', $4, $5, $6, 'dispatch_to_driver', $7, NOW())
      RETURNING *`,
      [tenantId, userId, userName, original.sender_id, original.sender_name, content, original.trip_id]
    );

    // Mark original as read
    await pool.query(
      `UPDATE messages SET read_at = NOW() WHERE tenant_id = $1 AND message_id = $2 AND read_at IS NULL`,
      [tenantId, messageId]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error replying to message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send reply'
    });
  }
});

// ============================================
// PUT /api/messages/:id/read
// Mark message as read
// ============================================
router.put('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const tenantId = (req as any).tenant?.id;
    const { id } = req.params;

    await pool.query(
      `UPDATE messages SET read_at = NOW() WHERE tenant_id = $1 AND message_id = $2`,
      [tenantId, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
});

// ============================================
// GET /api/messages/emergencies
// Get active emergencies (for dispatch dashboard)
// ============================================
router.get('/emergencies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = getPool(req);
    const tenantId = (req as any).tenant?.id;
    const userRole = (req as any).user?.role;

    // Only dispatch/admin can view emergency dashboard
    const isDispatch = ['admin', 'dispatcher', 'manager'].includes(userRole?.toLowerCase() || '');
    if (!isDispatch) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - dispatch access required'
      });
    }

    const result = await pool.query(
      `SELECT * FROM messages
       WHERE tenant_id = $1 AND is_emergency = true
       ORDER BY created_at DESC
       LIMIT 50`,
      [tenantId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching emergencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergencies'
    });
  }
});

export default router;
