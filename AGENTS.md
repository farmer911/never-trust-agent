# AGENTS.md — NeverTrustAgent Project Knowledge & Keep-Up-To-Date Law

> **Philosophy:** `NOTHING IS PERFECT. EVERY AGENT IS AN ASSHOLE UNTIL PROVEN BY DETERMINISTIC EVIDENCE.`

## 1. Mandatory Keep-Up-To-Date Protocol (`NTA-K008`)

Whenever you add, modify, or delete any analyzer rule (`NTA-*`), subagent, script, CLI command, or web route in this repository, you **MUST** in the **exact same turn**:
1. Update [`skills/never-trust-agent/SKILL.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/skills/never-trust-agent/SKILL.md), [`skills/mistake-ledger-grow-up/SKILL.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/skills/mistake-ledger-grow-up/SKILL.md), and this [`AGENTS.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/AGENTS.md) / [`GEMINI.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/GEMINI.md) so zero rules, scripts, or paths drift (`NTA-K005..K009`).
2. Whenever any mistake, test failure, analyzer violation, or user correction occurs, dissect it into [`MISTAKE_LEDGER.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/MISTAKE_LEDGER.md) with all 4 mandatory fields (`Where`, `How`, `Why`, `Prevention` — enforced by `NTA-K009`). Query past mistakes via `bun run mistakes` before coding.
3. Rebuild the Graphify knowledge graph (`bun run graph:update`) so `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` reflect the latest AST topology.
4. Run fresh verification (including full 7-subagent self-audit `bun run audit:self`) after the final edit:
   ```bash
   rtk bun run typecheck && rtk bun run test:api && bun run scan && bun run audit:self
   ```

---

## 2. Project Architecture & Module Map

- **Entrypoints & Interfaces:**
  - `src/cli/index.ts` — CLI binary (`nta <serve|audit-repo|scan|cross-test|adjudicate|diff-audit|report-audit|issue-receipt|verify-receipt|mistakes|log-mistake> [target]`)
  - `MISTAKE_LEDGER.md` & `CROSS_AUDIT_ARENA.md` — Canonical agent violation, backfire humiliation (`BỊ PHẢN DAME — NỖI NHỤC NHÃ`), & 20-round adversarial cross-test dossiers queried via `bun run mistakes` and `bun run cross-test`
  - `src/web/server.ts` & `src/web/ui.ts` — Web platform (`http://127.0.0.1:4173`) with `POST /api/scan` (clones or pulls any Git repo, runs all 7 Inquisitor Subagents across full source & full flow, dissects `whyItIsWrong`, seals A→Z `.webm` video evidence, and writes a shareable `.md` dossier), `GET /api/report` (streams the shareable `.md` forensic dossier), `GET /api/cross-audit` (20-round self-cross-test arena), `POST /api/rebuttal` (`AGREE` vs `REBUT` adjudication & humiliation logger), `GET /api/video` (streams the sealed A→Z `.webm` forensic video), and `GET /api/file` (line-by-line forensic code inspector)
  - `src/subagents/orchestrator.ts` — Parallel 7-subagent dispatcher, Integrity Score calculator, 20-round `runCrossTestArena`, and `adjudicateFindingRebuttal`
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
- **Evidence & Tech-Stack Verifier (`src/analyzers/evidence-verifier.ts` & `src/analyzers/tech-stack-detector.ts`):** `NTA-E001`..`NTA-E007` (citations, anti-sycophancy, SHA-256 `VerdictReceipt`, full-flow A→Z `.webm` video evidence, brutal `whyItIsWrong` root-cause verifier, tech-stack fingerprinting / anti-backfire guard, and shareable `.md` dossier + backfire humiliation evolution gate)
- **Deterministic SDD & Debugging Scripts (`scripts/`):**
  - `scripts/sdd-workspace`, `scripts/task-brief`, `scripts/review-package`, `scripts/find-polluter.sh`, `scripts/update-graph.sh`
- **Adversarial Prompt Templates (`prompts/`):**
  - `prompts/inquisitor-task-reviewer.md`, `prompts/inquisitor-re-reviewer.md`, `prompts/implementer-strict.md`, `prompts/session-forensics.md`

---

## 3. Token Optimization Rules (RTK + Graphify)

- **Graphify First:** `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` index 124+ AST nodes and 300+ edges across 11 communities, reducing structural discovery token usage by **~83.9%**. Check `graphify-out/GRAPH_REPORT.md` before reading files blindly.
- **RTK Command Compression:** Prefix shell/git/test commands with `rtk` (`rtk bun run typecheck`, `rtk bun run test:api`, `rtk git status`) to compress noisy CLI outputs.
