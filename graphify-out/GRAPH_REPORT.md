# Graph Report - main  (2026-10-22)

## Corpus Check
- Corpus is ~15,577 words - fits in a single context window. You may not need a graph.

## Summary
- 108 nodes · 288 edges · 14 communities (9 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
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
1. `runInquisitorSubagents()` - 20 edges
2. `scanWorkspace()` - 13 edges
3. `analyzeSkillAndDocDrift()` - 12 edges
4. `Finding` - 11 edges
5. `analyzeSuppressionFraud()` - 9 edges
6. `computeWorkspaceHash()` - 8 edges
7. `analyzeTestFraud()` - 8 edges
8. `runCli()` - 8 edges
9. `findOrphanFiles()` - 7 edges
10. `createAppServer()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Overview` --references--> `VerdictReceipt`  [INFERRED]
  skills/never-trust-agent/SKILL.md → src/types/verdict.ts
- `Rationalization Prevention (Bulletproofing Table)` --references--> `VerdictReceipt`  [INFERRED]
  skills/never-trust-agent/SKILL.md → src/types/verdict.ts
- `The 7 Inquisitor Subagents & Complete Rule Ledger` --references--> `VerdictReceipt`  [INFERRED]
  skills/never-trust-agent/SKILL.md → src/types/verdict.ts
- `runInquisitorSubagents()` --calls--> `analyzeDefects()`  [EXTRACTED]
  src/subagents/orchestrator.ts → src/analyzers/defect-scanner.ts
- `runInquisitorSubagents()` --calls--> `computeWorkspaceHash()`  [EXTRACTED]
  src/subagents/orchestrator.ts → src/analyzers/evidence-verifier.ts

## Import Cycles
- None detected.

## Communities (14 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.25
Nodes (16): analyzeDefects(), analyzeAgentReportLanguage(), collectSourceFiles(), computeWorkspaceHash(), createVerdictReceipt(), SYCOPHANCY_OR_SPECULATION_PATTERNS, verifyCitations(), verifyVerdictReceipt() (+8 more)

### Community 1 - "Community 1"
Cohesion: 0.21
Nodes (9): detectRtkVersion(), gitOutput(), parseRepoSlug(), syncRepository(), RepoSyncMetadata, createAppServer(), ServerOptions, renderForensicDashboardHtml() (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.35
Nodes (10): analyzeCssAndUi(), analyzeGraphAndTokenOptimization(), findDuplicateBlocks(), findOrphanExports(), findOrphanFiles(), resolveRelativeImport(), detectEntrypoints(), IndexedWorkspace (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (8): Citation, Finding, FindingCategory, PlatformAuditReport, ScanReport, Severity, SubagentSummary, TokenOptimizationMetrics

### Community 4 - "Community 4"
Cohesion: 0.28
Nodes (8): Keep-Up-To-Date Gate Function (Mandatory Before Finishing Any Turn), NeverTrustAgent (NTA) — Forensic Inquisitor & Keep-Up-To-Date Skill, Overview, Rationalization Prevention (Bulletproofing Table), Red Flags — STOP Immediately, The 7 Inquisitor Subagents & Complete Rule Ledger, The Four Iron Laws, VerdictReceipt

### Community 5 - "Community 5"
Cohesion: 0.42
Nodes (7): analyzeSkillAndDocDrift(), auditSkillFrontmatter(), collectSkillAndRuleDocs(), isExamplePlaceholderPath(), readPackageScripts(), analyzeSuppressionFraud(), stripStrings()

### Community 6 - "Community 6"
Cohesion: 0.40
Nodes (4): 1. Mandatory Keep-Up-To-Date Protocol (`NTA-K008`), 2. Project Architecture & Module Map, 3. Token Optimization Rules (RTK + Graphify), AGENTS.md — NeverTrustAgent Project Knowledge & Keep-Up-To-Date Law

### Community 7 - "Community 7"
Cohesion: 0.50
Nodes (3): 1. The 5-Round Fix Loop Mechanics, 2. Scoped Re-Review Prompt Template, Scoped Re-Reviewer & 5-Round Fix Loop Protocol

### Community 8 - "Community 8"
Cohesion: 0.50
Nodes (3): Dimension 1: Claim-to-Tool-Output Forensics (`quality-evidence`), Dimension 2: Plan Adherence & Post-Compaction Drift (`plan-adherence`), Session Transcript Forensics Protocol

## Knowledge Gaps
- **22 isolated node(s):** `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `ScanOptions`, `IndexedWorkspace`, `Severity`, `FindingCategory` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 33 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VerdictReceipt` connect `Community 4` to `Community 0`, `Community 3`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `runInquisitorSubagents()` connect `Community 2` to `Community 0`, `Community 1`, `Community 5`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `ScanOptions`, `IndexedWorkspace` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._