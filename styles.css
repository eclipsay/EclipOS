import { app, shell } from "electron";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Worker } from "node:worker_threads";
import type { DiskBenchmarkResult, LightSystemSnapshot, MetricPoint, ProcessInfo, StartupEntry, StorageAnalysis, StorageEntry, StorageScanItem, StorageScanOptions, StorageScanResult, StorageScanStatus, StorageScanTarget, StorageTypeBreakdown, StressTestOptions, StressTestResult, StressTestSession, SystemSnapshot, SystemSnapshotOptions, SystemStats } from "../../shared/types.js";

const execFileAsync = promisify(execFile);
let lastCpu = os.cpus();
let lastNetwork: { at: number; rx: number; tx: number } | null = null;
let cachedSpecs: SystemSnapshot["specs"] | null = null;
let activeStorageScan: { cancelled: boolean; paused: boolean; result: StorageScanResult } | null = null;
let activeStress: { stop: () => void; session: StressTestSession } | null = null;
let cachedCpuExtra: Awaited<ReturnType<typeof cpuExtras>> | null = null;
let cachedCpuExtraAt = 0;
let cachedGpu: Awaited<ReturnType<typeof gpuStats>> | null = null;
let cachedGpuAt = 0;
let cachedRamSpeed: number | null = null;
let cachedRamSpeedAt = 0;
let cachedDisks: Awaited<ReturnType<typeof diskStats>> | null = null;
let cachedDisksAt = 0;
let cachedNetwork: Awaited<ReturnType<typeof networkStats>> | null = null;
let cachedNetworkAt = 0;
let cachedBattery: Awaited<ReturnType<typeof batteryStats>> | null = null;
let cachedBatteryAt = 0;
let cachedProcesses: ProcessInfo[] | null = null;
let cachedProcessesAt = 0;
let cachedStartup: StartupEntry[] | null = null;
let cachedStartupAt = 0;
let cachedHistory: MetricPoint[] = [];
let cachedHistoryAt = 0;
let cachedLightSnapshot: LightSystemSnapshot | null = null;
let cachedLightSnapshotAt = 0;
let cachedFullSnapshot: SystemSnapshot | null = null;
let cachedFullSnapshotAt = 0;

function emptySpecs(): SystemSnapshot["specs"] {
  return { os: `${os.type()} ${os.release()}`, bios: "Unavailable", motherboard: "Unavailable", cpu: os.cpus()[0]?.model ?? "Unavailable", gpu: "Unavailable", ram: `${Math.round(os.totalmem() / 1024 ** 3)} GB`, storage: [], monitors: [], audio: [], network: [] };
}

function cpuUsage() {
  const current = os.cpus();
  const perCore = current.map((cpu, index) => {
    const prev = lastCpu[index]?.times ?? cpu.times;
    const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0) - Object.values(prev).reduce((sum, value) => sum + value, 0);
    const idle = cpu.times.idle - prev.idle;
    return total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((1 - idle / total) * 100)));
  });
  lastCpu = current;
  const usage = perCore.length ? Math.round(perCore.reduce((sum, value) => sum + value, 0) / perCore.length) : 0;
  return { usage, perCore };
}

async function powershellJson<T>(script: string, fallback: T): Promise<T> {
  if (process.platform !== "win32") return fallback;
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { maxBuffer: 1024 * 1024 * 8 });
    const trimmed = stdout.trim();
    return trimmed ? JSON.parse(trimmed) as T : fallback;
  } catch {
    return fallback;
  }
}

function asRows<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function cached<T>(ageMs: number, current: T | null, currentAt: number, load: () => Promise<T>): Promise<{ value: T; at: number }> {
  const now = Date.now();
  if (current && now - currentAt < ageMs) return { value: current, at: currentAt };
  return { value: await load(), at: now };
}

async function cachedCpuExtras(ageMs = 10_000) {
  const next = await cached(ageMs, cachedCpuExtra, cachedCpuExtraAt, cpuExtras);
  cachedCpuExtra = next.value;
  cachedCpuExtraAt = next.at;
  return next.value;
}

async function cachedGpuStats(ageMs = 5_000) {
  const next = await cached(ageMs, cachedGpu, cachedGpuAt, gpuStats);
  cachedGpu = next.value;
  cachedGpuAt = next.at;
  return next.value;
}

async function cachedRamSpeedStats(ageMs = 60_000) {
  const next = await cached(ageMs, cachedRamSpeed, cachedRamSpeedAt, ramSpeed);
  cachedRamSpeed = next.value;
  cachedRamSpeedAt = next.at;
  return next.value;
}

async function cachedDiskStats(ageMs = 5_000) {
  const next = await cached(ageMs, cachedDisks, cachedDisksAt, diskStats);
  cachedDisks = next.value;
  cachedDisksAt = next.at;
  return next.value;
}

async function cachedNetworkStats(ageMs = 2_000) {
  const next = await cached(ageMs, cachedNetwork, cachedNetworkAt, networkStats);
  cachedNetwork = next.value;
  cachedNetworkAt = next.at;
  return next.value;
}

async function cachedBatteryStats(ageMs = 30_000) {
  const next = await cached(ageMs, cachedBattery, cachedBatteryAt, batteryStats);
  cachedBattery = next.value;
  cachedBatteryAt = next.at;
  return next.value;
}

async function cachedProcessList(ageMs = 5_000) {
  const next = await cached(ageMs, cachedProcesses, cachedProcessesAt, processList);
  cachedProcesses = next.value;
  cachedProcessesAt = next.at;
  return next.value;
}

async function cachedStartupEntries(ageMs = 60_000) {
  const next = await cached(ageMs, cachedStartup, cachedStartupAt, startupEntries);
  cachedStartup = next.value;
  cachedStartupAt = next.at;
  return next.value;
}

async function cpuExtras() {
  const rows = await powershellJson<any[]>(
    "Get-CimInstance Win32_Processor | Select-Object -First 1 Name,MaxClockSpeed,CurrentClockSpeed | ConvertTo-Json -Compress",
    []
  );
  const row = asRows(rows)[0] ?? {};
  const tempRows = await powershellJson<any[]>(
    "Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace root/wmi -ErrorAction SilentlyContinue | Select-Object -First 1 CurrentTemperature | ConvertTo-Json -Compress",
    []
  );
  const rawTemp = Number(asRows(tempRows)[0]?.CurrentTemperature || 0);
  const temperature = rawTemp > 0 ? Math.round((rawTemp / 10 - 273.15) * 10) / 10 : null;
  return {
    model: row.Name || os.cpus()[0]?.model || "Unknown CPU",
    clockMHz: Number(row.CurrentClockSpeed || row.MaxClockSpeed || 0) || null,
    temperature,
    voltage: null
  };
}

async function gpuStats() {
  try {
    const { stdout } = await execFileAsync("nvidia-smi", ["--query-gpu=name,utilization.gpu,temperature.gpu,memory.used,memory.total,power.draw", "--format=csv,noheader,nounits"], { timeout: 2500 });
    const [name, usage, temperature, vramUsed, vramTotal, powerDraw] = stdout.trim().split(",").map((item) => item.trim());
    return { model: name || "NVIDIA GPU", usage: Number(usage), temperature: Number(temperature), vramUsed: Number(vramUsed) * 1024 ** 2, vramTotal: Number(vramTotal) * 1024 ** 2, powerDraw: Number(powerDraw) || null };
  } catch {
    const rows = await powershellJson<any[]>("Get-CimInstance Win32_VideoController | Select-Object -First 2 Name,AdapterRAM | ConvertTo-Json -Compress", []);
    const row = asRows(rows)[0];
    return { model: row?.Name || "Unavailable", usage: null, temperature: null, vramUsed: null, vramTotal: Number(row?.AdapterRAM || 0) || null, powerDraw: null };
  }
}

async function ramSpeed() {
  const row = await powershellJson<any>("Get-CimInstance Win32_PhysicalMemory | Measure-Object Speed -Maximum | Select-Object Maximum | ConvertTo-Json -Compress", {});
  return Number(row?.Maximum || 0) || null;
}

async function diskStats() {
  const rows = await powershellJson<any[]>(
    "Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -in 2,3,4 } | Select-Object DeviceID,VolumeName,Size,FreeSpace,DriveType | ConvertTo-Json -Compress",
    []
  );
  const counter = await powershellJson<any[]>(
    "Get-Counter '\\PhysicalDisk(_Total)\\Disk Read Bytes/sec','\\PhysicalDisk(_Total)\\Disk Write Bytes/sec' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty CounterSamples | Select-Object Path,CookedValue | ConvertTo-Json -Compress",
    []
  );
  const read = asRows(counter).find((row) => String(row.Path).toLowerCase().includes("read"))?.CookedValue ?? 0;
  const write = asRows(counter).find((row) => String(row.Path).toLowerCase().includes("write"))?.CookedValue ?? 0;
  return asRows(rows).map((row) => ({
    name: String(row.DeviceID || ""),
    label: row.VolumeName || "Local disk",
    total: Number(row.Size || 0),
    used: Number(row.Size || 0) - Number(row.FreeSpace || 0),
    temperature: null,
    readBps: Number(read || 0),
    writeBps: Number(write || 0)
  }));
}

async function networkStats() {
  const adapters = Object.entries(os.networkInterfaces())
    .flatMap(([name, rows]) => (rows ?? []).map((row) => ({ name, address: row.address, family: row.family })))
    .filter((row) => !row.address.includes("::1") && row.address !== "127.0.0.1");
  const rows = await powershellJson<any[]>("Get-NetAdapterStatistics -ErrorAction SilentlyContinue | Select-Object Name,ReceivedBytes,SentBytes | ConvertTo-Json -Compress", []);
  const totals = asRows(rows).reduce((sum, row) => ({ rx: sum.rx + Number(row.ReceivedBytes || 0), tx: sum.tx + Number(row.SentBytes || 0) }), { rx: 0, tx: 0 });
  const now = Date.now();
  const seconds = lastNetwork ? Math.max(1, (now - lastNetwork.at) / 1000) : 1;
  const rxBps = lastNetwork ? Math.max(0, (totals.rx - lastNetwork.rx) / seconds) : 0;
  const txBps = lastNetwork ? Math.max(0, (totals.tx - lastNetwork.tx) / seconds) : 0;
  lastNetwork = { at: now, ...totals };
  return { adapters, rxBps, txBps, externalIp: "Unavailable", latencyMs: null };
}

async function batteryStats() {
  const row = asRows(await powershellJson<any[]>("Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1 EstimatedChargeRemaining,BatteryStatus | ConvertTo-Json -Compress", []))[0];
  return { percent: row ? Number(row.EstimatedChargeRemaining || 0) : null, status: row ? (Number(row.BatteryStatus) === 2 ? "Charging" : "On battery") : "No battery detected" };
}

async function processList(): Promise<ProcessInfo[]> {
  const rows = await powershellJson<any[]>(
    "Get-CimInstance Win32_Process | Select-Object ProcessId,Name,ExecutablePath,CommandLine,WorkingSetSize | Sort-Object WorkingSetSize -Descending | Select-Object -First 80 | ConvertTo-Json -Compress",
    []
  );
  return asRows(rows).map((row) => {
    const memory = Number(row.WorkingSetSize || 0);
    const heavy = memory > 1024 ** 3;
    return {
      pid: Number(row.ProcessId),
      name: row.Name || "Unknown",
      cpu: 0,
      memory,
      path: row.ExecutablePath || "",
      commandLine: row.CommandLine || "",
      heavy,
      safeHint: heavy ? "High memory use. Close only if you recognize it." : "Usually safe to leave running unless you know this app is stuck."
    };
  });
}

async function startupEntries(): Promise<StartupEntry[]> {
  const script = `
    $items = @()
    foreach ($p in @('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run')) {
      if (Test-Path $p) {
        $props = Get-ItemProperty $p
        foreach ($name in $props.PSObject.Properties.Name) {
          if ($name -notmatch '^PS') { $items += [pscustomobject]@{ Name=$name; Command=$props.$name; Source=$p; Enabled=$true } }
        }
      }
    }
    $items | ConvertTo-Json -Compress
  `;
  return asRows(await powershellJson<any[]>(script, [])).map((row) => ({
    id: `${row.Source}:${row.Name}`,
    name: row.Name,
    command: String(row.Command || ""),
    source: String(row.Source || ""),
    enabled: !!row.Enabled,
    impact: String(row.Command || "").length > 160 ? "medium" : "low",
    canToggle: false
  }));
}

async function hardwareSpecs(): Promise<SystemSnapshot["specs"]> {
  if (cachedSpecs) return cachedSpecs;
  const script = `
    [pscustomobject]@{
      Os = (Get-CimInstance Win32_OperatingSystem).Caption + ' ' + (Get-CimInstance Win32_OperatingSystem).Version
      Bios = (Get-CimInstance Win32_BIOS | Select-Object -First 1 -ExpandProperty SMBIOSBIOSVersion)
      Motherboard = ((Get-CimInstance Win32_BaseBoard | Select-Object -First 1).Manufacturer + ' ' + (Get-CimInstance Win32_BaseBoard | Select-Object -First 1).Product)
      Cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)
      Gpu = ((Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ', ')
      Ram = ([math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1).ToString() + ' GB')
      Storage = @(Get-CimInstance Win32_DiskDrive | ForEach-Object { $_.Model + ' (' + [math]::Round($_.Size / 1GB) + ' GB)' })
      Monitors = @(Get-CimInstance Win32_DesktopMonitor -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
      Audio = @(Get-CimInstance Win32_SoundDevice -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
      Network = @(Get-CimInstance Win32_NetworkAdapter | Where-Object {$_.PhysicalAdapter} | Select-Object -ExpandProperty Name)
    } | ConvertTo-Json -Compress
  `;
  const row = await powershellJson<any>(script, null);
  cachedSpecs = row ? { os: row.Os, bios: row.Bios || "Unavailable", motherboard: row.Motherboard || "Unavailable", cpu: row.Cpu || os.cpus()[0]?.model || "Unavailable", gpu: row.Gpu || "Unavailable", ram: row.Ram || `${Math.round(os.totalmem() / 1024 ** 3)} GB`, storage: asRows(row.Storage), monitors: asRows(row.Monitors), audio: asRows(row.Audio), network: asRows(row.Network) } : emptySpecs();
  return cachedSpecs;
}

async function readHistory(limit = 720): Promise<MetricPoint[]> {
  if (cachedHistory.length && Date.now() - cachedHistoryAt < 1_000) return cachedHistory.slice(-limit);
  try {
    cachedHistory = JSON.parse(await fs.readFile(path.join(app.getPath("userData"), "system-history.json"), "utf8")).slice(-limit);
    cachedHistoryAt = Date.now();
    return cachedHistory;
  } catch {
    return [];
  }
}

async function writeHistory(point: MetricPoint, limit = 720) {
  const file = path.join(app.getPath("userData"), "system-history.json");
  const rows = [...await readHistory(limit), point].slice(-limit);
  cachedHistory = rows;
  cachedHistoryAt = Date.now();
  await fs.writeFile(file, JSON.stringify(rows), "utf8").catch(() => undefined);
  return rows;
}

export async function getLightSystemSnapshot(historyLimit = 360, ttlMs = 750): Promise<LightSystemSnapshot> {
  const now = Date.now();
  if (cachedLightSnapshot && now - cachedLightSnapshotAt < ttlMs) return cachedLightSnapshot;
  const cpu = cpuUsage();
  const [cpuExtra, gpu, disks, network] = await Promise.all([
    cachedCpuExtras(10_000),
    cachedGpuStats(5_000),
    cachedDiskStats(5_000),
    cachedNetworkStats(2_000)
  ]);
  const ramUsed = os.totalmem() - os.freemem();
  const storageMax = disks.reduce((max, disk) => Math.max(max, disk.total ? disk.used / disk.total : 0), 0);
  const alerts: string[] = [];
  if (cpuExtra.temperature && cpuExtra.temperature > 85) alerts.push(`CPU temperature is high at ${cpuExtra.temperature}C.`);
  if (gpu.temperature && gpu.temperature > 85) alerts.push(`GPU temperature is high at ${gpu.temperature}C.`);
  if (ramUsed / os.totalmem() > 0.9) alerts.push("Memory usage is very high.");
  if (storageMax > 0.9) alerts.push("One or more drives are almost full.");
  const point: MetricPoint = {
    time: new Date().toISOString(),
    cpuUsage: cpu.usage,
    ramUsage: Math.round((ramUsed / os.totalmem()) * 100),
    diskReadBps: disks[0]?.readBps ?? 0,
    diskWriteBps: disks[0]?.writeBps ?? 0,
    networkRxBps: network.rxBps,
    networkTxBps: network.txBps,
    cpuTemp: cpuExtra.temperature ?? undefined,
    gpuTemp: gpu.temperature ?? undefined
  };
  const history = [...cachedHistory.slice(-(historyLimit - 1)), point].slice(-historyLimit);
  cachedLightSnapshot = {
    capturedAt: point.time,
    uptime: os.uptime(),
    healthScore: Math.max(35, 100 - alerts.length * 16 - Math.max(0, point.ramUsage - 80)),
    healthLabel: alerts.length ? "Needs attention" : "Looking good",
    alerts,
    history,
    cpu: { usage: cpu.usage, cores: os.cpus().length, perCore: cpu.perCore, temperature: cpuExtra.temperature, clockMHz: cpuExtra.clockMHz },
    gpu: { usage: gpu.usage, temperature: gpu.temperature, vramUsed: gpu.vramUsed, vramTotal: gpu.vramTotal },
    ram: { used: ramUsed, total: os.totalmem() },
    disks,
    network: { adapters: network.adapters, rxBps: network.rxBps, txBps: network.txBps }
  };
  cachedLightSnapshotAt = now;
  return cachedLightSnapshot;
}

export function getSystemCacheDiagnostics() {
  const now = Date.now();
  return {
    lightSnapshotAgeMs: cachedLightSnapshotAt ? now - cachedLightSnapshotAt : null,
    fullSnapshotAgeMs: cachedFullSnapshotAt ? now - cachedFullSnapshotAt : null,
    gpuAgeMs: cachedGpuAt ? now - cachedGpuAt : null,
    cpuExtraAgeMs: cachedCpuExtraAt ? now - cachedCpuExtraAt : null,
    networkAgeMs: cachedNetworkAt ? now - cachedNetworkAt : null,
    diskAgeMs: cachedDisksAt ? now - cachedDisksAt : null
  };
}

export async function getSystemSnapshot(historyLimit = 720, options: SystemSnapshotOptions = {}): Promise<SystemSnapshot> {
  const includeProcesses = options.includeProcesses ?? true;
  const includeStartup = options.includeStartup ?? true;
  const includeSpecs = options.includeSpecs ?? true;
  const writeMetricHistory = options.writeHistory ?? true;
  if (cachedFullSnapshot && Date.now() - cachedFullSnapshotAt < 1_000 && includeProcesses && includeStartup && includeSpecs && writeMetricHistory) return cachedFullSnapshot;
  const cpu = cpuUsage();
  const [cpuExtra, gpu, ramMHz, disks, network, battery, processes, startup, specs] = await Promise.all([
    cachedCpuExtras(10_000),
    cachedGpuStats(5_000),
    cachedRamSpeedStats(60_000),
    cachedDiskStats(5_000),
    cachedNetworkStats(2_000),
    cachedBatteryStats(30_000),
    includeProcesses ? cachedProcessList(5_000) : Promise.resolve(cachedProcesses ?? []),
    includeStartup ? cachedStartupEntries(60_000) : Promise.resolve(cachedStartup ?? []),
    includeSpecs ? hardwareSpecs() : Promise.resolve(cachedSpecs ?? emptySpecs())
  ]);
  const ramUsed = os.totalmem() - os.freemem();
  const alerts: string[] = [];
  const storageMax = disks.reduce((max, disk) => Math.max(max, disk.total ? disk.used / disk.total : 0), 0);
  if (cpuExtra.temperature && cpuExtra.temperature > 85) alerts.push(`CPU temperature is high at ${cpuExtra.temperature}C.`);
  if (gpu.temperature && gpu.temperature > 85) alerts.push(`GPU temperature is high at ${gpu.temperature}C.`);
  if (ramUsed / os.totalmem() > 0.9) alerts.push("Memory usage is very high.");
  if (storageMax > 0.9) alerts.push("One or more drives are almost full.");
  const point: MetricPoint = { time: new Date().toISOString(), cpuUsage: cpu.usage, ramUsage: Math.round((ramUsed / os.totalmem()) * 100), diskReadBps: disks[0]?.readBps ?? 0, diskWriteBps: disks[0]?.writeBps ?? 0, networkRxBps: network.rxBps, networkTxBps: network.txBps, cpuTemp: cpuExtra.temperature ?? undefined, gpuTemp: gpu.temperature ?? undefined };
  const history = writeMetricHistory
    ? await writeHistory(point, historyLimit)
    : [...cachedHistory.slice(-(historyLimit - 1)), point].slice(-historyLimit);
  const healthScore = Math.max(35, 100 - alerts.length * 16 - Math.max(0, Math.round((ramUsed / os.totalmem()) * 100) - 80));
  const snapshot: SystemSnapshot = {
    capturedAt: point.time,
    healthScore,
    healthLabel: alerts.length ? "Needs attention" : "Looking good",
    uptime: os.uptime(),
    alerts,
    sensors: [
      { label: "CPU temperature", value: cpuExtra.temperature, unit: "C", status: cpuExtra.temperature ? (cpuExtra.temperature > 85 ? "warn" : "ok") : "unavailable" },
      { label: "GPU temperature", value: gpu.temperature, unit: "C", status: gpu.temperature ? (gpu.temperature > 85 ? "warn" : "ok") : "unavailable" },
      { label: "CPU voltage", value: cpuExtra.voltage, unit: "V", status: "unavailable" }
    ],
    history,
    cpu: { ...cpuExtra, usage: cpu.usage, cores: os.cpus().length, perCore: cpu.perCore },
    gpu,
    ram: { used: ramUsed, total: os.totalmem(), speedMHz: ramMHz },
    disks,
    network,
    battery,
    fans: [{ label: "Fan sensors", value: null, unit: "RPM", status: "unavailable" }],
    power: { drawWatts: gpu.powerDraw },
    processes,
    startup,
    specs
  };
  if (includeProcesses && includeStartup && includeSpecs && writeMetricHistory) {
    cachedFullSnapshot = snapshot;
    cachedFullSnapshotAt = Date.now();
  }
  return snapshot;
}

export async function getSystemStats(): Promise<SystemStats> {
  const snapshot = await getSystemSnapshot(120, { includeProcesses: false, includeStartup: false, includeSpecs: false, writeHistory: false });
  return {
    cpuUsage: snapshot.cpu.usage,
    ramTotal: snapshot.ram.total,
    ramUsed: snapshot.ram.used,
    uptime: os.uptime(),
    disks: snapshot.disks.map((disk) => ({ name: disk.name, total: disk.total, used: disk.used })),
    networks: snapshot.network.adapters,
    processes: snapshot.processes.slice(0, 12).map((item) => ({ pid: item.pid, name: item.name, cpu: item.cpu, memory: item.memory }))
  };
}

export async function killProcess(pid: number) {
  if (!Number.isFinite(pid) || pid <= 0) throw new Error("Invalid process id.");
  process.kill(pid);
  return true;
}

export async function openProcessLocation(pid: number) {
  const rows = await powershellJson<any[]>(`Get-CimInstance Win32_Process -Filter "ProcessId=${Math.trunc(pid)}" | Select-Object -First 1 ExecutablePath | ConvertTo-Json -Compress`, []);
  const target = asRows(rows)[0]?.ExecutablePath;
  if (!target) throw new Error("Windows did not expose a file location for this process.");
  shell.showItemInFolder(target);
}

async function dirSize(target: string, limit: { count: number }, largest: StorageEntry[], seen: Map<string, StorageEntry[]>): Promise<number> {
  if (limit.count > 6500) return 0;
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(target, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (limit.count++ > 6500) break;
    const full = path.join(target, entry.name);
    try {
      if (entry.isDirectory()) {
        const size = await dirSize(full, limit, largest, seen);
        total += size;
        largest.push({ path: full, name: entry.name, size, type: "folder" });
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        total += stat.size;
        const item: StorageEntry = { path: full, name: entry.name, size: stat.size, type: "file" };
        largest.push(item);
        const key = `${entry.name.toLowerCase()}:${stat.size}`;
        seen.set(key, [...(seen.get(key) ?? []), item]);
      }
    } catch {
      // Ignore inaccessible files so analysis can keep moving.
    }
  }
  return total;
}

export async function analyzeStorage(root?: string): Promise<StorageAnalysis> {
  const target = root || os.homedir();
  const largest: StorageEntry[] = [];
  const seen = new Map<string, StorageEntry[]>();
  const limit = { count: 0 };
  await dirSize(target, limit, largest, seen);
  const temp = os.tmpdir();
  const tempLargest: StorageEntry[] = [];
  const tempBytes = await dirSize(temp, { count: 0 }, tempLargest, new Map());
  const duplicates = [...seen.values()].filter((items) => items.length > 1).flat().slice(0, 25);
  return {
    root: target,
    scanned: limit.count,
    largest: largest.sort((a, b) => b.size - a.size).slice(0, 40),
    duplicates,
    tempBytes,
    recommendations: [
      tempBytes > 1024 ** 3 ? "Temporary files are using more than 1 GB." : "Temporary files look modest.",
      duplicates.length ? "Potential duplicate files were found by matching name and size." : "No obvious duplicate files found in the quick scan.",
      "For safety, NahkriinOS reports cleanup opportunities but does not delete files automatically."
    ]
  };
}

const WINDOWS_PROTECTED_PATHS = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\ProgramData\\Microsoft",
  "C:\\System Volume Information",
  "C:\\Recovery",
  "C:\\$Recycle.Bin",
  "C:\\Boot",
  "C:\\EFI",
  "C:\\PerfLogs",
  "C:\\Windows\\System32\\DriverStore",
  "C:\\Windows\\WinSxS",
  "C:\\Windows\\Servicing",
  "C:\\Windows\\SoftwareDistribution"
];

const WINDOWS_PROTECTED_FILES = ["C:\\pagefile.sys", "C:\\hiberfil.sys", "C:\\swapfile.sys"];

function scanCacheFile() {
  return path.join(app.getPath("userData"), "storage-scan-cache.json");
}

function scanCacheDir() {
  return path.join(app.getPath("userData"), "storage-scans");
}

function scanCacheFileFor(targetPath: string) {
  const key = Buffer.from(targetPath.toLowerCase(), "utf8").toString("base64url");
  return path.join(scanCacheDir(), `${key}.json`);
}

function normalizeScanPath(target: string) {
  return path.resolve(target).replace(/[\\/]+$/, "").toLowerCase();
}

function isProtectedPath(target: string) {
  const normalized = normalizeScanPath(target);
  return [...WINDOWS_PROTECTED_PATHS, ...WINDOWS_PROTECTED_FILES].some((protectedPath) => {
    const protectedNormalized = normalizeScanPath(protectedPath);
    return normalized === protectedNormalized || normalized.startsWith(`${protectedNormalized}\\`);
  });
}

function safetyForPath(target: string): { safety: StorageScanItem["safety"]; reason: string } {
  if (isProtectedPath(target)) return { safety: "protected", reason: "Windows/system protected location" };
  const lower = target.toLowerCase();
  if (lower.includes("\\appdata\\") || lower.includes("\\programdata\\")) return { safety: "careful", reason: "Application data. Review before deleting." };
  if (/\.(zip|rar|7z|iso|msi|exe|mp4|mov|mkv|avi|log|tmp)$/i.test(target)) return { safety: "safe", reason: "User-manageable file type" };
  return { safety: "safe", reason: "User folder content" };
}

function extensionGroup(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) return "No extension";
  if ([".mp4", ".mov", ".mkv", ".avi", ".wmv"].includes(ext)) return "Video";
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".raw"].includes(ext)) return "Images";
  if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) return "Archives";
  if ([".exe", ".msi", ".iso"].includes(ext)) return "Installers";
  if ([".log", ".tmp", ".cache"].includes(ext)) return "Logs/cache";
  return ext.replace(".", "").toUpperCase();
}

function pushTop(list: StorageScanItem[], item: StorageScanItem, limit = 250) {
  list.push(item);
  list.sort((a, b) => b.size - a.size);
  if (list.length > limit) list.length = limit;
}

function applyPercent(result: StorageScanResult) {
  const total = Math.max(1, result.scannedBytes);
  for (const row of [...result.largestFiles, ...result.largestFolders, ...result.treemap]) row.percent = Math.round((row.size / total) * 1000) / 10;
  for (const row of result.typeBreakdown) row.percent = Math.round((row.size / total) * 1000) / 10;
}

function buildSuggestions(result: StorageScanResult) {
  const suggestions = new Set<string>();
  const userFiles = result.largestFiles.filter((item) => item.safety !== "protected");
  if (userFiles.some((item) => /\\downloads\\/i.test(`${item.path}\\`))) suggestions.add("Downloads contains large files worth reviewing.");
  if (userFiles.some((item) => /\.(zip|rar|7z|iso)$/i.test(item.path))) suggestions.add("Large archives or disk images were found.");
  if (userFiles.some((item) => /\.(mp4|mov|mkv|avi)$/i.test(item.path))) suggestions.add("Large media files are a major storage category.");
  if (userFiles.some((item) => /\.(msi|exe)$/i.test(item.path))) suggestions.add("Old installers may be safe to remove after review.");
  if (userFiles.some((item) => /\\(cache|logs?|temp)\\/i.test(`${item.path}\\`))) suggestions.add("Cache, temp, or log folders may have cleanup opportunities.");
  suggestions.add("NahkriinOS never deletes files automatically. Open locations and review before removing anything.");
  return [...suggestions];
}

async function readCachedStorageScan(): Promise<StorageScanResult | null> {
  try {
    const latest = JSON.parse(await fs.readFile(scanCacheFile(), "utf8")) as { latest?: string } | StorageScanResult;
    if ("latest" in latest && latest.latest) return JSON.parse(await fs.readFile(latest.latest, "utf8"));
    return latest as StorageScanResult;
  } catch {
    return null;
  }
}

async function writeCachedStorageScan(result: StorageScanResult) {
  await fs.mkdir(scanCacheDir(), { recursive: true }).catch(() => undefined);
  const targetFile = scanCacheFileFor(result.targetPath || result.roots[0] || "unknown");
  await fs.writeFile(targetFile, JSON.stringify(result, null, 2), "utf8").catch(() => undefined);
  await fs.writeFile(scanCacheFile(), JSON.stringify({ latest: targetFile, targetPath: result.targetPath, updatedAt: new Date().toISOString() }, null, 2), "utf8").catch(() => undefined);
}

export async function storageScanTargets(): Promise<StorageScanTarget[]> {
  const drives = await diskStats();
  const home = os.homedir();
  const common = ["Downloads", "Desktop", "Documents", "Videos", "Pictures"].map((name) => path.join(home, name));
  const caches = [
    path.join(home, "AppData", "Local", "Temp"),
    path.join(home, "AppData", "Local", "Google", "Chrome", "User Data", "Default", "Cache"),
    path.join(home, "AppData", "Local", "Microsoft", "Edge", "User Data", "Default", "Cache")
  ];
  return [
    ...drives.map((drive) => ({ path: `${drive.name}\\`, label: `${drive.name} ${drive.label}`, kind: "drive" as const })),
    ...common.map((folder) => ({ path: folder, label: path.basename(folder), kind: "common" as const })),
    ...caches.map((folder) => ({ path: folder, label: folder.includes("Temp") ? "Windows user temp" : path.basename(path.dirname(folder)), kind: "common" as const }))
  ];
}

export async function storageScanStatus(): Promise<StorageScanStatus> {
  return { active: !!activeStorageScan, result: activeStorageScan?.result ?? null, cached: await readCachedStorageScan() };
}

export async function storageScanDiagnostics() {
  const status = await storageScanStatus();
  const latest = status.result ?? status.cached;
  return {
    activeScan: status.active,
    lastScanTarget: latest?.targetPath ?? "",
    lastScanStatus: latest?.status ?? "none"
  };
}

type ScanFrame = { dir: string; index: number; entries: string[]; size: number; fileCount: number; modifiedAt: number };

export async function startStorageScan(options: StorageScanOptions): Promise<StorageScanResult> {
  if (activeStorageScan) throw new Error("A storage scan is already running.");
  const roots = options.targets.length ? options.targets : [os.homedir()];
  const targetPath = path.resolve(roots[0] ?? os.homedir());
  const startedAt = new Date().toISOString();
  const result: StorageScanResult = {
    id: crypto.randomUUID(),
    startedAt,
    status: "running",
    roots,
    targetPath,
    targetType: options.targetType ?? (/^[a-z]:\\?$/i.test(targetPath) ? "drive" : "folder"),
    includeProtected: options.includeProtected,
    scannedBytes: 0,
    scannedFiles: 0,
    scannedFolders: 0,
    currentPath: roots[0] ?? "",
    largestFiles: [],
    largestFolders: [],
    duplicates: [],
    typeBreakdown: [],
    treemap: [],
    skipped: [],
    suggestions: []
  };
  activeStorageScan = { cancelled: false, paused: false, result };
  void runStorageScan(options, result).catch((error) => {
    result.status = "failed";
    result.error = error instanceof Error ? error.message : String(error);
    result.finishedAt = new Date().toISOString();
    activeStorageScan = null;
  });
  return result;
}

export async function cancelStorageScan(): Promise<StorageScanResult | null> {
  if (!activeStorageScan) return readCachedStorageScan();
  activeStorageScan.cancelled = true;
  activeStorageScan.result.status = "cancelled";
  activeStorageScan.result.finishedAt = new Date().toISOString();
  await writeCachedStorageScan(activeStorageScan.result);
  const result = activeStorageScan.result;
  return result;
}

export async function pauseStorageScan(): Promise<StorageScanResult | null> {
  if (!activeStorageScan) return readCachedStorageScan();
  activeStorageScan.paused = true;
  activeStorageScan.result.status = "paused";
  return activeStorageScan.result;
}

export async function resumeStorageScan(): Promise<StorageScanResult | null> {
  if (!activeStorageScan) return readCachedStorageScan();
  activeStorageScan.paused = false;
  activeStorageScan.result.status = "running";
  return activeStorageScan.result;
}

async function runStorageScan(options: StorageScanOptions, result: StorageScanResult) {
  const typeMap = new Map<string, { size: number; count: number }>();
  const duplicateMap = new Map<string, StorageScanItem[]>();
  const shouldInclude = (item: StorageScanItem) => {
    if (options.safeOnly && item.safety !== "safe") return false;
    if (options.minSizeBytes && item.size < options.minSizeBytes) return false;
    if (options.fileType && options.fileType !== "all" && item.extension !== options.fileType) return false;
    if (options.modifiedAfter && new Date(item.modifiedAt) < new Date(options.modifiedAfter)) return false;
    return true;
  };

  for (const root of result.roots) {
    if (activeStorageScan?.cancelled) break;
    const resolved = path.resolve(root);
    if (!options.includeProtected && isProtectedPath(resolved)) {
      result.skipped.push({ path: resolved, reason: "Protected Windows/system location excluded by default.", protected: true });
      continue;
    }

    const stack: ScanFrame[] = [{ dir: resolved, index: 0, entries: [], size: 0, fileCount: 0, modifiedAt: 0 }];
    while (stack.length && !activeStorageScan?.cancelled) {
      while (activeStorageScan?.paused && !activeStorageScan.cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const frame = stack[stack.length - 1];
      result.currentPath = frame.dir;
      if (!frame.entries.length) {
        try {
          const entries = await fs.readdir(frame.dir, { withFileTypes: true });
          frame.entries = entries.map((entry) => entry.name);
          result.scannedFolders++;
        } catch (error) {
          result.skipped.push({ path: frame.dir, reason: error instanceof Error ? error.message : "Permission denied or inaccessible.", protected: isProtectedPath(frame.dir) });
          stack.pop();
          continue;
        }
      }

      if (frame.index >= frame.entries.length) {
        const finished = stack.pop()!;
        const stat = await fs.stat(finished.dir).catch(() => null);
        const safety = safetyForPath(finished.dir);
        const item: StorageScanItem = { path: finished.dir, name: path.basename(finished.dir) || finished.dir, type: "folder", size: finished.size, fileCount: finished.fileCount, modifiedAt: new Date(Math.max(finished.modifiedAt, stat?.mtimeMs ?? 0)).toISOString(), percent: 0, extension: "Folder", ...safety };
        if (shouldInclude(item)) pushTop(result.largestFolders, item);
        if (stack.length) {
          stack[stack.length - 1].size += finished.size;
          stack[stack.length - 1].fileCount += finished.fileCount;
          stack[stack.length - 1].modifiedAt = Math.max(stack[stack.length - 1].modifiedAt, finished.modifiedAt);
        } else {
          pushTop(result.treemap, item, 80);
        }
        continue;
      }

      const child = path.join(frame.dir, frame.entries[frame.index++]);
      if (!options.includeProtected && isProtectedPath(child)) {
        result.skipped.push({ path: child, reason: "Protected Windows/system location hidden by default.", protected: true });
        continue;
      }

      try {
        const stat = await fs.lstat(child);
        if (stat.isSymbolicLink()) {
          result.skipped.push({ path: child, reason: "Skipped link or junction to avoid recursive scans.", protected: false });
        } else if (stat.isDirectory()) {
          stack.push({ dir: child, index: 0, entries: [], size: 0, fileCount: 0, modifiedAt: stat.mtimeMs });
        } else if (stat.isFile()) {
          const ext = extensionGroup(child);
          const safety = safetyForPath(child);
          const item: StorageScanItem = { path: child, name: path.basename(child), type: "file", size: stat.size, fileCount: 1, modifiedAt: stat.mtime.toISOString(), percent: 0, extension: ext, ...safety };
          result.scannedBytes += stat.size;
          result.scannedFiles++;
          frame.size += stat.size;
          frame.fileCount++;
          frame.modifiedAt = Math.max(frame.modifiedAt, stat.mtimeMs);
          const current = typeMap.get(ext) ?? { size: 0, count: 0 };
          current.size += stat.size;
          current.count++;
          typeMap.set(ext, current);
          if (stat.size >= 50 * 1024 ** 2 && item.safety !== "protected") {
            const key = `${item.name.toLowerCase()}:${stat.size}`;
            duplicateMap.set(key, [...(duplicateMap.get(key) ?? []), item]);
          }
          if (shouldInclude(item)) pushTop(result.largestFiles, item);
        }
      } catch (error) {
        result.skipped.push({ path: child, reason: error instanceof Error ? error.message : "Permission denied or inaccessible.", protected: isProtectedPath(child) });
      }

      if ((result.scannedFiles + result.scannedFolders) % 100 === 0) {
        result.typeBreakdown = [...typeMap.entries()].map(([type, value]) => ({ type, ...value, percent: 0 })).sort((a, b) => b.size - a.size).slice(0, 24);
        result.duplicates = [...duplicateMap.values()].filter((items) => items.length > 1).flat().slice(0, 80);
        applyPercent(result);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  result.typeBreakdown = [...typeMap.entries()].map(([type, value]) => ({ type, ...value, percent: 0 } satisfies StorageTypeBreakdown)).sort((a, b) => b.size - a.size).slice(0, 24);
  result.duplicates = [...duplicateMap.values()].filter((items) => items.length > 1).flat().slice(0, 120);
  applyPercent(result);
  result.suggestions = buildSuggestions(result);
  if (activeStorageScan?.cancelled) {
    result.status = "cancelled";
  } else {
    result.status = "completed";
  }
  result.finishedAt = new Date().toISOString();
  await writeCachedStorageScan(result);
  activeStorageScan = null;
}

export async function exportStorageReport(): Promise<string> {
  const result = activeStorageScan?.result ?? await readCachedStorageScan();
  if (!result) throw new Error("No storage scan report is available yet.");
  const file = path.join(app.getPath("userData"), `storage-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(file, JSON.stringify(result, null, 2), "utf8");
  shell.showItemInFolder(file);
  return file;
}

export async function runDiskBenchmark(): Promise<DiskBenchmarkResult> {
  const target = path.join(app.getPath("temp"), `nahkriinos-disk-test-${Date.now()}.bin`);
  const sizeBytes = 32 * 1024 * 1024;
  const buffer = Buffer.alloc(sizeBytes, 7);
  const startWrite = performance.now();
  await fs.writeFile(target, buffer);
  const writeMs = performance.now() - startWrite;
  const startRead = performance.now();
  await fs.readFile(target);
  const readMs = performance.now() - startRead;
  await fs.rm(target, { force: true });
  return { target: app.getPath("temp"), sizeBytes, writeMbps: Math.round((sizeBytes / 1024 / 1024) / (writeMs / 1000)), readMbps: Math.round((sizeBytes / 1024 / 1024) / (readMs / 1000)) };
}

function stressName(kind: StressTestOptions["kind"]) {
  if (kind === "cpu") return "CPU Stability Test";
  if (kind === "memory") return "Memory Pressure Test";
  if (kind === "disk") return "Disk Speed Test";
  return "GPU Stability Test";
}

function emptyStressSession(): StressTestSession {
  return { active: false, result: null, progress: 0, live: { cpuUsage: 0, ramUsage: 0, cpuTemp: null, gpuTemp: null } };
}

export function stressTestStatus(): StressTestSession {
  return activeStress?.session ?? emptyStressSession();
}

export function stopStressTest() {
  if (!activeStress) return stressTestStatus();
  activeStress.stop();
  activeStress.session.active = false;
  if (activeStress.session.result) {
    activeStress.session.result.status = "stopped";
    activeStress.session.result.finishedAt = new Date().toISOString();
    activeStress.session.result.summary = "Stopped manually before the selected duration finished.";
  }
  const session = activeStress.session;
  activeStress = null;
  return session;
}

export async function startStressTest(options: StressTestOptions, thresholds: { cpuTempAlert: number; gpuTempAlert: number }): Promise<StressTestSession> {
  if (activeStress) throw new Error("A stress test is already running.");
  if (options.kind === "gpu") throw new Error("GPU stress testing is disabled until a safe vendor-supported method is available.");
  const durationSeconds = Math.max(5, Math.min(600, Math.trunc(options.durationSeconds || 30)));
  const result: StressTestResult = {
    id: crypto.randomUUID(),
    kind: options.kind,
    name: stressName(options.kind),
    status: "running",
    startedAt: new Date().toISOString(),
    durationSeconds,
    averageUsage: 0,
    peakUsage: 0,
    averageTemperature: null,
    peakTemperature: null,
    warnings: [],
    summary: "Running..."
  };
  const session: StressTestSession = { active: true, result, progress: 0, live: { cpuUsage: 0, ramUsage: 0, cpuTemp: null, gpuTemp: null } };
  const samples: Array<{ usage: number; temp: number | null }> = [];
  let stopped = false;
  let workers: Worker[] = [];
  let memoryBlocks: Buffer[] = [];
  let timer: NodeJS.Timeout | null = null;

  const cleanup = () => {
    stopped = true;
    workers.forEach((worker) => worker.terminate().catch(() => undefined));
    workers = [];
    memoryBlocks = [];
    if (timer) clearInterval(timer);
  };
  activeStress = { stop: cleanup, session };

  const finish = async (status: StressTestResult["status"], summary: string) => {
    cleanup();
    const usage = samples.map((sample) => sample.usage);
    const temps = samples.map((sample) => sample.temp).filter((value): value is number => value !== null);
    result.status = status;
    result.finishedAt = new Date().toISOString();
    result.averageUsage = usage.length ? Math.round(usage.reduce((sum, value) => sum + value, 0) / usage.length) : 0;
    result.peakUsage = usage.length ? Math.max(...usage) : 0;
    result.averageTemperature = temps.length ? Math.round((temps.reduce((sum, value) => sum + value, 0) / temps.length) * 10) / 10 : null;
    result.peakTemperature = temps.length ? Math.max(...temps) : null;
    result.summary = summary;
    session.active = false;
    session.progress = 100;
    activeStress = null;
  };

  if (options.kind === "cpu") {
    const workerCode = `const { parentPort } = require("worker_threads"); let keep=true; parentPort.on("message", m => { if (m === "stop") keep=false; }); function burn(){ const end=Date.now()+80; let x=0; while(keep && Date.now()<end){ x += Math.sqrt(Math.random()*9999); } if(keep) setImmediate(burn); } burn();`;
    workers = Array.from({ length: Math.min(4, Math.max(1, os.cpus().length - 1)) }, () => new Worker(workerCode, { eval: true }));
  }

  if (options.kind === "memory") {
    const free = os.freemem();
    const percent = Math.max(5, Math.min(35, options.memoryPercent ?? 15));
    const target = Math.min(free * (percent / 100), 768 * 1024 * 1024);
    const chunk = 16 * 1024 * 1024;
    for (let allocated = 0; allocated < target && !stopped; allocated += chunk) {
      const block = Buffer.alloc(Math.min(chunk, target - allocated), 3);
      memoryBlocks.push(block);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  if (options.kind === "disk") {
    runDiskBenchmark().then((bench) => {
      result.details = `Temporary file test in ${bench.target}. Write ${bench.writeMbps} MB/s, read ${bench.readMbps} MB/s.`;
      result.warnings.push("Disk test used a temporary file and removed it afterward.");
    }).catch((error) => result.warnings.push(error instanceof Error ? error.message : String(error)));
  }

  const started = Date.now();
  timer = setInterval(async () => {
    if (stopped || !activeStress) return;
    const snapshot = await getSystemSnapshot(120).catch(() => null);
    if (!snapshot) return;
    const usage = options.kind === "memory" ? Math.round((snapshot.ram.used / snapshot.ram.total) * 100) : snapshot.cpu.usage;
    const temp = options.kind === "memory" ? snapshot.cpu.temperature : snapshot.cpu.temperature;
    session.live = { cpuUsage: snapshot.cpu.usage, ramUsage: Math.round((snapshot.ram.used / snapshot.ram.total) * 100), cpuTemp: snapshot.cpu.temperature, gpuTemp: snapshot.gpu.temperature };
    samples.push({ usage, temp });
    session.progress = Math.min(99, Math.round(((Date.now() - started) / (durationSeconds * 1000)) * 100));
    if ((snapshot.cpu.temperature ?? 0) >= thresholds.cpuTempAlert || (snapshot.gpu.temperature ?? 0) >= thresholds.gpuTempAlert) {
      result.warnings.push("Auto-stopped because a temperature threshold was reached.");
      void finish("warning", "Stopped early because NahkriinOS saw a high temperature reading.");
      return;
    }
    if (Date.now() - started >= durationSeconds * 1000) {
      void finish(result.warnings.length ? "warning" : "completed", result.warnings.length ? "Completed with warnings." : "Completed successfully.");
    }
  }, 1000);

  return session;
}
