import { dirname, posix } from "node:path";
import type { Finding } from "../types/verdict.ts";

const MARKER_REGEX = /(?:\/\/|\/\*)\s*(?:TO-?DO|FIX-?ME|HACK|XXX|PLACEHOLDER)\b/i;
const STUB_THROW_REGEX =
  /\bthrow\s+new\s+Error\s*\(\s*['"`](?:not\s+implemented|unimplemented|todo)['"`]\s*\)/i;
const IMPORT_FROM_REGEX = /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"`]([^'"`]+)['"`]/g;
const EXPORT_DECL_REGEX =
  /^[ \t]*export\s+(?:async\s+)?(?:function|class|const|let|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm;

export function analyzePhantomCode(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;

    if (MARKER_REGEX.test(line)) {
      findings.push({
        ruleId: "NTA-P001",
        category: "PHANTOM_CODE",
        severity: "HIGH",
        file,
        line: lineNum,
        message: "Unfinished work marker left in source file.",
        evidence: line.trim(),
      });
    }

    if (STUB_THROW_REGEX.test(line)) {
      findings.push({
        ruleId: "NTA-P002",
        category: "PHANTOM_CODE",
        severity: "CRITICAL",
        file,
        line: lineNum,
        message: "Unimplemented stub throws placeholder error at runtime.",
        evidence: line.trim(),
      });
    }
  }

  return findings;
}

export function findOrphanFiles(
  files: ReadonlyMap<string, string>,
  entrypoints: readonly string[]
): Finding[] {
  const importedFiles = new Set<string>(entrypoints);

  for (const [importerPath, content] of files.entries()) {
    for (const match of content.matchAll(IMPORT_FROM_REGEX)) {
      const specifier = match[1];
      if (!specifier || !specifier.startsWith(".")) continue;
      const resolved = resolveRelativeImport(importerPath, specifier, files);
      if (resolved) {
        importedFiles.add(resolved);
      }
    }
  }

  const findings: Finding[] = [];
  for (const filePath of files.keys()) {
    const isTestFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filePath);
    const isDeclaration = filePath.endsWith(".d.ts");
    if (isTestFile || isDeclaration || importedFiles.has(filePath)) {
      continue;
    }
    findings.push({
      ruleId: "NTA-P003",
      category: "PHANTOM_CODE",
      severity: "CRITICAL",
      file: filePath,
      line: 1,
      message: "Orphan source file is never imported by any module or entrypoint.",
      evidence: filePath,
    });
  }

  return findings;
}

export function findOrphanExports(
  files: ReadonlyMap<string, string>,
  entrypoints: readonly string[] = []
): Finding[] {
  const findings: Finding[] = [];
  const entrySet = new Set<string>(entrypoints);

  for (const [filePath, content] of files.entries()) {
    const isTestFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filePath);
    if (isTestFile || entrySet.has(filePath)) continue;

    for (const match of content.matchAll(EXPORT_DECL_REGEX)) {
      const symbolName = match[1];
      if (!symbolName) continue;
      const startIndex = match.index ?? 0;
      const lineNum = content.slice(0, startIndex).split("\n").length;

      let usedElsewhere = false;
      const wordRegex = new RegExp(`\\b${symbolName}\\b`);
      for (const [otherPath, otherContent] of files.entries()) {
        if (otherPath === filePath) continue;
        if (wordRegex.test(otherContent)) {
          usedElsewhere = true;
          break;
        }
      }

      if (!usedElsewhere) {
        const lineText = (content.split("\n")[lineNum - 1] ?? "").trim();
        findings.push({
          ruleId: "NTA-P004",
          category: "PHANTOM_CODE",
          severity: "MEDIUM",
          file: filePath,
          line: lineNum,
          message: `Dead export '${symbolName}' is never imported or referenced in any other file.`,
          evidence: lineText,
        });
      }
    }
  }

  return findings;
}

export function findDuplicateBlocks(
  files: ReadonlyMap<string, string>,
  windowSize = 5
): Finding[] {
  const findings: Finding[] = [];
  const seenBlocks = new Map<string, { readonly file: string; readonly line: number }>();
  const reportedPairs = new Set<string>();

  for (const [filePath, content] of files.entries()) {
    if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filePath)) continue;
    const rawLines = content.split("\n");
    const normLines = rawLines.map((l) => l.trim());

    for (let i = 0; i <= normLines.length - windowSize; i++) {
      const slice = normLines.slice(i, i + windowSize);
      const nonTrivialCount = slice.filter((l) => l.length > 10).length;
      const isMeaningful =
        nonTrivialCount >= 3 &&
        slice.every(
          (l) =>
            l.length > 0 &&
            !l.startsWith("//") &&
            !l.startsWith("import ") &&
            !l.startsWith("export type ") &&
            !l.startsWith("readonly ")
        );
      if (!isMeaningful) continue;

      const fingerprint = slice.join("\n");
      const firstHit = seenBlocks.get(fingerprint);
      const currentLine = i + 1;

      if (!firstHit) {
        seenBlocks.set(fingerprint, { file: filePath, line: currentLine });
        continue;
      }

      if (firstHit.file === filePath && Math.abs(firstHit.line - currentLine) < windowSize) {
        continue;
      }

      const pairKey = `${firstHit.file}:${firstHit.line}<->${filePath}:${currentLine}`;
      if (reportedPairs.has(pairKey)) continue;
      reportedPairs.add(pairKey);

      findings.push({
        ruleId: "NTA-P005",
        category: "PHANTOM_CODE",
        severity: "MEDIUM",
        file: filePath,
        line: currentLine,
        message: `Duplicate ${windowSize}-line logic block clones ${firstHit.file}:${firstHit.line}.`,
        evidence: `${firstHit.file}:${firstHit.line} & ${filePath}:${currentLine} -> ${slice[0] ?? ""}`,
      });
    }
  }

  return findings;
}

export function resolveRelativeImport(
  importerPath: string,
  specifier: string,
  files: ReadonlyMap<string, string>
): string | null {
  const baseDir = dirname(importerPath).replace(/\\/g, "/");
  const candidate = posix.normalize(posix.join(baseDir, specifier));
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}/index.ts`,
    candidate.replace(/\.js$/, ".ts"),
  ];
  for (const c of candidates) {
    if (files.has(c)) return c;
  }
  return null;
}
