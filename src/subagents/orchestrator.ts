import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { analyzeCssAndUi } from "../analyzers/css-critic.ts";
import { analyzeDefects } from "../analyzers/defect-scanner.ts";
import { computeWorkspaceHash } from "../analyzers/evidence-verifier.ts";
import { analyzeGraphAndTokenOptimization } from "../analyzers/graph-optimizer.ts";
import {
  analyzePhantomCode,
  findDuplicateBlocks,
  findOrphanExports,
  findOrphanFiles,
} from "../analyzers/phantom-code.ts";
import { analyzeSkillAndDocDrift } from "../analyzers/skill-critic.ts";
import { analyzeSuppressionFraud } from "../analyzers/suppression-fraud.ts";
import { analyzeTestFraud } from "../analyzers/test-fraud.ts";
import { syncRepository } from "../repo/git-manager.ts";
import type { Finding, PlatformAuditReport, SubagentSummary } from "../types/verdict.ts";

interface IndexedWorkspace {
  readonly root: string;
  readonly allFiles: ReadonlyMap<string, string>;
  readonly codeFiles: ReadonlyMap<string, string>;
  readonly totalLines: number;
}

export async function runInquisitorSubagents(
  repoUrlOrPath: string,
  cacheBaseDir: string
): Promise<PlatformAuditReport> {
  const repoMeta = syncRepository(repoUrlOrPath, cacheBaseDir);
  const ws = indexWorkspace(repoMeta.localPath);
  const entrypoints = detectEntrypoints(ws.codeFiles);
  const graphOpt = analyzeGraphAndTokenOptimization(ws.root);

  const subagentDefinitions: readonly {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly run: () => Finding[];
  }[] = [
    {
      id: "subagent-test-fraud",
      name: "TestInquisitor",
      role: "Audits empty tests, tautologies, mirror assertions, mock existence checks, and arbitrary sleeps",
      run: () => {
        const out: Finding[] = [];
        for (const [rel, content] of ws.codeFiles.entries()) {
          if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel)) {
            for (const f of analyzeTestFraud(rel, content)) {
              out.push({ ...f, subagent: "TestInquisitor" });
            }
          }
        }
        return out;
      },
    },
    {
      id: "subagent-type-error",
      name: "TypeAndErrorInquisitor",
      role: "Hunts explicit any, double casts, @ts-ignore, linter disables, and swallowed catch blocks",
      run: () => {
        const out: Finding[] = [];
        for (const [rel, content] of ws.codeFiles.entries()) {
          for (const f of analyzeSuppressionFraud(rel, content)) {
            out.push({ ...f, subagent: "TypeAndErrorInquisitor" });
          }
        }
        return out;
      },
    },
    {
      id: "subagent-dead-dup",
      name: "DeadAndDuplicateCodeInquisitor",
      role: "Exposes orphan files, dead exports, multi-line duplicate code blocks, and unimplemented stubs",
      run: () => {
        const out: Finding[] = [];
        for (const [rel, content] of ws.codeFiles.entries()) {
          if (!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel)) {
            for (const f of analyzePhantomCode(rel, content)) {
              out.push({ ...f, subagent: "DeadAndDuplicateCodeInquisitor" });
            }
          }
        }
        for (const f of findOrphanFiles(ws.codeFiles, entrypoints)) {
          out.push({ ...f, subagent: "DeadAndDuplicateCodeInquisitor" });
        }
        for (const f of findOrphanExports(ws.codeFiles, entrypoints)) {
          out.push({ ...f, subagent: "DeadAndDuplicateCodeInquisitor" });
        }
        for (const f of findDuplicateBlocks(ws.codeFiles)) {
          out.push({ ...f, subagent: "DeadAndDuplicateCodeInquisitor" });
        }
        return out;
      },
    },
    {
      id: "subagent-css-ui",
      name: "CssAndUiInquisitor",
      role: "Nitpicks !important overrides, hardcoded hex/rgb colors, magic z-index, outline:none, and duplicate CSS",
      run: () => {
        const out: Finding[] = [];
        for (const [rel, content] of ws.allFiles.entries()) {
          for (const f of analyzeCssAndUi(rel, content)) {
            out.push({ ...f, subagent: "CssAndUiInquisitor" });
          }
        }
        return out;
      },
    },
    {
      id: "subagent-skill-drift",
      name: "SkillAndDocDriftInquisitor",
      role: "Audits SKILL.md stupidity, bad frontmatter, broken file/script references, and rule-vs-code hypocrisy",
      run: () =>
        analyzeSkillAndDocDrift(ws.root).map((f) => ({
          ...f,
          subagent: "SkillAndDocDriftInquisitor",
        })),
    },
    {
      id: "subagent-runtime-security",
      name: "RuntimeAndSecurityInquisitor",
      role: "Scans for dynamic eval, unguarded fetch without AbortSignal, and unawaited async forEach loops",
      run: () => {
        const out: Finding[] = [];
        for (const [rel, content] of ws.codeFiles.entries()) {
          if (!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel)) {
            for (const f of analyzeDefects(rel, content)) {
              out.push({ ...f, subagent: "RuntimeAndSecurityInquisitor" });
            }
          }
        }
        return out;
      },
    },
    {
      id: "subagent-graph-token",
      name: "GraphAndTokenInquisitor",
      role: "Audits Graphify AST topology, God Node coupling bottlenecks (NTA-G001), and RTK/Graphify token savings (NTA-G002)",
      run: () => graphOpt.findings.map((f) => ({ ...f, subagent: "GraphAndTokenInquisitor" })),
    },
  ];

  const subagentReports: SubagentSummary[] = await Promise.all(
    subagentDefinitions.map(async (def) => {
      const t0 = performance.now();
      const subFindings = await Promise.resolve(def.run());
      const durationMs = Math.max(1, Math.round(performance.now() - t0));
      return {
        id: def.id,
        name: def.name,
        role: def.role,
        findingsCount: subFindings.length,
        criticalCount: subFindings.filter((f) => f.severity === "CRITICAL").length,
        highCount: subFindings.filter((f) => f.severity === "HIGH").length,
        mediumCount: subFindings.filter((f) => f.severity === "MEDIUM").length,
        nitpickCount: subFindings.filter((f) => f.severity === "NITPICK").length,
        durationMs,
        findings: subFindings,
      };
    })
  );

  const allFindings = subagentReports.flatMap((r) => r.findings);
  const penalty = allFindings.reduce((acc, f) => {
    if (f.severity === "CRITICAL") return acc + 12;
    if (f.severity === "HIGH") return acc + 6;
    if (f.severity === "MEDIUM") return acc + 3;
    return acc + 1;
  }, 0);
  const integrityScore = Math.max(0, 100 - penalty);

  return {
    repoMeta,
    workspaceHash: computeWorkspaceHash(ws.root),
    scannedFilesCount: ws.allFiles.size,
    totalLinesScanned: ws.totalLines,
    totalFindings: allFindings.length,
    integrityScore,
    passed: allFindings.length === 0,
    tokenOptimization: graphOpt.telemetry,
    subagentReports,
    findings: allFindings,
  };
}

function indexWorkspace(rootDir: string): IndexedWorkspace {
  const allFiles = new Map<string, string>();
  const codeFiles = new Map<string, string>();
  let totalLines = 0;

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
      } else if (
        /\.(?:[cm]?[jt]sx?|css|scss|less|html|md|sh|json|yaml|yml)$/.test(entry) &&
        st.size < 512_000
      ) {
        const rel = relative(rootDir, fullPath).replace(/\\/g, "/");
        const content = readFileSync(fullPath, "utf8");
        allFiles.set(rel, content);
        totalLines += content.split("\n").length;
        if (/\.[cm]?[jt]sx?$/.test(entry)) {
          codeFiles.set(rel, content);
        }
      }
    }
  };

  if (existsSync(rootDir)) {
    walk(rootDir);
  }

  return { root: rootDir, allFiles, codeFiles, totalLines };
}

function detectEntrypoints(codeFiles: ReadonlyMap<string, string>): string[] {
  const defaults = [
    "src/index.ts",
    "src/main.ts",
    "src/cli/index.ts",
    "src/web/server.ts",
    "index.ts",
    "index.js",
  ];
  return defaults.filter((p) => codeFiles.has(p));
}
