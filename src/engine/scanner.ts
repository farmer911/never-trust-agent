import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { analyzeDefects } from "../analyzers/defect-scanner.ts";
import {
  collectSourceFiles,
  computeWorkspaceHash,
  enrichFindingWithBrutalCritique,
} from "../analyzers/evidence-verifier.ts";
import {
  analyzePhantomCode,
  findDuplicateBlocks,
  findOrphanExports,
  findOrphanFiles,
} from "../analyzers/phantom-code.ts";
import { analyzeSkillAndDocDrift, analyzeSuppressionFraud } from "../analyzers/skill-critic.ts";
import { analyzeTestFraud } from "../analyzers/test-fraud.ts";
import type { Finding, ScanReport } from "../types/verdict.ts";

interface ScanOptions {
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

  const entrypoints = options.entrypoints ?? ["src/index.ts", "src/cli/index.ts"];
  findings.push(...findOrphanFiles(fileMap, entrypoints));
  findings.push(...analyzeSkillAndDocDrift(root));
  const enrichedFindings = findings.map((f) => enrichFindingWithBrutalCritique(f));

  return {
    workspaceRoot: root,
    workspaceHash: computeWorkspaceHash(root),
    scannedFiles: absFiles.length,
    passed: enrichedFindings.length === 0,
    findings: enrichedFindings,
  };
}

export function createCoreCodeSubagents(
  root: string,
  codeFiles: ReadonlyMap<string, string>,
  entrypoints: readonly string[]
): readonly {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly run: () => Finding[];
}[] {
  return [
    {
      id: "subagent-test-fraud",
      name: "TestInquisitor",
      role: "Audits empty tests, tautologies, mirror assertions, mock existence checks, and arbitrary sleeps",
      run: () => {
        const out: Finding[] = [];
        for (const [rel, content] of codeFiles.entries()) {
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
        for (const [rel, content] of codeFiles.entries()) {
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
        for (const [rel, content] of codeFiles.entries()) {
          if (!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel)) {
            for (const f of analyzePhantomCode(rel, content)) {
              out.push({ ...f, subagent: "DeadAndDuplicateCodeInquisitor" });
            }
          }
        }
        for (const f of findOrphanFiles(codeFiles, entrypoints)) {
          out.push({ ...f, subagent: "DeadAndDuplicateCodeInquisitor" });
        }
        for (const f of findOrphanExports(codeFiles, entrypoints)) {
          out.push({ ...f, subagent: "DeadAndDuplicateCodeInquisitor" });
        }
        for (const f of findDuplicateBlocks(codeFiles)) {
          out.push({ ...f, subagent: "DeadAndDuplicateCodeInquisitor" });
        }
        return out;
      },
    },
    {
      id: "subagent-skill-drift",
      name: "SkillAndDocDriftInquisitor",
      role: "Audits SKILL.md stupidity, bad frontmatter, broken file/script references, and rule-vs-code hypocrisy",
      run: () =>
        analyzeSkillAndDocDrift(root).map((f) => ({
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
        for (const [rel, content] of codeFiles.entries()) {
          if (!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel)) {
            for (const f of analyzeDefects(rel, content)) {
              out.push({ ...f, subagent: "RuntimeAndSecurityInquisitor" });
            }
          }
        }
        return out;
      },
    },
  ];
}
