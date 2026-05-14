import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const appName = "EclipOS";
const releaseDir = path.join(root, "release");
const publicDir = path.join(releaseDir, "public");
const versionDir = path.join(publicDir, "releases", version);
const latestDir = path.join(publicDir, "releases", "latest");
const baseUrl = (process.env.ECLIPOS_DOWNLOAD_BASE_URL || "https://downloads.example.com").replace(/\/$/, "");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findArtifact(prefix) {
  const entries = await fs.readdir(releaseDir);
  const match = entries.find((entry) => entry.startsWith(`${prefix}-${version}-`) && entry.endsWith(".exe"));
  if (!match) throw new Error(`Could not find ${prefix}-${version}-*.exe in ${releaseDir}. Run npm run dist:win first.`);
  return path.join(releaseDir, match);
}

async function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const handle = await fs.open(filePath, "r");
  try {
    for await (const chunk of handle.createReadStream()) hash.update(chunk);
  } finally {
    await handle.close();
  }
  return hash.digest("hex");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatBytes(value) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

async function releaseNotes() {
  if (process.env.ECLIPOS_RELEASE_NOTES) return process.env.ECLIPOS_RELEASE_NOTES;
  const changelog = path.join(root, "CHANGELOG.md");
  if (await fileExists(changelog)) {
    const raw = await fs.readFile(changelog, "utf8");
    return raw.split(/^##\s+/m)[1]?.trim() || raw.trim();
  }
  return "Latest EclipOS Windows release.";
}

const setupSource = await findArtifact("EclipOS-Setup");
const portableSource = await findArtifact("EclipOS-Portable");
const notes = await releaseNotes();
const publishedAt = new Date().toISOString();

await fs.mkdir(versionDir, { recursive: true });
await fs.mkdir(latestDir, { recursive: true });

const setupVersionedName = `EclipOS-Setup-${version}-x64.exe`;
const portableVersionedName = `EclipOS-Portable-${version}-x64.exe`;
const setupLatestName = "EclipOS-Setup.exe";
const portableLatestName = "EclipOS-Portable.exe";

await fs.copyFile(setupSource, path.join(versionDir, setupVersionedName));
await fs.copyFile(portableSource, path.join(versionDir, portableVersionedName));
await fs.copyFile(setupSource, path.join(latestDir, setupLatestName));
await fs.copyFile(portableSource, path.join(latestDir, portableLatestName));

const setupStat = await fs.stat(path.join(latestDir, setupLatestName));
const portableStat = await fs.stat(path.join(latestDir, portableLatestName));
const setupHash = await sha256(path.join(latestDir, setupLatestName));
const portableHash = await sha256(path.join(latestDir, portableLatestName));

const latest = {
  appName,
  version,
  downloadUrl: `${baseUrl}/download/latest`,
  portableUrl: `${baseUrl}/releases/latest/${portableLatestName}`,
  releaseNotes: notes,
  fileSize: setupStat.size,
  portableFileSize: portableStat.size,
  publishedAt,
  sha256: setupHash,
  portableSha256: portableHash
};

await fs.writeFile(path.join(publicDir, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(versionDir, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`, "utf8");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${appName} Download</title>
  <style>
    :root{color-scheme:dark;--bg:#070b10;--panel:#111821;--text:#eef5f7;--muted:#9fb0bd;--accent:#2dd4bf}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top left,#132531,#070b10 44%);color:var(--text);font-family:Inter,Segoe UI,Arial,sans-serif}
    main{width:min(920px,calc(100% - 32px));margin:0 auto;padding:72px 0}
    h1{font-size:clamp(40px,8vw,76px);line-height:.95;margin:0 0 16px;letter-spacing:0}
    p{color:var(--muted);line-height:1.65;font-size:17px}.card{border:1px solid #233140;background:rgba(17,24,33,.86);border-radius:8px;padding:24px;margin-top:28px;box-shadow:0 24px 90px rgba(0,0,0,.28)}
    .actions{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0}.button{appearance:none;border:0;border-radius:8px;background:var(--accent);color:#03110f;font-weight:800;padding:13px 18px;text-decoration:none}.secondary{background:#1b2632;color:var(--text)}
    dl{display:grid;grid-template-columns:160px 1fr;gap:10px 20px}dt{color:var(--muted)}dd{margin:0}code{color:#90f1df;word-break:break-all}.notes{white-space:pre-wrap}
  </style>
</head>
<body>
  <main>
    <p>${appName} for Windows</p>
    <h1>Download ${appName}</h1>
    <p>A personal desktop companion for reminders, PC health, storage insight, quick tools, and AI-assisted workflows.</p>
    <div class="actions">
      <a class="button" href="/download/latest">Download Windows Installer</a>
      <a class="button secondary" href="/releases/latest/${portableLatestName}">Portable .exe</a>
    </div>
    <section class="card">
      <h2>Latest Release</h2>
      <dl>
        <dt>Version</dt><dd>${escapeHtml(version)}</dd>
        <dt>Installer size</dt><dd>${formatBytes(setupStat.size)}</dd>
        <dt>Portable size</dt><dd>${formatBytes(portableStat.size)}</dd>
        <dt>Last updated</dt><dd>${new Date(publishedAt).toLocaleString()}</dd>
        <dt>SHA256</dt><dd><code>${setupHash}</code></dd>
      </dl>
    </section>
    <section class="card">
      <h2>Release Notes</h2>
      <p class="notes">${escapeHtml(notes)}</p>
    </section>
    <section class="card">
      <h2>Install Instructions</h2>
      <p>Download the installer, double-click it, and follow the prompts. The portable build can be placed anywhere and launched directly.</p>
    </section>
  </main>
</body>
</html>`;

await fs.writeFile(path.join(publicDir, "index.html"), html, "utf8");
console.log(`Prepared ${appName} ${version} release in ${publicDir}`);
console.log(`Update feed: ${path.join(publicDir, "latest.json")}`);
