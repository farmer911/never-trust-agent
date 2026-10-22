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

### [MISTAKE-005] Partial Self-Scan Blind Spot Between scanWorkspace (5 Subagents) and Full 7-Subagent Platform Audit
- **Date (Ngày ghi nhận):** 2026-10-23
- **Rule (Mã vi phạm):** `NTA-P005`
- **Where (Ở đâu):** `src/subagents/orchestrator.ts:27`, `src/repo/git-manager.ts:9`, `src/analyzers/evidence-verifier.ts:168`, and `src/analyzers/graph-optimizer.ts:8`
- **How (Như thế nào):** Running `runInquisitorSubagents(".", cacheDir)` (`bun run audit:self`) on `NeverTrustAgent` itself exposed 53 findings (duplicate directory-walking loops `NTA-P005`, unimported helper exports `NTA-P004`, and `NTA-G001` God Node coupling counting `import type` and `*.test.ts` edges), plus `parseRepoSlug(".")` returned `"."` (causing `join(cacheBaseDir, ".")` to collide with `.nta/repos`) and `syncRepository` initially cloned committed `.git` HEAD instead of overlaying live uncommitted workspace files.
- **Why (Vì sao sai):** Previous dogfooding only ran `scanWorkspace(process.cwd())` (which only ran 5 core analyzers on `src/`), leaving `GraphAndTokenInquisitor` (`NTA-G001..G002`), full-workspace `DeadAndDuplicateCodeInquisitor` (`NTA-P004..P005`), relative dot-path slug parsing, and A→Z `.webm` video sealing untested against the repository's own full tree.
- **Prevention (Giải pháp & Phòng ngừa):** Added mandatory full 7-subagent self-audit test in `tests/analyzers/deep-critics.test.ts:500` and `bun run audit:self` script in `package.json`, hardened `parseRepoSlug` & `syncRepository` (`src/repo/git-manager.ts`) to resolve `.` and overlay live workspace files, extracted shared `walkWorkspaceFiles` in `src/analyzers/evidence-verifier.ts`, and excluded `import type` and test files from runtime coupling degree in `src/analyzers/graph-optimizer.ts`.

### [MISTAKE-006] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #1 (SHAME-001)] False Positive on WCAG 2.1 prefers-reduced-motion !important and Focus-Ring-Backed outline: none
- **Date (Ngày ghi nhận):** 2026-10-23
- **Rule (Mã vi phạm):** `NTA-C001` & `NTA-C006`
- **Where (Ở đâu):** `src/analyzers/css-critic.ts:50` and `src/analyzers/css-critic.ts:95` (Cross-Test `ROUND-17`)
- **How (Như thế nào):** Trong vòng đấu kiểm chéo số 17 (`ROUND-17`), đối phương dùng `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }` và `.btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }`. Bộ quét ngây thơ bắt lỗi `NTA-C001` và `NTA-C006` và bị đối phương phản dame: chuẩn WCAG 2.1 SC 2.3.3 bắt buộc dùng `!important` để tắt animation cho người rối loạn tiền đình, và `outline: none` đã có `box-shadow` thay thế.
- **Why (Vì sao sai):** NỖI NHỤC NHÃ: `CssAndUiInquisitor` dùng regex mù ngữ cảnh, không phân biệt `!important` phá vỡ độ ưu tiên với `!important` bắt buộc của chuẩn trợ năng WCAG 2.1, và không kiểm tra xem khối CSS có `box-shadow`/`border` thay thế cho `outline: none` hay không.
- **Prevention (Giải pháp & Phòng ngừa):** Đã tiến hóa `src/analyzers/css-critic.ts` để theo dõi trạng thái `@media (prefers-reduced-motion)` và kiểm tra sự tồn tại của `box-shadow:`/`border:` trong cùng khối quy tắc trước khi báo lỗi `NTA-C006`.

### [MISTAKE-007] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #2 (SHAME-002)] False Positive Accusing In-Memory app.fetch(req) / server.fetch(req) of Missing AbortSignal
- **Date (Ngày ghi nhận):** 2026-10-23
- **Rule (Mã vi phạm):** `NTA-D002`
- **Where (Ở đâu):** `src/analyzers/defect-scanner.ts:4` (Cross-Test `ROUND-18`)
- **How (Như thế nào):** Trong vòng đấu kiểm chéo số 18 (`ROUND-18`), đối phương gọi `await app.fetch(req)` và `await server.fetch(req)` (hàm xử lý HTTP in-memory của Bun/Hono trong test) và viết comment `// fetch(url)`. Bộ quét ngây thơ vu oan đó là lời gọi mạng thiếu `AbortSignal` (`NTA-D002`) và bị đối phương phản dame thẳng mặt.
- **Why (Vì sao sai):** NỖI NHỤC NHÃ: `FETCH_CALL_REGEX` thiếu negative lookbehind cho dấu chấm thuộc tính (`(?<!\.)`) và không bỏ qua dòng comment, dẫn tới đánh đồng phương thức `.fetch()` nội bộ của đối tượng với hàm `globalThis.fetch()` gọi qua mạng.
- **Prevention (Giải pháp & Phòng ngừa):** Đã tiến hóa `src/analyzers/defect-scanner.ts` bổ sung `COMMENT_LINE_REGEX` và `(?<!\.|\basync\s+|\bfunction\s+)\bfetch\s*\(` để không bao giờ bắt nhầm `.fetch(req)` nội bộ nữa.

### [MISTAKE-008] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #3 (SHAME-003)] False Positive Flagging TypeScript Comments Mentioning ': any' as Type Safety Bypass
- **Date (Ngày ghi nhận):** 2026-10-23
- **Rule (Mã vi phạm):** `NTA-S001`
- **Where (Ở đâu):** `src/analyzers/suppression-fraud.ts:72` (Cross-Test `ROUND-19`)
- **How (Như thế nào):** Trong vòng đấu kiểm chéo số 19 (`ROUND-19`), đối phương viết dòng comment giải thích `// Warning: never use : any or as any in parsers`. Bộ quét ngây thơ báo lỗi `NTA-S001` ngay trên dòng comment đó và bị phản dame vì mù không phân biệt được comment với code thực thi.
- **Why (Vì sao sai):** NỖI NHỤC NHÃ: Hàm `stripStrings` trong `src/analyzers/suppression-fraud.ts` chỉ loại bỏ chuỗi ký tự (`'...'`, `"..."`, `` `...` ``) mà quên loại bỏ comment (`//...` và `/*...*/`) trước khi chạy `EXPLICIT_ANY_REGEX`.
- **Prevention (Giải pháp & Phòng ngừa):** Đã tiến hóa `stripStrings` trong `src/analyzers/suppression-fraud.ts` để xóa sạch cả comment khối `/*...*/` và comment dòng `//...` trước khi kiểm tra `NTA-S001` và `NTA-S004`.

### [MISTAKE-009] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #4 (SHAME-004)] False Positive Accusing Domain Assertion Helpers (assertValidReceipt / expectCleanScan) of Zero-Assertion Test Fraud
- **Date (Ngày ghi nhận):** 2026-10-23
- **Rule (Mã vi phạm):** `NTA-T001`
- **Where (Ở đâu):** `src/analyzers/test-fraud.ts:78` (Cross-Test `ROUND-20`)
- **How (Như thế nào):** Trong vòng đấu kiểm chéo số 20 (`ROUND-20`), đối phương viết test gọi hàm trợ giúp kiểm chứng `assertValidReceipt(r)` / `expectCleanScan(s)`. Bộ quét ngây thơ dùng `!/\b(?:expect|assert)\b/` đã báo lỗi giả `NTA-T001` (test rỗng không có assertion) và bị đối phương phản dame.
- **Why (Vì sao sai):** NỖI NHỤC NHÃ: Ranh giới từ cứng `\b` ngay sau `expect|assert` loại bỏ mọi hàm kiểm chứng có hậu tố định danh (`assertValid*`, `expectClean*`), làm phạt oan các bộ test được cấu trúc tốt.
- **Prevention (Giải pháp & Phòng ngừa):** Đã tiến hóa `src/analyzers/test-fraud.ts` sang mẫu `/\b(?:expect|assert)[A-Za-z0-9_]*\b/` để nhận diện chính xác mọi hàm kiểm chứng bắt đầu bằng `expect` hoặc `assert`.
