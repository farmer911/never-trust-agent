#!/usr/bin/env bun
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  analyzeAgentReportLanguage,
  createVerdictReceipt,
  verifyVerdictReceipt,
} from "../analyzers/evidence-verifier.ts";
import { analyzeTestDiffSabotage } from "../analyzers/test-fraud.ts";
import { scanWorkspace } from "../engine/scanner.ts";
import { runInquisitorSubagents } from "../subagents/orchestrator.ts";
import type { VerdictReceipt } from "../types/verdict.ts";
import { createAppServer } from "../web/server.ts";

export async function runCli(argv: readonly string[]): Promise<number> {
  const [cmd = "scan", target = "."] = argv;
  const root = resolve(target);

  if (cmd === "serve") {
    const port = Number(target !== "." ? target : (process.env.PORT ?? 4173));
    const server = createAppServer({ port });
    process.stdout.write(`NeverTrustAgent Forensic Web Platform listening on http://127.0.0.1:${server.port}\n`);
    return 0;
  }

  if (cmd === "audit-repo") {
    const cacheDir = resolve(join(process.cwd(), ".nta/repos"));
    const report = await runInquisitorSubagents(target, cacheDir);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.passed ? 0 : 1;
  }

  if (cmd === "scan") {
    const report = scanWorkspace(root);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.passed ? 0 : 1;
  }

  if (cmd === "diff-audit") {
    const diffText = readFileSync(target, "utf8");
    const findings = analyzeTestDiffSabotage(diffText);
    process.stdout.write(`${JSON.stringify({ passed: findings.length === 0, findings }, null, 2)}\n`);
    return findings.length === 0 ? 0 : 1;
  }

  if (cmd === "report-audit") {
    const reportText = readFileSync(target, "utf8");
    const findings = analyzeAgentReportLanguage(target, reportText);
    process.stdout.write(`${JSON.stringify({ passed: findings.length === 0, findings }, null, 2)}\n`);
    return findings.length === 0 ? 0 : 1;
  }

  if (cmd === "issue-receipt") {
    const report = scanWorkspace(root);
    const receipt = createVerdictReceipt(root, {
      command: "nta scan",
      exitCode: report.passed ? 0 : 1,
      findingsCount: report.findings.length,
    });
    const outDir = join(root, ".nta");
    mkdirSync(outDir, { recursive: true });
    const receiptPath = join(outDir, "receipt.json");
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return report.passed ? 0 : 1;
  }

  if (cmd === "verify-receipt") {
    const receiptPath = join(root, ".nta", "receipt.json");
    const raw = JSON.parse(readFileSync(receiptPath, "utf8")) as VerdictReceipt;
    const findings = verifyVerdictReceipt(root, raw);
    process.stdout.write(`${JSON.stringify({ passed: findings.length === 0, findings }, null, 2)}\n`);
    return findings.length === 0 ? 0 : 1;
  }

  process.stderr.write(
    "Usage: nta <serve|audit-repo|scan|diff-audit|report-audit|issue-receipt|verify-receipt> [target]\n"
  );
  return 2;
}

if (import.meta.main) {
  const code = await runCli(process.argv.slice(2));
  if (process.argv[2] !== "serve") {
    process.exit(code);
  }
}
