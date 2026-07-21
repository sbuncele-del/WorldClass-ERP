import { Response } from 'express';
import multer from 'multer';
import { TenantRequest } from '../../../types';
import { captureVendorInvoice } from '../services/invoice-ocr.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
    }
  },
});

export const uploadInvoiceDocument = upload.single('file');

export const captureInvoice = async (req: TenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      res.status(401).json({ success: false, message: 'Tenant context not available' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const ctx = { tenantId: req.tenant.id, userId: req.user?.id, entityId: req.entity?.id };
    const result = await captureVendorInvoice(ctx, { buffer: req.file.buffer, mimetype: req.file.mimetype });

    res.status(201).json({
      success: true,
      data: result,
      message: result.needsReview
        ? 'Invoice captured - please review before posting'
        : 'Invoice captured and matched successfully',
    });
  } catch (error) {
    console.error('Error capturing vendor invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to capture invoice',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
