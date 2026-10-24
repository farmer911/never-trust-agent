import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Finding, PlatformAuditReport, TechStackProfile } from "../types/verdict.ts";
import { enrichFindingWithBrutalCritique, walkWorkspaceFiles } from "./evidence-verifier.ts";

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
  /(?:^|\/)(?:app\/(?:.*\/)?(?:page|layout|route|loading|error|not-found|_layout|index|robots|sitemap)\.[cm]?[jt]sx?|pages\/.*\.[cm]?[jt]sx?|routes\/.*\.[cm]?[jt]sx?|scripts\/.*\.[cm]?[jt]sx?|middleware\.[cm]?[jt]s|index\.[cm]?[jt]sx?|public\/.*\.js|[a-z0-9-]+\.config\.[cm]?[jt]s)$/i;
const MONOREPO_SUBDIRS = ["", "frontend", "backend", "mobile", "qc", "web", "server", "api"] as const;

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
  let hasAnyPkgJson = false;

  for (const sub of MONOREPO_SUBDIRS) {
    const dir = sub ? join(workspaceRoot, sub) : workspaceRoot;
    const subPkgPath = join(dir, "package.json");
    if (!existsSync(subPkgPath)) continue;
    hasAnyPkgJson = true;
    try {
      const pkg = JSON.parse(readFileSync(subPkgPath, "utf8")) as RawPackageJson;
      allDeps = { ...allDeps, ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      scripts = { ...scripts, ...(pkg.scripts ?? {}) };
      const prefix = sub ? `${sub}/` : "";

      if (pkg.packageManager) {
        if (pkg.packageManager.startsWith("pnpm")) packageManager = "pnpm";
        else if (pkg.packageManager.startsWith("yarn")) packageManager = "yarn";
        else if (pkg.packageManager.startsWith("bun")) packageManager = "bun";
        else if (pkg.packageManager.startsWith("npm")) packageManager = "npm";
      }

      if (typeof pkg.main === "string") discoveredEntrypoints.add(`${prefix}${cleanRelPath(pkg.main)}`);
      if (typeof pkg.module === "string") discoveredEntrypoints.add(`${prefix}${cleanRelPath(pkg.module)}`);
      if (typeof pkg.bin === "string") {
        discoveredEntrypoints.add(`${prefix}${cleanRelPath(pkg.bin)}`);
      } else if (pkg.bin && typeof pkg.bin === "object") {
        for (const target of Object.values(pkg.bin)) {
          if (typeof target === "string") discoveredEntrypoints.add(`${prefix}${cleanRelPath(target)}`);
        }
      }
      collectExportEntrypoints(pkg.exports, discoveredEntrypoints);
    } catch {
      // Ignore malformed package.json
    }
  }

  // Lockfile & manifest detection across root and monorepo subdirs
  const hasSubFile = (name: string) =>
    MONOREPO_SUBDIRS.some((s) => existsSync(join(workspaceRoot, s, name)));

  if (
    hasSubFile("bun.lock") ||
    hasSubFile("bun.lockb") ||
    "@types/bun" in allDeps ||
    Object.values(scripts).some((s) => /\bbun\b/.test(s))
  ) {
    runtime = "bun";
    if (packageManager === "npm") packageManager = "bun";
  }
  if (hasSubFile("pnpm-lock.yaml")) packageManager = "pnpm";
  if (hasSubFile("yarn.lock")) packageManager = "yarn";

  if (hasSubFile("pyproject.toml") || hasSubFile("requirements.txt")) {
    languages.add("Python");
    for (const sub of MONOREPO_SUBDIRS) {
      const reqFile = join(workspaceRoot, sub, "requirements.txt");
      if (existsSync(reqFile)) {
        const reqText = readFileSync(reqFile, "utf8");
        if (/\bfastapi\b/i.test(reqText)) frameworks.add("FastAPI");
        if (/\bpytest\b/i.test(reqText)) frameworks.add("Pytest");
      }
    }
    if (!hasAnyPkgJson) {
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
  if ("expo" in allDeps || "react-native" in allDeps) frameworks.add("Expo / React Native");
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
    "@tailwindcss/postcss" in allDeps ||
    hasSubFile("tailwind.config.js") ||
    hasSubFile("tailwind.config.ts")
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
  const pushE006 = (file: string, line: number, message: string, evidence: string) => {
    findings.push(
      enrichFindingWithBrutalCritique(
        {
          ruleId: "NTA-E006",
          category: "EVIDENCE_FRAUD",
          severity: "CRITICAL",
          file,
          line,
          message,
          evidence,
        },
        stack
      )
    );
  };

  if (!stack || !stack.runtime || !stack.packageManager || !stack.testRunner) {
    pushE006(
      report.repoMeta.localPath || ".",
      1,
      "Missing Tech-Stack Reconnaissance (NTA-E006): audit ran without fingerprinting project runtime, package manager, frameworks, and test runner.",
      "Missing report.techStack profile"
    );
    return findings;
  }

  const entrypointSet = new Set(stack.discoveredEntrypoints);

  for (const f of report.findings) {
    if (f.ruleId === "NTA-P003" && entrypointSet.has(f.file)) {
      pushE006(
        f.file,
        f.line,
        `Tech-Stack Mismatch / Self-Backfire Risk (NTA-E006): '${f.file}' is a declared framework route or package.json entrypoint in [${stack.groundingSummary}], NOT an orphan file.`,
        `${f.ruleId} falsely flagged entrypoint '${f.file}'`
      );
    }

    const combinedText = `${f.whyItIsWrong ?? ""} ${f.directFix ?? ""}`;
    if (stack.runtime !== "rust" && /\bcargo\s+(?:test|build|check)\b/i.test(combinedText)) {
      pushE006(
        f.file,
        f.line,
        `Tech-Stack Mismatch / Self-Backfire Risk (NTA-E006): critique recommends Rust 'cargo' commands on a ${stack.runtime}/${stack.packageManager} project.`,
        combinedText.trim()
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
  walkWorkspaceFiles(rootDir, (relPath) => onFile(relPath));
}
