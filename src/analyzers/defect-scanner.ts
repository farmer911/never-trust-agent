import type { Finding } from "../types/verdict.ts";

const DYNAMIC_EXEC_REGEX = /\beval\s*\(|\bnew\s+Function\s*\(/;
const FETCH_CALL_REGEX = /(?<!\.|\basync\s+|\bfunction\s+)\bfetch\s*\(([^)]*)\)/;
const ASYNC_FOREACH_REGEX = /\.forEach\s*\(\s*async\b/;
const COMMENT_LINE_REGEX = /^[ \t]*(?:\/\/|\/\*|\*)/;

export function analyzeDefects(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;
    if (COMMENT_LINE_REGEX.test(line)) continue;

    if (DYNAMIC_EXEC_REGEX.test(line)) {
      findings.push({
        ruleId: "NTA-D001",
        category: "DEFECT",
        severity: "HIGH",
        file,
        line: lineNum,
        message: "Dynamic code evaluation (eval or Function constructor) introduces injection risk.",
        evidence: line.trim(),
      });
    }

    const fetchMatch = FETCH_CALL_REGEX.exec(line);
    if (fetchMatch) {
      const args = fetchMatch[1] ?? "";
      if (!args.includes("signal") && !content.includes("AbortSignal")) {
        findings.push({
          ruleId: "NTA-D002",
          category: "DEFECT",
          severity: "MEDIUM",
          file,
          line: lineNum,
          message: "Network fetch call lacks AbortSignal / timeout protection.",
          evidence: line.trim(),
        });
      }
    }

    if (ASYNC_FOREACH_REGEX.test(line)) {
      findings.push({
        ruleId: "NTA-D003",
        category: "DEFECT",
        severity: "HIGH",
        file,
        line: lineNum,
        message: "Async callback inside Array.forEach is not awaited; use for...of or Promise.all.",
        evidence: line.trim(),
      });
    }
  }

  return findings;
}
