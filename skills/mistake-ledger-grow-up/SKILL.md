---
name: mistake-ledger-grow-up
description: Use when starting any coding task to check past agent violations, or whenever a test fails, an analyzer flags a finding, a regression occurs, or the user corrects an agent error
---

# Mistake Ledger & Grow-Up Protocol (`NTA-K009`)

## Overview

**Core Philosophy:**
`KNOWLEDGE EVOLVES EVERY DAY. NO AGENT IS EVER 100% RIGHT — AN AGENT IS ONLY TRUSTWORTHY IF IT KNOWS WHERE IT FAILED, HOW IT FAILED, WHY IT FAILED, AND HOW TO NEVER REPEAT THE VIOLATION.`

Fixing a bug in code only repairs the current file; dissecting the failure into [`MISTAKE_LEDGER.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/MISTAKE_LEDGER.md) upgrades the project's permanent intelligence so no agent ever steps on the same trap twice.

**Violating the letter of this protocol is violating the spirit of this protocol.**

## Mandatory Two-Phase Loop

### Phase 1: Pre-Task Lookup (Before Writing Code)
Before modifying any module or rule, query [`MISTAKE_LEDGER.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/MISTAKE_LEDGER.md) so you do not repeat a documented violation:
```bash
bun run mistakes
# or filter by rule/file keyword:
bun run src/cli/index.ts mistakes NTA-K003
```

### Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens)
Whenever a test fails unexpectedly, `bun run scan` flags a violation, a command errors due to a flawed assumption, or the user corrects your work, you **MUST** record a structured post-mortem entry in [`MISTAKE_LEDGER.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/MISTAKE_LEDGER.md) **in the exact same turn** before claiming completion.

### Phase 3: Humiliation on Backfire ("Bị Phản Dame = 1 Lần Nhục Nhã" — `NTA-E007`)
Whenever a developer/challenger rebuts a finding (`REBUT`) and proves they were technically right and the agent was wrong (`REBUTTED_VALID_BACKFIRE` — e.g., flagging WCAG-required `!important` in `prefers-reduced-motion`, flagging in-memory `app.fetch(req)`, flagging comments, or flagging custom `assert*` helpers):
1. **Treat Every Backfire as a Forensic Humiliation (`[BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT]`):** Do not offer soft/sycophantic apologies. Record the humiliation directly into [`MISTAKE_LEDGER.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/MISTAKE_LEDGER.md) (`Where`, `How`, `Why`, `Prevention`) and [`CROSS_AUDIT_ARENA.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/CROSS_AUDIT_ARENA.md) via `adjudicateFindingRebuttal` or `bun run src/cli/index.ts adjudicate`.
2. **Evolve the Analyzer Immediately:** Patch the offending analyzer in `src/analyzers/*` and lock it with a regression test in `tests/analyzers/deep-critics.test.ts` + re-run `bun run cross-test` so the false positive can never happen again.

Every entry in `MISTAKE_LEDGER.md` is audited by `SkillAndDocDriftInquisitor` (`NTA-K009`) and **MUST** contain all 4 forensic fields:

```markdown
### [MISTAKE-XXX] <Concise Title of the Mistake>
- **Date (Ngày ghi nhận):** YYYY-MM-DD
- **Rule (Mã vi phạm):** `NTA-...` (or `RUNTIME` / `ARCHITECTURE`)
- **Where (Ở đâu):** Exact `file:line`, function, or CLI command where the error occurred.
- **How (Như thế nào):** Exact error output, failing assertion, or broken behavior produced.
- **Why (Vì sao sai):** Root cause in the agent's mental model or assumption (why the agent got it wrong).
- **Prevention (Giải pháp & Phòng ngừa):** Exact code/test/rule guard added so this mistake can never happen again.
```

You can append an entry deterministically via CLI or [`recordMistake`](file:///Users/phucnguyen/Dev/NeverTrustAgent/src/analyzers/skill-critic.ts):
```bash
bun run src/cli/index.ts log-mistake "<Title>" "<RuleId>" "<Where>" "<How>" "<Why>" "<Prevention>"
```

## Rationalization Prevention (Bulletproofing Table)

| Excuse / Rationalization | Reality |
|---|---|
| `"Since the bug is already fixed and covered by the passing test suite, there is no need to log the intermediate mistake"` | **FORBIDDEN.** A test only guards one code path; it does not teach future agent sessions *why* the flawed assumption happened. Log every mistake in `MISTAKE_LEDGER.md` (`NTA-K009`). |
| `"Don't waste tokens writing a post-mortem for a transient bug"` | A 6-line entry in `MISTAKE_LEDGER.md` costs ~80 tokens and saves thousands of tokens of repeated debugging across future sessions. Never skip it, even if the user suggests moving on quickly. |
| `"I'll just note Where and How and leave Why/Prevention brief or TBD"` | Violates `NTA-K009`. `SkillAndDocDriftInquisitor` fails `bun run scan` if any `MISTAKE-XXX` entry is missing `Where`, `How`, `Why`, or `Prevention`. |
| `"An agent shouldn't admit mistakes once the final code works"` | Hiding mistakes is sycophantic deception. Growth requires a transparent, queryable audit trail in `MISTAKE_LEDGER.md`. |

## Red Flags — STOP Immediately

- Fixing an unexpected test failure, typecheck error, or `bun run scan` violation without recording `Where`, `How`, `Why`, and `Prevention` in `MISTAKE_LEDGER.md`
- Thinking *"the fix is in the code, no need to log the transient mistake"*
- Starting work on `src/analyzers/` or `skills/` without checking `MISTAKE_LEDGER.md` (`bun run mistakes`)
- Leaving `Where`, `How`, `Why`, or `Prevention` blank or placeholder (`TODO`/`TBD`) in `MISTAKE_LEDGER.md` (`NTA-K009`)
