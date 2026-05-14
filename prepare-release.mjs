import { spawnSync } from "node:child_process";

const host = process.env.VPS_HOST;
const user = process.env.VPS_USER || "ubuntu";
const dir = process.env.VPS_BOT_DIR || "/home/ubuntu/nahkriinos-bot";
const service = process.env.VPS_BOT_PM2_NAME || "nahkriinos-reminder-bot";
const key = process.env.VPS_SSH_KEY;

if (!host) {
  console.error("Set VPS_HOST first, for example: set VPS_HOST=15.204.119.230");
  process.exit(1);
}

function run(command, args, options = {}) {
  const shown = [command, ...args].join(" ");
  console.log(shown);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) throw new Error(`${shown} failed with exit code ${result.status}`);
}

const sshArgs = [];
if (key) sshArgs.push("-i", key);
sshArgs.push(`${user}@${host}`);

const remote = [
  "set -e",
  `cd '${dir.replaceAll("'", "'\\''")}'`,
  "git pull",
  "cd bot",
  "npm install --omit=dev",
  "if command -v pm2 >/dev/null 2>&1; then pm2 startOrReload ecosystem.config.cjs --update-env; pm2 save; else echo 'PM2 is not installed. Install it with: sudo npm install -g pm2'; exit 1; fi"
].join(" && ");

run("ssh", [...sshArgs, remote]);
console.log(`Restarted ${service} on ${host}.`);
