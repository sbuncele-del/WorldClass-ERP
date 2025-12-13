/**
 * Communications Controller V2
 * Tenant-hardened API for internal communications
 * 
 * Features:
 * - Announcements
 * - Chat channels & messages
 * - Direct messages
 * - Notifications
 * - Video meetings
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import pool from '../config/database';

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
// WORKSPACE
// ============================================================================
export const getWorkspace = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);

    const [announcementsResult, channelsResult, unreadResult, meetingsResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as active_announcements
        FROM announcements WHERE tenant_id = $1 AND is_active = true 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [tenantId]
      ),
      pool.query(
        `SELECT COUNT(*) as total_channels
        FROM chat_channels WHERE tenant_id = $1 AND is_active = true`,
        [tenantId]
      ),
      pool.query(
        `SELECT COUNT(*) as unread_notifications
        FROM notifications WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`,
        [tenantId, userId]
      ),
      pool.query(
        `SELECT COUNT(*) as upcoming_meetings
        FROM video_meetings WHERE tenant_id = $1 
        AND scheduled_start > CURRENT_TIMESTAMP 
        AND scheduled_start < CURRENT_TIMESTAMP + INTERVAL '7 days'`,
        [tenantId]
      )
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          activeAnnouncements: parseInt(announcementsResult.rows[0]?.active_announcements || '0'),
          totalChannels: parseInt(channelsResult.rows[0]?.total_channels || '0'),
          unreadNotifications: parseInt(unreadResult.rows[0]?.unread_notifications || '0'),
          upcomingMeetings: parseInt(meetingsResult.rows[0]?.upcoming_meetings || '0')
        }
      }
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Communications workspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to load workspace' });
  }
};

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================
export const getAnnouncements = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { priority, includeExpired } = req.query;

    let queryStr = `
      SELECT a.*, u.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by_user_id = u.id
      WHERE a.tenant_id = $1 AND a.is_active = true
    `;
    const params: any[] = [tenantId];

    if (includeExpired !== 'true') {
      queryStr += ' AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)';
    }
    if (priority) {
      params.push(priority);
      queryStr += ` AND a.priority = $${params.length}`;
    }

    queryStr += ' ORDER BY a.is_pinned DESC, a.created_at DESC';
    const result = await pool.query(queryStr, params);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get announcements error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch announcements' });
  }
};

export const createAnnouncement = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { title, content, priority, targetAudience, expiresAt, isPinned } = req.body;

    const result = await pool.query(
      `INSERT INTO announcements (tenant_id, created_by_user_id, title, content, priority,
        target_audience, expires_at, is_pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [tenantId, userId, title, content, priority || 'normal', targetAudience || 'all',
       expiresAt, isPinned || false]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Announcement posted' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Create announcement error:', error);
    res.status(500).json({ success: false, error: 'Failed to create announcement' });
  }
};

export const updateAnnouncement = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const { title, content, priority, expiresAt, isPinned, isActive } = req.body;

    const result = await pool.query(
      `UPDATE announcements SET
        title = COALESCE($3, title),
        content = COALESCE($4, content),
        priority = COALESCE($5, priority),
        expires_at = COALESCE($6, expires_at),
        is_pinned = COALESCE($7, is_pinned),
        is_active = COALESCE($8, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [id, tenantId, title, content, priority, expiresAt, isPinned, isActive]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Announcement updated' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Update announcement error:', error);
    res.status(500).json({ success: false, error: 'Failed to update announcement' });
  }
};

export const deleteAnnouncement = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE announcements SET is_active = false WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Delete announcement error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete announcement' });
  }
};

// ============================================================================
// CHAT CHANNELS
// ============================================================================
export const getChannels = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { type } = req.query;

    let queryStr = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM chat_messages m WHERE m.channel_id = c.id) as message_count,
        (SELECT MAX(created_at) FROM chat_messages m WHERE m.channel_id = c.id) as last_message_at
      FROM chat_channels c
      WHERE c.tenant_id = $1 AND c.is_active = true
      AND (c.is_private = false OR EXISTS (
        SELECT 1 FROM chat_channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = $2
      ))
    `;
    const params: any[] = [tenantId, userId];

    if (type) {
      params.push(type);
      queryStr += ` AND c.channel_type = $${params.length}`;
    }

    queryStr += ' ORDER BY last_message_at DESC NULLS LAST, c.name ASC';
    const result = await pool.query(queryStr, params);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get channels error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch channels' });
  }
};

export const createChannel = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { name, description, channelType, isPrivate, memberUserIds } = req.body;

    const channelResult = await pool.query(
      `INSERT INTO chat_channels (tenant_id, created_by_user_id, name, description, 
        channel_type, is_private)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [tenantId, userId, name, description, channelType || 'general', isPrivate || false]
    );

    const channel = channelResult.rows[0];

    // Add creator as member
    await pool.query(
      `INSERT INTO chat_channel_members (tenant_id, channel_id, user_id, role)
      VALUES ($1, $2, $3, 'admin')`,
      [tenantId, channel.id, userId]
    );

    // Add other members
    if (memberUserIds && memberUserIds.length > 0) {
      for (const memberId of memberUserIds) {
        if (memberId !== userId) {
          await pool.query(
            `INSERT INTO chat_channel_members (tenant_id, channel_id, user_id, role)
            VALUES ($1, $2, $3, 'member')`,
            [tenantId, channel.id, memberId]
          );
        }
      }
    }

    res.status(201).json({ success: true, data: channel, message: 'Channel created' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Create channel error:', error);
    res.status(500).json({ success: false, error: 'Failed to create channel' });
  }
};

// ============================================================================
// CHANNEL MESSAGES
// ============================================================================
export const getChannelMessages = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;

    let queryStr = `
      SELECT m.*, u.name as author_name, u.email as author_email
      FROM chat_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.tenant_id = $1 AND m.channel_id = $2
    `;
    const params: any[] = [tenantId, channelId];

    if (before) {
      params.push(before);
      queryStr += ` AND m.created_at < $${params.length}`;
    }

    params.push(limit);
    queryStr += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(queryStr, params);

    res.json({ success: true, data: result.rows.reverse() });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
};

export const sendChannelMessage = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { channelId } = req.params;
    const { content, messageType, attachments } = req.body;

    const result = await pool.query(
      `INSERT INTO chat_messages (tenant_id, channel_id, user_id, content, message_type, attachments)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [tenantId, channelId, userId, content, messageType || 'text', attachments]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Message sent' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

// ============================================================================
// DIRECT MESSAGES
// ============================================================================
export const getDirectConversations = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);

    const result = await pool.query(
      `SELECT DISTINCT ON (other_user_id)
        CASE WHEN sender_id = $2 THEN recipient_id ELSE sender_id END as other_user_id,
        u.name as other_user_name,
        dm.content as last_message,
        dm.created_at as last_message_at
      FROM direct_messages dm
      LEFT JOIN users u ON (CASE WHEN dm.sender_id = $2 THEN dm.recipient_id ELSE dm.sender_id END) = u.id
      WHERE dm.tenant_id = $1 AND (dm.sender_id = $2 OR dm.recipient_id = $2)
      ORDER BY other_user_id, dm.created_at DESC`,
      [tenantId, userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get DM conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
};

export const getDirectMessages = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { otherUserId } = req.params;
    const { limit = 50 } = req.query;

    const result = await pool.query(
      `SELECT dm.*, 
        s.name as sender_name, 
        r.name as recipient_name
      FROM direct_messages dm
      LEFT JOIN users s ON dm.sender_id = s.id
      LEFT JOIN users r ON dm.recipient_id = r.id
      WHERE dm.tenant_id = $1 
      AND ((dm.sender_id = $2 AND dm.recipient_id = $3) 
           OR (dm.sender_id = $3 AND dm.recipient_id = $2))
      ORDER BY dm.created_at DESC
      LIMIT $4`,
      [tenantId, userId, otherUserId, limit]
    );

    // Mark as read
    await pool.query(
      `UPDATE direct_messages SET is_read = true 
      WHERE tenant_id = $1 AND recipient_id = $2 AND sender_id = $3 AND is_read = false`,
      [tenantId, userId, otherUserId]
    );

    res.json({ success: true, data: result.rows.reverse() });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get DMs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
};

export const sendDirectMessage = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { recipientId, content, attachments } = req.body;

    const result = await pool.query(
      `INSERT INTO direct_messages (tenant_id, sender_id, recipient_id, content, attachments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [tenantId, userId, recipientId, content, attachments]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Message sent' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Send DM error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================
export const getNotifications = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { unreadOnly, limit = 50 } = req.query;

    let queryStr = `
      SELECT * FROM notifications
      WHERE tenant_id = $1 AND user_id = $2
    `;
    const params: any[] = [tenantId, userId];

    if (unreadOnly === 'true') {
      queryStr += ' AND is_read = false';
    }

    params.push(limit);
    queryStr += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(queryStr, params);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND user_id = $3
      RETURNING *`,
      [id, tenantId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Mark notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification' });
  }
};

export const markAllNotificationsRead = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);

    await pool.query(
      `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`,
      [tenantId, userId]
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Mark all notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications' });
  }
};

// ============================================================================
// VIDEO MEETINGS
// ============================================================================
export const getMeetings = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { upcoming, past } = req.query;

    let queryStr = `
      SELECT m.*, u.name as organizer_name
      FROM video_meetings m
      LEFT JOIN users u ON m.organizer_user_id = u.id
      WHERE m.tenant_id = $1
      AND (m.organizer_user_id = $2 OR EXISTS (
        SELECT 1 FROM video_meeting_participants p WHERE p.meeting_id = m.id AND p.user_id = $2
      ))
    `;
    const params: any[] = [tenantId, userId];

    if (upcoming === 'true') {
      queryStr += ' AND m.scheduled_start > CURRENT_TIMESTAMP';
    }
    if (past === 'true') {
      queryStr += ' AND m.scheduled_end < CURRENT_TIMESTAMP';
    }

    queryStr += ' ORDER BY m.scheduled_start ASC';
    const result = await pool.query(queryStr, params);

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get meetings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch meetings' });
  }
};

export const createMeeting = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { title, description, scheduledStart, scheduledEnd, meetingType, 
            participantUserIds, isRecurring, recurringPattern } = req.body;

    // Generate meeting link
    const meetingCode = `mtg-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
    const meetingLink = `/meetings/${meetingCode}`;

    const meetingResult = await pool.query(
      `INSERT INTO video_meetings (tenant_id, organizer_user_id, title, description,
        scheduled_start, scheduled_end, meeting_type, meeting_link, meeting_code,
        is_recurring, recurring_pattern, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled')
      RETURNING *`,
      [tenantId, userId, title, description, scheduledStart, scheduledEnd,
       meetingType || 'video', meetingLink, meetingCode, isRecurring || false, recurringPattern]
    );

    const meeting = meetingResult.rows[0];

    // Add organizer as participant
    await pool.query(
      `INSERT INTO video_meeting_participants (tenant_id, meeting_id, user_id, role, status)
      VALUES ($1, $2, $3, 'organizer', 'accepted')`,
      [tenantId, meeting.id, userId]
    );

    // Add other participants
    if (participantUserIds && participantUserIds.length > 0) {
      for (const participantId of participantUserIds) {
        if (participantId !== userId) {
          await pool.query(
            `INSERT INTO video_meeting_participants (tenant_id, meeting_id, user_id, role, status)
            VALUES ($1, $2, $3, 'participant', 'pending')`,
            [tenantId, meeting.id, participantId]
          );
        }
      }
    }

    res.status(201).json({ success: true, data: meeting, message: 'Meeting scheduled' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Create meeting error:', error);
    res.status(500).json({ success: false, error: 'Failed to create meeting' });
  }
};

export const updateMeeting = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const { title, description, scheduledStart, scheduledEnd, status } = req.body;

    const result = await pool.query(
      `UPDATE video_meetings SET
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        scheduled_start = COALESCE($5, scheduled_start),
        scheduled_end = COALESCE($6, scheduled_end),
        status = COALESCE($7, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [id, tenantId, title, description, scheduledStart, scheduledEnd, status]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Meeting updated' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Update meeting error:', error);
    res.status(500).json({ success: false, error: 'Failed to update meeting' });
  }
};

export const cancelMeeting = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE video_meetings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    res.json({ success: true, message: 'Meeting cancelled' });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Cancel meeting error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel meeting' });
  }
};

export default {
  getWorkspace,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getChannels,
  createChannel,
  getChannelMessages,
  sendChannelMessage,
  getDirectConversations,
  getDirectMessages,
  sendDirectMessage,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getMeetings,
  createMeeting,
  updateMeeting,
  cancelMeeting
};
