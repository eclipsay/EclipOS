#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/nahkriinos-bot}"
BOT_DIR="$APP_DIR/bot"
PM2_NAME="${PM2_NAME:-nahkriinos-reminder-bot}"

cd "$APP_DIR"
git pull --ff-only

cd "$BOT_DIR"
npm install --omit=dev

if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save
  pm2 status "$PM2_NAME"
else
  sudo systemctl restart nahkriinos-reminder-bot
  sudo systemctl status nahkriinos-reminder-bot --no-pager
fi
