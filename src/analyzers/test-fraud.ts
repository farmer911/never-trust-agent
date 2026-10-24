import type { Finding } from "../types/verdict.ts";

const TEST_BLOCK_START = /^[ \t]*(?:test|it)\s*\(\s*(['"`])([\s\S]*?)\1\s*,/gm;
const SKIP_OR_ONLY_PATTERN =
  /^[ \t]*(?:test|it|describe)\.(?:skip|only|todo)\s*\(|^[ \t]*(?:xit|xdescribe|fit|fdescribe)\s*\(/;
const TAUTOLOGY_PATTERN =
  /^[ \t]*expect\s*\(\s*(true|false|1|0|'[^']*'|"[^"]*")\s*\)\s*\.\s*toBe\s*\(\s*\1\s*\)/;
const MOCK_TESTID_PATTERN =
  /^[ \t]*expect\s*\([^)]*getByTestId\s*\(\s*['"`][^'"`]*-mock['"`]\s*\)[^)]*\)/;
const ARBITRARY_SLEEP_PATTERN = /\b(?:setTimeout|Bun\.sleep)\s*\(/;
const QUOTED_ARRAY_LINE = /^[ \t]*['"`].*['"`]\s*,?\s*$/;

export function analyzeTestFraud(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;
    if (QUOTED_ARRAY_LINE.test(line)) continue;

    if (SKIP_OR_ONLY_PATTERN.test(line)) {
      findings.push({
        ruleId: "NTA-T003",
        category: "TEST_FRAUD",
        severity: "HIGH",
        file,
        line: lineNum,
        message: "Skipped, focused, or todo test evades full suite verification.",
        evidence: line.trim(),
      });
    }

    if (TAUTOLOGY_PATTERN.test(line)) {
      findings.push({
        ruleId: "NTA-T002",
        category: "TEST_FRAUD",
        severity: "CRITICAL",
        file,
        line: lineNum,
        message: "Tautological assertion compares a literal to itself and proves nothing.",
        evidence: line.trim(),
      });
    }

    if (MOCK_TESTID_PATTERN.test(line)) {
      findings.push({
        ruleId: "NTA-T005",
        category: "TEST_FRAUD",
        severity: "HIGH",
        file,
        line: lineNum,
        message: "Assertion checks mock existence (*-mock) instead of real component behavior.",
        evidence: line.trim(),
      });
    }

    if (ARBITRARY_SLEEP_PATTERN.test(line) && !content.includes("waitFor(")) {
      findings.push({
        ruleId: "NTA-T006",
        category: "TEST_FRAUD",
        severity: "HIGH",
        file,
        line: lineNum,
        message: "Arbitrary timeout sleep in test; use condition-based polling (waitFor) instead.",
        evidence: line.trim(),
      });
    }
  }

  for (const match of content.matchAll(TEST_BLOCK_START)) {
    const startIndex = match.index ?? 0;
    const afterTitleIndex = startIndex + match[0].length;
    const lineNum = content.slice(0, startIndex).split("\n").length;
    const blockBody = extractBalancedBraces(content, afterTitleIndex);
    if (!blockBody) continue;

    if (!/\b(?:expect|assert)[A-Za-z0-9_]*\b/.test(blockBody)) {
      findings.push({
        ruleId: "NTA-T001",
        category: "TEST_FRAUD",
        severity: "CRITICAL",
        file,
        line: lineNum,
        message: "Test block contains zero assertions (no expect or assert call).",
        evidence: (lines[lineNum - 1] ?? "").trim(),
      });
    }

    const mirrorMatch = detectMirrorAssertion(blockBody);
    if (mirrorMatch) {
      findings.push({
        ruleId: "NTA-T004",
        category: "TEST_FRAUD",
        severity: "CRITICAL",
        file,
        line: lineNum,
        message: "Mirror assertion computes expected value using the same call under test.",
        evidence: mirrorMatch,
      });
    }
  }

  return findings;
}

export function analyzeTestDiffSabotage(diffText: string): Finding[] {
  const findings: Finding[] = [];
  const lines = diffText.split("\n");
  let currentFile = "unknown.test.ts";
  let removedExpects = 0;
  let addedExpects = 0;
  let firstRemovedLine = "";

  const flushFile = () => {
    const isTestFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(currentFile);
    if (isTestFile && removedExpects > addedExpects) {
      findings.push({
        ruleId: "NTA-T007",
        category: "TEST_FRAUD",
        severity: "CRITICAL",
        file: currentFile,
        line: 1,
        message: `Test sabotage detected in diff: ${removedExpects} assertion(s) removed vs ${addedExpects} added.`,
        evidence: firstRemovedLine,
      });
    }
    removedExpects = 0;
    addedExpects = 0;
    firstRemovedLine = "";
  };

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      flushFile();
      currentFile = line.slice("+++ b/".length).trim();
      continue;
    }
    if (line.startsWith("-") && !line.startsWith("---") && /\bexpect\s*\(/.test(line)) {
      removedExpects++;
      if (!firstRemovedLine) {
        firstRemovedLine = line.slice(1).trim();
      }
    } else if (line.startsWith("+") && !line.startsWith("+++") && /\bexpect\s*\(/.test(line)) {
      addedExpects++;
    }
  }
  flushFile();

  return findings;
}

function extractBalancedBraces(source: string, fromIndex: number): string | null {
  const arrowIdx = source.indexOf("=>", fromIndex);
  const fnIdx = source.indexOf("function", fromIndex);
  const nextStmtIdx = source.indexOf("\n", fromIndex);
  let bodySearchStart = fromIndex;
  if (arrowIdx !== -1 && (nextStmtIdx === -1 || arrowIdx < nextStmtIdx + 80)) {
    bodySearchStart = arrowIdx + 2;
  } else if (fnIdx !== -1 && (nextStmtIdx === -1 || fnIdx < nextStmtIdx + 80)) {
    const closeParen = source.indexOf(")", fnIdx);
    if (closeParen !== -1) bodySearchStart = closeParen + 1;
  }
  const openBrace = source.indexOf("{", bodySearchStart);
  if (openBrace === -1) return null;
  let depth = 0;
  let inQuote: string | null = null;

  for (let i = openBrace; i < source.length; i++) {
    const ch = source[i] ?? "";
    const prev = i > 0 ? source[i - 1] : "";

    if (inQuote) {
      if (ch === inQuote && prev !== "\\") {
        inQuote = null;
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      inQuote = ch;
      continue;
    }

    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(openBrace, i + 1);
      }
    }
  }
  return null;
}

function detectMirrorAssertion(blockBody: string): string | null {
  const assignRegex =
    /^[ \t]*(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*\s*\([^;\n]+\))\s*;/gm;
  for (const match of blockBody.matchAll(assignRegex)) {
    const varName = match[1];
    const callExpr = match[2]?.trim();
    if (!varName || !callExpr) continue;
    const escapedCall = callExpr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mirrorCheck = new RegExp(
      `^[ \\t]*expect\\s*\\(\\s*${escapedCall}\\s*\\)\\s*\\.\\s*(?:toBe|toEqual|toStrictEqual)\\s*\\(\\s*${varName}\\s*\\)`,
      "m"
    );
    if (mirrorCheck.test(blockBody)) {
      return `${varName} = ${callExpr}`;
    }
  }
  return null;
}
