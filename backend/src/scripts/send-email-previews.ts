/**
 * Send all waitlist/drip email previews to Ncele for review
 * Run: npx ts-node src/scripts/send-email-previews.ts
 */
import fs from 'fs';
import path from 'path';

const RESEND_API_KEY = 're_AvXVms4E_KJ4akWJJWTzeiv1ZLviBByxu';
const TO = 'sbuncele@gmail.com';
const FROM = '"SiyaBusa ERP" <noreply@siyabusaerp.co.za>';

interface EmailPreview {
  template: string;
  subject: string;
  variables: Record<string, string>;
}

const PREVIEWS: EmailPreview[] = [
  {
    template: 'waitlist-welcome',
    subject: '[PREVIEW 1/4] Waitlist Welcome Email',
    variables: { name: 'Ncele' },
  },
  {
    template: 'drip-day3-features',
    subject: '[PREVIEW 2/4] Day 3 — Feature Deep-Dive',
    variables: { name: 'Ncele' },
  },
  {
    template: 'drip-day7-demo',
    subject: '[PREVIEW 3/4] Day 7 — Demo Invitation',
    variables: { name: 'Ncele' },
  },
  {
    template: 'drip-day14-urgency',
    subject: '[PREVIEW 4/4] Day 14 — Urgency / Testimonials',
    variables: { name: 'Ncele' },
  },
];

function loadTemplate(templateName: string, variables: Record<string, string>): string {
  const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Replace {{variable}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return html;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`  ✅ Sent: ${subject} → ${to} (ID: ${data.id})`);
    return true;
  } else {
    console.error(`  ❌ Failed: ${subject}`, data);
    return false;
  }
}

async function main() {
  console.log(`\n📧 Sending ${PREVIEWS.length} email previews to ${TO}...\n`);

  let success = 0;
  for (const preview of PREVIEWS) {
    try {
      const html = loadTemplate(preview.template, preview.variables);
      const sent = await sendViaResend(TO, preview.subject, html);
      if (sent) success++;
      // Small delay between sends to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ❌ Error with ${preview.template}:`, (err as Error).message);
    }
  }

  console.log(`\n✅ Done — ${success}/${PREVIEWS.length} emails sent to ${TO}`);
  process.exit(0);
}

main().catch(console.error);
