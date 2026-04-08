#!/bin/bash
# ============================================================
# WorldClass ERP - DigitalOcean Deploy Script
# Run this from /opt/worldclass-erp on the Droplet
# ============================================================
set -e

DOMAIN="platform.siyabusaerp.co.za"
EMAIL="waltz_lime_0b@icloud.com"
SERVER_IP="46.101.244.145"

echo "============================================"
echo "  WorldClass ERP - DigitalOcean Deploy"
echo "============================================"

cd /opt/worldclass-erp

# Pull latest code
git pull origin main

# Create required directories
mkdir -p docker/nginx/ssl
mkdir -p docker/nginx/certbot

# Step 1: Start with HTTP-only nginx to get SSL cert
echo "--- Starting HTTP nginx for SSL certificate ---"
docker compose -f docker-compose.digitalocean.yml up -d nginx redis

# Check if domain DNS points to this server
RESOLVED_IP=$(dig +short $DOMAIN 2>/dev/null || echo "")
if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
    echo "--- DNS verified. Obtaining SSL certificate ---"
    docker run --rm \
        -v /opt/worldclass-erp/docker/nginx/ssl:/etc/letsencrypt \
        -v /opt/worldclass-erp/docker/nginx/certbot:/var/www/certbot \
        -p 80:80 \
        certbot/certbot certonly --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN
    echo "SSL certificate obtained!"
else
    echo "--- WARNING: DNS not pointing to this server yet ---"
    echo "--- Domain $DOMAIN resolves to: $RESOLVED_IP ---"
    echo "--- Point your DNS A record to: $SERVER_IP ---"
    echo "--- Continuing with HTTP only for now ---"
fi

# Step 2: Build and start all services
echo "--- Building and starting all services ---"
docker compose -f docker-compose.digitalocean.yml up -d --build

echo ""
echo "============================================"
echo "  Deployment complete!"
echo "  Server IP: $SERVER_IP"
echo "  Access (HTTP): http://$SERVER_IP"
echo "  Access (HTTPS): https://$DOMAIN (after DNS)"
echo "============================================"

# Show running containers
docker ps
