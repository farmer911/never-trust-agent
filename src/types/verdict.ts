type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "NITPICK";

type FindingCategory =
  | "TEST_FRAUD"
  | "SUPPRESSION_FRAUD"
  | "PHANTOM_CODE"
  | "DEFECT"
  | "EVIDENCE_FRAUD"
  | "CSS_NITPICK"
  | "SKILL_DRIFT"
  | "GRAPH_COUPLING";

export interface Finding {
  readonly ruleId: string;
  readonly category: FindingCategory;
  readonly severity: Severity;
  readonly file: string;
  readonly line: number;
  readonly message: string;
  readonly evidence: string;
  readonly subagent?: string;
  readonly whyItIsWrong?: string;
  readonly directFix?: string;
}

export interface AuditFlowStep {
  readonly stageId: string;
  readonly title: string;
  readonly detail: string;
  readonly evidence: string;
  readonly timestamp: string;
  readonly durationMs: number;
}

export interface VideoEvidenceMetadata {
  readonly filePath: string;
  readonly videoUrl: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly durationMs: number;
  readonly fps: number;
  readonly frameCount: number;
  readonly stagesCaptured: readonly string[];
}

export interface Citation {
  readonly file: string;
  readonly startLine: number;
  readonly endLine: number;
}

export interface VerdictReceipt {
  readonly workspaceHash: string;
  readonly timestamp: string;
  readonly command: string;
  readonly exitCode: number;
  readonly findingsCount: number;
}

export interface ScanReport {
  readonly workspaceRoot: string;
  readonly workspaceHash: string;
  readonly scannedFiles: number;
  readonly passed: boolean;
  readonly findings: readonly Finding[];
}

export interface RepoSyncMetadata {
  readonly repoUrl: string;
  readonly slug: string;
  readonly localPath: string;
  readonly action: "CLONED" | "PULLED";
  readonly headSha: string;
  readonly branch: string;
  readonly commitMessage: string;
  readonly syncedAt: string;
}

export interface TokenOptimizationMetrics {
  readonly rtkEnabled: boolean;
  readonly rtkVersion: string;
  readonly graphifyIndexed: boolean;
  readonly rawCorpusTokens: number;
  readonly graphCompactTokens: number;
  readonly tokensSaved: number;
  readonly reductionPercent: number;
  readonly graphNodes: number;
  readonly graphEdges: number;
  readonly godNodes: readonly { readonly file: string; readonly degree: number }[];
}

export interface SubagentSummary {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly findingsCount: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly mediumCount: number;
  readonly nitpickCount: number;
  readonly durationMs: number;
  readonly findings: readonly Finding[];
}

export interface TechStackProfile {
  readonly runtime: string;
  readonly packageManager: string;
  readonly testRunner: string;
  readonly stylingSystem: string;
  readonly languages: readonly string[];
  readonly frameworks: readonly string[];
  readonly discoveredEntrypoints: readonly string[];
  readonly groundingSummary: string;
}

export interface MarkdownDossierMetadata {
  readonly filePath: string;
  readonly reportUrl: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface AdjudicationResult {
  readonly roundId: string;
  readonly ruleId: string;
  readonly file: string;
  readonly line: number;
  readonly decision: "AGREE" | "REBUT";
  readonly challengerArgument: string;
  readonly verdict: "AGREED" | "REBUTTED_INVALID" | "REBUTTED_VALID_BACKFIRE";
  readonly inquisitorResponse: string;
  readonly humiliationRecorded: boolean;
  readonly mistakeId?: string | undefined;
}

export interface CrossTestRoundResult {
  readonly roundNumber: number;
  readonly roundId: string;
  readonly title: string;
  readonly subagent: string;
  readonly targetRules: readonly string[];
  readonly mode: "DEFECT_INJECTION" | "BACKFIRE_CHALLENGE";
  readonly findingsDetected: number;
  readonly adjudicationVerdict: "AGREED" | "REBUTTED_INVALID" | "REBUTTED_VALID_BACKFIRE";
  readonly shameId?: string | undefined;
  readonly errorPointedOut: string;
  readonly remediationFix: string;
  readonly challengerStatement: string;
  readonly inquisitorVerdictNote: string;
  readonly passedRound: boolean;
}

export interface CrossTestArenaReport {
  readonly totalRounds: number;
  readonly agreedCount: number;
  readonly rejectedRebuttalCount: number;
  readonly backfireShameCount: number;
  readonly passedAllRounds: boolean;
  readonly markdownPath: string;
  readonly generatedAt: string;
  readonly rounds: readonly CrossTestRoundResult[];
}

export interface PlatformAuditReport {
  readonly repoMeta: RepoSyncMetadata;
  readonly workspaceHash: string;
  readonly scannedFilesCount: number;
  readonly totalLinesScanned: number;
  readonly totalFindings: number;
  readonly integrityScore: number;
  readonly passed: boolean;
  readonly techStack: TechStackProfile;
  readonly tokenOptimization: TokenOptimizationMetrics;
  readonly flowTrace: readonly AuditFlowStep[];
  readonly videoEvidence: VideoEvidenceMetadata;
  readonly markdownReport: MarkdownDossierMetadata;
  readonly subagentReports: readonly SubagentSummary[];
  readonly findings: readonly Finding[];
}
