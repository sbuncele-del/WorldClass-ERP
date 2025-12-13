/**
 * Delivery Controller v2 - Tenant-Hardened
 * 
 * Proof of Delivery (POD) verification system with SMS-based customer verification,
 * file uploads, and delivery completion workflow.
 * 
 * Features:
 * - SMS verification codes sent to customers
 * - POD file upload management
 * - Delivery completion with invoice generation
 * - Full audit trail via delivery_events
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { pool } from '../../config/database';

// Tenant-aware request type
interface AuthenticatedRequest extends Request {
  tenantId?: string;
  tenant?: { id: string };
  user?: { id: string; email: string; role: string };
  pool?: Pool;
  tenantPool?: Pool;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tenant-scoped database pool from request
 */
function getPool(req: AuthenticatedRequest): Pool {
  const pool = (req as any).pool || (req as any).tenantPool;
  if (!pool) {
    throw new Error('Database pool not available');
  }
  return pool;
}

/**
 * Generate a 6-digit verification code for SMS
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique POD reference number
 */
function generatePODReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `POD-${timestamp}-${random}`;
}

// =============================================================================
// VERIFICATION HANDLERS
// =============================================================================

/**
 * POST /api/v2/delivery/initiate-verification
 * Initiates delivery verification by sending SMS code to customer
 */
export async function initiateVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  
  if (!tenantId) {
    res.status(401).json({ success: false, error: 'Tenant context required' });
    return;
  }

  const pool = getPool(req);
  const { tripId, driverId, customerPhone, customerName } = req.body;

  if (!tripId || !driverId || !customerPhone) {
    res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: tripId, driverId, customerPhone' 
    });
    return;
  }

  try {
    // Verify trip exists and belongs to tenant
    const tripCheck = await pool.query(`
      SELECT id, trip_number, status 
      FROM logistics_trips 
      WHERE id = $1 AND tenant_id = $2
    `, [tripId, tenantId]);

    if (tripCheck.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Trip not found' });
      return;
    }

    const trip = tripCheck.rows[0];

    if (trip.status === 'delivered') {
      res.status(400).json({ success: false, error: 'Trip already delivered' });
      return;
    }

    // Check for existing pending verification
    const existing = await pool.query(`
      SELECT id FROM delivery_verifications 
      WHERE trip_id = $1 AND tenant_id = $2 AND verified_at IS NULL
    `, [tripId, tenantId]);

    if (existing.rows.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Verification already pending. Use resend-code to get a new code.' 
      });
      return;
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Create verification record
    await pool.query(`
      INSERT INTO delivery_verifications (
        tenant_id, trip_id, driver_id, customer_phone, customer_name, 
        verification_code, expires_at, attempts
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
    `, [tenantId, tripId, driverId, customerPhone, customerName || 'Customer', verificationCode, expiresAt]);

    // Update trip status
    await pool.query(`
      UPDATE logistics_trips 
      SET status = 'at_destination', updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
    `, [tripId, tenantId]);

    // Log event
    await pool.query(`
      INSERT INTO delivery_events (tenant_id, trip_id, event_type, event_data, created_by)
      VALUES ($1, $2, 'verification_initiated', $3, $4)
    `, [tenantId, tripId, JSON.stringify({ 
      customerPhone: customerPhone.slice(-4), 
      expiresAt 
    }), driverId]);

    // TODO: Integrate with SMS gateway
    console.log(`📱 [Tenant: ${tenantId}] SMS to ${customerPhone}: Your delivery code is ${verificationCode}`);

    res.json({
      success: true,
      message: 'Verification code sent to customer',
      data: {
        tripNumber: trip.trip_number,
        phoneLastFour: customerPhone.slice(-4),
        expiresAt,
        maxAttempts: 3
      }
    });

  } catch (error) {
    console.error('Error initiating verification:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate verification' });
  }
}

/**
 * POST /api/v2/delivery/verify-code
 * Customer enters the code to verify delivery
 */
export async function verifyCode(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  
  if (!tenantId) {
    res.status(401).json({ success: false, error: 'Tenant context required' });
    return;
  }

  const pool = getPool(req);
  const { tripId, code, driverId } = req.body;

  if (!tripId || !code) {
    res.status(400).json({ success: false, error: 'Missing tripId or code' });
    return;
  }

  try {
    // Get pending verification with tenant scope
    const result = await pool.query(`
      SELECT id, verification_code, expires_at, attempts
      FROM delivery_verifications 
      WHERE trip_id = $1 AND tenant_id = $2 AND verified_at IS NULL
    `, [tripId, tenantId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'No pending verification found' });
      return;
    }

    const verification = result.rows[0];

    // Check expiry
    if (new Date() > new Date(verification.expires_at)) {
      res.status(400).json({ success: false, error: 'Verification code expired. Please request a new code.' });
      return;
    }

    // Check attempts
    if (verification.attempts >= 3) {
      res.status(400).json({ success: false, error: 'Maximum attempts exceeded. Please request a new code.' });
      return;
    }

    // Verify code
    if (verification.verification_code !== code) {
      // Increment attempts
      await pool.query(`
        UPDATE delivery_verifications SET attempts = attempts + 1 WHERE id = $1
      `, [verification.id]);

      const attemptsLeft = 2 - verification.attempts;
      res.status(400).json({ 
        success: false, 
        error: `Invalid code. ${attemptsLeft} attempts remaining.` 
      });
      return;
    }

    // Mark as verified
    await pool.query(`
      UPDATE delivery_verifications 
      SET verified_at = NOW()
      WHERE id = $1
    `, [verification.id]);

    // Log event
    await pool.query(`
      INSERT INTO delivery_events (tenant_id, trip_id, event_type, event_data, created_by)
      VALUES ($1, $2, 'code_verified', $3, $4)
    `, [tenantId, tripId, JSON.stringify({ 
      verifiedAt: new Date(),
      attempts: verification.attempts + 1
    }), driverId || 'customer']);

    res.json({
      success: true,
      message: 'Delivery verified by customer',
      data: {
        verified: true,
        verifiedAt: new Date(),
        nextStep: 'Upload proof of delivery (POD)'
      }
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ success: false, error: 'Failed to verify code' });
  }
}

/**
 * POST /api/v2/delivery/resend-code
 * Resend verification code if customer didn't receive it
 */
export async function resendCode(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  
  if (!tenantId) {
    res.status(401).json({ success: false, error: 'Tenant context required' });
    return;
  }

  const pool = getPool(req);
  const { tripId, driverId } = req.body;

  try {
    // Get existing verification with tenant scope
    const result = await pool.query(`
      SELECT * FROM delivery_verifications 
      WHERE trip_id = $1 AND tenant_id = $2 AND verified_at IS NULL
    `, [tripId, tenantId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'No pending verification' });
      return;
    }

    const verification = result.rows[0];

    // Generate new code
    const newCode = generateVerificationCode();
    const newExpiry = new Date(Date.now() + 30 * 60 * 1000);

    await pool.query(`
      UPDATE delivery_verifications 
      SET verification_code = $2, expires_at = $3, attempts = 0
      WHERE id = $1
    `, [verification.id, newCode, newExpiry]);

    // Log event
    await pool.query(`
      INSERT INTO delivery_events (tenant_id, trip_id, event_type, event_data, created_by)
      VALUES ($1, $2, 'code_resent', $3, $4)
    `, [tenantId, tripId, JSON.stringify({ expiresAt: newExpiry }), driverId]);

    // TODO: Send SMS
    console.log(`📱 [Tenant: ${tenantId}] Resend SMS to ${verification.customer_phone}: Code ${newCode}`);

    res.json({
      success: true,
      message: 'New verification code sent',
      data: {
        phoneLastFour: verification.customer_phone.slice(-4),
        expiresAt: newExpiry
      }
    });

  } catch (error) {
    console.error('Error resending code:', error);
    res.status(500).json({ success: false, error: 'Failed to resend code' });
  }
}

// =============================================================================
// POD (PROOF OF DELIVERY) HANDLERS
// =============================================================================

/**
 * POST /api/v2/delivery/upload-pod
 * Upload proof of delivery documents/photos
 */
export async function uploadPOD(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  
  if (!tenantId) {
    res.status(401).json({ success: false, error: 'Tenant context required' });
    return;
  }

  const pool = getPool(req);
  const { tripId, driverId, files } = req.body;

  if (!tripId || !files || !Array.isArray(files)) {
    res.status(400).json({ success: false, error: 'Missing tripId or files array' });
    return;
  }

  try {
    // Verify trip exists and belongs to tenant
    const tripCheck = await pool.query(`
      SELECT id, trip_number FROM logistics_trips 
      WHERE id = $1 AND tenant_id = $2
    `, [tripId, tenantId]);

    if (tripCheck.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Trip not found' });
      return;
    }

    const podReference = generatePODReference();
    
    // Process uploaded files
    const uploadedFiles = files.map((file: any, index: number) => ({
      id: `${podReference}-${index}`,
      name: file.name || `document_${index}`,
      type: file.type || 'image/jpeg',
      size: file.size || 0,
      uploadedAt: new Date()
    }));

    // Create or update POD record
    await pool.query(`
      INSERT INTO proof_of_delivery (tenant_id, trip_id, driver_id, pod_reference, files, status)
      VALUES ($1, $2, $3, $4, $5, 'uploaded')
      ON CONFLICT (trip_id) DO UPDATE SET
        files = $5,
        pod_reference = $4,
        status = 'uploaded',
        uploaded_at = NOW()
    `, [tenantId, tripId, driverId, podReference, JSON.stringify(uploadedFiles)]);

    // Log event
    await pool.query(`
      INSERT INTO delivery_events (tenant_id, trip_id, event_type, event_data, created_by)
      VALUES ($1, $2, 'pod_uploaded', $3, $4)
    `, [tenantId, tripId, JSON.stringify({ 
      files: uploadedFiles.length, 
      reference: podReference 
    }), driverId]);

    res.json({
      success: true,
      message: 'Proof of delivery uploaded successfully',
      data: {
        podReference,
        filesUploaded: uploadedFiles.length
      }
    });

  } catch (error) {
    console.error('Error uploading POD:', error);
    res.status(500).json({ success: false, error: 'Failed to upload POD' });
  }
}

// =============================================================================
// COMPLETION HANDLERS
// =============================================================================

/**
 * POST /api/v2/delivery/complete
 * Final delivery confirmation after verification and POD upload
 */
export async function completeDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  
  if (!tenantId) {
    res.status(401).json({ success: false, error: 'Tenant context required' });
    return;
  }

  const pool = getPool(req);
  const { tripId, driverId, notes, customerSignature } = req.body;

  try {
    // Verify all requirements are met
    const checkResult = await pool.query(`
      SELECT 
        t.id, t.trip_number, t.status,
        v.verified_at,
        p.status as pod_status, p.pod_reference
      FROM logistics_trips t
      LEFT JOIN delivery_verifications v ON t.id = v.trip_id AND v.tenant_id = $2
      LEFT JOIN proof_of_delivery p ON t.id = p.trip_id AND p.tenant_id = $2
      WHERE t.id = $1 AND t.tenant_id = $2
    `, [tripId, tenantId]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Trip not found' });
      return;
    }

    const trip = checkResult.rows[0];

    // Check verification
    if (!trip.verified_at) {
      res.status(400).json({ 
        success: false, 
        error: 'Customer verification required before completing delivery' 
      });
      return;
    }

    // Check POD (optional but recommended)
    const hasPOD = trip.pod_status === 'uploaded';

    // Update trip status to delivered
    await pool.query(`
      UPDATE logistics_trips 
      SET 
        status = 'delivered',
        delivered_at = NOW(),
        delivery_notes = $2,
        completed_by = $3,
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $4
    `, [tripId, notes, driverId, tenantId]);

    // Update POD status
    if (hasPOD) {
      await pool.query(`
        UPDATE proof_of_delivery 
        SET status = 'confirmed', confirmed_at = NOW()
        WHERE trip_id = $1 AND tenant_id = $2
      `, [tripId, tenantId]);
    }

    // Create invoice draft
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    await pool.query(`
      INSERT INTO invoices (tenant_id, trip_id, invoice_number, status, created_by)
      VALUES ($1, $2, $3, 'pending_approval', $4)
    `, [tenantId, tripId, invoiceNumber, driverId]);

    // Log completion event
    await pool.query(`
      INSERT INTO delivery_events (tenant_id, trip_id, event_type, event_data, created_by)
      VALUES ($1, $2, 'delivery_completed', $3, $4)
    `, [tenantId, tripId, JSON.stringify({ 
      verified: true, 
      hasPOD, 
      invoiceNumber,
      completedAt: new Date()
    }), driverId]);

    console.log(`✅ [Tenant: ${tenantId}] Delivery completed: ${trip.trip_number} - Invoice: ${invoiceNumber}`);

    res.json({
      success: true,
      message: 'Delivery completed successfully!',
      data: {
        tripNumber: trip.trip_number,
        invoiceNumber,
        podReference: trip.pod_reference,
        verifiedDelivery: true,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error completing delivery:', error);
    res.status(500).json({ success: false, error: 'Failed to complete delivery' });
  }
}

// =============================================================================
// STATUS HANDLERS
// =============================================================================

/**
 * GET /api/v2/delivery/status/:tripId
 * Get current delivery verification status
 */
export async function getDeliveryStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  
  if (!tenantId) {
    res.status(401).json({ success: false, error: 'Tenant context required' });
    return;
  }

  const pool = getPool(req);
  const { tripId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        t.id, t.trip_number, t.status,
        v.verification_code IS NOT NULL as code_sent,
        v.verified_at IS NOT NULL as code_verified,
        v.expires_at as code_expires,
        v.attempts as code_attempts,
        p.status as pod_status,
        p.pod_reference,
        p.files as pod_files
      FROM logistics_trips t
      LEFT JOIN delivery_verifications v ON t.id = v.trip_id AND v.tenant_id = $2
      LEFT JOIN proof_of_delivery p ON t.id = p.trip_id AND p.tenant_id = $2
      WHERE t.id = $1 AND t.tenant_id = $2
    `, [tripId, tenantId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Trip not found' });
      return;
    }

    const status = result.rows[0];

    res.json({
      success: true,
      data: {
        tripNumber: status.trip_number,
        tripStatus: status.status,
        verification: {
          codeSent: status.code_sent,
          codeVerified: status.code_verified,
          codeExpires: status.code_expires,
          attemptsUsed: status.code_attempts || 0
        },
        pod: {
          status: status.pod_status,
          reference: status.pod_reference,
          filesCount: status.pod_files ? JSON.parse(status.pod_files).length : 0
        },
        canComplete: status.code_verified && (status.pod_status === 'uploaded' || status.pod_status === null)
      }
    });

  } catch (error) {
    console.error('Error getting delivery status:', error);
    res.status(500).json({ success: false, error: 'Failed to get status' });
  }
}

/**
 * GET /api/v2/delivery/events/:tripId
 * Get delivery event history/audit trail
 */
export async function getDeliveryEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  
  if (!tenantId) {
    res.status(401).json({ success: false, error: 'Tenant context required' });
    return;
  }

  const pool = getPool(req);
  const { tripId } = req.params;

  try {
    // Verify trip belongs to tenant
    const tripCheck = await pool.query(`
      SELECT id, trip_number FROM logistics_trips 
      WHERE id = $1 AND tenant_id = $2
    `, [tripId, tenantId]);

    if (tripCheck.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Trip not found' });
      return;
    }

    const events = await pool.query(`
      SELECT e.*, u.name as created_by_name
      FROM delivery_events e
      LEFT JOIN users u ON e.created_by::uuid = u.id
      WHERE e.trip_id = $1 AND e.tenant_id = $2
      ORDER BY e.created_at ASC
    `, [tripId, tenantId]);

    res.json({
      success: true,
      data: {
        tripNumber: tripCheck.rows[0].trip_number,
        events: events.rows.map(e => ({
          id: e.id,
          eventType: e.event_type,
          eventData: typeof e.event_data === 'string' ? JSON.parse(e.event_data) : e.event_data,
          createdBy: e.created_by_name || e.created_by,
          createdAt: e.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Error getting delivery events:', error);
    res.status(500).json({ success: false, error: 'Failed to get events' });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  initiateVerification,
  verifyCode,
  resendCode,
  uploadPOD,
  completeDelivery,
  getDeliveryStatus,
  getDeliveryEvents
};
