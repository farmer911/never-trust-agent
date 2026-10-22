import type { Finding } from "../types/verdict.ts";

const EXPLICIT_ANY_REGEX = /(?:[:]\s*any\b|\bas\s+any\b|\bas\s+unknown\s+as\b)/;
const TS_SUPPRESS_REGEX =
  /^[ \t]*(?:\/\/|\/\*)[ \t]*@(?:ts-ignore|ts-nocheck)\b|^[ \t]*(?:\/\/|\/\*)[ \t]*@ts-expect-error[ \t]*$/;
const LINT_SUPPRESS_REGEX =
  /^[ \t]*(?:\/\/|\/\*)[ \t]*(?:eslint-disable|biome-ignore|oxlint-disable)\b/;
const EMPTY_CATCH_REGEX =
  /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}|\.catch\s*\(\s*\([^)]*\)\s*=>\s*\{\s*\}\s*\)/;

export function analyzeSuppressionFraud(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;
    const codeWithoutStrings = stripStrings(line);

    if (EXPLICIT_ANY_REGEX.test(codeWithoutStrings)) {
      findings.push({
        ruleId: "NTA-S001",
        category: "SUPPRESSION_FRAUD",
        severity: "HIGH",
        file,
        line: lineNum,
        message: "Type safety bypass detected (explicit any or double assertion).",
        evidence: line.trim(),
      });
    }

    if (TS_SUPPRESS_REGEX.test(line)) {
      findings.push({
        ruleId: "NTA-S002",
        category: "SUPPRESSION_FRAUD",
        severity: "CRITICAL",
        file,
        line: lineNum,
        message: "TypeScript compiler error suppression directive is forbidden.",
        evidence: line.trim(),
      });
    }

    if (LINT_SUPPRESS_REGEX.test(line)) {
      findings.push({
        ruleId: "NTA-S003",
        category: "SUPPRESSION_FRAUD",
        severity: "HIGH",
        file,
        line: lineNum,
        message: "Linter rule suppression comment is forbidden.",
        evidence: line.trim(),
      });
    }

    if (EMPTY_CATCH_REGEX.test(codeWithoutStrings)) {
      findings.push({
        ruleId: "NTA-S004",
        category: "SUPPRESSION_FRAUD",
        severity: "CRITICAL",
        file,
        line: lineNum,
        message: "Silent error swallowing via empty catch block or no-op .catch handler.",
        evidence: line.trim(),
      });
    }
  }

  return findings;
}

function stripStrings(line: string): string {
  return line
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/, "");
}
