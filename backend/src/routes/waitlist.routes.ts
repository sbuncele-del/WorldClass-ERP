import { Router, Request, Response } from 'express';
import { sendEmail } from '../services/email.service';
import pool from '../config/database';

const router = Router();

/**
 * Waitlist / Lead Capture Routes
 *
 * Public routes (no auth):
 *   POST /api/v1/waitlist    - Join the founding member waitlist
 *   GET  /api/v1/waitlist/count - Get current waitlist count (public social proof)
 */

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, company, role, source } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }

    // Store lead in database
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS public.waitlist (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          company VARCHAR(255),
          role VARCHAR(100),
          source VARCHAR(100) DEFAULT 'website',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      );

      await pool.query(
        `INSERT INTO public.waitlist (name, email, company, role, source)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           company = EXCLUDED.company,
           role = EXCLUDED.role,
           updated_at = NOW()`,
        [name, email, company || null, role || null, source || 'website']
      );
    } catch (dbErr: any) {
      console.error('Waitlist DB error (non-fatal):', dbErr.message);
      // Continue even if DB fails — still send emails
    }

    // Send welcome email to the lead
    await sendEmail({
      to: email,
      subject: 'Welcome to the SiyaBusa Founding Member Waitlist',
      template: 'waitlist-welcome',
      variables: {
        name,
        email,
        company: company || '',
      },
    });

    // Notify the team
    await sendEmail({
      to: 'sbuncele@gmail.com',
      subject: `[Waitlist] New Founding Member: ${name}`,
      template: 'waitlist-notification',
      variables: {
        name,
        email,
        company: company || 'Not provided',
        role: role || 'Not specified',
        source: source || 'website',
      },
    });

    res.json({
      success: true,
      message: "You're on the list! Check your inbox for a welcome email.",
    });
  } catch (error: any) {
    console.error('Waitlist error:', error);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
});

router.get('/count', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM public.waitlist WHERE status = 'active'`
    );
    const count = parseInt(result.rows[0]?.count || '0', 10);
    // Add a base offset for social proof (founding member spots = 50)
    res.json({ success: true, count, spotsLeft: Math.max(0, 50 - count) });
  } catch {
    // Return default if table doesn't exist yet
    res.json({ success: true, count: 0, spotsLeft: 50 });
  }
});

export default router;
