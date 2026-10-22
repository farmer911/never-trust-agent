import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { Finding } from "../types/verdict.ts";
import { collectSourceFiles } from "./evidence-verifier.ts";
import { analyzeSuppressionFraud } from "./suppression-fraud.ts";

const WEAK_OR_SYCOPHANTIC_SKILL_LINE =
  /\bwhen feasible\b|\bconsider writing\b|^#{1,4}\s+Strengths\b|\byou(?:'re| are) absolutely right\b/i;
const SCRIPT_RUN_REGEX = /\b(?:bun|npm|pnpm|yarn)\s+run\s+([a-zA-Z0-9:_-]+)\b/g;
const FILE_REF_REGEX = /\b((?:scripts|src|references)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)\b/g;
const NO_ANY_MANDATE_REGEX = /\bnever\s+use\s+`?any`?\b|\bno\s+explicit\s+`?any`?\b/i;

export function analyzeSkillAndDocDrift(workspaceRoot: string): Finding[] {
  const findings: Finding[] = [];
  const docFiles = collectSkillAndRuleDocs(workspaceRoot);
  const pkgScripts = readPackageScripts(workspaceRoot);

  const sourceFiles = collectSourceFiles(workspaceRoot);
  const anyViolations: Finding[] = [];
  for (const absSrc of sourceFiles) {
    const relSrc = relative(workspaceRoot, absSrc).replace(/\\/g, "/");
    if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relSrc)) continue;
    const srcContent = readFileSync(absSrc, "utf8");
    for (const f of analyzeSuppressionFraud(relSrc, srcContent)) {
      if (f.ruleId === "NTA-S001") {
        anyViolations.push(f);
      }
    }
  }

  for (const absDoc of docFiles) {
    const relDoc = relative(workspaceRoot, absDoc).replace(/\\/g, "/");
    const content = readFileSync(absDoc, "utf8");
    const lines = content.split("\n");
    const isSkillMd = relDoc.endsWith("SKILL.md");

    if (isSkillMd) {
      findings.push(...auditSkillFrontmatter(relDoc, content, lines));
      if (lines.length > 500) {
        findings.push({
          ruleId: "NTA-K004",
          category: "SKILL_DRIFT",
          severity: "MEDIUM",
          file: relDoc,
          line: 501,
          message: `Bloated SKILL.md (${lines.length} lines > 500 max); extract heavy reference into references/.`,
          evidence: `${relDoc} (${lines.length} lines)`,
          subagent: "SkillAndDocDriftInquisitor",
        });
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const lineNum = i + 1;

      if (WEAK_OR_SYCOPHANTIC_SKILL_LINE.test(line) && !line.includes("NTA-E003") && !line.includes("❌")) {
        findings.push({
          ruleId: "NTA-K003",
          category: "SKILL_DRIFT",
          severity: "HIGH",
          file: relDoc,
          line: lineNum,
          message:
            "Skill/rule contains weak wishy-washy phrasing or sycophancy priming (Strengths/praise).",
          evidence: line.trim(),
          subagent: "SkillAndDocDriftInquisitor",
        });
      }

      for (const refMatch of line.matchAll(FILE_REF_REGEX)) {
        const refPath = refMatch[1];
        if (!refPath || isExamplePlaceholderPath(refPath)) continue;
        const inRepoRoot = existsSync(join(workspaceRoot, refPath));
        const inSkillDir = existsSync(join(dirname(absDoc), refPath));
        if (!inRepoRoot && !inSkillDir) {
          findings.push({
            ruleId: "NTA-K005",
            category: "SKILL_DRIFT",
            severity: "CRITICAL",
            file: relDoc,
            line: lineNum,
            message: `Skill-to-Code Drift: doc references '${refPath}', which does not exist in the repository.`,
            evidence: line.trim(),
            subagent: "SkillAndDocDriftInquisitor",
          });
        }
      }

      if (pkgScripts !== null) {
        for (const cmdMatch of line.matchAll(SCRIPT_RUN_REGEX)) {
          const scriptName = cmdMatch[1];
          if (!scriptName || scriptName === "src" || scriptName.includes(".")) continue;
          if (!pkgScripts.has(scriptName)) {
            findings.push({
              ruleId: "NTA-K006",
              category: "SKILL_DRIFT",
              severity: "CRITICAL",
              file: relDoc,
              line: lineNum,
              message: `Skill-to-Code Drift: doc instructs running '${scriptName}', but package.json has no such script.`,
              evidence: line.trim(),
              subagent: "SkillAndDocDriftInquisitor",
            });
          }
        }
      }

      if (NO_ANY_MANDATE_REGEX.test(line) && anyViolations.length > 0) {
        const firstViolation = anyViolations[0];
        if (firstViolation) {
          findings.push({
            ruleId: "NTA-K007",
            category: "SKILL_DRIFT",
            severity: "CRITICAL",
            file: relDoc,
            line: lineNum,
            message: `Hypocrisy Drift: skill forbids 'any' at ${relDoc}:${lineNum}, but code violates it at ${firstViolation.file}:${firstViolation.line}.`,
            evidence: `Rule: "${line.trim()}" vs Code (${firstViolation.file}:${firstViolation.line}): "${firstViolation.evidence}"`,
            subagent: "SkillAndDocDriftInquisitor",
          });
        }
      }
    }
  }

  return findings;
}

function auditSkillFrontmatter(
  relDoc: string,
  content: string,
  lines: readonly string[]
): Finding[] {
  const findings: Finding[] = [];
  if (!content.startsWith("---\n")) {
    findings.push({
      ruleId: "NTA-K001",
      category: "SKILL_DRIFT",
      severity: "CRITICAL",
      file: relDoc,
      line: 1,
      message: "SKILL.md is missing required YAML frontmatter (---).",
      evidence: (lines[0] ?? "").trim(),
      subagent: "SkillAndDocDriftInquisitor",
    });
    return findings;
  }

  const endIdx = content.indexOf("\n---", 4);
  if (endIdx === -1) {
    findings.push({
      ruleId: "NTA-K001",
      category: "SKILL_DRIFT",
      severity: "CRITICAL",
      file: relDoc,
      line: 1,
      message: "SKILL.md has unclosed YAML frontmatter.",
      evidence: "---",
      subagent: "SkillAndDocDriftInquisitor",
    });
    return findings;
  }

  const frontmatter = content.slice(4, endIdx);
  const nameMatch = /^name:\s*(.+)$/m.exec(frontmatter);
  const descMatch = /^description:\s*(.+)$/m.exec(frontmatter);

  const rawName = nameMatch?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  if (!rawName || !/^[a-z0-9-]+$/.test(rawName)) {
    findings.push({
      ruleId: "NTA-K001",
      category: "SKILL_DRIFT",
      severity: "HIGH",
      file: relDoc,
      line: 2,
      message: `Invalid or missing SKILL.md 'name' ('${rawName}'); must use lowercase letters, numbers, and hyphens only.`,
      evidence: nameMatch?.[0] ?? "missing name:",
      subagent: "SkillAndDocDriftInquisitor",
    });
  }

  const rawDesc = descMatch?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  if (!rawDesc || !/^use when\b/i.test(rawDesc) || /\bI\s+help\b|\bI\s+can\b/i.test(rawDesc)) {
    findings.push({
      ruleId: "NTA-K002",
      category: "SKILL_DRIFT",
      severity: "HIGH",
      file: relDoc,
      line: 3,
      message:
        "Stupid SKILL.md description: must be third-person and start with 'Use when...' describing triggering conditions, not workflow or first-person prose.",
      evidence: descMatch?.[0] ?? "missing description:",
      subagent: "SkillAndDocDriftInquisitor",
    });
  }

  return findings;
}

function collectSkillAndRuleDocs(rootDir: string): string[] {
  const results: string[] = [];
  const ignoredDirs = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".nta",
    ".superpowers",
    "docs",
  ]);

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (ignoredDirs.has(entry)) continue;
      const fullPath = join(dir, entry);
      const st = statSync(fullPath);
      if (st.isDirectory()) {
        walk(fullPath);
      } else if (
        entry === "SKILL.md" ||
        entry === "AGENTS.md" ||
        entry === "CLAUDE.md" ||
        entry === "GEMINI.md" ||
        entry === ".cursorrules"
      ) {
        results.push(fullPath);
      }
    }
  };

  if (existsSync(rootDir)) {
    walk(rootDir);
  }
  return results;
}

function readPackageScripts(workspaceRoot: string): Set<string> | null {
  const pkgPath = join(workspaceRoot, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    return new Set(Object.keys(raw.scripts ?? {}));
  } catch {
    return null;
  }
}

function isExamplePlaceholderPath(refPath: string): boolean {
  return (
    refPath.includes("tool.sh") ||
    refPath.includes("tool.js") ||
    refPath.includes("example.")
  );
}
