/**
 * Email Service
 * Core email sending functionality using Nodemailer
 */

import nodemailer from 'nodemailer';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import EmailPreferencesService from './email-preferences.service';

const readFile = promisify(fs.readFile);

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

// Create transporter - only if email is enabled
const EMAIL_ENABLED = process.env.ENABLE_EMAIL !== 'false' && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;

const transporter = EMAIL_ENABLED 
  ? nodemailer.createTransport(emailConfig)
  : null as any; // Dummy transporter when disabled

// Verify connection configuration
if (EMAIL_ENABLED && transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email service configuration error:', error);
    } else {
      console.log('✅ Email service is ready to send messages');
    }
  });
} else {
  console.log('⚠️  Email service disabled (no credentials configured)');
}

/**
 * Email template loader
 * Loads and processes email templates with variable substitution
 */
async function loadTemplate(templateName: string, variables: Record<string, string>): Promise<string> {
  try {
    const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
    let template = await readFile(templatePath, 'utf-8');

    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, variables[key]);
    });

    return template;
  } catch (error) {
    console.error(`Failed to load email template: ${templateName}`, error);
    throw new Error(`Email template not found: ${templateName}`);
  }
}

/**
 * Send email using template
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
  from?: string;
  userId?: number;
  tenantId?: number;
  category?: string;
}): Promise<void> {
  try {
    const { to, subject, template, variables, from, userId, tenantId, category } = options;

    // Check email preferences if user info provided
    if (userId && tenantId && category) {
      const canSend = await EmailPreferencesService.canSendEmail(userId, tenantId, category);
      if (!canSend) {
        console.log(`⏭️ Skipping email to ${to} - user preference: ${category}`);
        return;
      }
    }

    // Generate unsubscribe token if user info provided
    let unsubscribeUrl = '';
    if (userId && tenantId) {
      const token = await EmailPreferencesService.generateUnsubscribeToken(
        userId,
        tenantId,
        category
      );
      unsubscribeUrl = `${process.env.FRONTEND_URL}/api/email-preferences/unsubscribe/${token}`;
      variables.unsubscribeUrl = unsubscribeUrl;
    }

    // Load and process template
    const html = await loadTemplate(template, variables);

    // Send email
    const info = await transporter.sendMail({
      from: from || `"Worldclass ERP" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent:', {
      messageId: info.messageId,
      to,
      subject,
    });

    // Log email send for compliance
    if (userId && tenantId && category) {
      await EmailPreferencesService.logEmailSend({
        userId,
        tenantId,
        emailAddress: to,
        emailType: template,
        emailCategory: category,
        subject,
      });
    }
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

/**
 * Send plain text email (no template)
 */
export async function sendPlainEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}): Promise<void> {
  try {
    const { to, subject, text, html, from } = options;

    const info = await transporter.sendMail({
      from: from || `"Worldclass ERP" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });

    console.log('✅ Email sent:', {
      messageId: info.messageId,
      to,
      subject,
    });
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

/**
 * Send bulk emails (with rate limiting)
 */
export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    template: string;
    variables: Record<string, string>;
  }>,
  delayMs: number = 100
): Promise<{ sent: number; failed: number; errors: any[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (const email of emails) {
    try {
      await sendEmail(email);
      results.sent++;
      
      // Delay between emails to avoid rate limiting
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        email: email.to,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

export default {
  sendEmail,
  sendPlainEmail,
  sendBulkEmails,
};
