#!/bin/bash
# Add 2GB swap to prevent OOM during Docker builds
# Run once on the server: bash setup-swap.sh

set -e

if swapon --show | grep -q /swapfile; then
  echo "Swap already active."
  free -h
  exit 0
fi

echo "Creating 2GB swapfile..."
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make permanent
if ! grep -q '/swapfile' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Reduce swap tendency (prefer RAM)
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf

echo "Done. Swap status:"
free -h
swapon --show
