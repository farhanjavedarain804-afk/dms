#!/bin/bash
# ============================================================
# deploy.sh — One-command deploy script for Hostinger SSH
# Run: bash deploy.sh
# ============================================================

set -e

echo "🔄 Pulling latest code from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm install --production=false

echo "🔨 Building the app..."
npm run build

echo "🔁 Restarting Node.js server..."
# Try PM2 first, fallback to Hostinger-specific restart
if command -v pm2 &> /dev/null; then
  pm2 restart ecosystem.config.cjs --update-env 2>/dev/null || pm2 start ecosystem.config.cjs
else
  echo "PM2 not found. Please restart the Node.js app from Hostinger hPanel."
fi

echo "✅ Deploy complete! Your app is running."
