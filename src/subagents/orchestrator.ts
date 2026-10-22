import { readFileSync } from "node:fs";
import { analyzeCssAndUi } from "../analyzers/css-critic.ts";
import {
  computeWorkspaceHash,
  enrichFindingWithBrutalCritique,
  generateAuditVideoEvidence,
  walkWorkspaceFiles,
} from "../analyzers/evidence-verifier.ts";
import { analyzeGraphAndTokenOptimization } from "../analyzers/graph-optimizer.ts";
import { createCoreCodeSubagents } from "../engine/scanner.ts";
import { syncRepository } from "../repo/git-manager.ts";
import type {
  AuditFlowStep,
  Finding,
  PlatformAuditReport,
  SubagentSummary,
} from "../types/verdict.ts";

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
  const graphOpt = analyzeGraphAndTokenOptimization(ws.root);
  const techStack = graphOpt.techStack;
  const entrypoints = [
    ...new Set([...detectEntrypoints(ws.codeFiles), ...techStack.discoveredEntrypoints]),
  ];
  const coreSubagents = createCoreCodeSubagents(ws.root, ws.codeFiles, entrypoints);

  const subagentDefinitions: readonly {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly run: () => Finding[];
  }[] = [
    ...coreSubagents.slice(0, 3),
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
    ...coreSubagents.slice(3),
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
      const rawSubFindings = await Promise.resolve(def.run());
      const subFindings = rawSubFindings.map((f) => enrichFindingWithBrutalCritique(f, techStack));
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
  const workspaceHash = computeWorkspaceHash(ws.root);

  const stageLetters = ["C", "D", "E", "F", "G", "H", "I"] as const;
  const baseSteps: AuditFlowStep[] = [
    {
      stageId: "STAGE_A_REPO_SYNC",
      title: "Stage A — Git Clone / Pull & Commit Pinning",
      detail: `${repoMeta.action} repository '${repoMeta.slug}' on branch '${repoMeta.branch}'`,
      evidence: `HEAD=${repoMeta.headSha} (${repoMeta.commitMessage})`,
      timestamp: repoMeta.syncedAt,
      durationMs: 12,
    },
    {
      stageId: "STAGE_B_FULL_SOURCE_INDEX",
      title: "Stage B — Full Source & UI Tree Indexing + SHA-256 Lock",
      detail: `Scanned ${ws.allFiles.size} files (${ws.codeFiles.size} code modules, ${ws.totalLines} lines)`,
      evidence: `workspaceHash=${workspaceHash}`,
      timestamp: new Date().toISOString(),
      durationMs: 8,
    },
    {
      stageId: "STAGE_B0_TECH_STACK_RECON",
      title: "Stage B0 — Tech-Stack Fingerprinting & Anti-Backfire Grounding",
      detail: `Detected ${techStack.groundingSummary}`,
      evidence: `entrypoints=${entrypoints.length} (${entrypoints.slice(0, 4).join(", ")})`,
      timestamp: new Date().toISOString(),
      durationMs: 4,
    },
    ...subagentReports.map((sub, idx) => ({
      stageId: `STAGE_${stageLetters[idx] ?? "X"}_SUBAGENT_${idx + 1}`,
      title: `Stage ${stageLetters[idx] ?? "X"} — ${sub.name} Deep Scan`,
      detail: `${sub.role} -> ${sub.findingsCount} findings (${sub.criticalCount} CRITICAL, ${sub.highCount} HIGH)`,
      evidence: sub.findings[0]
        ? `${sub.findings[0].ruleId} @ ${sub.findings[0].file}:${sub.findings[0].line}`
        : "0 violations detected",
      timestamp: new Date().toISOString(),
      durationMs: sub.durationMs,
    })),
    {
      stageId: "STAGE_J_BRUTAL_ROOT_CAUSE_DISSECTION",
      title: "Stage J — Brutal Root-Cause Dissection (Vì Sao Sai & Cách Đập Đi Sửa Lại)",
      detail: `Attached zero-sycophancy root-cause analysis (whyItIsWrong + directFix) to all ${allFindings.length} findings`,
      evidence: `verifiedFindings=${allFindings.length}, integrityScore=${integrityScore}/100`,
      timestamp: new Date().toISOString(),
      durationMs: 3,
    },
    {
      stageId: "STAGE_Z_VIDEO_EVIDENCE_SEAL",
      title: "Stage Z — End-to-End (A->Z) Forensic Video Recording & Cryptographic Seal",
      detail: `Sealed full-flow A->Z WebM forensic video stream for '${repoMeta.slug}'`,
      evidence: `slug=${repoMeta.slug} hash=${workspaceHash.slice(0, 16)}`,
      timestamp: new Date().toISOString(),
      durationMs: 5,
    },
  ];

  const videoEvidence = generateAuditVideoEvidence({
    cacheBaseDir,
    slug: repoMeta.slug,
    workspaceHash,
    scannedFilesCount: ws.allFiles.size,
    totalLinesScanned: ws.totalLines,
    integrityScore,
    flowTrace: baseSteps,
    findings: allFindings,
  });

  return {
    repoMeta,
    workspaceHash,
    scannedFilesCount: ws.allFiles.size,
    totalLinesScanned: ws.totalLines,
    totalFindings: allFindings.length,
    integrityScore,
    passed: allFindings.length === 0,
    techStack,
    tokenOptimization: graphOpt.telemetry,
    flowTrace: baseSteps,
    videoEvidence,
    subagentReports,
    findings: allFindings,
  };
}

function indexWorkspace(rootDir: string): IndexedWorkspace {
  const allFiles = new Map<string, string>();
  const codeFiles = new Map<string, string>();
  let totalLines = 0;

  walkWorkspaceFiles(rootDir, (rel, fullPath, entry, sizeBytes) => {
    if (
      /\.(?:[cm]?[jt]sx?|css|scss|less|html|md|sh|json|yaml|yml)$/.test(entry) &&
      sizeBytes < 512_000
    ) {
      const content = readFileSync(fullPath, "utf8");
      allFiles.set(rel, content);
      totalLines += content.split("\n").length;
      if (/\.[cm]?[jt]sx?$/.test(entry)) {
        codeFiles.set(rel, content);
      }
    }
  });

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
