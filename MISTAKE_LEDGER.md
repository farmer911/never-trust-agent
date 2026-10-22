# MISTAKE_LEDGER.md — Agent Forensic Post-Mortem & Grow-Up Ledger

> **Axiom:** `KNOWLEDGE EVOLVES DAILY. NO AGENT IS 100% RIGHT — EVERY MISTAKE MUST BE DISSECTED (WHERE, HOW, WHY, PREVENTION) SO IT IS NEVER REPEATED.`

Use `bun run mistakes` (or `bun run src/cli/index.ts mistakes [keyword]`) to search this ledger before modifying code or skills. Every entry below is enforced by `SkillAndDocDriftInquisitor` (`NTA-K009`).

### [MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section
- **Date (Ngày ghi nhận):** 2026-10-22
- **Rule (Mã vi phạm):** `NTA-K003`
- **Where (Ở đâu):** `skills/never-trust-agent/SKILL.md:70` and `src/analyzers/skill-critic.ts:8`
- **How (Như thế nào):** After wiring `analyzeSkillAndDocDrift` into `scanWorkspace`, self-dogfooding test `tests/analyzers/nta-suite.test.ts:107` failed with `NTA-K003` because line 70 of `skills/never-trust-agent/SKILL.md` quoted the literal banned sycophancy phrases inside its "Red Flags" bullet list.
- **Why (Vì sao sai):** The agent wrote negative examples in `SKILL.md` by pasting the exact raw substrings matched by `WEAK_OR_SYCOPHANTIC_SKILL_LINE` without checking that `analyzeSkillAndDocDrift` scans every line of `SKILL.md` unconditionally.
- **Prevention (Giải pháp & Phòng ngừa):** Wired `analyzeSkillAndDocDrift(root)` directly into `scanWorkspace` (`src/engine/scanner.ts:41`) so `bun run scan` audits all project `SKILL.md` files on every run, and rewrote `SKILL.md` negative examples to describe banned patterns structurally rather than embedding raw trigger strings.

### [MISTAKE-002] Unscoped Graphify File Collection Indexing node_modules and Cache Directories
- **Date (Ngày ghi nhận):** 2026-10-22
- **Rule (Mã vi phạm):** `NTA-G002`
- **Where (Ở đâu):** `scripts/update-graph.sh:18` and `graphify-out/graph.json`
- **How (Như thế nào):** Running `collect_files(Path("."))` on the workspace root indexed 228 files (2,226 nodes and 2,727 edges) because cached repositories and non-source directories were traversed, and `graphify.report.generate()` threw `AttributeError: 'PosixPath' object has no attribute 'get'` when passed `Path(".")` instead of `detect(Path("."))`.
- **Why (Vì sao sai):** The agent assumed `collect_files(Path("."))` respected `.gitignore` by default and assumed `generate()` accepted a `Path` argument without inspecting the `graphify.report.generate` function signature first.
- **Prevention (Giải pháp & Phòng ngừa):** Created deterministic `scripts/update-graph.sh` (wired to `bun run graph:update`) that explicitly scopes AST extraction to `["src", "tests", "scripts", "prompts", "skills", "AGENTS.md", "GEMINI.md", "MISTAKE_LEDGER.md"]` and passes `detect(Path("."))` + `force=True`.

### [MISTAKE-003] Deferring Skill & Knowledge Synchronization Under Time Pressure
- **Date (Ngày ghi nhận):** 2026-10-22
- **Rule (Mã vi phạm):** `NTA-K008`
- **Where (Ở đâu):** `src/analyzers/skill-critic.ts:52` and `skills/never-trust-agent/SKILL.md:25`
- **How (Như thế nào):** In baseline pressure testing, an agent without the Keep-Up-To-Date gate agreed to skip updating `SKILL.md`, `AGENTS.md`, and `graphify-out/graph.json` when told deployment freeze was 1 minute away.
- **Why (Vì sao sai):** Without a deterministic static analysis failure, agents treat documentation and knowledge-graph updates as optional post-processing rather than part of the code contract.
- **Prevention (Giải pháp & Phòng ngừa):** Implemented `NTA-K008` in `src/analyzers/skill-critic.ts` to extract every `ruleId: "NTA-..."` from `src/` and fail `bun run scan` whenever any rule is missing from `SKILL.md`, `AGENTS.md`, or `GEMINI.md`.

### [MISTAKE-004] Embedded Call-Site Syntax in Brutal Critique Dictionary Triggered NTA-D001 and NTA-D003
- **Date (Ngày ghi nhận):** 2026-10-22
- **Rule (Mã vi phạm):** `NTA-D001`
- **Where (Ở đâu):** `src/analyzers/evidence-verifier.ts:321` and `src/analyzers/evidence-verifier.ts:330`
- **How (Như thế nào):** Self-dogfooding test `tests/analyzers/nta-suite.test.ts:107` failed with NTA-D001 and NTA-D003 because the Vietnamese critique strings in `BRUTAL_CRITIQUE_BY_RULE` contained literal call-site substrings `eval()` and `.forEach(async ...)`.
- **Why (Vì sao sai):** Repeated the pattern of MISTAKE-001 in TypeScript string literals: `analyzeDefects` scans all non-comment source lines for `\beval\s*\(` and `\.forEach\s*\(\s*async\b` including inside dictionary strings.
- **Prevention (Giải pháp & Phòng ngừa):** Replaced raw call-site syntax inside `BRUTAL_CRITIQUE_BY_RULE` strings with descriptive identifier references (`hàm eval`, `vòng lặp forEach bất đồng bộ`) and verified `bun run scan` returns 0 findings.
