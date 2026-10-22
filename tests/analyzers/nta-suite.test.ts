import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeTestFraud, analyzeTestDiffSabotage } from "../../src/analyzers/test-fraud.ts";
import { analyzeSuppressionFraud } from "../../src/analyzers/suppression-fraud.ts";
import { analyzePhantomCode, findOrphanFiles } from "../../src/analyzers/phantom-code.ts";
import { analyzeDefects } from "../../src/analyzers/defect-scanner.ts";
import {
  verifyCitations,
  analyzeAgentReportLanguage,
  createVerdictReceipt,
  verifyVerdictReceipt,
} from "../../src/analyzers/evidence-verifier.ts";
import { scanWorkspace } from "../../src/engine/scanner.ts";

describe("V1: Test Fraud Analyzer (Superpowers writing-good-tests + condition-based-waiting)", () => {
  test("catches empty test with zero assertions (NTA-T001)", () => {
    const code = [
      'test("calculates total", () => {',
      "  const total = 1 + 2;",
      "});",
    ].join("\n");
    const findings = analyzeTestFraud("cart.test.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-T001")).toBe(true);
  });

  test("catches tautological assertion (NTA-T002)", () => {
    const code = [
      'test("truthy check", () => {',
      "  expect(true).toBe(true);",
      "});",
    ].join("\n");
    const findings = analyzeTestFraud("cart.test.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-T002")).toBe(true);
  });

  test("catches skipped or focused test evasion (NTA-T003)", () => {
    const code = [
      'test.skip("broken edge case", () => {',
      "  expect(run()).toBe(42);",
      "});",
    ].join("\n");
    const findings = analyzeTestFraud("cart.test.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-T003")).toBe(true);
  });

  test("catches mirror assertion where SUT computes expected value (NTA-T004)", () => {
    const code = [
      'test("formats query", () => {',
      '  const expected = buildSearchQuery({ tag: "urgent" });',
      '  expect(buildSearchQuery({ tag: "urgent" })).toBe(expected);',
      "});",
    ].join("\n");
    const findings = analyzeTestFraud("query.test.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-T004")).toBe(true);
  });

  test("catches mock existence assertion (NTA-T005)", () => {
    const code = [
      'test("renders sidebar", () => {',
      '  expect(screen.getByTestId("sidebar-mock")).toBeInTheDocument();',
      "});",
    ].join("\n");
    const findings = analyzeTestFraud("sidebar.test.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-T005")).toBe(true);
  });

  test("catches arbitrary timeout sleep in test without condition polling (NTA-T006)", () => {
    const code = [
      'test("waits for async state", async () => {',
      "  await new Promise((r) => setTimeout(r, 50));",
      "  expect(getResult()).toBe(10);",
      "});",
    ].join("\n");
    const findings = analyzeTestFraud("async.test.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-T006")).toBe(true);
  });

  test("catches test sabotage in git diff when assertions are deleted (NTA-T007)", () => {
    const diff = [
      "diff --git a/tests/auth.test.ts b/tests/auth.test.ts",
      "--- a/tests/auth.test.ts",
      "+++ b/tests/auth.test.ts",
      "@@ -10,4 +10,2 @@",
      "   const res = login();",
      "-  expect(res.token).toBe('secret-jwt');",
      "-  expect(res.status).toBe(200);",
    ].join("\n");
    const findings = analyzeTestDiffSabotage(diff);
    expect(findings.some((f) => f.ruleId === "NTA-T007")).toBe(true);
  });

  test("passes clean, literal-expectation test with zero findings", () => {
    const code = [
      'test("rejects empty object {} input", () => {',
      "  const outcome = calculatePrice(-5);",
      '  expect(outcome.error).toBe("NEGATIVE_PRICE");',
      "});",
    ].join("\n");
    const findings = analyzeTestFraud("price.test.ts", code);
    expect(findings).toEqual([]);
  });

  test("self-dogfooding: NeverTrustAgent workspace itself has zero findings", () => {
    const report = scanWorkspace(process.cwd());
    expect(report.findings).toEqual([]);
    expect(report.passed).toBe(true);
  });
});

describe("V2: Type & Error Suppression Analyzer", () => {
  test("catches explicit any and double assertion (NTA-S001)", () => {
    const code = [
      "export function parseInput(data: any): string {",
      "  return (data as unknown as { name: string }).name;",
      "}",
    ].join("\n");
    const findings = analyzeSuppressionFraud("parser.ts", code);
    expect(findings.filter((f) => f.ruleId === "NTA-S001").length).toBeGreaterThanOrEqual(2);
  });

  test("catches compiler directives @ts-ignore and bare @ts-expect-error (NTA-S002)", () => {
    const code = [
      "// @ts-ignore",
      "const bad = window.nonExistent;",
    ].join("\n");
    const findings = analyzeSuppressionFraud("bad.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-S002")).toBe(true);
  });

  test("catches linter disable comments (NTA-S003)", () => {
    const code = "/* eslint-disable no-explicit-any */\nexport const x = 1;";
    const findings = analyzeSuppressionFraud("lint.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-S003")).toBe(true);
  });

  test("catches empty catch block and .catch(() => {}) (NTA-S004)", () => {
    const code = [
      "export async function save(p: Promise<void>) {",
      "  try { await p; } catch (err) {}",
      "  await p.catch(() => {});",
      "}",
    ].join("\n");
    const findings = analyzeSuppressionFraud("save.ts", code);
    expect(findings.filter((f) => f.ruleId === "NTA-S004").length).toBe(2);
  });
});

describe("V3: Phantom Completion & Orphan Code Analyzer", () => {
  test("catches unfinished markers and not-implemented stubs (NTA-P001, NTA-P002)", () => {
    const code = [
      "// TODO: wire up real payment gateway",
      "export function chargeCard() {",
      '  throw new Error("Not implemented");',
      "}",
    ].join("\n");
    const findings = analyzePhantomCode("payment.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-P001")).toBe(true);
    expect(findings.some((f) => f.ruleId === "NTA-P002")).toBe(true);
  });

  test("catches orphan source files never imported anywhere (NTA-P003)", () => {
    const files = new Map<string, string>([
      ["src/index.ts", 'import { usedHelper } from "./used.ts";\nconsole.error(usedHelper());'],
      ["src/used.ts", "export function usedHelper() { return 1; }"],
      ["src/orphan-feature.ts", "export function deadFeature() { return 2; }"],
    ]);
    const findings = findOrphanFiles(files, ["src/index.ts"]);
    expect(findings.length).toBe(1);
    expect(findings[0]?.ruleId).toBe("NTA-P003");
    expect(findings[0]?.file).toBe("src/orphan-feature.ts");
  });
});

describe("V4: Security, Concurrency & Boundary Defect Scanner", () => {
  test("catches dynamic eval, fetch without AbortSignal, and async forEach (NTA-D001, NTA-D002, NTA-D003)", () => {
    const code = [
      "export async function runBadCode(items: string[], expr: string) {",
      "  eval(expr);",
      '  const res = await fetch("https://example.com/api");',
      "  items.forEach(async (item) => {",
      "    await Promise.resolve(item);",
      "  });",
      "  return res.status;",
      "}",
    ].join("\n");
    const findings = analyzeDefects("bad-runtime.ts", code);
    expect(findings.some((f) => f.ruleId === "NTA-D001")).toBe(true);
    expect(findings.some((f) => f.ruleId === "NTA-D002")).toBe(true);
    expect(findings.some((f) => f.ruleId === "NTA-D003")).toBe(true);
  });
});

describe("V5: Claim-to-Evidence & Anti-Sycophancy Verifier", () => {
  test("catches fabricated file and out-of-bounds line citations (NTA-E001, NTA-E002)", () => {
    const dir = mkdtempSync(join(tmpdir(), "nta-cite-"));
    try {
      writeFileSync(join(dir, "real.ts"), "const a = 1;\nconst b = 2;\n");
      const findings = verifyCitations(dir, [
        { file: "ghost.ts", startLine: 1, endLine: 5 },
        { file: "real.ts", startLine: 10, endLine: 20 },
        { file: "real.ts", startLine: 1, endLine: 2 },
      ]);
      expect(findings.some((f) => f.ruleId === "NTA-E001" && f.file === "ghost.ts")).toBe(true);
      expect(findings.some((f) => f.ruleId === "NTA-E002" && f.file === "real.ts")).toBe(true);
      expect(findings.length).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("catches sycophancy, performative praise, and speculative claims in agent reports (NTA-E003)", () => {
    const report = [
      "You're absolutely right! Great point!",
      "I updated the handler and it should work now.",
      "### Strengths",
      "The code structure is wonderful.",
    ].join("\n");
    const findings = analyzeAgentReportLanguage("agent-report.md", report);
    expect(findings.filter((f) => f.ruleId === "NTA-E003").length).toBeGreaterThanOrEqual(3);
  });

  test("detects stale VerdictReceipt when working tree changes after verification (NTA-E004)", () => {
    const dir = mkdtempSync(join(tmpdir(), "nta-receipt-"));
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src/app.ts"), "export const v = 1;\n");

      const receipt = createVerdictReceipt(dir, {
        command: "bun test",
        exitCode: 0,
        findingsCount: 0,
      });
      expect(verifyVerdictReceipt(dir, receipt)).toEqual([]);

      // Agent sneaks in a last-minute edit after running tests
      writeFileSync(join(dir, "src/app.ts"), "export const v = 2;\n");
      const findings = verifyVerdictReceipt(dir, receipt);
      expect(findings.some((f) => f.ruleId === "NTA-E004")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("scanWorkspace aggregates clean status on compliant project", () => {
    const dir = mkdtempSync(join(tmpdir(), "nta-clean-"));
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      mkdirSync(join(dir, "tests"), { recursive: true });
      writeFileSync(
        join(dir, "src/index.ts"),
        "export function add(a: number, b: number): number {\n  return a + b;\n}\n"
      );
      writeFileSync(
        join(dir, "tests/index.test.ts"),
        'import { expect, test } from "bun:test";\nimport { add } from "../src/index.ts";\ntest("adds two integers", () => {\n  expect(add(2, 3)).toBe(5);\n});\n'
      );

      const report = scanWorkspace(dir, { entrypoints: ["src/index.ts"] });
      expect(report.passed).toBe(true);
      expect(report.findings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
