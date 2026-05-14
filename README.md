# NahkriinOS

NahkriinOS is a Windows desktop companion for productivity, reminders, PC utilities, entertainment tracking, Codex workflows, and system monitoring. This repository also includes the VPS-hosted Discord reminder bot that keeps reminders working even when the desktop PC is offline.

## Project Layout

- `src/` - Electron main process, preload bridge, React renderer, shared types, and desktop services.
- `bot/` - VPS Discord reminder bot, SQLite database layer, slash commands, and sync API.
- `scripts/` - release, VPS upload, and VPS bot deployment helpers.
- `BOT_DEPLOYMENT.md` - full Ubuntu VPS setup for the reminder bot.
- `DEPLOYMENT.md` - Windows app download/update hosting docs.

## Prerequisites

- Node.js 22 or newer.
- npm.
- Git.
- Windows for packaging the desktop `.exe`.
- Ubuntu VPS for the always-on Discord reminder bot.

## Local Desktop Setup

```powershell
npm install
npm run dev
```

Production build:

```powershell
npm run build
npm run build:win
```

The Windows installer and portable builds are generated in `release/`.

## Reminder Bot Setup

```bash
cd bot
cp .env.example .env
npm install
npm start
```

Required bot `.env` values:

```bash
DISCORD_BOT_TOKEN=
DISCORD_TARGET_USER_ID=203025242753335296
REMINDER_TIME_ZONE=America/New_York
DATABASE_URL=file:/home/ubuntu/nahkriinos-bot/reminders.sqlite
BOT_API_TOKEN=
BOT_API_PORT=47822
BOT_API_HOST=127.0.0.1
```

Do not commit `.env`. The Discord bot token belongs only on the VPS. The desktop app stores only the VPS backend URL and backend API token.

`REMINDER_TIME_ZONE` controls how Discord natural dates are interpreted and displayed. Use an IANA timezone like `America/New_York`, `America/Chicago`, `America/Denver`, or `America/Los_Angeles`.

## Desktop Reminder Sync

In NahkriinOS Settings, open **Discord Reminder Backend** and set:

- Backend URL: `https://your-domain.example.com/reminders`
- Backend API token: the same value as `BOT_API_TOKEN`
- Target user ID: `203025242753335296`

Reminders created in Discord sync into NahkriinOS. Reminders created in NahkriinOS sync to the VPS bot, which sends the Discord DM when due.

## GitHub Setup

From `E:\Codex\Assistant`:

```powershell
git init
git add .
git commit -m "Initial NahkriinOS and reminder bot setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

If your repo already exists locally, skip `git init`. If `origin` already exists, use:

```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

## VPS Git Pull Deployment

On the VPS:

```bash
sudo apt update
sudo apt install -y git curl build-essential nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git nahkriinos-bot
cd nahkriinos-bot/bot
cp .env.example .env
nano .env
npm install --omit=dev
pm2 start ecosystem.config.cjs --update-env
pm2 save
pm2 startup
```

For future updates:

```bash
cd /home/ubuntu/nahkriinos-bot
git pull --ff-only
cd bot
npm install --omit=dev
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

Or use:

```bash
APP_DIR=/home/ubuntu/nahkriinos-bot bash scripts/vps-update-reminder-bot.sh
```

From your PC, after pushing commits:

```powershell
$env:VPS_HOST="15.204.119.230"
$env:VPS_USER="ubuntu"
$env:VPS_BOT_DIR="/home/ubuntu/nahkriinos-bot"
npm run deploy:bot:vps
```

## Discord Commands

- `/remind add`
- `/remind list`
- `/remind complete`
- `/remind delete`
- `/remind snooze`
- `/remind testdm`

Commands are registered globally and are available in servers, bot DMs, and private/user-install contexts when the Discord application is installed with the right scopes. Commands are still restricted to Discord user ID `203025242753335296`.

If commands do not appear in DMs, open the Discord Developer Portal for the bot application and make sure the app supports user installation. Then install/reinvite with the `applications.commands` scope, plus `bot` for server installs.

## Security Notes

- `.env`, `.env.*`, SQLite databases, build outputs, logs, and local app data are ignored by Git.
- Commit `.env.example`, never `.env`.
- Do not put SSH passwords, Discord tokens, OpenAI keys, or backend API tokens in code or docs.
- Use HTTPS for the public VPS backend before relying on it outside your own network.

## Validation

```powershell
npm run typecheck
npm run build
```

Bot syntax check:

```bash
cd bot
node --check index.mjs
```
