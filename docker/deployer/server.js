/**
 * WorldClass ERP - Deploy Webhook Server
 *
 * Listens for POST /deploy with the correct secret header.
 * Runs git pull + docker compose up on the host (via mounted Docker socket).
 * This replaces SSH-based deployment — GitHub Actions just calls this HTTPS endpoint.
 */

'use strict';

const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');

const PORT = 9000;
const SECRET = process.env.DEPLOY_SECRET;
const PROJECT_DIR = process.env.PROJECT_DIR || '/project';

if (!SECRET) {
  console.error('FATAL: DEPLOY_SECRET env var is not set');
  process.exit(1);
}

function runDeploy(res) {
  const cmd = [
    `cd ${PROJECT_DIR}`,
    'git pull origin main',
    'docker compose -f docker-compose.digitalocean.yml up -d --build',
    'docker image prune -f',
  ].join(' && ');

  console.log(`[${new Date().toISOString()}] Deploy started`);

  exec(cmd, { timeout: 20 * 60 * 1000 }, (err, stdout, stderr) => {
    if (err) {
      console.error(`[${new Date().toISOString()}] Deploy FAILED:`, stderr || err.message);
    } else {
      console.log(`[${new Date().toISOString()}] Deploy SUCCEEDED`);
      if (stdout) console.log(stdout.slice(-2000)); // last 2000 chars
    }
  });
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'deployer' }));
    return;
  }

  // Deploy trigger
  if (req.method === 'POST' && req.url === '/deploy') {
    const providedSecret = req.headers['x-deploy-secret'];

    // Constant-time comparison to prevent timing attacks
    if (!providedSecret || !crypto.timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(SECRET),
    )) {
      console.warn(`[${new Date().toISOString()}] Unauthorized deploy attempt`);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Respond immediately, run deploy in background
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'deploy started' }));

    runDeploy(res);
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Deploy webhook server listening on :${PORT}`);
});
