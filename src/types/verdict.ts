export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "NITPICK";

export type FindingCategory =
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
  readonly subagentReports: readonly SubagentSummary[];
  readonly findings: readonly Finding[];
}
