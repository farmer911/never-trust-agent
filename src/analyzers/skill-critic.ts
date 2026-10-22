import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { Finding } from "../types/verdict.ts";
import { collectSourceFiles, walkWorkspaceFiles } from "./evidence-verifier.ts";
import { analyzeSuppressionFraud } from "./suppression-fraud.ts";

export { analyzeSuppressionFraud };

interface MistakeInput {
  readonly title: string;
  readonly ruleId: string;
  readonly where: string;
  readonly how: string;
  readonly why: string;
  readonly prevention: string;
  readonly date?: string;
}

interface MistakeRecord extends MistakeInput {
  readonly id: string;
  readonly date: string;
  readonly line: number;
}

const WEAK_OR_SYCOPHANTIC_SKILL_LINE =
  /\bwhen feasible\b|\bconsider writing\b|^#{1,4}\s+Strengths\b|\byou(?:'re| are) absolutely right\b/i;
const SCRIPT_RUN_REGEX = /\b(?:bun|npm|pnpm|yarn)\s+run\s+([a-zA-Z0-9:_-]+)\b/g;
const FILE_REF_REGEX = /\b((?:scripts|src|references)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)\b/g;
const NO_ANY_MANDATE_REGEX = /\bnever\s+use\s+`?any`?\b|\bno\s+explicit\s+`?any`?\b/i;
const RULE_ID_DEF_REGEX = /\bruleId\s*:\s*['"`](NTA-[A-Z]\d{3})['"`]/g;

export function analyzeSkillAndDocDrift(workspaceRoot: string): Finding[] {
  const findings: Finding[] = [];
  const docFiles = collectSkillAndRuleDocs(workspaceRoot);
  const pkgScripts = readPackageScripts(workspaceRoot);

  const sourceFiles = collectSourceFiles(workspaceRoot);
  const anyViolations: Finding[] = [];
  const codeRules = new Map<string, { readonly file: string; readonly line: number }>();

  for (const absSrc of sourceFiles) {
    const relSrc = relative(workspaceRoot, absSrc).replace(/\\/g, "/");
    if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relSrc)) continue;
    const srcContent = readFileSync(absSrc, "utf8");
    for (const f of analyzeSuppressionFraud(relSrc, srcContent)) {
      if (f.ruleId === "NTA-S001") {
        anyViolations.push(f);
      }
    }
    for (const match of srcContent.matchAll(RULE_ID_DEF_REGEX)) {
      const rId = match[1];
      if (rId && !codeRules.has(rId)) {
        const line = srcContent.slice(0, match.index ?? 0).split("\n").length;
        codeRules.set(rId, { file: relSrc, line });
      }
    }
  }

  const combinedDocsContent = docFiles.map((p) => readFileSync(p, "utf8")).join("\n");
  if (docFiles.length > 0 && codeRules.size > 0) {
    const primaryDoc = relative(workspaceRoot, docFiles[0] ?? "").replace(/\\/g, "/");
    for (const [ruleId, loc] of codeRules.entries()) {
      if (!combinedDocsContent.includes(ruleId)) {
        findings.push({
          ruleId: "NTA-K008",
          category: "SKILL_DRIFT",
          severity: "HIGH",
          file: primaryDoc,
          line: 1,
          message: `Keep-Up-To-Date Drift: rule '${ruleId}' is implemented in ${loc.file}:${loc.line} but missing from project skill/knowledge docs.`,
          evidence: `${loc.file}:${loc.line} defines ${ruleId} (undocumented in ${primaryDoc})`,
          subagent: "SkillAndDocDriftInquisitor",
        });
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

  findings.push(...auditMistakeLedger(workspaceRoot));

  return findings;
}

function makeSkillFinding(opts: {
  readonly ruleId: string;
  readonly severity: "CRITICAL" | "HIGH" | "MEDIUM";
  readonly file: string;
  readonly line: number;
  readonly message: string;
  readonly evidence: string;
}): Finding {
  return {
    ...opts,
    category: "SKILL_DRIFT",
    subagent: "SkillAndDocDriftInquisitor",
  };
}

function auditSkillFrontmatter(
  relDoc: string,
  content: string,
  lines: readonly string[]
): Finding[] {
  const findings: Finding[] = [];
  if (!content.startsWith("---\n")) {
    findings.push(
      makeSkillFinding({
        ruleId: "NTA-K001", severity: "CRITICAL", file: relDoc, line: 1,
        message: "SKILL.md is missing required YAML frontmatter (---).", evidence: (lines[0] ?? "").trim(),
      })
    );
    return findings;
  }

  const endIdx = content.indexOf("\n---", 4);
  if (endIdx === -1) {
    findings.push(
      makeSkillFinding({
        ruleId: "NTA-K001", severity: "CRITICAL", file: relDoc, line: 1,
        message: "SKILL.md has unclosed YAML frontmatter.", evidence: "---",
      })
    );
    return findings;
  }

  const frontmatter = content.slice(4, endIdx);
  const nameMatch = /^name:\s*(.+)$/m.exec(frontmatter);
  const descMatch = /^description:\s*(.+)$/m.exec(frontmatter);

  const rawName = nameMatch?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  if (!rawName || !/^[a-z0-9-]+$/.test(rawName)) {
    findings.push(
      makeSkillFinding({
        ruleId: "NTA-K001", severity: "HIGH", file: relDoc, line: 2,
        message: `Invalid or missing SKILL.md 'name' ('${rawName}'); must use lowercase letters, numbers, and hyphens only.`,
        evidence: nameMatch?.[0] ?? "missing name:",
      })
    );
  }

  const rawDesc = descMatch?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  if (!rawDesc || !/^use when\b/i.test(rawDesc) || /\bI\s+help\b|\bI\s+can\b/i.test(rawDesc)) {
    findings.push(
      makeSkillFinding({
        ruleId: "NTA-K002", severity: "HIGH", file: relDoc, line: 3,
        message: "Stupid SKILL.md description: must be third-person and start with 'Use when...' describing triggering conditions, not workflow or first-person prose.",
        evidence: descMatch?.[0] ?? "missing description:",
      })
    );
  }

  return findings;
}

function collectSkillAndRuleDocs(rootDir: string): string[] {
  const results: string[] = [];
  walkWorkspaceFiles(
    rootDir,
    (_rel, fullPath, entry) => {
      if (
        entry === "SKILL.md" ||
        entry === "AGENTS.md" ||
        entry === "CLAUDE.md" ||
        entry === "GEMINI.md" ||
        entry === ".cursorrules"
      ) {
        results.push(fullPath);
      }
    },
    ["docs"]
  );
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

const MISTAKE_HEADER_REGEX = /^###\s+\[(MISTAKE-\d{3,})\]\s+(.+)$/;
const PLACEHOLDER_VALUE_REGEX = /^(?:todo|tbd|n\/a|none|-|\.\.\.)$/i;

function auditMistakeLedger(workspaceRoot: string): Finding[] {
  const findings: Finding[] = [];
  const ledgerPath = join(workspaceRoot, "MISTAKE_LEDGER.md");
  const growUpSkillPath = join(workspaceRoot, "skills/mistake-ledger-grow-up/SKILL.md");

  if (!existsSync(ledgerPath)) {
    if (existsSync(growUpSkillPath)) {
      findings.push(
        makeSkillFinding({
          ruleId: "NTA-K009", severity: "HIGH", file: "skills/mistake-ledger-grow-up/SKILL.md", line: 1,
          message: "Grow-Up Ledger Missing: skills/mistake-ledger-grow-up/SKILL.md is installed, but MISTAKE_LEDGER.md does not exist at workspace root.",
          evidence: "Missing MISTAKE_LEDGER.md",
        })
      );
    }
    return findings;
  }

  const content = readFileSync(ledgerPath, "utf8");
  const lines = content.split(/\r?\n/);
  const entries = parseMistakeEntries(lines);

  if (entries.length === 0) {
    findings.push(
      makeSkillFinding({
        ruleId: "NTA-K009", severity: "HIGH", file: "MISTAKE_LEDGER.md", line: 1,
        message: "MISTAKE_LEDGER.md exists but contains zero '### [MISTAKE-XXX]' post-mortem entries.",
        evidence: (lines[0] ?? "Empty MISTAKE_LEDGER.md").trim(),
      })
    );
    return findings;
  }

  for (const entry of entries) {
    const missingFields: string[] = [];
    if (!entry.where || PLACEHOLDER_VALUE_REGEX.test(entry.where)) missingFields.push("Where");
    if (!entry.how || PLACEHOLDER_VALUE_REGEX.test(entry.how)) missingFields.push("How");
    if (!entry.why || PLACEHOLDER_VALUE_REGEX.test(entry.why)) missingFields.push("Why");
    if (!entry.prevention || PLACEHOLDER_VALUE_REGEX.test(entry.prevention)) {
      missingFields.push("Prevention");
    }

    if (missingFields.length > 0) {
      findings.push(
        makeSkillFinding({
          ruleId: "NTA-K009", severity: "HIGH", file: "MISTAKE_LEDGER.md", line: entry.line,
          message: `Incomplete Mistake Post-Mortem: ${entry.id} is missing required forensic fields (${missingFields.join(", ")}). Every mistake must document Where, How, Why, and Prevention.`,
          evidence: `${entry.id} (${entry.title}) missing: ${missingFields.join(", ")}`,
        })
      );
    }
  }

  return findings;
}

function parseMistakeEntries(lines: readonly string[]): MistakeRecord[] {
  const records: MistakeRecord[] = [];
  let current: {
    id: string;
    title: string;
    ruleId: string;
    date: string;
    where: string;
    how: string;
    why: string;
    prevention: string;
    line: number;
  } | null = null;

  const flush = () => {
    if (current) {
      records.push({ ...current });
      current = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    const headerMatch = MISTAKE_HEADER_REGEX.exec(line);
    if (headerMatch?.[1] && headerMatch[2]) {
      flush();
      current = {
        id: headerMatch[1],
        title: headerMatch[2].trim(),
        ruleId: "GENERAL",
        date: "",
        where: "",
        how: "",
        why: "",
        prevention: "",
        line: i + 1,
      };
      continue;
    }

    if (!current) continue;

    const ruleMatch = /^-\s+\*\*Rule\s*(?:\([^)]*\))?:\*\*\s*(.+)$/i.exec(line);
    if (ruleMatch?.[1]) {
      current.ruleId = ruleMatch[1].trim().replace(/^`|`$/g, "");
      continue;
    }
    const dateMatch = /^-\s+\*\*Date\s*(?:\([^)]*\))?:\*\*\s*(.+)$/i.exec(line);
    if (dateMatch?.[1]) {
      current.date = dateMatch[1].trim();
      continue;
    }
    const whereMatch = /^-\s+\*\*Where\s*(?:\([^)]*\))?:\*\*\s*(.+)$/i.exec(line);
    if (whereMatch?.[1]) {
      current.where = whereMatch[1].trim();
      continue;
    }
    const howMatch = /^-\s+\*\*How\s*(?:\([^)]*\))?:\*\*\s*(.+)$/i.exec(line);
    if (howMatch?.[1]) {
      current.how = howMatch[1].trim();
      continue;
    }
    const whyMatch = /^-\s+\*\*Why\s*(?:\([^)]*\))?:\*\*\s*(.+)$/i.exec(line);
    if (whyMatch?.[1]) {
      current.why = whyMatch[1].trim();
      continue;
    }
    const prevMatch = /^-\s+\*\*Prevention\s*(?:\([^)]*\))?:\*\*\s*(.+)$/i.exec(line);
    if (prevMatch?.[1]) {
      current.prevention = prevMatch[1].trim();
      continue;
    }
  }
  flush();
  return records;
}

export function queryMistakes(workspaceRoot: string, query = ""): MistakeRecord[] {
  const ledgerPath = join(workspaceRoot, "MISTAKE_LEDGER.md");
  if (!existsSync(ledgerPath)) return [];
  const lines = readFileSync(ledgerPath, "utf8").split(/\r?\n/);
  const entries = parseMistakeEntries(lines);
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.id.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.ruleId.toLowerCase().includes(q) ||
      e.where.toLowerCase().includes(q) ||
      e.how.toLowerCase().includes(q) ||
      e.why.toLowerCase().includes(q) ||
      e.prevention.toLowerCase().includes(q)
  );
}

export function recordMistake(workspaceRoot: string, input: MistakeInput): MistakeRecord {
  const title = input.title.trim();
  const ruleId = input.ruleId.trim() || "GENERAL";
  const where = input.where.trim();
  const how = input.how.trim();
  const why = input.why.trim();
  const prevention = input.prevention.trim();

  if (!title || !where || !how || !why || !prevention) {
    throw new Error(
      "recordMistake requires non-empty title, where, how, why, and prevention fields."
    );
  }

  const ledgerPath = join(workspaceRoot, "MISTAKE_LEDGER.md");
  const existing = queryMistakes(workspaceRoot);
  const nextNum = existing.length + 1;
  const id = `MISTAKE-${String(nextNum).padStart(3, "0")}`;
  const date = input.date?.trim() || new Date().toISOString().slice(0, 10);

  const block = [
    `### [${id}] ${title}`,
    `- **Date (Ngày ghi nhận):** ${date}`,
    `- **Rule (Mã vi phạm):** \`${ruleId}\``,
    `- **Where (Ở đâu):** ${where}`,
    `- **How (Như thế nào):** ${how}`,
    `- **Why (Vì sao sai):** ${why}`,
    `- **Prevention (Giải pháp & Phòng ngừa):** ${prevention}`,
    "",
  ].join("\n");

  if (!existsSync(ledgerPath)) {
    const header = [
      "# MISTAKE_LEDGER.md — Agent Forensic Post-Mortem & Grow-Up Ledger",
      "",
      "> **Axiom:** `KNOWLEDGE EVOLVES DAILY. NO AGENT IS 100% RIGHT — EVERY MISTAKE MUST BE DISSECTED (WHERE, HOW, WHY, PREVENTION) SO IT IS NEVER REPEATED.`",
      "",
      block,
    ].join("\n");
    writeFileSync(ledgerPath, header, "utf8");
  } else {
    const currentContent = readFileSync(ledgerPath, "utf8").trimEnd();
    writeFileSync(ledgerPath, `${currentContent}\n\n${block}`, "utf8");
  }

  const updated = queryMistakes(workspaceRoot, id);
  return (
    updated[0] ?? {
      id,
      title,
      ruleId,
      date,
      where,
      how,
      why,
      prevention,
      line: 1,
    }
  );
}
