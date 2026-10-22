import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Finding, PlatformAuditReport, TechStackProfile } from "../types/verdict.ts";
import { enrichFindingWithBrutalCritique } from "./evidence-verifier.ts";

interface RawPackageJson {
  readonly name?: string;
  readonly packageManager?: string;
  readonly main?: string;
  readonly module?: string;
  readonly bin?: string | Record<string, string>;
  readonly exports?: unknown;
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

const CONVENTION_ROUTE_OR_CONFIG_REGEX =
  /(?:^|\/)(?:app\/.*\/(?:page|layout|route|loading|error|not-found)\.[cm]?[jt]sx?|pages\/.*\.[cm]?[jt]sx?|routes\/.*\.[cm]?[jt]sx?|middleware\.[cm]?[jt]s|[a-z0-9-]+\.config\.[cm]?[jt]s)$/i;

export function detectProjectTechStack(workspaceRoot: string): TechStackProfile {
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const discoveredEntrypoints = new Set<string>();
  let runtime = "node";
  let packageManager = "npm";
  let testRunner = "node:test";
  let stylingSystem = "vanilla-css";

  const pkgPath = join(workspaceRoot, "package.json");
  let allDeps: Record<string, string> = {};
  let scripts: Record<string, string> = {};

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as RawPackageJson;
      allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      scripts = pkg.scripts ?? {};

      if (pkg.packageManager) {
        if (pkg.packageManager.startsWith("pnpm")) packageManager = "pnpm";
        else if (pkg.packageManager.startsWith("yarn")) packageManager = "yarn";
        else if (pkg.packageManager.startsWith("bun")) packageManager = "bun";
        else if (pkg.packageManager.startsWith("npm")) packageManager = "npm";
      }

      if (typeof pkg.main === "string") discoveredEntrypoints.add(cleanRelPath(pkg.main));
      if (typeof pkg.module === "string") discoveredEntrypoints.add(cleanRelPath(pkg.module));
      if (typeof pkg.bin === "string") {
        discoveredEntrypoints.add(cleanRelPath(pkg.bin));
      } else if (pkg.bin && typeof pkg.bin === "object") {
        for (const target of Object.values(pkg.bin)) {
          if (typeof target === "string") discoveredEntrypoints.add(cleanRelPath(target));
        }
      }
      collectExportEntrypoints(pkg.exports, discoveredEntrypoints);
    } catch {
      // Ignore malformed package.json
    }
  }

  // Lockfile & manifest detection
  if (
    existsSync(join(workspaceRoot, "bun.lock")) ||
    existsSync(join(workspaceRoot, "bun.lockb")) ||
    "@types/bun" in allDeps ||
    Object.values(scripts).some((s) => /\bbun\b/.test(s))
  ) {
    runtime = "bun";
    if (packageManager === "npm") packageManager = "bun";
  }
  if (existsSync(join(workspaceRoot, "pnpm-lock.yaml"))) packageManager = "pnpm";
  if (existsSync(join(workspaceRoot, "yarn.lock"))) packageManager = "yarn";

  if (
    existsSync(join(workspaceRoot, "pyproject.toml")) ||
    existsSync(join(workspaceRoot, "requirements.txt"))
  ) {
    languages.add("Python");
    if (!existsSync(pkgPath)) {
      runtime = "python";
      packageManager = "uv/pip";
      testRunner = "pytest";
    }
  }
  if (existsSync(join(workspaceRoot, "Cargo.toml"))) {
    languages.add("Rust");
    if (!existsSync(pkgPath)) {
      runtime = "rust";
      packageManager = "cargo";
      testRunner = "cargo-test";
    }
  }
  if (existsSync(join(workspaceRoot, "go.mod"))) {
    languages.add("Go");
    if (!existsSync(pkgPath)) {
      runtime = "go";
      packageManager = "go";
      testRunner = "go-test";
    }
  }

  // Framework & Tooling Fingerprinting
  if ("next" in allDeps) frameworks.add("Next.js");
  if ("react" in allDeps || "react-dom" in allDeps) frameworks.add("React");
  if ("vue" in allDeps) frameworks.add("Vue");
  if ("svelte" in allDeps || "@sveltejs/kit" in allDeps) frameworks.add("Svelte");
  if ("astro" in allDeps) frameworks.add("Astro");
  if ("vite" in allDeps) frameworks.add("Vite");
  if ("express" in allDeps) frameworks.add("Express");
  if ("fastify" in allDeps) frameworks.add("Fastify");
  if ("hono" in allDeps) frameworks.add("Hono");
  if ("@modelcontextprotocol/sdk" in allDeps) frameworks.add("MCP SDK");

  if (
    "tailwindcss" in allDeps ||
    "@tailwindcss/vite" in allDeps ||
    existsSync(join(workspaceRoot, "tailwind.config.js")) ||
    existsSync(join(workspaceRoot, "tailwind.config.ts"))
  ) {
    frameworks.add("Tailwind CSS");
    stylingSystem = "tailwind";
  } else if ("styled-components" in allDeps || "@emotion/react" in allDeps) {
    stylingSystem = "css-in-js";
  }

  // Test Runner Detection
  if ("vitest" in allDeps || Object.values(scripts).some((s) => /\bvitest\b/.test(s))) {
    testRunner = "vitest";
    frameworks.add("Vitest");
  } else if ("jest" in allDeps || Object.values(scripts).some((s) => /\bjest\b/.test(s))) {
    testRunner = "jest";
    frameworks.add("Jest");
  } else if (
    "@playwright/test" in allDeps ||
    Object.values(scripts).some((s) => /\bplaywright\b/.test(s))
  ) {
    testRunner = "playwright";
    frameworks.add("Playwright");
  } else if (runtime === "bun") {
    testRunner = "bun:test";
    frameworks.add("Bun.serve / bun:test");
  }

  // Walk workspace files to discover languages and convention-routed entrypoints
  walkTechFiles(workspaceRoot, (relPath) => {
    if (/\.[cm]?tsx?$/.test(relPath)) languages.add("TypeScript");
    else if (/\.[cm]?jsx?$/.test(relPath)) languages.add("JavaScript");
    else if (/\.(?:css|scss|less)$/.test(relPath)) languages.add("CSS");
    else if (/\.sh$/.test(relPath)) languages.add("Bash");
    else if (/\.py$/.test(relPath)) languages.add("Python");
    else if (/\.md$/.test(relPath)) languages.add("Markdown/Skills");

    if (CONVENTION_ROUTE_OR_CONFIG_REGEX.test(relPath)) {
      discoveredEntrypoints.add(relPath);
    }
  });

  if (existsSync(join(workspaceRoot, "tsconfig.json")) || "typescript" in allDeps) {
    languages.add("TypeScript");
  }

  const langList = [...languages];
  const fwList = [...frameworks];
  const groundingSummary = `Runtime=${runtime} |PkgMgr=${packageManager} |TestRunner=${testRunner} |Styling=${stylingSystem} |Frameworks=${fwList.join(", ") || "Stdlib/Native"} |Languages=${langList.join(", ") || "Unknown"}`;

  return {
    runtime,
    packageManager,
    testRunner,
    stylingSystem,
    languages: langList,
    frameworks: fwList,
    discoveredEntrypoints: [...discoveredEntrypoints],
    groundingSummary,
  };
}

export function verifyTechStackAlignment(report: PlatformAuditReport): Finding[] {
  const findings: Finding[] = [];
  const stack = report.techStack;

  if (!stack || !stack.runtime || !stack.packageManager || !stack.testRunner) {
    findings.push(
      enrichFindingWithBrutalCritique({
        ruleId: "NTA-E006",
        category: "EVIDENCE_FRAUD",
        severity: "CRITICAL",
        file: report.repoMeta.localPath || ".",
        line: 1,
        message:
          "Missing Tech-Stack Reconnaissance (NTA-E006): audit ran without fingerprinting project runtime, package manager, frameworks, and test runner.",
        evidence: "Missing report.techStack profile",
      })
    );
    return findings;
  }

  const entrypointSet = new Set(stack.discoveredEntrypoints);

  for (const f of report.findings) {
    // 1. Check if an NTA-P003 (Orphan File) finding falsely accused a known framework route or package.json entrypoint
    if (f.ruleId === "NTA-P003" && entrypointSet.has(f.file)) {
      findings.push(
        enrichFindingWithBrutalCritique(
          {
            ruleId: "NTA-E006",
            category: "EVIDENCE_FRAUD",
            severity: "CRITICAL",
            file: f.file,
            line: f.line,
            message: `Tech-Stack Mismatch / Self-Backfire Risk (NTA-E006): '${f.file}' is a declared framework route or package.json entrypoint in [${stack.groundingSummary}], NOT an orphan file.`,
            evidence: `${f.ruleId} falsely flagged entrypoint '${f.file}'`,
          },
          stack
        )
      );
    }

    // 2. Check if whyItIsWrong / directFix recommends a foreign toolchain (e.g., cargo test or pytest on a TS/JS project)
    const combinedText = `${f.whyItIsWrong ?? ""} ${f.directFix ?? ""}`;
    if (
      stack.runtime !== "rust" &&
      /\bcargo\s+(?:test|build|check)\b/i.test(combinedText)
    ) {
      findings.push(
        enrichFindingWithBrutalCritique(
          {
            ruleId: "NTA-E006",
            category: "EVIDENCE_FRAUD",
            severity: "CRITICAL",
            file: f.file,
            line: f.line,
            message: `Tech-Stack Mismatch / Self-Backfire Risk (NTA-E006): critique recommends Rust 'cargo' commands on a ${stack.runtime}/${stack.packageManager} project.`,
            evidence: combinedText.trim(),
          },
          stack
        )
      );
    }
  }

  return findings;
}

function cleanRelPath(p: string): string {
  return p.replace(/^\.\//, "").replace(/\\/g, "/");
}

function collectExportEntrypoints(exportsField: unknown, out: Set<string>): void {
  if (!exportsField) return;
  if (typeof exportsField === "string") {
    out.add(cleanRelPath(exportsField));
    return;
  }
  if (typeof exportsField === "object") {
    for (const val of Object.values(exportsField as Record<string, unknown>)) {
      collectExportEntrypoints(val, out);
    }
  }
}

function walkTechFiles(rootDir: string, onFile: (relPath: string) => void): void {
  const ignoredDirs = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".nta",
    ".superpowers",
    "graphify-out",
  ]);

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (ignoredDirs.has(entry)) continue;
      const fullPath = join(dir, entry);
      const st = statSync(fullPath);
      if (st.isDirectory()) {
        walk(fullPath);
      } else {
        const rel = relative(rootDir, fullPath).replace(/\\/g, "/");
        onFile(rel);
      }
    }
  };

  if (existsSync(rootDir)) {
    walk(rootDir);
  }
}
