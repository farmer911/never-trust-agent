# Graph Report - main  (2026-10-24)

## Corpus Check
- Corpus is ~33,658 words - fits in a single context window. You may not need a graph.

## Summary
- 192 nodes · 468 edges · 17 communities (12 shown, 5 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16

## God Nodes (most connected - your core abstractions)
1. `3. Chi Tiết 20 Vòng Đấu Kiểm Chéo (Chỉ Thẳng Lỗi, Cách Khắc Phục, Đồng Ý vs Phản Biện)` - 21 edges
2. `runInquisitorSubagents()` - 17 edges
3. `scanWorkspace()` - 15 edges
4. `runCrossTestArena()` - 14 edges
5. `analyzeSkillAndDocDrift()` - 13 edges
6. `Finding` - 13 edges
7. `runCli()` - 12 edges
8. `createCoreCodeSubagents()` - 12 edges
9. `walkWorkspaceFiles()` - 11 edges
10. `MISTAKE_LEDGER.md — Agent Forensic Post-Mortem & Grow-Up Ledger` - 11 edges

## Surprising Connections (you probably didn't know these)
- `[MISTAKE-004] Embedded Call-Site Syntax in Brutal Critique Dictionary Triggered NTA-D001 and NTA-D003` --references--> `analyzeDefects()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/defect-scanner.ts
- `[MISTAKE-005] Partial Self-Scan Blind Spot Between scanWorkspace (5 Subagents) and Full 7-Subagent Platform Audit` --references--> `walkWorkspaceFiles()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/evidence-verifier.ts
- `[MISTAKE-010] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #5 (SHAME-005)] Polyglot Monorepo Manifests, Playwright ({ page }) Destructuring, and @/ Path Aliases on Beloga Platform` --references--> `resolveRelativeImport()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/phantom-code.ts
- `[MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section` --references--> `analyzeSkillAndDocDrift()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/skill-critic.ts
- `[MISTAKE-008] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #3 (SHAME-003)] False Positive Flagging TypeScript Comments Mentioning ': any' as Type Safety Bypass` --references--> `stripStrings()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/suppression-fraud.ts

## Import Cycles
- None detected.

## Communities (17 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (29): External Project Forensic Audit Protocol (`NTA-E005`), analyzeCssAndUi(), BRUTAL_CRITIQUE_BY_RULE, DEFAULT_IGNORED_DIRS, enrichFindingWithBrutalCritique(), generateAuditVideoEvidence(), generateForensicMarkdownDossier(), makeCritFinding() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.21
Nodes (13): analyzeDefects(), analyzePhantomCode(), findDuplicateBlocks(), findOrphanExports(), findOrphanFiles(), resolveRelativeImport(), analyzeTestFraud(), detectMirrorAssertion() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (24): 1. Bảng Tổng Hợp 20 Vòng Đấu Kiểm Chéo Trên Chính Repo NeverTrustAgent, 2. Bảng Nhục Nhã Khi Bị Phản Dame (Hall of Shame & Analyzer Evolution), 3. Chi Tiết 20 Vòng Đấu Kiểm Chéo (Chỉ Thẳng Lỗi, Cách Khắc Phục, Đồng Ý vs Phản Biện), CROSS_AUDIT_ARENA.md — Hồ Sơ Đấu Kiểm Chéo 20 Lần & Sổ Cái Phản Dame (NeverTrustAgent), [ROUND-01] Test rỗng không có assertion (Zero-Assertion Theater), [ROUND-02] So sánh hằng số vô nghĩa & tự lấy hàm cần test làm đáp án (Tautology & Mirror), [ROUND-03] Trốn chạy kiểm thử bằng .skip và ngủ cứng setTimeout (Test Evasion & Sleep), [ROUND-04] Kiểm tra sự tồn tại của Mock (*-mock) thay vì hành vi thật (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (16): collectSourceFiles(), walkWorkspaceFiles(), analyzeSkillAndDocDrift(), auditMistakeLedger(), auditSkillFrontmatter(), collectSkillAndRuleDocs(), isExamplePlaceholderPath(), makeSkillFinding() (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.24
Nodes (13): Phase 3: Humiliation on Backfire ("Bị Phản Dame = 1 Lần Nhục Nhã" — `NTA-E007`), analyzeAgentReportLanguage(), computeWorkspaceHash(), createVerdictReceipt(), verifyVerdictReceipt(), queryMistakes(), recordMistake(), analyzeTestDiffSabotage() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (12): 1. Mandatory Keep-Up-To-Date Protocol (`NTA-K008`), 2. Project Architecture & Module Map, 3. Token Optimization Rules (RTK + Graphify), AGENTS.md — NeverTrustAgent Project Knowledge & Keep-Up-To-Date Law, Keep-Up-To-Date Gate Function (Mandatory Before Finishing Any Turn), NeverTrustAgent (NTA) — Forensic Inquisitor & Keep-Up-To-Date Skill, Overview, Rationalization Prevention (Bulletproofing Table) (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.23
Nodes (11): [MISTAKE-010] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #5 (SHAME-005)] Polyglot Monorepo Manifests, Playwright ({ page }) Destructuring, and @/ Path Aliases on Beloga Platform, cleanRelPath(), collectExportEntrypoints(), detectProjectTechStack(), MONOREPO_SUBDIRS, RawPackageJson, verifyTechStackAlignment(), walkTechFiles() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (9): [MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section, [MISTAKE-002] Unscoped Graphify File Collection Indexing node_modules and Cache Directories, [MISTAKE-003] Deferring Skill & Knowledge Synchronization Under Time Pressure, [MISTAKE-004] Embedded Call-Site Syntax in Brutal Critique Dictionary Triggered NTA-D001 and NTA-D003, [MISTAKE-006] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #1 (SHAME-001)] False Positive on WCAG 2.1 prefers-reduced-motion !important and Focus-Ring-Backed outline: none, [MISTAKE-007] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #2 (SHAME-002)] False Positive Accusing In-Memory app.fetch(req) / server.fetch(req) of Missing AbortSignal, [MISTAKE-008] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #3 (SHAME-003)] False Positive Flagging TypeScript Comments Mentioning ': any' as Type Safety Bypass, [MISTAKE-009] [BỊ PHẢN DAME — NỖI NHỤC NHÃ KỸ THUẬT #4 (SHAME-004)] False Positive Accusing Domain Assertion Helpers (assertValidReceipt / expectCleanScan) of Zero-Assertion Test Fraud (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (7): Mandatory Two-Phase Loop, Mistake Ledger & Grow-Up Protocol (`NTA-K009`), Overview, Phase 1: Pre-Task Lookup (Before Writing Code), Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens), Rationalization Prevention (Bulletproofing Table), Red Flags — STOP Immediately

### Community 9 - "Community 9"
Cohesion: 0.48
Nodes (6): [MISTAKE-005] Partial Self-Scan Blind Spot Between scanWorkspace (5 Subagents) and Full 7-Subagent Platform Audit, detectRtkVersion(), gitOutput(), parseRepoSlug(), syncRepository(), RepoSyncMetadata

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): 1. The 5-Round Fix Loop Mechanics, 2. Scoped Re-Review Prompt Template, Scoped Re-Reviewer & 5-Round Fix Loop Protocol

### Community 11 - "Community 11"
Cohesion: 0.50
Nodes (3): Dimension 1: Claim-to-Tool-Output Forensics (`quality-evidence`), Dimension 2: Plan Adherence & Post-Compaction Drift (`plan-adherence`), Session Transcript Forensics Protocol

## Knowledge Gaps
- **57 isolated node(s):** `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `DEFAULT_IGNORED_DIRS`, `BRUTAL_CRITIQUE_BY_RULE`, `RawPackageJson`, `MONOREPO_SUBDIRS` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 72 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Phase 3: Humiliation on Backfire ("Bị Phản Dame = 1 Lần Nhục Nhã" — `NTA-E007`)` connect `Community 4` to `Community 8`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `Mandatory Two-Phase Loop` connect `Community 8` to `Community 4`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `MISTAKE_LEDGER.md — Agent Forensic Post-Mortem & Grow-Up Ledger` connect `Community 7` to `Community 9`, `Community 6`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runCrossTestArena()` (e.g. with `2. Project Architecture & Module Map` and `External Project Forensic Audit Protocol (`NTA-E005`)`) actually correct?**
  _`runCrossTestArena()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `DEFAULT_IGNORED_DIRS`, `BRUTAL_CRITIQUE_BY_RULE` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1140819964349376 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._