import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { detectRtkVersion } from "../analyzers/graph-optimizer.ts";
import type { RepoSyncMetadata } from "../types/verdict.ts";

const FORBIDDEN_METACHARS = /[;|&$`\n\r<>]/;

export function parseRepoSlug(repoUrl: string): string {
  const trimmed = repoUrl.trim();
  if (!trimmed || FORBIDDEN_METACHARS.test(trimmed) || trimmed.includes("..")) {
    throw new Error(`Unsafe or invalid repository URL/path: ${repoUrl}`);
  }

  const ghMatch = /(?:github\.com|gitlab\.com|bitbucket\.org)[/:]([^/]+)\/([^/.]+)(?:\.git)?$/i.exec(
    trimmed
  );
  if (ghMatch && ghMatch[1] && ghMatch[2]) {
    return `${ghMatch[1]}__${ghMatch[2]}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  }

  const normalizedLocal = trimmed === "." || trimmed.startsWith("./") ? resolve(trimmed) : trimmed;
  const base = basename(normalizedLocal.replace(/\.git$/, ""));
  const clean = base.replace(/[^a-zA-Z0-9_.-]/g, "_");
  if (!clean || clean === "." || clean === "..") {
    throw new Error(`Cannot derive slug from repository input: ${repoUrl}`);
  }
  return clean;
}

export function syncRepository(repoUrl: string, cacheBaseDir: string): RepoSyncMetadata {
  const slug = parseRepoSlug(repoUrl);
  mkdirSync(cacheBaseDir, { recursive: true });
  const localPath = resolve(join(cacheBaseDir, slug));

  let action: "CLONED" | "PULLED";
  if (!existsSync(join(localPath, ".git"))) {
    const cloneRes = spawnSync("git", ["clone", "--depth", "20", repoUrl.trim(), localPath], {
      encoding: "utf8",
    });
    if (cloneRes.status !== 0) {
      throw new Error(`git clone failed: ${cloneRes.stderr || cloneRes.stdout}`);
    }
    action = "CLONED";
  } else {
    spawnSync("git", ["reset", "--hard", "HEAD"], { cwd: localPath, encoding: "utf8" });
    spawnSync("git", ["clean", "-fd"], { cwd: localPath, encoding: "utf8" });
    const pullRes = spawnSync("git", ["pull", "--ff-only"], {
      cwd: localPath,
      encoding: "utf8",
    });
    if (pullRes.status !== 0) {
      const fetchRes = spawnSync("git", ["fetch", "origin"], {
        cwd: localPath,
        encoding: "utf8",
      });
      if (fetchRes.status !== 0) {
        throw new Error(`git pull/fetch failed: ${fetchRes.stderr || pullRes.stderr}`);
      }
      spawnSync("git", ["reset", "--hard", "FETCH_HEAD"], {
        cwd: localPath,
        encoding: "utf8",
      });
    }
    action = "PULLED";
  }

  const headSha = gitOutput(localPath, ["rev-parse", "--short=12", "HEAD"]) || "unknown";
  const branch = gitOutput(localPath, ["rev-parse", "--abbrev-ref", "HEAD"]) || "HEAD";
  const commitMessage = gitOutput(localPath, ["log", "-1", "--pretty=%s"]) || "";

  const localSourceRoot = resolve(repoUrl.trim());
  if (existsSync(join(localSourceRoot, ".git")) && localSourceRoot !== localPath) {
    const dirtyRes = spawnSync("git", ["status", "--porcelain", "-uall"], {
      cwd: localSourceRoot,
      encoding: "utf8",
    });
    for (const line of (dirtyRes.stdout ?? "").split("\n")) {
      if (line.length < 4) continue;
      const statusFlag = line.slice(0, 2);
      const relDirty = line.slice(3).trim().replace(/^"|"$/g, "");
      if (
        !relDirty ||
        relDirty.startsWith(".nta/") ||
        relDirty.includes("node_modules/") ||
        relDirty.includes(".venv/") ||
        relDirty.includes(".next/")
      ) {
        continue;
      }
      const srcDirty = join(localSourceRoot, relDirty);
      const dstDirty = join(localPath, relDirty);
      if (statusFlag.includes("D") || !existsSync(srcDirty)) {
        rmSync(dstDirty, { recursive: true, force: true });
      } else {
        cpSync(srcDirty, dstDirty, { recursive: true, force: true });
      }
    }
  }

  return {
    repoUrl: repoUrl.trim(),
    slug,
    localPath,
    action,
    headSha,
    branch,
    commitMessage,
    syncedAt: new Date().toISOString(),
  };
}

function gitOutput(cwd: string, args: readonly string[]): string {
  const hasRtk = detectRtkVersion().length > 0;
  if (hasRtk) {
    const rtkRes = spawnSync("rtk", ["git", ...args], { cwd, encoding: "utf8" });
    if (rtkRes.status === 0 && rtkRes.stdout) {
      return rtkRes.stdout.trim();
    }
  }
  const res = spawnSync("git", [...args], { cwd, encoding: "utf8" });
  return (res.stdout ?? "").trim();
}
