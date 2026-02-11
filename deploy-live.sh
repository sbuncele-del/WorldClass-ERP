#!/bin/bash
# ============================================================
# WorldClass ERP - One-Command Deploy to Production (Vultr)
# Usage: ./deploy-live.sh [backend|frontend|both]
# ============================================================

set -e

SERVER="139.84.243.221"
SERVER_PASS="3X.mJLdbHBpgsLFx"
SSH_CMD="sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no root@$SERVER"
SCP_CMD="sshpass -p '$SERVER_PASS' scp -o StrictHostKeyChecking=no"

DEPLOY_TARGET="${1:-both}"

echo "========================================="
echo "  WorldClass ERP - Production Deploy"
echo "  Target: $DEPLOY_TARGET"
echo "  Server: $SERVER (Vultr)"
echo "========================================="

# Step 1: Commit any uncommitted changes
echo ""
echo "📦 Step 1: Saving code to GitHub..."
cd /workspaces/WorldClass-ERP
if [[ -n $(git status --porcelain) ]]; then
  git add -A
  git commit -m "deploy: auto-commit before deployment $(date +%Y-%m-%d_%H:%M)"
  git push origin main
  echo "✅ Code committed and pushed"
else
  echo "✅ No uncommitted changes"
fi

# Step 2: Build and deploy backend
if [[ "$DEPLOY_TARGET" == "backend" || "$DEPLOY_TARGET" == "both" ]]; then
  echo ""
  echo "🔧 Step 2: Building backend..."
  cd /workspaces/WorldClass-ERP/backend
  npm run build
  echo "✅ Backend built"

  echo "📤 Deploying backend to server..."
  tar czf /tmp/backend-dist.tar.gz dist/
  eval $SCP_CMD /tmp/backend-dist.tar.gz root@$SERVER:/tmp/backend-dist.tar.gz
  eval $SSH_CMD "docker cp /tmp/backend-dist.tar.gz worldclass-backend:/tmp/ && \
    docker exec worldclass-backend sh -c 'cd /app && tar xzf /tmp/backend-dist.tar.gz && rm /tmp/backend-dist.tar.gz' && \
    docker restart worldclass-backend"
  rm /tmp/backend-dist.tar.gz
  echo "✅ Backend deployed and restarted"
fi

# Step 3: Build and deploy frontend
if [[ "$DEPLOY_TARGET" == "frontend" || "$DEPLOY_TARGET" == "both" ]]; then
  echo ""
  echo "🎨 Step 3: Building frontend..."
  cd /workspaces/WorldClass-ERP/frontend
  npm run build
  echo "✅ Frontend built"

  echo "📤 Deploying frontend to server..."
  tar czf /tmp/frontend-dist.tar.gz dist/
  eval $SCP_CMD /tmp/frontend-dist.tar.gz root@$SERVER:/tmp/frontend-dist.tar.gz
  eval $SSH_CMD "cd /var/www/html && rm -rf assets/* && tar xzf /tmp/frontend-dist.tar.gz --strip-components=1 && rm /tmp/frontend-dist.tar.gz"
  rm /tmp/frontend-dist.tar.gz
  echo "✅ Frontend deployed"
fi

# Step 4: Verify
echo ""
echo "🔍 Step 4: Verifying deployment..."
sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://siyabusaerp.co.za/)
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "✅ Frontend: https://siyabusaerp.co.za/ → HTTP $HTTP_CODE"
else
  echo "❌ Frontend: HTTP $HTTP_CODE"
fi

LOGIN_RESULT=$(curl -s -X POST "https://siyabusaerp.co.za/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@worldclass.co.za","password":"admin123"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success','FAIL'))" 2>/dev/null)

if [[ "$LOGIN_RESULT" == "True" ]]; then
  echo "✅ Backend API: Login working"
else
  echo "❌ Backend API: Login failed"
fi

echo ""
echo "========================================="
echo "  Deployment Complete! 🚀"
echo "  URL: https://siyabusaerp.co.za"
echo "========================================="
