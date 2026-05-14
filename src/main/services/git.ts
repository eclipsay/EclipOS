import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync("git", args, { cwd, windowsHide: true });
  return [stdout, stderr].filter(Boolean).join("");
}

export async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    return (await git(["rev-parse", "--is-inside-work-tree"], cwd)).trim() === "true";
  } catch {
    return false;
  }
}

export async function gitStatus(cwd: string): Promise<string> {
  if (!(await isGitRepository(cwd))) return "Not a Git repository.";
  return (await git(["status", "--short"], cwd)).trim() || "Clean working tree.";
}

export async function changedFiles(cwd: string): Promise<string[]> {
  if (!(await isGitRepository(cwd))) return [];
  const output = await git(["status", "--short"], cwd);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().slice(3).trim())
    .filter(Boolean);
}

export async function revertChanges(cwd: string): Promise<string> {
  if (!(await isGitRepository(cwd))) throw new Error("Selected project is not a Git repository.");
  await git(["restore", "."], cwd);
  await git(["clean", "-fd"], cwd);
  return gitStatus(cwd);
}
