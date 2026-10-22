import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPTS_DIR = resolve(process.cwd(), "scripts");

function runBash(scriptName: string, args: readonly string[], cwd: string, env?: NodeJS.ProcessEnv) {
  return spawnSync("bash", [join(SCRIPTS_DIR, scriptName), ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

describe("Extracted & Hardened Superpowers Scripts", () => {
  test("sdd-workspace creates plan-scoped directory and disambiguates basename collisions", () => {
    const repo = mkdtempSync(join(tmpdir(), "nta-sdd-"));
    try {
      spawnSync("git", ["init"], { cwd: repo });
      mkdirSync(join(repo, "docs/alpha"), { recursive: true });
      mkdirSync(join(repo, "docs/beta"), { recursive: true });
      const planA = join(repo, "docs/alpha/plan.md");
      const planB = join(repo, "docs/beta/plan.md");
      writeFileSync(planA, "# Plan A\n");
      writeFileSync(planB, "# Plan B\n");

      const resA = runBash("sdd-workspace", [planA], repo);
      expect(resA.status).toBe(0);
      const dirA = resA.stdout.trim();
      expect(existsSync(join(dirA, "plan-path"))).toBe(true);

      const resB = runBash("sdd-workspace", [planB], repo);
      expect(resB.status).toBe(0);
      const dirB = resB.stdout.trim();
      expect(dirB).not.toBe(dirA);
      expect(dirB.endsWith("plan-beta")).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test("task-brief extracts target task while ignoring headings inside code fences", () => {
    const repo = mkdtempSync(join(tmpdir(), "nta-brief-"));
    try {
      spawnSync("git", ["init"], { cwd: repo });
      const plan = join(repo, "plan.md");
      writeFileSync(
        plan,
        [
          "# Implementation Plan",
          "## Task 1: Setup",
          "```markdown",
          "## Task 2: Fake heading inside code block",
          "```",
          "Still in Task 1",
          "## Task 2: Real Second Task",
          "Step 2 body",
          "## Task 3: Third Task",
        ].join("\n")
      );

      const out = join(repo, "task-2.md");
      const res = runBash("task-brief", [plan, "2", out], repo);
      expect(res.status).toBe(0);
      const extracted = readFileSync(out, "utf8");
      expect(extracted).toContain("## Task 2: Real Second Task");
      expect(extracted).not.toContain("Fake heading inside code block");
      expect(extracted).not.toContain("## Task 3");

      const missing = runBash("task-brief", [plan, "99", out], repo);
      expect(missing.status).toBe(3);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test("review-package enforces ancestor range guards and outputs commit log, stat, and diff", () => {
    const repo = mkdtempSync(join(tmpdir(), "nta-rev-"));
    try {
      spawnSync("git", ["init"], { cwd: repo });
      spawnSync("git", ["config", "user.email", "nta@example.com"], { cwd: repo });
      spawnSync("git", ["config", "user.name", "NTA"], { cwd: repo });

      const plan = join(repo, "plan.md");
      writeFileSync(plan, "# Plan\n");
      writeFileSync(join(repo, "file.ts"), "export const x = 1;\n");
      spawnSync("git", ["add", "."], { cwd: repo });
      spawnSync("git", ["commit", "-m", "base commit"], { cwd: repo });
      const baseSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();

      writeFileSync(join(repo, "file.ts"), "export const x = 2;\n");
      spawnSync("git", ["commit", "-am", "task commit"], { cwd: repo });
      const headSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();

      // Empty range guard (base == head) must exit 3
      const emptyRes = runBash("review-package", [plan, baseSha, baseSha], repo);
      expect(emptyRes.status).toBe(3);

      // Valid range generates package
      const out = join(repo, "review.diff");
      const validRes = runBash("review-package", [plan, baseSha, headSha, out], repo);
      expect(validRes.status).toBe(0);
      const pkg = readFileSync(out, "utf8");
      expect(pkg).toContain("## Commits");
      expect(pkg).toContain("task commit");
      expect(pkg).toContain("## Diff");
      expect(pkg).toContain("+export const x = 2;");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test("find-polluter.sh isolates the exact test file that creates unwanted state", () => {
    const repo = mkdtempSync(join(tmpdir(), "nta-polluter-"));
    try {
      mkdirSync(join(repo, "tests"), { recursive: true });
      writeFileSync(join(repo, "tests/a.test.js"), "// clean test\n");
      writeFileSync(
        join(repo, "tests/b.test.js"),
        'require("node:fs").writeFileSync(".polluted", "dirty");\n'
      );

      const res = runBash("find-polluter.sh", [".polluted", "tests/*.test.js"], repo, {
        NTA_TEST_CMD: "node",
      });
      expect(res.status).toBe(1);
      expect(res.stdout).toContain("FOUND POLLUTER");
      expect(res.stdout).toContain("tests/b.test.js");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
