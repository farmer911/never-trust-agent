# AGENTS.md — NeverTrustAgent Project Knowledge & Keep-Up-To-Date Law

> **Philosophy:** `NOTHING IS PERFECT. EVERY AGENT IS AN ASSHOLE UNTIL PROVEN BY DETERMINISTIC EVIDENCE.`

## 1. Mandatory Keep-Up-To-Date Protocol (`NTA-K008`)

Whenever you add, modify, or delete any analyzer rule (`NTA-*`), subagent, script, CLI command, or web route in this repository, you **MUST** in the **exact same turn**:
1. Update [`skills/never-trust-agent/SKILL.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/skills/never-trust-agent/SKILL.md), [`skills/mistake-ledger-grow-up/SKILL.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/skills/mistake-ledger-grow-up/SKILL.md), and this [`AGENTS.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/AGENTS.md) / [`GEMINI.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/GEMINI.md) so zero rules, scripts, or paths drift (`NTA-K005..K009`).
2. Whenever any mistake, test failure, analyzer violation, or user correction occurs, dissect it into [`MISTAKE_LEDGER.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/MISTAKE_LEDGER.md) with all 4 mandatory fields (`Where`, `How`, `Why`, `Prevention` — enforced by `NTA-K009`). Query past mistakes via `bun run mistakes` before coding.
3. Rebuild the Graphify knowledge graph (`bun run graph:update`) so `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` reflect the latest AST topology.
4. Run fresh verification after the final edit:
   ```bash
   rtk bun run typecheck && rtk bun run test:api && bun run scan
   ```

---

## 2. Project Architecture & Module Map

- **Entrypoints & Interfaces:**
  - `src/cli/index.ts` — CLI binary (`nta <serve|audit-repo|scan|diff-audit|report-audit|issue-receipt|verify-receipt|mistakes|log-mistake> [target]`)
  - `MISTAKE_LEDGER.md` — Canonical agent violation & post-mortem ledger (`Where`, `How`, `Why`, `Prevention`) queried via `bun run mistakes`
  - `src/web/server.ts` & `src/web/ui.ts` — Web platform (`http://127.0.0.1:4173`) with `POST /api/scan` (clones or pulls any Git repo & runs all 7 Inquisitor Subagents) and `GET /api/file` (line-by-line forensic code inspector)
  - `src/subagents/orchestrator.ts` — Parallel 7-subagent dispatcher & Integrity Score calculator
  - `src/repo/git-manager.ts` — Safe repo slug parser, `git clone` / `git pull` manager, and `rtk git` wrapper
  - `src/engine/scanner.ts` — Workspace static scanner
- **7 Inquisitor Subagents (`src/analyzers/`):**
  1. `TestInquisitor` (`src/analyzers/test-fraud.ts`): `NTA-T001`..`NTA-T007`
  2. `TypeAndErrorInquisitor` (`src/analyzers/suppression-fraud.ts`): `NTA-S001`..`NTA-S004`
  3. `DeadAndDuplicateCodeInquisitor` (`src/analyzers/phantom-code.ts`): `NTA-P001`..`NTA-P005`
  4. `CssAndUiInquisitor` (`src/analyzers/css-critic.ts`): `NTA-C001`..`NTA-C006`
  5. `SkillAndDocDriftInquisitor` (`src/analyzers/skill-critic.ts`): `NTA-K001`..`NTA-K009`
  6. `RuntimeAndSecurityInquisitor` (`src/analyzers/defect-scanner.ts`): `NTA-D001`..`NTA-D003`
  7. `GraphAndTokenInquisitor` (`src/analyzers/graph-optimizer.ts`): `NTA-G001`..`NTA-G002` + RTK/Graphify token telemetry
- **Evidence & Receipt Verifier (`src/analyzers/evidence-verifier.ts`):** `NTA-E001`..`NTA-E004`
- **Deterministic SDD & Debugging Scripts (`scripts/`):**
  - `scripts/sdd-workspace`, `scripts/task-brief`, `scripts/review-package`, `scripts/find-polluter.sh`, `scripts/update-graph.sh`
- **Adversarial Prompt Templates (`prompts/`):**
  - `prompts/inquisitor-task-reviewer.md`, `prompts/inquisitor-re-reviewer.md`, `prompts/implementer-strict.md`, `prompts/session-forensics.md`

---

## 3. Token Optimization Rules (RTK + Graphify)

- **Graphify First:** `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` index 124+ AST nodes and 300+ edges across 11 communities, reducing structural discovery token usage by **~83.9%**. Check `graphify-out/GRAPH_REPORT.md` before reading files blindly.
- **RTK Command Compression:** Prefix shell/git/test commands with `rtk` (`rtk bun run typecheck`, `rtk bun run test:api`, `rtk git status`) to compress noisy CLI outputs.
