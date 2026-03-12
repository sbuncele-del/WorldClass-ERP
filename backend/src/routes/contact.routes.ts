import { Router, Request, Response } from 'express';
import { sendEmail } from '../services/email.service';

const router = Router();

/**
 * Contact Form Routes
 * 
 * Public routes (no auth):
 *   POST /api/contact    - Submit contact form
 */

// Rate limiting is applied at the mount level in index.ts

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, company, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, subject, and message are required' });
    }

    // Send notification email to support team
    const subjectMap: Record<string, string> = {
      demo: 'Demo Request',
      pricing: 'Pricing Inquiry',
      support: 'Support Request',
      partnership: 'Partnership Inquiry',
      media: 'Media & Press',
      other: 'General Inquiry',
    };

    const subjectLabel = subjectMap[subject] || subject;

    await sendEmail({
      to: 'support@siyabusaerp.co.za',
      subject: `[Website Contact] ${subjectLabel} from ${name}`,
      template: 'contact-form',
      variables: {
        name,
        email,
        company: company || 'Not provided',
        subjectLabel,
        message,
      },
    });

    res.json({ success: true, message: 'Your message has been sent. We will get back to you within 24 hours.' });
  } catch (error: any) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message. Please try again or email us directly.' });
  }
});

export default router;
