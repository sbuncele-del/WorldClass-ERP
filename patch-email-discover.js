/**
 * Patch script to inject email API routes into the running Express app
 * Run inside Docker container: node /tmp/patch-email-api.js
 */

const fs = require('fs');
const path = require('path');

// Write the email handler module
const emailHandlerCode = fs.readFileSync('/tmp/email-api-handler.js', 'utf8');
const handlerPath = '/app/dist/email-api-handler.js';
fs.writeFileSync(handlerPath, emailHandlerCode);
console.log('[Patch] Written email-api-handler.js to', handlerPath);

// Now patch the main server file to load our email routes
// Find the main app entry point
const possibleEntries = [
  '/app/dist/server.js',
  '/app/dist/index.js', 
  '/app/dist/app.js',
  '/app/dist/main.js'
];

let mainFile = null;
for (const f of possibleEntries) {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('express') || content.includes('app.listen') || content.includes('createServer')) {
      mainFile = f;
      break;
    }
  }
}

if (!mainFile) {
  // Search for the file that has app.listen
  const distDir = '/app/dist';
  const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(distDir, f), 'utf8');
    if (content.includes('app.listen') || content.includes('.listen(')) {
      mainFile = path.join(distDir, f);
      break;
    }
  }
}

console.log('[Patch] Main entry file:', mainFile);

// List the dist directory structure to understand the app
console.log('\n[Patch] /app/dist/ contents:');
const distFiles = fs.readdirSync('/app/dist');
distFiles.forEach(f => console.log('  ', f));

// Check for routes directory
if (fs.existsSync('/app/dist/routes')) {
  console.log('\n[Patch] /app/dist/routes/ contents:');
  fs.readdirSync('/app/dist/routes').forEach(f => console.log('  ', f));
}

// Check for middleware
if (fs.existsSync('/app/dist/middleware')) {
  console.log('\n[Patch] /app/dist/middleware/ contents:');
  fs.readdirSync('/app/dist/middleware').forEach(f => console.log('  ', f));
}

// Find the pool/database connection
const findPoolImport = () => {
  const candidates = [
    '/app/dist/config/database.js',
    '/app/dist/db.js',
    '/app/dist/database.js',
    '/app/dist/config/db.js',
    '/app/dist/utils/db.js'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Search
  const search = (dir) => {
    if (!fs.existsSync(dir)) return null;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        const found = search(full);
        if (found) return found;
      } else if (item.match(/db|database|pool/i) && item.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('Pool') || content.includes('pg') || content.includes('postgres')) {
          return full;
        }
      }
    }
    return null;
  };
  return search('/app/dist');
};

const poolFile = findPoolImport();
console.log('[Patch] Pool/DB file:', poolFile);

if (mainFile) {
  console.log('\n[Patch] First 50 lines of main file:');
  const lines = fs.readFileSync(mainFile, 'utf8').split('\n').slice(0, 50);
  lines.forEach((l, i) => console.log(`${i+1}: ${l}`));
}
