# GEMINI.md — NeverTrustAgent Workspace Rules

See [`AGENTS.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/AGENTS.md), [`skills/never-trust-agent/SKILL.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/skills/never-trust-agent/SKILL.md), [`skills/mistake-ledger-grow-up/SKILL.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/skills/mistake-ledger-grow-up/SKILL.md), and [`MISTAKE_LEDGER.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/MISTAKE_LEDGER.md) for the complete rule ledger (`NTA-T001..T007`, `NTA-S001..S004`, `NTA-P001..P005`, `NTA-C001..C006`, `NTA-K001..K009`, `NTA-D001..D003`, `NTA-G001..G002`, `NTA-E001..E006`) and mandatory **Keep-Up-To-Date** + **Mistake Ledger Grow-Up** + **A→Z Video, Brutal Critique & Tech-Stack Anti-Backfire** protocols.

## Continuous Learning & Keep-Up-To-Date Loop

1. **Before answering architecture questions:** Consult `graphify-out/GRAPH_REPORT.md` and `graphify-out/graph.json`.
2. **Before writing production code or skills:** Follow strict TDD (`RED -> Verify RED -> GREEN -> Verify GREEN -> REFACTOR`).
3. **After any code, rule, or script change:**
   - Update `skills/never-trust-agent/SKILL.md` and `AGENTS.md` in the same turn (`NTA-K008`).
   - Run `bun run graph:update` to keep `graphify-out/` synchronized.
   - Run `rtk bun run typecheck && rtk bun run test:api && bun run scan && bun run audit:self` and verify `0` findings (`passed: true`, `100/100` Integrity Score) before claiming completion.
