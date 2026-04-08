#!/bin/bash
# ============================================================
# WorldClass ERP - SSL Certificate Setup
# Run this ONCE after DNS is pointed to the server
# ============================================================
set -e

DOMAINS="-d siyabusaerp.co.za -d www.siyabusaerp.co.za -d platform.siyabusaerp.co.za -d accountant.siyabusaerp.co.za"
EMAIL="waltz_lime_0b@icloud.com"
SERVER_IP="46.101.244.145"

echo "============================================"
echo "  SSL Certificate Setup"
echo "============================================"

# Check DNS first
echo "Checking DNS..."
for domain in siyabusaerp.co.za platform.siyabusaerp.co.za accountant.siyabusaerp.co.za; do
    RESOLVED=$(dig +short $domain 2>/dev/null | head -1)
    if [ "$RESOLVED" = "$SERVER_IP" ]; then
        echo "  ✅ $domain → $RESOLVED"
    else
        echo "  ❌ $domain → $RESOLVED (expected $SERVER_IP)"
        echo "  DNS not ready yet. Update your A records and try again."
        echo "  It can take 1-24 hours for DNS to propagate."
        exit 1
    fi
done

echo ""
echo "All DNS records verified! Getting SSL certificates..."

# Stop nginx temporarily so certbot can bind to port 80
cd /opt/worldclass-erp
docker compose -f docker-compose.digitalocean.yml stop nginx

# Get certificate
docker run --rm \
    -v /opt/worldclass-erp/docker/nginx/ssl:/etc/letsencrypt \
    -v /opt/worldclass-erp/docker/nginx/certbot:/var/www/certbot \
    -p 80:80 \
    certbot/certbot certonly --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $DOMAINS

echo ""
echo "✅ SSL certificates obtained!"
echo ""

# Now update nginx config to enable HTTPS
cat > /opt/worldclass-erp/docker/nginx/nginx.digitalocean.conf << 'NGINXCONFIG'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    server_tokens off;
    client_max_body_size 50M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    upstream backend {
        server backend:3000;
        keepalive 32;
    }

    upstream frontend {
        server frontend:80;
    }

    # HTTP → HTTPS redirect
    server {
        listen 80;
        listen [::]:80;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # ============================================
    # siyabusaerp.co.za — Main App (landing + ERP)
    # ============================================
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name siyabusaerp.co.za www.siyabusaerp.co.za;

        ssl_certificate /etc/letsencrypt/live/siyabusaerp.co.za/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/siyabusaerp.co.za/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 90s;
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
        }
    }

    # ============================================
    # platform.siyabusaerp.co.za — Super Admin
    # ============================================
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name platform.siyabusaerp.co.za;

        ssl_certificate /etc/letsencrypt/live/siyabusaerp.co.za/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/siyabusaerp.co.za/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 90s;
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
        }
    }

    # ============================================
    # accountant.siyabusaerp.co.za — Accountant Portal
    # ============================================
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name accountant.siyabusaerp.co.za;

        ssl_certificate /etc/letsencrypt/live/siyabusaerp.co.za/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/siyabusaerp.co.za/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 90s;
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
        }
    }
}
NGINXCONFIG

# Restart everything
docker compose -f docker-compose.digitalocean.yml restart nginx

echo ""
echo "============================================"
echo "  ✅ SSL Setup Complete!"
echo "  https://siyabusaerp.co.za"
echo "  https://platform.siyabusaerp.co.za"
echo "  https://accountant.siyabusaerp.co.za"
echo "============================================"
