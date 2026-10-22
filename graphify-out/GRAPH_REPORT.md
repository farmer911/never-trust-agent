# Graph Report - NeverTrustAgent  (2026-10-22)

## Corpus Check
- Corpus is ~13,857 words - fits in a single context window. You may not need a graph.

## Summary
- 124 nodes · 300 edges · 11 communities (7 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- NTA Subsystem 0
- NTA Subsystem 1
- NTA Subsystem 2
- NTA Subsystem 3
- NTA Subsystem 4
- NTA Subsystem 5
- NTA Subsystem 6
- NTA Subsystem 8

## God Nodes (most connected - your core abstractions)
1. `runInquisitorSubagents()` - 20 edges
2. `compilerOptions` - 19 edges
3. `scanWorkspace()` - 11 edges
4. `Finding` - 11 edges
5. `analyzeSkillAndDocDrift()` - 10 edges
6. `analyzeSuppressionFraud()` - 9 edges
7. `computeWorkspaceHash()` - 8 edges
8. `analyzeTestFraud()` - 8 edges
9. `runCli()` - 8 edges
10. `findOrphanFiles()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `runInquisitorSubagents()` --calls--> `analyzeDefects()`  [EXTRACTED]
  src/subagents/orchestrator.ts → src/analyzers/defect-scanner.ts
- `scanWorkspace()` --calls--> `computeWorkspaceHash()`  [EXTRACTED]
  src/engine/scanner.ts → src/analyzers/evidence-verifier.ts
- `runInquisitorSubagents()` --calls--> `computeWorkspaceHash()`  [EXTRACTED]
  src/subagents/orchestrator.ts → src/analyzers/evidence-verifier.ts
- `scanWorkspace()` --calls--> `collectSourceFiles()`  [EXTRACTED]
  src/engine/scanner.ts → src/analyzers/evidence-verifier.ts
- `runInquisitorSubagents()` --calls--> `analyzeGraphAndTokenOptimization()`  [EXTRACTED]
  src/subagents/orchestrator.ts → src/analyzers/graph-optimizer.ts

## Import Cycles
- None detected.

## Communities (11 total, 4 thin omitted)

### Community 0 - "NTA Subsystem 0"
Cohesion: 0.18
Nodes (13): analyzeGraphAndTokenOptimization(), detectRtkVersion(), findDuplicateBlocks(), findOrphanExports(), resolveRelativeImport(), gitOutput(), parseRepoSlug(), syncRepository() (+5 more)

### Community 1 - "NTA Subsystem 1"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, exactOptionalPropertyTypes, lib, module, moduleDetection, moduleResolution, noEmit (+12 more)

### Community 2 - "NTA Subsystem 2"
Cohesion: 0.11
Nodes (17): bin, nta, description, devDependencies, @types/bun, typescript, name, scripts (+9 more)

### Community 3 - "NTA Subsystem 3"
Cohesion: 0.22
Nodes (12): analyzeCssAndUi(), detectEntrypoints(), IndexedWorkspace, indexWorkspace(), runInquisitorSubagents(), Finding, FindingCategory, PlatformAuditReport (+4 more)

### Community 4 - "NTA Subsystem 4"
Cohesion: 0.32
Nodes (10): analyzeDefects(), analyzePhantomCode(), findOrphanFiles(), analyzeSuppressionFraud(), stripStrings(), analyzeTestFraud(), detectMirrorAssertion(), extractBalancedBraces() (+2 more)

### Community 5 - "NTA Subsystem 5"
Cohesion: 0.28
Nodes (10): analyzeAgentReportLanguage(), computeWorkspaceHash(), createVerdictReceipt(), SYCOPHANCY_OR_SPECULATION_PATTERNS, verifyCitations(), verifyVerdictReceipt(), analyzeTestDiffSabotage(), runCli() (+2 more)

### Community 6 - "NTA Subsystem 6"
Cohesion: 0.52
Nodes (6): collectSourceFiles(), analyzeSkillAndDocDrift(), auditSkillFrontmatter(), collectSkillAndRuleDocs(), isExamplePlaceholderPath(), readPackageScripts()

## Knowledge Gaps
- **41 isolated node(s):** `name`, `version`, `description`, `type`, `nta` (+36 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 48 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `runInquisitorSubagents()` connect `NTA Subsystem 3` to `NTA Subsystem 0`, `NTA Subsystem 4`, `NTA Subsystem 5`, `NTA Subsystem 6`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `analyzeSkillAndDocDrift()` connect `NTA Subsystem 6` to `NTA Subsystem 0`, `NTA Subsystem 3`, `NTA Subsystem 4`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `NTA Subsystem 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `NTA Subsystem 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._