#!/usr/bin/env bash

# ==============================================================================
# ARAADHYA FASHION - 1-CLICK HOSTINGER AUTOMATED DEPLOYMENT SCRIPT
# ==============================================================================

set -e

echo "👑 Starting Araadhya Fashion 24/7 Cloud Deployment on Hostinger..."

# 1. Update system packages & install Node.js 20 if needed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js Version: $(node -v)"
echo "✅ NPM Version: $(npm -v)"

# 2. Install PM2 process manager globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 Global Process Manager..."
    sudo npm install -g pm2
fi

# 3. Install dependencies & Build
echo "🔨 Installing project dependencies..."
npm install --production=false

echo "🔨 Building TypeScript Production Distribution..."
npm run build

# 4. Start / Restart with PM2 Cluster Mode
echo "🚀 Starting 24/7 Cluster Daemon with PM2..."
pm2 start ecosystem.config.js || pm2 restart ecosystem.config.js
pm2 save

echo ""
echo "=============================================================================="
echo "🎉 ARAADHYA FASHION CLOUD SERVER IS NOW LIVE 24/7!"
echo "=============================================================================="
echo "⚡ PM2 Status:"
pm2 status
echo ""
echo "🔗 Webhook Endpoint for Meta:"
SERVER_IP=$(curl -s ifconfig.me || echo "YOUR_SERVER_IP")
echo "👉 http://${SERVER_IP}:3000/webhooks/meta"
echo "=============================================================================="
