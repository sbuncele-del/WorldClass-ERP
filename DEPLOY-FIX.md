# Deploy Fix — SSH Key Recovery

## Problem
GitHub Actions deploy fails because the SSH key in the `DEPLOY_SSH_KEY` secret doesn't match the server's `authorized_keys`.

## Fix (2 Steps)

### Step 1: Add SSH Key to Server
1. Go to https://cloud.digitalocean.com/droplets
2. Click on the droplet (164.92.197.87)
3. Click **Console** (or **Access** tab → **Launch Droplet Console**)
4. Paste this ONE command:

```bash
mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILBUvG6eX3dZDrXAtNWr2aBqUibf71J/7Ox01GA4lyw/ github-actions-deploy" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "SSH key added!" && cd /opt/worldclass-erp && git pull origin main && docker compose -f docker-compose.digitalocean.yml up -d --build && echo "DEPLOY COMPLETE"
```

This adds the deploy SSH key AND immediately deploys the latest code.

### Step 2: Update GitHub Secret
1. Go to https://github.com/sbuncele-del/WorldClass-ERP/settings/secrets/actions
2. Edit `DEPLOY_SSH_KEY` and replace with this EXACT content:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCwVLxunl93WQ61wLTVq9mgalIm3+9Sf+zsdNRgOJcsPwAAAJjRTNKy0UzS
sgAAAAtzc2gtZWQyNTUxOQAAACCwVLxunl93WQ61wLTVq9mgalIm3+9Sf+zsdNRgOJcsPw
AAAEDjMVJJaTCcSXrgeKeC+QPfJEgyqaazCm8/LZpzh1xnerBUvG6eX3dZDrXAtNWr2aBq
Uibf71J/7Ox01GA4lyw/AAAAFWdpdGh1Yi1hY3Rpb25zLWRlcGxveQ==
-----END OPENSSH PRIVATE KEY-----
```

3. After saving, go to **Actions** tab and click **Run workflow** on "Deploy to DigitalOcean" to verify it works.

## After Fix
All future `git push origin main` will auto-deploy via GitHub Actions.
