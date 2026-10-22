import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Citation, Finding, VerdictReceipt } from "../types/verdict.ts";

const SYCOPHANCY_OR_SPECULATION_PATTERNS: readonly {
  readonly pattern: RegExp;
  readonly reason: string;
}[] = [
  {
    pattern: /\byou(?:'re| are) absolutely right\b|\bgreat point\b|\bexcellent feedback\b|\bthanks for catching\b/i,
    reason: "Performative sycophancy is forbidden (receiving-code-review protocol).",
  },
  {
    pattern: /\bshould work now\b|\bprobably fixed\b|\bseems to pass\b|\blooks good to me\b/i,
    reason: "Speculative completion claim without fresh deterministic evidence.",
  },
  {
    pattern: /^#{1,4}\s+Strengths\b/i,
    reason: "Praise/Strengths section is forbidden in NeverTrustAgent forensic audits.",
  },
];

export function verifyCitations(
  workspaceRoot: string,
  citations: readonly Citation[]
): Finding[] {
  const findings: Finding[] = [];

  for (const cite of citations) {
    const absPath = join(workspaceRoot, cite.file);
    if (!existsSync(absPath)) {
      findings.push({
        ruleId: "NTA-E001",
        category: "EVIDENCE_FRAUD",
        severity: "CRITICAL",
        file: cite.file,
        line: cite.startLine,
        message: `Fabricated file citation: '${cite.file}' does not exist on disk.`,
        evidence: `${cite.file}#L${cite.startLine}-L${cite.endLine}`,
      });
      continue;
    }

    const totalLines = readFileSync(absPath, "utf8").split("\n").length;
    if (cite.startLine < 1 || cite.endLine > totalLines || cite.startLine > cite.endLine) {
      findings.push({
        ruleId: "NTA-E002",
        category: "EVIDENCE_FRAUD",
        severity: "CRITICAL",
        file: cite.file,
        line: cite.startLine,
        message: `Out-of-bounds line citation: requested L${cite.startLine}-L${cite.endLine} but file has ${totalLines} lines.`,
        evidence: `${cite.file}#L${cite.startLine}-L${cite.endLine}`,
      });
    }
  }

  return findings;
}

export function analyzeAgentReportLanguage(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;

    for (const rule of SYCOPHANCY_OR_SPECULATION_PATTERNS) {
      if (rule.pattern.test(line)) {
        findings.push({
          ruleId: "NTA-E003",
          category: "EVIDENCE_FRAUD",
          severity: "HIGH",
          file,
          line: lineNum,
          message: rule.reason,
          evidence: line.trim(),
        });
      }
    }
  }

  return findings;
}

export function computeWorkspaceHash(workspaceRoot: string): string {
  const hash = createHash("sha256");
  const files = collectSourceFiles(workspaceRoot).sort();

  for (const absPath of files) {
    const relPath = relative(workspaceRoot, absPath).replace(/\\/g, "/");
    hash.update(`FILE:${relPath}\n`);
    hash.update(readFileSync(absPath));
    hash.update("\n");
  }

  return hash.digest("hex");
}

export function createVerdictReceipt(
  workspaceRoot: string,
  meta: {
    readonly command: string;
    readonly exitCode: number;
    readonly findingsCount: number;
  }
): VerdictReceipt {
  return {
    workspaceHash: computeWorkspaceHash(workspaceRoot),
    timestamp: new Date().toISOString(),
    command: meta.command,
    exitCode: meta.exitCode,
    findingsCount: meta.findingsCount,
  };
}

export function verifyVerdictReceipt(
  workspaceRoot: string,
  receipt: VerdictReceipt
): Finding[] {
  const currentHash = computeWorkspaceHash(workspaceRoot);
  const findings: Finding[] = [];

  if (currentHash !== receipt.workspaceHash) {
    findings.push({
      ruleId: "NTA-E004",
      category: "EVIDENCE_FRAUD",
      severity: "CRITICAL",
      file: ".",
      line: 1,
      message:
        "Stale VerdictReceipt: workspace files were modified after verification command ran.",
      evidence: `expected=${receipt.workspaceHash.slice(0, 12)} actual=${currentHash.slice(0, 12)}`,
    });
  }

  if (receipt.exitCode !== 0 || receipt.findingsCount > 0) {
    findings.push({
      ruleId: "NTA-E004",
      category: "EVIDENCE_FRAUD",
      severity: "CRITICAL",
      file: ".",
      line: 1,
      message: `VerdictReceipt records failed verification (exitCode=${receipt.exitCode}, findings=${receipt.findingsCount}).`,
      evidence: receipt.command,
    });
  }

  return findings;
}

export function collectSourceFiles(rootDir: string): string[] {
  const results: string[] = [];
  const ignoredDirs = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".nta",
    ".superpowers",
  ]);

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (ignoredDirs.has(entry)) continue;
      const fullPath = join(dir, entry);
      const st = statSync(fullPath);
      if (st.isDirectory()) {
        walk(fullPath);
      } else if (/\.[cm]?[jt]sx?$/.test(entry)) {
        results.push(fullPath);
      }
    }
  };

  if (existsSync(rootDir)) {
    walk(rootDir);
  }
  return results;
}
