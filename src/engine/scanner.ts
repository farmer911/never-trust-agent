import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { analyzeDefects } from "../analyzers/defect-scanner.ts";
import {
  collectSourceFiles,
  computeWorkspaceHash,
  enrichFindingWithBrutalCritique,
} from "../analyzers/evidence-verifier.ts";
import { analyzePhantomCode, findOrphanFiles } from "../analyzers/phantom-code.ts";
import { analyzeSkillAndDocDrift } from "../analyzers/skill-critic.ts";
import { analyzeSuppressionFraud } from "../analyzers/suppression-fraud.ts";
import { detectProjectTechStack } from "../analyzers/tech-stack-detector.ts";
import { analyzeTestFraud } from "../analyzers/test-fraud.ts";
import type { Finding, ScanReport } from "../types/verdict.ts";

export interface ScanOptions {
  readonly entrypoints?: readonly string[];
}

export function scanWorkspace(
  workspaceRoot: string,
  options: ScanOptions = {}
): ScanReport {
  const root = resolve(workspaceRoot);
  const absFiles = collectSourceFiles(root);
  const fileMap = new Map<string, string>();
  const findings: Finding[] = [];

  for (const absPath of absFiles) {
    const relPath = relative(root, absPath).replace(/\\/g, "/");
    const content = readFileSync(absPath, "utf8");
    fileMap.set(relPath, content);

    const isTestFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relPath);
    if (isTestFile) {
      findings.push(...analyzeTestFraud(relPath, content));
    } else {
      findings.push(...analyzePhantomCode(relPath, content));
      findings.push(...analyzeDefects(relPath, content));
    }

    findings.push(...analyzeSuppressionFraud(relPath, content));
  }

  const techStack = detectProjectTechStack(root);
  const entrypoints = options.entrypoints ?? [
    ...new Set(["src/index.ts", "src/cli/index.ts", ...techStack.discoveredEntrypoints]),
  ];
  findings.push(...findOrphanFiles(fileMap, entrypoints));
  findings.push(...analyzeSkillAndDocDrift(root));
  const enrichedFindings = findings.map((f) => enrichFindingWithBrutalCritique(f, techStack));

  return {
    workspaceRoot: root,
    workspaceHash: computeWorkspaceHash(root),
    scannedFiles: absFiles.length,
    passed: enrichedFindings.length === 0,
    findings: enrichedFindings,
  };
}
