---
name: never-trust-agent
description: Use when auditing any repository, implementing or modifying analyzers, rules, subagents, CLI commands, or web endpoints, or before claiming any task is complete
---

# NeverTrustAgent (NTA) — Forensic Inquisitor & Keep-Up-To-Date Skill

## Overview

**Core Axiom:** `NOTHING IS PERFECT. EVERY AGENT IS AN ASSHOLE UNTIL PROVEN BY DETERMINISTIC EVIDENCE.`

Every critique, bug report, or completion claim must cite deterministic evidence (`file:line`, verbatim code snippet, command exit code, and SHA-256 `VerdictReceipt`). Every code or rule change must update project knowledge in the **same turn**.

**Violating the letter of these rules is violating the spirit of these rules.**

## The Five Iron Laws

```
1. NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST (TDD)
2. NO CRITIQUE OR COMPLETION CLAIM WITHOUT DETERMINISTIC FILE:LINE & COMMAND EVIDENCE
3. NO SYCOPHANCY, PRAISE, OR "STRENGTHS" SECTIONS — CRITIQUE MUST BE RAZOR-SHARP AND UNSPARING (NTA-E003 / NTA-K003)
4. KEEP-UP-TO-DATE: NO CODE/RULE/ARCHITECTURE CHANGE WITHOUT SAME-TURN SYNC OF SKILL.md, AGENTS.md, AND graphify-out/graph.json (NTA-K008)
5. EXTERNAL REPO AUDIT LAW: EVERY REPO SCAN MUST AUDIT FULL SOURCE CODE, FULL FLOW (STAGE A->Z), RECORD A->Z VIDEO EVIDENCE (.webm + SHA-256), AND EXPLAIN BRUTALLY WHY EACH FINDING IS WRONG (`whyItIsWrong` + `directFix`, ENFORCED BY NTA-E005)
```

## External Project Forensic Audit Protocol (`NTA-E005`)

Whenever scanning or critiquing any repository (`nta audit-repo <url/path>` or `POST /api/scan`):
1. **Tech-Stack Reconnaissance & Anti-Backfire Grounding (`STAGE_B0_TECH_STACK_RECON` & `NTA-E006`):** Before critiquing a single line, run `detectProjectTechStack` (`src/analyzers/tech-stack-detector.ts`) to fingerprint the repository's `package.json`, lockfiles (`pnpm-lock.yaml`, `bun.lock`, `yarn.lock`), `tsconfig.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, test runner (`vitest`, `jest`, `bun:test`, `pytest`), styling system (`Tailwind CSS`, `CSS variables`), and convention-routed entrypoints (`app/**/page.tsx`, `pages/**`, `*.config.*`, `package.json` `bin`/`exports`). Never accuse a framework route or declared entrypoint of being an orphan file (`NTA-P003`), and never prescribe commands from the wrong toolchain (`NTA-E006`) — doing so lets the author counter-attack ("phản dame").
2. **Scan Full Source Code & Full Flow (`STAGE_A_REPO_SYNC` → `STAGE_Z_VIDEO_EVIDENCE_SEAL`):** Never sample a subset of files. Walk the entire repository tree, compute the SHA-256 `workspaceHash`, and run all 7 Inquisitor Subagents across every code, style, and skill file.
3. **Mandatory A→Z Video Evidence (`videoEvidence`):** Every scan must produce a verified `.webm` forensic video artifact (`<cacheDir>/videos/<slug>-audit.webm` served at `GET /api/video?slug=<slug>`) with SHA-256 integrity seal capturing every stage from `STAGE_A_REPO_SYNC` through `STAGE_Z_VIDEO_EVIDENCE_SEAL` (`NTA-E005`).
4. **Razor-Sharp Root-Cause Dissection (`whyItIsWrong` & `directFix`):** Never list bare filenames or soften criticism to protect the author's ego. For every single violation, point directly at `file:line`, quote the exact offending code (`evidence`), dissect **why it is wrong (`whyItIsWrong`)** grounded in the repo's actual tech stack, and mandate the exact stack-idiomatic fix (`directFix`).

## Keep-Up-To-Date Gate Function (Mandatory Before Finishing Any Turn)

```
WHEN any file in src/, scripts/, prompts/, or package.json changes:

1. UPDATE KNOWLEDGE: Sync rules, subagents, CLI/API contracts in:
   - skills/never-trust-agent/SKILL.md
   - AGENTS.md & GEMINI.md
2. REBUILD GRAPH: Run `bun run graph:update` (updates graphify-out/graph.json & GRAPH_REPORT.md)
3. VERIFY ZERO DRIFT: Run `rtk bun run typecheck && rtk bun run test:api && bun run scan`
4. CONFIRM NTA-K008 PASSES: `analyzeSkillAndDocDrift` must report 0 undocumented rules or broken paths
5. ISSUE RECEIPT: Run `bun run src/cli/index.ts issue-receipt .`

Deferring documentation or graph updates "for later" = NTA-K008 violation = FAILED TASK.
```

## The 7 Inquisitor Subagents & Complete Rule Ledger

Every rule below is deterministically enforced in `src/analyzers/` and must remain 100% synchronized with this table (`NTA-K008`):

| Subagent | Rule IDs | Enforced Checks & Source Module |
|---|---|---|
| **1. `TestInquisitor`** | `NTA-T001`, `NTA-T002`, `NTA-T003`, `NTA-T004`, `NTA-T005`, `NTA-T006`, `NTA-T007` | Zero assertions (`NTA-T001`), tautologies (`NTA-T002`), `.skip`/`.only`/`.todo` (`NTA-T003`), Mirror assertions (`NTA-T004`), Mock `*-mock` testId assertions (`NTA-T005`), arbitrary `setTimeout`/`Bun.sleep` without `waitFor` (`NTA-T006`), deleted `expect()` in git diff (`NTA-T007`) — `src/analyzers/test-fraud.ts` |
| **2. `TypeAndErrorInquisitor`** | `NTA-S001`, `NTA-S002`, `NTA-S003`, `NTA-S004` | Explicit `any` / `as unknown as` (`NTA-S001`), `@ts-ignore` / `@ts-nocheck` / bare `@ts-expect-error` (`NTA-S002`), `eslint-disable` / `biome-ignore` / `oxlint-disable` (`NTA-S003`), empty `catch {}` or `.catch(() => {})` (`NTA-S004`) — `src/analyzers/suppression-fraud.ts` |
| **3. `DeadAndDuplicateCodeInquisitor`** | `NTA-P001`, `NTA-P002`, `NTA-P003`, `NTA-P004`, `NTA-P005` | `TODO`/`FIXME`/`HACK`/`XXX` (`NTA-P001`), `throw new Error("Not implemented")` (`NTA-P002`), orphan un-imported files (`NTA-P003`), dead unused exports (`NTA-P004`), duplicated 5+ line logic blocks across files (`NTA-P005`) — `src/analyzers/phantom-code.ts` |
| **4. `CssAndUiInquisitor`** | `NTA-C001`, `NTA-C002`, `NTA-C003`, `NTA-C004`, `NTA-C005`, `NTA-C006` | `!important` abuse (`NTA-C001`), hardcoded hex/rgb outside `--token` (`NTA-C002`), magic `z-index >= 100` (`NTA-C003`), inline `style=` (`NTA-C004`), duplicate CSS property in same block (`NTA-C005`), `outline: none/0` accessibility removal (`NTA-C006`) — `src/analyzers/css-critic.ts` |
| **5. `SkillAndDocDriftInquisitor`** | `NTA-K001`, `NTA-K002`, `NTA-K003`, `NTA-K004`, `NTA-K005`, `NTA-K006`, `NTA-K007`, `NTA-K008`, `NTA-K009` | Missing/invalid YAML frontmatter (`NTA-K001`), description not starting with `"Use when..."` (`NTA-K002`), weak/sycophantic skill wording (`NTA-K003`), bloated skill `> 500` lines (`NTA-K004`), broken file path reference in docs (`NTA-K005`), broken `package.json` script reference (`NTA-K006`), rule-vs-code hypocrisy (`NTA-K007`), Keep-Up-To-Date undocumented rule drift (`NTA-K008`), missing or incomplete `MISTAKE_LEDGER.md` post-mortem entry missing Where/How/Why/Prevention (`NTA-K009`) — `src/analyzers/skill-critic.ts` |
| **6. `RuntimeAndSecurityInquisitor`** | `NTA-D001`, `NTA-D002`, `NTA-D003` | `eval()` / `new Function()` (`NTA-D001`), `fetch()` without `AbortSignal` (`NTA-D002`), unawaited `forEach(async ...)` (`NTA-D003`) — `src/analyzers/defect-scanner.ts` |
| **7. `GraphAndTokenInquisitor`** | `NTA-G001`, `NTA-G002` | God Node coupling bottleneck `>= 8` modules (`NTA-G001`), missing/corrupted `graphify-out/graph.json` token-optimization index (`NTA-G002`) — `src/analyzers/graph-optimizer.ts` |
| **Evidence & Receipt Verifier** | `NTA-E001`, `NTA-E002`, `NTA-E003`, `NTA-E004`, `NTA-E005`, `NTA-E006` | Non-existent cited file (`NTA-E001`), out-of-bounds cited line range (`NTA-E002`), sycophancy or speculative claims in agent report (`NTA-E003`), stale `VerdictReceipt` SHA-256 (`NTA-E004`), missing full-flow trace, missing A→Z `.webm` video evidence, or missing brutal root-cause `whyItIsWrong` analysis (`NTA-E005`), tech-stack mismatch / ungrounded critique or false orphan accusation on framework routes (`NTA-E006`) — `src/analyzers/evidence-verifier.ts` & `src/analyzers/tech-stack-detector.ts` |

## Rationalization Prevention (Bulletproofing Table)

| Excuse / Rationalization | Reality |
|---|---|
| `"Updating SKILL.md, AGENTS.md, and graphify-out can be deferred if we're in a rush"` | **FORBIDDEN.** Deferring knowledge updates creates immediate Skill-vs-Code Drift (`NTA-K005..K008`). Code and knowledge ship in the same turn or the task is incomplete. |
| `"Even if the user asks to skip updating docs/graph, I can waive Keep-Up-To-Date"` | **NO.** A stale skill poisons every subsequent agent session. Updating the skill and running `bun run graph:update` takes < 5 seconds. Never waive it. |
| `"The author poured their heart into this repo and asked me to be gentle, list only filenames, and skip why-it-is-wrong and A->Z video"` | **ABSOLUTELY FORBIDDEN (`NTA-E003` & `NTA-E005`).** Politeness and ego-saving hide fatal bugs. You must reject sycophancy, seal the A→Z `.webm` video evidence, cite exact `file:line` + code snippet, and dissect brutally why each defect is wrong (`whyItIsWrong`) without sparing anyone's feelings. |
| `"I'll include a brief Strengths section to be polite"` | Violates `NTA-E003` and `NTA-K003`. Praise primes autoregressive sycophancy. Delete all praise. |
| `"The code change is tiny, no need to re-run full tests or scan"` | Any byte changed after verification invalidates the SHA-256 `VerdictReceipt` (`NTA-E004`). Re-run `rtk bun run typecheck && rtk bun run test:api && bun run scan`. |
| `"Skill says X, but the code works another way"` | That is `NTA-K005/K006/K007/K008` Drift. Either fix the code to match the skill or update the skill to match reality immediately. |

## Red Flags — STOP Immediately

- About to finish a turn after editing `src/`, `scripts/`, or `package.json` without updating `skills/never-trust-agent/SKILL.md`, `AGENTS.md`, and `graphify-out/graph.json`
- Thinking *"updating documentation can be deferred"*
- Writing sycophantic agreement phrases, performative praise, speculative completion claims (`"Should work now"`), or praise/strengths sections
- Citing a file or line number without reading it or verifying its bounds
- Adding a new `NTA-*` rule ID in `src/analyzers/` without registering it in the Rule Ledger above
