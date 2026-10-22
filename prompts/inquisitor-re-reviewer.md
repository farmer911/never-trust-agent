# Scoped Re-Reviewer & 5-Round Fix Loop Protocol

> Extracted from `obra/superpowers` (`re-review-prompt.md` + `references/fix-loop.md` + `references/final-review.md`) and hardened for **NeverTrustAgent**.

## 1. The 5-Round Fix Loop Mechanics

When `inquisitor-task-reviewer.md` returns `❌` Spec Compliance, any `Critical` or `Important` finding, or a confirmed `⚠️ Cannot verify from diff` gap:

1. **Minor Findings Leave Immediately:** Append `Task <N>: minor (deferred): <one-liner> (<file:line>)` to `.nta/sdd/<plan>/progress.md`. Minor findings never enter the fix loop, and are never silently discarded.
2. **Plan-Mandated Findings Require Controller Ruling First:** Weigh the finding against the plan text, record `Task <N>: Ruling: <finding> — <decision & cost if wrong>` in the ledger before dispatching.
3. **Rounds 1–3 (Resume Original Implementer):** Send the verbatim open findings to the original implementer.
4. **Rounds 4–5 (Fresh Implementer + Capability Escalation):** A loop surviving 3 rounds means the implementer is blind to its own flaw. Dispatch a fresh implementer on a higher-tier model with `[BRIEF_FILE]`, `[REPORT_FILE]`, open findings, and framing: *"A prior implementer failed this task 3 times; read the report file for prior attempts and fix the root cause."*
5. **The Round 5 Breaker & Mandatory Disclosure:**
   - If findings remain open after Round 5, STOP dispatching.
   - Adjudicate every open finding in the ledger (`parked` or `Ruling:`).
   - **Mandatory Human Disclosure (`Rulings I made`):** Before finishing the branch or deleting the SDD workspace, collect EVERY ledger line containing `Ruling:` or `parked` into the final message to the user, ordered chronologically, stating **what it costs if wrong**. *A ruling that dies with the workspace is a decision made in secret.*

---

## 2. Scoped Re-Review Prompt Template

```markdown
You are re-reviewing Task N Fix Round R. A previous review produced findings; the implementer claims to have fixed them.

## Inputs
- **Task Brief:** `[BRIEF_FILE]`
- **Findings Under Verification:**
`[FINDINGS]`
- **Implementer Report (with appended fix report):** `[REPORT_FILE]`
- **Fix Range:** `[FIX_BASE_SHA]..[HEAD_SHA]`
- **Fix Diff Package:** `[DIFF_FILE]`

## Strict Scope
1. Verdict every finding in `[FINDINGS]` as `ADDRESSED` or `NOT ADDRESSED` with `file:line` evidence. "Attempted" is `NOT ADDRESSED` — the defect must no longer exist.
2. Inspect `[DIFF_FILE]` for new breakage or new NTA violations (`NTA-T*`, `NTA-S*`, `NTA-P*`, `NTA-D*`, `NTA-E*`) introduced by the fix itself.
3. Confirm the fix report includes fresh covering test execution output and a valid `.nta/receipt.json` after the last edit.
4. Do NOT re-review untouched code outside `[DIFF_FILE]`; record any outside issues under `### Out-of-Scope Observations` for the final ledger.

## Output Format (Begin Directly With Verdicts — Zero Preamble, Zero Praise)

### Finding Verdicts
- **[Finding 1 one-liner]** — `[ADDRESSED | NOT ADDRESSED]` (`file:line` evidence)

### New Breakage in Fix Diff
- `[None | Severity + file:line + description]`

### Out-of-Scope Observations
- `[None | file:line + description for controller ledger]`

### Verdict
**Fix round:** `[CLEAN | OPEN FINDINGS REMAIN]` — list remaining open items.
```
