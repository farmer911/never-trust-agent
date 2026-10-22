export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "NITPICK";

export type FindingCategory =
  | "TEST_FRAUD"
  | "SUPPRESSION_FRAUD"
  | "PHANTOM_CODE"
  | "DEFECT"
  | "EVIDENCE_FRAUD"
  | "CSS_NITPICK"
  | "SKILL_DRIFT";

export interface Finding {
  readonly ruleId: string;
  readonly category: FindingCategory;
  readonly severity: Severity;
  readonly file: string;
  readonly line: number;
  readonly message: string;
  readonly evidence: string;
  readonly subagent?: string;
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

export interface PlatformAuditReport {
  readonly repoMeta: RepoSyncMetadata;
  readonly workspaceHash: string;
  readonly scannedFilesCount: number;
  readonly totalLinesScanned: number;
  readonly totalFindings: number;
  readonly integrityScore: number;
  readonly passed: boolean;
  readonly subagentReports: readonly SubagentSummary[];
  readonly findings: readonly Finding[];
}
