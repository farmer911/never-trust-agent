import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeCssAndUi } from "../../src/analyzers/css-critic.ts";
import { analyzeDefects } from "../../src/analyzers/defect-scanner.ts";
import { verifyExternalAuditForensics } from "../../src/analyzers/evidence-verifier.ts";
import { findDuplicateBlocks, findOrphanExports } from "../../src/analyzers/phantom-code.ts";
import {
  analyzeSkillAndDocDrift,
  analyzeSuppressionFraud,
  queryMistakes,
  recordMistake,
} from "../../src/analyzers/skill-critic.ts";
import { analyzeTestFraud } from "../../src/analyzers/test-fraud.ts";
import { scanWorkspace } from "../../src/engine/scanner.ts";
import { analyzeGraphAndTokenOptimization } from "../../src/analyzers/graph-optimizer.ts";
import {
  detectProjectTechStack,
  verifyTechStackAlignment,
} from "../../src/analyzers/tech-stack-detector.ts";
import { syncRepository, parseRepoSlug } from "../../src/repo/git-manager.ts";
import {
  adjudicateFindingRebuttal,
  runCrossTestArena,
  runInquisitorSubagents,
} from "../../src/subagents/orchestrator.ts";
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

  test("parseRepoSlug rejects unsafe shell injection strings and resolves current directory dot", () => {
    expect(() => parseRepoSlug("https://github.com/obra/superpowers; rm -rf /")).toThrow();
    expect(() => parseRepoSlug("..")).toThrow();
    expect(parseRepoSlug(".")).toBe("NeverTrustAgent");
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
      expect(
        audit.findings.every(
          (f) =>
            typeof f.whyItIsWrong === "string" &&
            f.whyItIsWrong.length > 20 &&
            typeof f.directFix === "string" &&
            f.directFix.length > 10
        )
      ).toBe(true);
      expect(audit.flowTrace.length).toBeGreaterThanOrEqual(9);
      expect(audit.flowTrace[0]?.stageId).toBe("STAGE_A_REPO_SYNC");
      expect(audit.flowTrace[audit.flowTrace.length - 1]?.stageId).toBe(
        "STAGE_Z_VIDEO_EVIDENCE_SEAL"
      );
      expect(existsSync(audit.videoEvidence.filePath)).toBe(true);
      expect(audit.videoEvidence.sizeBytes).toBeGreaterThan(256);
      expect(audit.videoEvidence.sha256.length).toBe(64);
      expect(verifyExternalAuditForensics(audit)).toEqual([]);

      const tamperedAudit = {
        ...audit,
        videoEvidence: { ...audit.videoEvidence, filePath: join(tempRoot, "missing-video.webm") },
        findings: audit.findings.map((f, idx) => (idx === 0 ? { ...f, whyItIsWrong: "" } : f)),
      };
      const forensicViolations = verifyExternalAuditForensics(tamperedAudit);
      expect(forensicViolations.some((v) => v.ruleId === "NTA-E005")).toBe(true);

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
        const scanJson = (await scanRes.json()) as {
          totalFindings: number;
          repoMeta: { action: string; slug: string };
          videoEvidence: { videoUrl: string; sizeBytes: number };
        };
        expect(scanJson.totalFindings).toBeGreaterThanOrEqual(6);
        expect(["CLONED", "PULLED"]).toContain(scanJson.repoMeta.action);

        const videoRes = await fetch(
          `http://127.0.0.1:${server.port}${scanJson.videoEvidence.videoUrl}`,
          { signal: AbortSignal.timeout(5000) }
        );
        expect(videoRes.status).toBe(200);
        expect(videoRes.headers.get("content-type")).toContain("video/webm");
        const videoBytes = await videoRes.arrayBuffer();
        expect(videoBytes.byteLength).toBe(scanJson.videoEvidence.sizeBytes);
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

  test("Tech-Stack Recon & Anti-Backfire Guard detects framework routes/tools and prevents stack-mismatch critiques (NTA-E006)", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "nta-tech-stack-"));
    const nextRepo = join(tempRoot, "nextjs-vitest-repo");
    const cacheDir = join(tempRoot, "cache");

    try {
      mkdirSync(join(nextRepo, "src/app/dashboard"), { recursive: true });
      mkdirSync(join(nextRepo, "tests"), { recursive: true });
      spawnSync("git", ["init"], { cwd: nextRepo });
      spawnSync("git", ["config", "user.email", "test@nta.local"], { cwd: nextRepo });
      spawnSync("git", ["config", "user.name", "NTA Test"], { cwd: nextRepo });

      writeFileSync(
        join(nextRepo, "package.json"),
        JSON.stringify({
          name: "nextjs-vitest-app",
          packageManager: "pnpm@9.12.0",
          scripts: { test: "vitest run", build: "next build" },
          dependencies: { next: "15.1.0", react: "19.0.0" },
          devDependencies: { tailwindcss: "4.0.0", vitest: "2.1.0", typescript: "5.7.0" },
        })
      );
      writeFileSync(join(nextRepo, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
      writeFileSync(
        join(nextRepo, "src/app/dashboard/page.tsx"),
        "export default function DashboardPage() { return <main>Dashboard</main>; }\n"
      );
      writeFileSync(
        join(nextRepo, "tests/dashboard.test.ts"),
        'import { test } from "vitest";\ntest("empty dashboard test", () => {});\n'
      );

      spawnSync("git", ["add", "."], { cwd: nextRepo });
      spawnSync("git", ["commit", "-m", "init nextjs vitest repo"], { cwd: nextRepo });

      const stack = detectProjectTechStack(nextRepo);
      expect(stack.packageManager).toBe("pnpm");
      expect(stack.testRunner).toBe("vitest");
      expect(stack.frameworks).toContain("Next.js");
      expect(stack.frameworks).toContain("React");
      expect(stack.frameworks).toContain("Tailwind CSS");
      expect(stack.discoveredEntrypoints).toContain("src/app/dashboard/page.tsx");

      const audit = await runInquisitorSubagents(nextRepo, cacheDir);
      // Anti-Backfire: Next.js App Router page.tsx must NOT be flagged as NTA-P003 (Orphan File) or NTA-P004 (Orphan Export)!
      expect(
        audit.findings.some(
          (f) =>
            (f.ruleId === "NTA-P003" || f.ruleId === "NTA-P004") &&
            f.file === "src/app/dashboard/page.tsx"
        )
      ).toBe(false);
      // Critique must be grounded in the detected stack (pnpm / vitest / Next.js)
      const testFinding = audit.findings.find((f) => f.ruleId === "NTA-T001");
      expect(testFinding).toBeDefined();
      expect(testFinding?.whyItIsWrong).toContain("vitest");
      expect(verifyTechStackAlignment(audit)).toEqual([]);

      // Simulate a naive/hallucinated critique that mismatches the repo's tech stack -> NTA-E006
      const mismatchedAudit = {
        ...audit,
        findings: [
          ...audit.findings,
          {
            ruleId: "NTA-P003",
            category: "PHANTOM_CODE" as const,
            severity: "MEDIUM" as const,
            file: "src/app/dashboard/page.tsx",
            line: 1,
            message: "Orphan file not imported by index.ts",
            evidence: "src/app/dashboard/page.tsx",
            whyItIsWrong: "File tidak diimport, jalankan cargo test.",
            directFix: "Run cargo test and delete page.tsx",
          },
        ],
      };
      const backfireFindings = verifyTechStackAlignment(mismatchedAudit);
      expect(backfireFindings.some((f) => f.ruleId === "NTA-E006")).toBe(true);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("Self-Audit Dogfooding: NeverTrustAgent full 7-subagent platform audit on its own repo achieves 100/100 Integrity Score and 0 findings", async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), "nta-self-audit-"));
    try {
      const selfReport = await runInquisitorSubagents(process.cwd(), cacheDir);
      expect(selfReport.findings).toEqual([]);
      expect(selfReport.totalFindings).toBe(0);
      expect(selfReport.integrityScore).toBe(100);
      expect(selfReport.passed).toBe(true);
      expect(existsSync(selfReport.markdownReport.filePath)).toBe(true);
      expect(verifyExternalAuditForensics(selfReport)).toEqual([]);
      expect(verifyTechStackAlignment(selfReport)).toEqual([]);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  test("20-Round Adversarial Cross-Test Arena, Markdown Dossier (NTA-E007), and Backfire Humiliation Evolution (SHAME-001..004)", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nta-arena-"));
    try {
      // 1. Verify the 4 evolved analyzers do not get counter-attacked (bị phản dame) on valid edge cases:
      const wcagCss = [
        "@media (prefers-reduced-motion: reduce) {",
        "  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }",
        "}",
        ".btn:focus-visible {",
        "  outline: none;",
        "  box-shadow: 0 0 0 2px var(--focus-ring);",
        "}",
      ].join("\n");
      expect(analyzeCssAndUi("src/a11y.css", wcagCss)).toEqual([]);

      const honoTestCode = [
        "// fetch('https://example.com') in a comment is not a call",
        "const res = await app.fetch(req);",
        "const res2 = await server.fetch(new Request('http://localhost/'));",
      ].join("\n");
      expect(analyzeDefects("tests/server.test.ts", honoTestCode)).toEqual([]);

      const commentedAnyCode = [
        "// Warning: never use : any or as any in production parsers",
        "export const cleanValue: string = 'deterministic';",
      ].join("\n");
      expect(analyzeSuppressionFraud("src/clean.ts", commentedAnyCode)).toEqual([]);

      const customAssertTest = [
        "test('validates receipt via domain helper', () => {",
        "  const r = issueReceipt();",
        "  assertValidReceipt(r);",
        "});",
      ].join("\n");
      expect(analyzeTestFraud("tests/helper.test.ts", customAssertTest)).toEqual([]);

      // 2. Run the 20-Round Adversarial Cross-Test Arena on NeverTrustAgent's own repo
      const arenaMdPath = join(tempDir, "CROSS_AUDIT_ARENA.md");
      const arena = await runCrossTestArena(process.cwd(), arenaMdPath);
      expect(arena.totalRounds).toBe(20);
      expect(arena.rounds.length).toBe(20);
      expect(arena.backfireShameCount).toBe(4);
      expect(arena.passedAllRounds).toBe(true);
      expect(existsSync(arenaMdPath)).toBe(true);
      const mdText = readFileSync(arenaMdPath, "utf8");
      expect(mdText).toContain("ROUND-01");
      expect(mdText).toContain("ROUND-20");
      expect(mdText).toContain("SHAME-001");
      expect(mdText).toContain("NHỤC NHÃ");

      // 3. Test interactive Rebuttal & Adjudication (AGREE, REBUTTED_INVALID, REBUTTED_VALID_BACKFIRE)
      const invalidRebuttal = adjudicateFindingRebuttal(tempDir, {
        roundId: "ROUND-05",
        ruleId: "NTA-S001",
        file: "src/parser.ts",
        line: 14,
        decision: "REBUT",
        challengerArgument: "Tôi dùng : any tạm thời cho nhanh kịp deadline thôi!",
      });
      expect(invalidRebuttal.verdict).toBe("REBUTTED_INVALID");

      const validBackfire = adjudicateFindingRebuttal(tempDir, {
        roundId: "ROUND-17",
        ruleId: "NTA-C001",
        file: "src/a11y.css",
        line: 2,
        decision: "REBUT",
        challengerArgument:
          "Chuẩn WCAG 2.1 SC 2.3.3 bắt buộc dùng !important trong @media (prefers-reduced-motion: reduce) để tắt animation.",
      });
      expect(validBackfire.verdict).toBe("REBUTTED_VALID_BACKFIRE");
      expect(validBackfire.humiliationRecorded).toBe(true);
      expect(existsSync(join(tempDir, "MISTAKE_LEDGER.md"))).toBe(true);
      expect(readFileSync(join(tempDir, "MISTAKE_LEDGER.md"), "utf8")).toContain("BỊ PHẢN DAME");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
