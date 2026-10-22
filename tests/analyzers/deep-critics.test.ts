import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeCssAndUi } from "../../src/analyzers/css-critic.ts";
import { findDuplicateBlocks, findOrphanExports } from "../../src/analyzers/phantom-code.ts";
import {
  analyzeSkillAndDocDrift,
  queryMistakes,
  recordMistake,
} from "../../src/analyzers/skill-critic.ts";
import { scanWorkspace } from "../../src/engine/scanner.ts";
import { analyzeGraphAndTokenOptimization } from "../../src/analyzers/graph-optimizer.ts";
import { syncRepository, parseRepoSlug } from "../../src/repo/git-manager.ts";
import { runInquisitorSubagents } from "../../src/subagents/orchestrator.ts";
import { createAppServer } from "../../src/web/server.ts";

describe("Subagent 4: CSS & UI Nitpicking Critic", () => {
  test("catches !important, hardcoded hex colors, magic z-index, outline:none, and duplicate properties (NTA-C001..C006)", () => {
    const css = [
      ":root {",
      "  --brand-primary: #2563eb;",
      "}",
      ".modal {",
      "  color: #ff0033 !important;",
      "  z-index: 99999;",
      "  outline: none;",
      "  padding: 12px;",
      "  padding: 16px;",
      "}",
    ].join("\n");

    const findings = analyzeCssAndUi("styles/modal.css", css);
    expect(findings.some((f) => f.ruleId === "NTA-C001")).toBe(true);
    expect(findings.some((f) => f.ruleId === "NTA-C002")).toBe(true);
    expect(findings.some((f) => f.ruleId === "NTA-C003")).toBe(true);
    expect(findings.some((f) => f.ruleId === "NTA-C005")).toBe(true);
    expect(findings.some((f) => f.ruleId === "NTA-C006")).toBe(true);
    // Should NOT flag --brand-primary: #2563eb on line 2
    expect(findings.some((f) => f.ruleId === "NTA-C002" && f.line === 2)).toBe(false);
  });

  test("catches inline styles and embedded <style> defects in JSX/HTML files (NTA-C001, NTA-C002, NTA-C004)", () => {
    const tsx = 'export const Btn = () => <button style={{ color: "red" }}>Click</button>;';
    const findings = analyzeCssAndUi("src/Btn.tsx", tsx);
    expect(findings.some((f) => f.ruleId === "NTA-C004")).toBe(true);

    const html = [
      "<style>",
      "  .header { background: #1a1a2e !important; }",
      "</style>",
    ].join("\n");
    const htmlFindings = analyzeCssAndUi("public/frame.html", html);
    expect(htmlFindings.some((f) => f.ruleId === "NTA-C001")).toBe(true);
    expect(htmlFindings.some((f) => f.ruleId === "NTA-C002")).toBe(true);
  });
});

describe("Subagent 3: Orphan Exports & Duplicate Code Block Critic", () => {
  test("catches exported symbols never imported anywhere else (NTA-P004)", () => {
    const files = new Map<string, string>([
      ["src/index.ts", 'import { usedFn } from "./math.ts";\nconsole.error(usedFn(2));'],
      [
        "src/math.ts",
        "export function usedFn(x: number) { return x * 2; }\nexport function deadExport(x: number) { return x + 1; }\n",
      ],
    ]);
    const findings = findOrphanExports(files, ["src/index.ts"]);
    expect(findings.some((f) => f.ruleId === "NTA-P004" && f.evidence.includes("deadExport"))).toBe(
      true
    );
    expect(findings.some((f) => f.evidence.includes("usedFn"))).toBe(false);
  });

  test("catches duplicated multi-line code blocks across files with dual file:line evidence (NTA-P005)", () => {
    const dupBlock = [
      "  const normalized = input.trim().toLowerCase();",
      "  if (!normalized.startsWith('nta_')) {",
      "    throw new Error('Invalid prefix in token');",
      "  }",
      "  const parts = normalized.split('_');",
      "  return parts.slice(1).join('-');",
    ].join("\n");

    const files = new Map<string, string>([
      ["src/serviceA.ts", `export function parseA(input: string) {\n${dupBlock}\n}\n`],
      ["src/serviceB.ts", `export function parseB(input: string) {\n${dupBlock}\n}\n`],
    ]);

    const findings = findDuplicateBlocks(files);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.ruleId).toBe("NTA-P005");
    expect(findings[0]?.evidence).toContain("src/serviceA.ts");
    expect(findings[0]?.evidence).toContain("src/serviceB.ts");
  });
});

describe("Subagent 5: Skill Stupidity & Skill-vs-Code Drift Critic", () => {
  test("catches bad SKILL.md frontmatter, non-'Use when...' description, sycophancy, missing script paths, missing npm scripts, and hypocrisy drift (NTA-K001..K007)", () => {
    const dir = mkdtempSync(join(tmpdir(), "nta-skill-drift-"));
    try {
      mkdirSync(join(dir, "skills/bad-skill"), { recursive: true });
      mkdirSync(join(dir, "src"), { recursive: true });

      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({
          name: "broken-agent-repo",
          scripts: {
            test: "bun test",
          },
        })
      );

      writeFileSync(
        join(dir, "skills/bad-skill/SKILL.md"),
        [
          "---",
          "name: Bad_Skill_Name",
          "description: I help you summarize workflows and write code",
          "---",
          "# Bad Skill",
          "Consider writing tests when feasible.",
          "### Strengths",
          "Always run `bun run test:nonexistent` and `bash scripts/ghost-script.sh`.",
          "Rule: Never use `any` in TypeScript files.",
        ].join("\n")
      );

      writeFileSync(
        join(dir, "src/hypocrite.ts"),
        "export const leak: any = 123;\n"
      );

      const findings = analyzeSkillAndDocDrift(dir);
      expect(findings.some((f) => f.ruleId === "NTA-K001")).toBe(true);
      expect(findings.some((f) => f.ruleId === "NTA-K002")).toBe(true);
      expect(findings.some((f) => f.ruleId === "NTA-K003")).toBe(true);
      expect(findings.some((f) => f.ruleId === "NTA-K005")).toBe(true);
      expect(findings.some((f) => f.ruleId === "NTA-K006")).toBe(true);
      expect(findings.some((f) => f.ruleId === "NTA-K007")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("catches Keep-Up-To-Date knowledge drift when code defines NTA rules missing from project skill/knowledge docs (NTA-K008)", () => {
    const dir = mkdtempSync(join(tmpdir(), "nta-keep-uptodate-"));
    try {
      mkdirSync(join(dir, "skills/project-skill"), { recursive: true });
      mkdirSync(join(dir, "src"), { recursive: true });

      writeFileSync(
        join(dir, "src/scanner.ts"),
        'export const rule = { ruleId: "NTA-X901", message: "Undocumented rule in code" };\n'
      );

      writeFileSync(
        join(dir, "skills/project-skill/SKILL.md"),
        [
          "---",
          "name: project-skill",
          "description: Use when auditing repositories or updating project knowledge",
          "---",
          "# Project Skill",
          "Known rules: NTA-T001.",
        ].join("\n")
      );

      const findings = analyzeSkillAndDocDrift(dir);
      expect(findings.some((f) => f.ruleId === "NTA-K008" && f.evidence.includes("NTA-X901"))).toBe(
        true
      );
      const report = scanWorkspace(dir, { entrypoints: ["src/scanner.ts"] });
      expect(
        report.findings.some((f) => f.ruleId === "NTA-K008" && f.evidence.includes("NTA-X901"))
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("enforces Mistake Ledger structure (NTA-K009) and supports recording & querying agent mistakes", () => {
    const dir = mkdtempSync(join(tmpdir(), "nta-mistake-ledger-"));
    try {
      mkdirSync(join(dir, "skills/mistake-ledger-grow-up"), { recursive: true });
      writeFileSync(
        join(dir, "skills/mistake-ledger-grow-up/SKILL.md"),
        [
          "---",
          "name: mistake-ledger-grow-up",
          "description: Use when any test fails, analyzer flags a violation, or user corrects an assumption",
          "---",
          "# Mistake Ledger & Grow Up",
        ].join("\n")
      );

      // Missing MISTAKE_LEDGER.md when mistake-ledger-grow-up skill exists -> NTA-K009
      const missingLedgerFindings = analyzeSkillAndDocDrift(dir);
      expect(missingLedgerFindings.some((f) => f.ruleId === "NTA-K009")).toBe(true);

      // Incomplete mistake entry missing Why and Prevention -> NTA-K009
      writeFileSync(
        join(dir, "MISTAKE_LEDGER.md"),
        [
          "# Agent Mistake Ledger",
          "",
          "### [MISTAKE-001] Unanchored Regex False Positive",
          "- **Where (Ở đâu):** `src/analyzers/skill-critic.ts:8`",
          "- **How (Như thế nào):** Matched literal text inside markdown bullet.",
        ].join("\n")
      );
      const incompleteFindings = analyzeSkillAndDocDrift(dir);
      expect(
        incompleteFindings.some((f) => f.ruleId === "NTA-K009" && f.evidence.includes("MISTAKE-001"))
      ).toBe(true);

      // Clean MISTAKE_LEDGER.md recorded via recordMistake -> 0 NTA-K009 findings & queryable
      rmSync(join(dir, "MISTAKE_LEDGER.md"), { force: true });
      const recorded = recordMistake(dir, {
        title: "Self-triggering sycophancy regex in SKILL.md",
        ruleId: "NTA-K003",
        where: "skills/never-trust-agent/SKILL.md:70",
        how: "Embedded literal banned phrase inside Red Flags section, triggering NTA-K003 during self-scan.",
        why: "Quoted the exact regex trigger string verbatim without checking WEAK_OR_SYCOPHANTIC_SKILL_LINE.",
        prevention: "Describe banned sycophancy patterns structurally instead of embedding raw trigger strings in SKILL.md.",
      });
      expect(recorded.id).toBe("MISTAKE-001");

      const cleanFindings = analyzeSkillAndDocDrift(dir);
      expect(cleanFindings.filter((f) => f.ruleId === "NTA-K009")).toEqual([]);

      const hits = queryMistakes(dir, "NTA-K003");
      expect(hits.length).toBe(1);
      expect(hits[0]?.id).toBe("MISTAKE-001");
      expect(hits[0]?.where).toContain("skills/never-trust-agent/SKILL.md:70");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("Git Repository Cloner/Puller & Multi-Subagent Web Platform", () => {
  test("clones repo on first call and pulls latest commits on subsequent call", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "nta-git-mgr-"));
    const upstream = join(tempRoot, "upstream-repo");
    const cacheDir = join(tempRoot, "cache");

    try {
      mkdirSync(upstream, { recursive: true });
      spawnSync("git", ["init"], { cwd: upstream });
      spawnSync("git", ["config", "user.email", "test@nta.local"], { cwd: upstream });
      spawnSync("git", ["config", "user.name", "NTA Test"], { cwd: upstream });
      writeFileSync(join(upstream, "index.ts"), "export const a: any = 1;\n");
      spawnSync("git", ["add", "."], { cwd: upstream });
      spawnSync("git", ["commit", "-m", "initial commit"], { cwd: upstream });

      const firstSync = syncRepository(upstream, cacheDir);
      expect(firstSync.action).toBe("CLONED");
      expect(firstSync.headSha.length).toBeGreaterThanOrEqual(7);

      // Push a new commit to upstream and verify second call pulls it
      writeFileSync(join(upstream, "index.ts"), "export const a: any = 2;\n");
      spawnSync("git", ["commit", "-am", "second commit"], { cwd: upstream });

      const secondSync = syncRepository(upstream, cacheDir);
      expect(secondSync.action).toBe("PULLED");
      expect(secondSync.headSha).not.toBe(firstSync.headSha);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("parseRepoSlug rejects unsafe shell injection strings", () => {
    expect(() => parseRepoSlug("https://github.com/obra/superpowers; rm -rf /")).toThrow();
  });

  test("orchestrator & web server scan repository via POST /api/scan and return subagent evidence", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "nta-web-"));
    const targetRepo = join(tempRoot, "sample-repo");
    const cacheDir = join(tempRoot, "cache");

    try {
      mkdirSync(join(targetRepo, "src"), { recursive: true });
      mkdirSync(join(targetRepo, "skills/sample"), { recursive: true });
      spawnSync("git", ["init"], { cwd: targetRepo });
      spawnSync("git", ["config", "user.email", "test@nta.local"], { cwd: targetRepo });
      spawnSync("git", ["config", "user.name", "NTA Test"], { cwd: targetRepo });

      writeFileSync(
        join(targetRepo, "package.json"),
        JSON.stringify({ name: "sample", scripts: { test: "bun test" } })
      );
      writeFileSync(
        join(targetRepo, "src/bad.ts"),
        "// TODO: fix this\nexport function broken(x: any) { try { eval(x); } catch {} }\n"
      );
      writeFileSync(
        join(targetRepo, "src/style.css"),
        ".box { color: #ff0000 !important; outline: none; }\n"
      );
      writeFileSync(
        join(targetRepo, "skills/sample/SKILL.md"),
        "---\nname: sample\ndescription: Bad description without trigger prefix\n---\nRun `bash scripts/missing.sh`.\n"
      );
      spawnSync("git", ["add", "."], { cwd: targetRepo });
      spawnSync("git", ["commit", "-m", "init broken repo"], { cwd: targetRepo });

      const audit = await runInquisitorSubagents(targetRepo, cacheDir);
      expect(audit.subagentReports.length).toBe(7);
      expect(audit.totalFindings).toBeGreaterThanOrEqual(7);
      expect(audit.tokenOptimization.rawCorpusTokens).toBeGreaterThan(0);
      expect(audit.tokenOptimization.reductionPercent).toBeGreaterThanOrEqual(0);
      expect(audit.findings.every((f) => f.evidence.length > 0 && f.line >= 1)).toBe(true);

      const server = createAppServer({ port: 0, cacheDir });
      try {
        const homeRes = await fetch(`http://127.0.0.1:${server.port}/`, {
          signal: AbortSignal.timeout(5000),
        });
        expect(homeRes.status).toBe(200);
        const html = await homeRes.text();
        expect(html).toContain("NEVER TRUST AGENT");

        const scanRes = await fetch(`http://127.0.0.1:${server.port}/api/scan`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repoUrl: targetRepo }),
          signal: AbortSignal.timeout(5000),
        });
        expect(scanRes.status).toBe(200);
        const scanJson = (await scanRes.json()) as { totalFindings: number; repoMeta: { action: string } };
        expect(scanJson.totalFindings).toBeGreaterThanOrEqual(6);
        expect(["CLONED", "PULLED"]).toContain(scanJson.repoMeta.action);
      } finally {
        server.stop(true);
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("Subagent 7: Graph & Token Optimization Inquisitor computes RTK + Graphify savings and flags missing graphify-out (NTA-G001, NTA-G002)", () => {
    const dir = mkdtempSync(join(tmpdir(), "nta-graph-opt-"));
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "AGENTS.md"), "# Agent Rules\nUse strict verification.\n");
      // Create a hub file importing many modules to trigger God Node coupling check (NTA-G001)
      const imports: string[] = [];
      for (let i = 1; i <= 8; i++) {
        writeFileSync(
          join(dir, `src/mod${i}.ts`),
          `export function helper${i}(x: number): number { return x + ${i}; }\n`
        );
        imports.push(`import { helper${i} } from "./mod${i}.ts";`);
      }
      writeFileSync(
        join(dir, "src/god-hub.ts"),
        `${imports.join("\n")}\nexport function megaHub(v: number) {\n  return ${Array.from({ length: 8 }, (_, i) => `helper${i + 1}(v)`).join(" + ")};\n}\n`
      );

      const res = analyzeGraphAndTokenOptimization(dir);
      expect(res.telemetry.rawCorpusTokens).toBeGreaterThan(0);
      expect(res.telemetry.graphNodes).toBeGreaterThanOrEqual(8);
      expect(res.findings.some((f) => f.ruleId === "NTA-G001")).toBe(true);
      expect(res.findings.some((f) => f.ruleId === "NTA-G002")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
