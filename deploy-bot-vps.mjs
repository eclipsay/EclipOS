{
  "name": "nahkriinos-reminder-bot",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "NahkriinOS VPS-hosted Discord reminder bot and sync API",
  "main": "index.mjs",
  "scripts": {
    "start": "node index.mjs",
    "dev": "node --watch index.mjs"
  },
  "dependencies": {
    "better-sqlite3": "^12.4.1",
    "chrono-node": "^2.9.0",
    "discord.js": "^14.24.2",
    "dotenv": "^17.2.3"
  }
}
