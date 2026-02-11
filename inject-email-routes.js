/**
 * Email API Injection Patch
 * This patches the running Express app to add email IMAP/SMTP routes.
 * Run: docker exec worldclass-backend node /tmp/inject-email-routes.js
 */
const fs = require('fs');
const path = require('path');

// Read current index.js
const indexPath = '/app/dist/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

// Check if already patched
if (content.includes('email-api-handler')) {
  console.log('[Email Patch] Already patched. Skipping.');
  process.exit(0);
}

// We need to inject our email routes BEFORE the error handler
// Find the line: app.use(errorHandler_1.errorHandler);
const errorHandlerLine = "app.use(errorHandler_1.errorHandler);";
const injectionPoint = content.indexOf(errorHandlerLine);

if (injectionPoint === -1) {
  console.error('[Email Patch] Could not find error handler line in index.js');
  process.exit(1);
}

// The injection code - register email routes on the app directly
const injectionCode = `
// ============================================
// EMAIL IMAP/SMTP INTEGRATION (Injected Patch)
// ============================================
try {
  const { registerEmailRoutes } = require('./email-api-handler');
  const { pool: emailPool } = require('./config/database');
  registerEmailRoutes(app, emailPool);
  console.log('[Email API] ✅ Email IMAP/SMTP routes injected successfully');
} catch (emailErr) {
  console.error('[Email API] ❌ Failed to inject email routes:', emailErr.message);
}

`;

// Insert before error handler
content = content.slice(0, injectionPoint) + injectionCode + content.slice(injectionPoint);

// Write back
fs.writeFileSync(indexPath, content);
console.log('[Email Patch] ✅ Successfully patched index.js with email routes');
console.log('[Email Patch] Restart the container to apply changes');
