#!/bin/bash
# ============================================================
# WorldClass ERP - DigitalOcean Server Setup Script
# Run this ONCE on the new Droplet (46.101.244.145)
# ============================================================
set -e

echo "============================================"
echo "  WorldClass ERP - Server Setup"
echo "============================================"

# Update system
apt-get update -y && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
apt-get install -y docker-compose-plugin

# Install Git, curl, certbot
apt-get install -y git curl certbot

# Create app directory
mkdir -p /opt/worldclass-erp
cd /opt/worldclass-erp

# Clone the repo
git clone https://github.com/sbuncele-del/WorldClass-ERP.git .

echo ""
echo "============================================"
echo "  Setup complete! Next steps:"
echo "  1. cd /opt/worldclass-erp"
echo "  2. Run: bash deploy-digitalocean.sh"
echo "============================================"
