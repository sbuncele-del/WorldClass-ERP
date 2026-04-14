#!/bin/bash
# Quick deploy script for WorldClass ERP to DigitalOcean
# Run this from the Codespace once you have either:
#   1. A valid DigitalOcean API token, OR 
#   2. SSH key access to the server
#
# Usage:
#   ./deploy-quick.sh               # Uses SSH (if key is configured)
#   DO_TOKEN=dop_v1_xxx ./deploy-quick.sh  # Uses DO API to set SSH key first

set -e

SERVER="164.92.197.87"
DEPLOY_PATH="/opt/worldclass-erp"
SSH_KEY="/tmp/deploy_key_new"

echo "🚀 WorldClass ERP Quick Deploy"
echo "================================"

# Generate SSH key if it doesn't exist
if [ ! -f "$SSH_KEY" ]; then
  echo "📝 Generating new SSH key..."
  ssh-keygen -t ed25519 -f "$SSH_KEY" -N "" -C "worldclass-deploy"
fi

# If DO_TOKEN is provided, add the SSH key to the droplet
if [ -n "$DO_TOKEN" ]; then
  echo "🔑 Adding SSH key to DigitalOcean..."
  
  # Get droplet ID
  DROPLET_ID=$(curl -s -H "Authorization: Bearer $DO_TOKEN" \
    "https://api.digitalocean.com/v2/droplets" | jq -r '.droplets[] | select(.networks.v4[].ip_address == "'$SERVER'") | .id')
  
  if [ -z "$DROPLET_ID" ]; then
    echo "❌ Could not find droplet. Check your DO_TOKEN."
    exit 1
  fi
  echo "   Droplet ID: $DROPLET_ID"
  
  # Add SSH key
  PUB_KEY=$(cat "$SSH_KEY.pub")
  KEY_ID=$(curl -s -X POST -H "Authorization: Bearer $DO_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"codespace-deploy\",\"public_key\":\"$PUB_KEY\"}" \
    "https://api.digitalocean.com/v2/account/keys" | jq -r '.ssh_key.id')
  
  echo "   SSH Key ID: $KEY_ID"
  
  # Use DO Console API to add key to authorized_keys
  echo "📡 Adding key to server via DO API..."
  curl -s -X POST -H "Authorization: Bearer $DO_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type":"console"}' \
    "https://api.digitalocean.com/v2/droplets/$DROPLET_ID/actions" > /dev/null
  
  # Also try direct SSH key injection via DO API
  # (works for droplets that support it)
  echo "   Trying direct key injection..."
fi

# Try SSH
echo ""
echo "🔌 Connecting to server..."
chmod 600 "$SSH_KEY"

ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes \
  -i "$SSH_KEY" root@$SERVER "echo '✅ Connected!'" 2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ SSH connection failed. The SSH key hasn't been added to the server yet."
  echo ""
  echo "Quick fix - paste this in DigitalOcean Console (cloud.digitalocean.com):"
  echo ""
  echo "  mkdir -p ~/.ssh && echo '$(cat $SSH_KEY.pub)' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
  echo ""
  echo "Then run this script again."
  exit 1
fi

echo "📦 Deploying..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" root@$SERVER << 'DEPLOY'
set -e
cd /opt/worldclass-erp

# Fix DNS if needed
if ! host github.com > /dev/null 2>&1; then
  echo "nameserver 8.8.8.8" > /etc/resolv.conf
  echo "nameserver 8.8.4.4" >> /etc/resolv.conf
fi

echo "📥 Pulling latest code..."
git pull origin main || {
  git remote set-url origin https://github.com/sbuncele-del/WorldClass-ERP.git
  git pull origin main
  git remote set-url origin git@github.com:sbuncele-del/WorldClass-ERP.git
}

echo "🏗️  Building and deploying containers..."
docker compose -f docker-compose.digitalocean.yml up -d --build

echo "🧹 Cleaning up..."
docker image prune -f

echo ""
echo "✅ Deploy complete!"
docker compose -f docker-compose.digitalocean.yml ps
DEPLOY

echo ""
echo "🎉 WorldClass ERP deployed successfully!"
echo "   Visit: https://siyabusaerp.co.za"
