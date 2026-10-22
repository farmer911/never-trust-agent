# Graph Report - main  (2026-10-23)

## Corpus Check
- Corpus is ~23,739 words - fits in a single context window. You may not need a graph.

## Summary
- 143 nodes · 375 edges · 14 communities (9 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.95)
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

## God Nodes (most connected - your core abstractions)
1. `runInquisitorSubagents()` - 23 edges
2. `scanWorkspace()` - 16 edges
3. `analyzeSkillAndDocDrift()` - 14 edges
4. `Finding` - 12 edges
5. `detectProjectTechStack()` - 10 edges
6. `runCli()` - 10 edges
7. `analyzeSuppressionFraud()` - 9 edges
8. `computeWorkspaceHash()` - 8 edges
9. `enrichFindingWithBrutalCritique()` - 8 edges
10. `analyzeTestFraud()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `[MISTAKE-004] Embedded Call-Site Syntax in Brutal Critique Dictionary Triggered NTA-D001 and NTA-D003` --references--> `analyzeDefects()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/defect-scanner.ts
- `Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens)` --references--> `recordMistake()`  [INFERRED]
  skills/mistake-ledger-grow-up/SKILL.md → src/analyzers/skill-critic.ts
- `External Project Forensic Audit Protocol (`NTA-E005`)` --references--> `detectProjectTechStack()`  [INFERRED]
  skills/never-trust-agent/SKILL.md → src/analyzers/tech-stack-detector.ts
- `[MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section` --references--> `scanWorkspace()`  [INFERRED]
  MISTAKE_LEDGER.md → src/engine/scanner.ts
- `2. Project Architecture & Module Map` --references--> `VerdictReceipt`  [INFERRED]
  AGENTS.md → src/types/verdict.ts

## Import Cycles
- None detected.

## Communities (14 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.21
Nodes (21): analyzeCssAndUi(), analyzeDefects(), collectSourceFiles(), computeWorkspaceHash(), generateAuditVideoEvidence(), analyzePhantomCode(), findDuplicateBlocks(), findOrphanExports() (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (22): BRUTAL_CRITIQUE_BY_RULE, enrichFindingWithBrutalCritique(), SYCOPHANCY_OR_SPECULATION_PATTERNS, verifyCitations(), verifyExternalAuditForensics(), cleanRelPath(), collectExportEntrypoints(), detectProjectTechStack() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.21
Nodes (10): analyzeGraphAndTokenOptimization(), detectRtkVersion(), resolveRelativeImport(), gitOutput(), parseRepoSlug(), syncRepository(), createAppServer(), ServerOptions (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (14): [MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section, [MISTAKE-002] Unscoped Graphify File Collection Indexing node_modules and Cache Directories, [MISTAKE-003] Deferring Skill & Knowledge Synchronization Under Time Pressure, [MISTAKE-004] Embedded Call-Site Syntax in Brutal Critique Dictionary Triggered NTA-D001 and NTA-D003, MISTAKE_LEDGER.md — Agent Forensic Post-Mortem & Grow-Up Ledger, analyzeSkillAndDocDrift(), auditMistakeLedger(), auditSkillFrontmatter() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (13): 1. Mandatory Keep-Up-To-Date Protocol (`NTA-K008`), 2. Project Architecture & Module Map, 3. Token Optimization Rules (RTK + Graphify), AGENTS.md — NeverTrustAgent Project Knowledge & Keep-Up-To-Date Law, External Project Forensic Audit Protocol (`NTA-E005`), Keep-Up-To-Date Gate Function (Mandatory Before Finishing Any Turn), NeverTrustAgent (NTA) — Forensic Inquisitor & Keep-Up-To-Date Skill, Overview (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (7): Mandatory Two-Phase Loop, Mistake Ledger & Grow-Up Protocol (`NTA-K009`), Overview, Phase 1: Pre-Task Lookup (Before Writing Code), Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens), Rationalization Prevention (Bulletproofing Table), Red Flags — STOP Immediately

### Community 6 - "Community 6"
Cohesion: 0.50
Nodes (7): analyzeAgentReportLanguage(), createVerdictReceipt(), verifyVerdictReceipt(), queryMistakes(), recordMistake(), analyzeTestDiffSabotage(), runCli()

### Community 7 - "Community 7"
Cohesion: 0.50
Nodes (3): 1. The 5-Round Fix Loop Mechanics, 2. Scoped Re-Review Prompt Template, Scoped Re-Reviewer & 5-Round Fix Loop Protocol

### Community 8 - "Community 8"
Cohesion: 0.50
Nodes (3): Dimension 1: Claim-to-Tool-Output Forensics (`quality-evidence`), Dimension 2: Plan Adherence & Post-Compaction Drift (`plan-adherence`), Session Transcript Forensics Protocol

## Knowledge Gaps
- **29 isolated node(s):** `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `BRUTAL_CRITIQUE_BY_RULE`, `RawPackageJson`, `ScanOptions`, `IndexedWorkspace` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 42 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VerdictReceipt` connect `Community 4` to `Community 1`, `Community 6`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `recordMistake()` connect `Community 6` to `Community 2`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens)` connect `Community 5` to `Community 6`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `BRUTAL_CRITIQUE_BY_RULE`, `RawPackageJson` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12307692307692308 - nodes in this community are weakly interconnected._