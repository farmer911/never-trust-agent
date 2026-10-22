# Graph Report - main  (2026-10-22)

## Corpus Check
- Corpus is ~17,722 words - fits in a single context window. You may not need a graph.

## Summary
- 127 nodes · 320 edges · 15 communities (10 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.95)
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

## God Nodes (most connected - your core abstractions)
1. `runInquisitorSubagents()` - 20 edges
2. `analyzeSkillAndDocDrift()` - 14 edges
3. `scanWorkspace()` - 14 edges
4. `Finding` - 11 edges
5. `runCli()` - 10 edges
6. `analyzeSuppressionFraud()` - 9 edges
7. `computeWorkspaceHash()` - 8 edges
8. `analyzeTestFraud()` - 8 edges
9. `findOrphanFiles()` - 7 edges
10. `createAppServer()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens)` --references--> `recordMistake()`  [INFERRED]
  skills/mistake-ledger-grow-up/SKILL.md → src/analyzers/skill-critic.ts
- `[MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section` --references--> `analyzeSkillAndDocDrift()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/skill-critic.ts
- `[MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section` --references--> `scanWorkspace()`  [INFERRED]
  MISTAKE_LEDGER.md → src/engine/scanner.ts
- `Overview` --references--> `VerdictReceipt`  [INFERRED]
  skills/never-trust-agent/SKILL.md → src/types/verdict.ts
- `Rationalization Prevention (Bulletproofing Table)` --references--> `VerdictReceipt`  [INFERRED]
  skills/never-trust-agent/SKILL.md → src/types/verdict.ts

## Import Cycles
- None detected.

## Communities (15 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (12): analyzeGraphAndTokenOptimization(), detectRtkVersion(), findDuplicateBlocks(), findOrphanExports(), resolveRelativeImport(), gitOutput(), parseRepoSlug(), syncRepository() (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.24
Nodes (16): analyzeAgentReportLanguage(), collectSourceFiles(), computeWorkspaceHash(), createVerdictReceipt(), SYCOPHANCY_OR_SPECULATION_PATTERNS, verifyCitations(), verifyVerdictReceipt(), analyzePhantomCode() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (17): analyzeCssAndUi(), analyzeDefects(), analyzeSuppressionFraud(), stripStrings(), detectEntrypoints(), IndexedWorkspace, indexWorkspace(), runInquisitorSubagents() (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.30
Nodes (11): analyzeSkillAndDocDrift(), auditMistakeLedger(), auditSkillFrontmatter(), collectSkillAndRuleDocs(), isExamplePlaceholderPath(), MistakeInput, MistakeRecord, parseMistakeEntries() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.28
Nodes (8): Keep-Up-To-Date Gate Function (Mandatory Before Finishing Any Turn), NeverTrustAgent (NTA) — Forensic Inquisitor & Keep-Up-To-Date Skill, Overview, Rationalization Prevention (Bulletproofing Table), Red Flags — STOP Immediately, The 7 Inquisitor Subagents & Complete Rule Ledger, The Four Iron Laws, VerdictReceipt

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (7): Mandatory Two-Phase Loop, Mistake Ledger & Grow-Up Protocol (`NTA-K009`), Overview, Phase 1: Pre-Task Lookup (Before Writing Code), Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens), Rationalization Prevention (Bulletproofing Table), Red Flags — STOP Immediately

### Community 6 - "Community 6"
Cohesion: 0.40
Nodes (4): 1. Mandatory Keep-Up-To-Date Protocol (`NTA-K008`), 2. Project Architecture & Module Map, 3. Token Optimization Rules (RTK + Graphify), AGENTS.md — NeverTrustAgent Project Knowledge & Keep-Up-To-Date Law

### Community 7 - "Community 7"
Cohesion: 0.40
Nodes (4): [MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section, [MISTAKE-002] Unscoped Graphify File Collection Indexing node_modules and Cache Directories, [MISTAKE-003] Deferring Skill & Knowledge Synchronization Under Time Pressure, MISTAKE_LEDGER.md — Agent Forensic Post-Mortem & Grow-Up Ledger

### Community 8 - "Community 8"
Cohesion: 0.50
Nodes (3): 1. The 5-Round Fix Loop Mechanics, 2. Scoped Re-Review Prompt Template, Scoped Re-Reviewer & 5-Round Fix Loop Protocol

### Community 9 - "Community 9"
Cohesion: 0.50
Nodes (3): Dimension 1: Claim-to-Tool-Output Forensics (`quality-evidence`), Dimension 2: Plan Adherence & Post-Compaction Drift (`plan-adherence`), Session Transcript Forensics Protocol

## Knowledge Gaps
- **28 isolated node(s):** `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `ScanOptions`, `IndexedWorkspace`, `Severity`, `FindingCategory` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 41 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `recordMistake()` connect `Community 3` to `Community 0`, `Community 1`, `Community 5`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `VerdictReceipt` connect `Community 4` to `Community 1`, `Community 2`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens)` connect `Community 5` to `Community 3`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `ScanOptions`, `IndexedWorkspace` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._