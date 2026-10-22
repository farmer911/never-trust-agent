# Graph Report - main  (2026-10-23)

## Corpus Check
- Corpus is ~23,893 words - fits in a single context window. You may not need a graph.

## Summary
- 151 nodes · 388 edges · 16 communities (11 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.95)
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

## God Nodes (most connected - your core abstractions)
1. `scanWorkspace()` - 15 edges
2. `runInquisitorSubagents()` - 15 edges
3. `analyzeSkillAndDocDrift()` - 13 edges
4. `Finding` - 12 edges
5. `walkWorkspaceFiles()` - 11 edges
6. `createCoreCodeSubagents()` - 11 edges
7. `runCli()` - 10 edges
8. `computeWorkspaceHash()` - 8 edges
9. `enrichFindingWithBrutalCritique()` - 8 edges
10. `analyzeGraphAndTokenOptimization()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `[MISTAKE-004] Embedded Call-Site Syntax in Brutal Critique Dictionary Triggered NTA-D001 and NTA-D003` --references--> `analyzeDefects()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/defect-scanner.ts
- `Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens)` --references--> `recordMistake()`  [INFERRED]
  skills/mistake-ledger-grow-up/SKILL.md → src/analyzers/skill-critic.ts
- `External Project Forensic Audit Protocol (`NTA-E005`)` --references--> `detectProjectTechStack()`  [INFERRED]
  skills/never-trust-agent/SKILL.md → src/analyzers/tech-stack-detector.ts
- `[MISTAKE-005] Partial Self-Scan Blind Spot Between scanWorkspace (5 Subagents) and Full 7-Subagent Platform Audit` --references--> `walkWorkspaceFiles()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/evidence-verifier.ts
- `[MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section` --references--> `analyzeSkillAndDocDrift()`  [INFERRED]
  MISTAKE_LEDGER.md → src/analyzers/skill-critic.ts

## Import Cycles
- None detected.

## Communities (16 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.16
Nodes (16): [MISTAKE-005] Partial Self-Scan Blind Spot Between scanWorkspace (5 Subagents) and Full 7-Subagent Platform Audit, analyzeCssAndUi(), generateAuditVideoEvidence(), analyzeGraphAndTokenOptimization(), detectRtkVersion(), gitOutput(), parseRepoSlug(), syncRepository() (+8 more)

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (15): analyzeDefects(), analyzePhantomCode(), findDuplicateBlocks(), findOrphanExports(), findOrphanFiles(), resolveRelativeImport(), analyzeSuppressionFraud(), stripStrings() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (17): BRUTAL_CRITIQUE_BY_RULE, DEFAULT_IGNORED_DIRS, makeCritFinding(), SYCOPHANCY_OR_SPECULATION_PATTERNS, verifyCitations(), verifyExternalAuditForensics(), AuditFlowStep, Citation (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (13): 1. Mandatory Keep-Up-To-Date Protocol (`NTA-K008`), 2. Project Architecture & Module Map, 3. Token Optimization Rules (RTK + Graphify), AGENTS.md — NeverTrustAgent Project Knowledge & Keep-Up-To-Date Law, External Project Forensic Audit Protocol (`NTA-E005`), Keep-Up-To-Date Gate Function (Mandatory Before Finishing Any Turn), NeverTrustAgent (NTA) — Forensic Inquisitor & Keep-Up-To-Date Skill, Overview (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.31
Nodes (12): collectSourceFiles(), walkWorkspaceFiles(), analyzeSkillAndDocDrift(), auditMistakeLedger(), auditSkillFrontmatter(), collectSkillAndRuleDocs(), isExamplePlaceholderPath(), makeSkillFinding() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.44
Nodes (8): analyzeAgentReportLanguage(), computeWorkspaceHash(), createVerdictReceipt(), verifyVerdictReceipt(), queryMistakes(), recordMistake(), analyzeTestDiffSabotage(), runCli()

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (7): Mandatory Two-Phase Loop, Mistake Ledger & Grow-Up Protocol (`NTA-K009`), Overview, Phase 1: Pre-Task Lookup (Before Writing Code), Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens), Rationalization Prevention (Bulletproofing Table), Red Flags — STOP Immediately

### Community 7 - "Community 7"
Cohesion: 0.43
Nodes (7): enrichFindingWithBrutalCritique(), cleanRelPath(), collectExportEntrypoints(), detectProjectTechStack(), RawPackageJson, verifyTechStackAlignment(), walkTechFiles()

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (5): [MISTAKE-001] Self-Triggering Sycophancy Regex Inside SKILL.md Red Flags Section, [MISTAKE-002] Unscoped Graphify File Collection Indexing node_modules and Cache Directories, [MISTAKE-003] Deferring Skill & Knowledge Synchronization Under Time Pressure, [MISTAKE-004] Embedded Call-Site Syntax in Brutal Critique Dictionary Triggered NTA-D001 and NTA-D003, MISTAKE_LEDGER.md — Agent Forensic Post-Mortem & Grow-Up Ledger

### Community 9 - "Community 9"
Cohesion: 0.50
Nodes (3): 1. The 5-Round Fix Loop Mechanics, 2. Scoped Re-Review Prompt Template, Scoped Re-Reviewer & 5-Round Fix Loop Protocol

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): Dimension 1: Claim-to-Tool-Output Forensics (`quality-evidence`), Dimension 2: Plan Adherence & Post-Compaction Drift (`plan-adherence`), Session Transcript Forensics Protocol

## Knowledge Gaps
- **30 isolated node(s):** `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `DEFAULT_IGNORED_DIRS`, `BRUTAL_CRITIQUE_BY_RULE`, `RawPackageJson`, `ScanOptions` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 45 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VerdictReceipt` connect `Community 3` to `Community 2`, `Community 5`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `recordMistake()` connect `Community 5` to `Community 0`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `Phase 2: Post-Mistake Dissection & Grow-Up (Whenever Any Failure or Correction Happens)` connect `Community 6` to `Community 5`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **What connects `SYCOPHANCY_OR_SPECULATION_PATTERNS`, `DEFAULT_IGNORED_DIRS`, `BRUTAL_CRITIQUE_BY_RULE` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._