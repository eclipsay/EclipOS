import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "release", "public");
const host = process.env.VPS_HOST;
const user = process.env.VPS_USER || "ubuntu";
const remoteDir = process.env.VPS_RELEASE_DIR || "/var/www/eclipos";
const sshKey = process.env.VPS_SSH_KEY;
const remote = host ? `${user}@${host}` : "";
const publicGlob = `${publicDir.replaceAll("\\", "/")}/*`;

function run(command, args) {
  const shown = `${command} ${args.join(" ")}`;
  console.log(shown);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`${shown} failed with exit code ${result.status}`);
}

if (!host) {
  throw new Error("Set VPS_HOST before deploying, for example: $env:VPS_HOST='203.0.113.10'; npm run deploy:vps");
}

if (!fs.existsSync(publicDir)) {
  throw new Error("release/public does not exist. Run npm run release before npm run deploy:vps.");
}

const sshArgs = sshKey ? ["-i", sshKey] : [];
run("ssh", [...sshArgs, remote, `mkdir -p "${remoteDir}/releases"`]);
run("scp", [...sshArgs, "-r", publicGlob, `${remote}:${remoteDir}/`]);
run("ssh", [...sshArgs, remote, `chmod -R u=rwX,go=rX "${remoteDir}"`]);

console.log(`Deployed EclipOS release assets to ${remote}:${remoteDir}`);
