import { z } from 'zod';

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type Severity = z.infer<typeof SeveritySchema>;

export const FindingTypeSchema = z.enum(['secret', 'dependency', 'code_pattern']);
export type FindingType = z.infer<typeof FindingTypeSchema>;

export const FindingStatusSchema = z.enum(['open', 'resolved', 'ignored']);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const ScanTriggerSchema = z.enum(['manual', 'push', 'pull_request']);
export type ScanTrigger = z.infer<typeof ScanTriggerSchema>;

export const ScanStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);
export type ScanStatus = z.infer<typeof ScanStatusSchema>;

export const SeverityCountsSchema = z.object({
  critical: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
});
export type SeverityCounts = z.infer<typeof SeverityCountsSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.string(),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
  database: z.enum(['connected', 'disconnected']),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  githubId: z.string(),
  username: z.string(),
  avatarUrl: z.string(),
  email: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const GitHubRepoItemSchema = z.object({
  githubRepoId: z.string(),
  fullName: z.string(),
  name: z.string(),
  owner: z.string(),
  description: z.string().nullable(),
  defaultBranch: z.string(),
  isPrivate: z.boolean(),
  language: z.string().nullable(),
  updatedAt: z.string(),
  htmlUrl: z.string(),
  alreadyConnected: z.boolean(),
  connectedRepoId: z.string().nullable(),
});
export type GitHubRepoItem = z.infer<typeof GitHubRepoItemSchema>;

export const ConnectRepoBodySchema = z.object({
  fullName: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Invalid repository fullName'),
});
export type ConnectRepoBody = z.infer<typeof ConnectRepoBodySchema>;

export const ConnectedRepoSchema = z.object({
  id: z.string(),
  githubRepoId: z.string(),
  fullName: z.string(),
  defaultBranch: z.string(),
  isPrivate: z.boolean(),
  webhookActive: z.boolean(),
  lastScannedSha: z.string().nullable(),
  securityScore: z.number().nullable(),
  lastScanAt: z.string().nullable(),
  lastScanStatus: ScanStatusSchema.nullable(),
  counts: SeverityCountsSchema,
  createdAt: z.string(),
});
export type ConnectedRepo = z.infer<typeof ConnectedRepoSchema>;

export const ScanSummaryItemSchema = z.object({
  id: z.string(),
  repoId: z.string(),
  commitSha: z.string(),
  trigger: ScanTriggerSchema,
  status: ScanStatusSchema,
  progress: z.number().min(0).max(100),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  counts: SeverityCountsSchema,
  securityScore: z.number().nullable(),
  scoreDelta: z.number().nullable().optional(),
  previousScore: z.number().nullable().optional(),
  isRegression: z.boolean().optional(),
  error: z.string().nullable(),
});
export type ScanSummaryItem = z.infer<typeof ScanSummaryItemSchema>;

export const FindingItemSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  repoId: z.string(),
  type: FindingTypeSchema,
  severity: SeveritySchema,
  title: z.string(),
  filePath: z.string(),
  lineNumber: z.number().int().positive(),
  maskedPreview: z.string(),
  ruleId: z.string(),
  description: z.string(),
  aiExplanation: z.string().nullable(),
  aiSuggestedFix: z.string().nullable(),
  status: FindingStatusSchema,
  prUrl: z.string().nullable().optional(),
  isRegressionNew: z.boolean().optional(),
});
export type FindingItem = z.infer<typeof FindingItemSchema>;

export const LicenseRiskSchema = z.enum(['permissive', 'weak_copyleft', 'copyleft', 'unknown']);
export type LicenseRisk = z.infer<typeof LicenseRiskSchema>;

export const LicenseItemSchema = z.object({
  name: z.string(),
  version: z.string(),
  license: z.string(),
  type: LicenseRiskSchema,
  description: z.string().optional(),
});
export type LicenseItem = z.infer<typeof LicenseItemSchema>;

export const LicenseSummarySchema = z.object({
  licenses: z.array(LicenseItemSchema),
  counts: z.record(z.string(), z.number()),
  riskCounts: z.object({
    permissive: z.number(),
    weak_copyleft: z.number(),
    copyleft: z.number(),
    unknown: z.number(),
  }),
  overallRisk: z.enum(['low', 'medium', 'high']),
});
export type LicenseSummary = z.infer<typeof LicenseSummarySchema>;

export const CreateFixPrResponseSchema = z.object({
  success: z.boolean(),
  prUrl: z.string(),
  prNumber: z.number(),
  branchName: z.string(),
});
export type CreateFixPrResponse = z.infer<typeof CreateFixPrResponseSchema>;

export const UpdateFindingBodySchema = z.object({
  status: FindingStatusSchema,
});
export type UpdateFindingBody = z.infer<typeof UpdateFindingBodySchema>;

export const RepoSummaryContentSchema = z.object({
  overview: z.string(),
  techStack: z.array(z.string()),
  folderStructure: z.array(z.object({ path: z.string(), purpose: z.string() })),
  requestFlow: z.string(),
  apiRoutes: z.array(z.object({ method: z.string(), path: z.string(), purpose: z.string() })),
  dataModels: z.array(z.object({ name: z.string(), fields: z.array(z.string()) })),
  authApproach: z.string(),
  securityNotes: z.array(z.string()),
  keyFiles: z.array(z.object({ path: z.string(), role: z.string() })),
  mermaidDiagram: z.string(),
  setupInstructions: z.array(z.string()),
});
export type RepoSummaryContent = z.infer<typeof RepoSummaryContentSchema>;

export const RepoSummaryRecordSchema = z.object({
  id: z.string(),
  repoId: z.string(),
  commitSha: z.string(),
  content: RepoSummaryContentSchema,
  createdAt: z.string(),
});
export type RepoSummaryRecord = z.infer<typeof RepoSummaryRecordSchema>;

export const AskCitationSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
});
export type AskCitation = z.infer<typeof AskCitationSchema>;

export const AskChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
  citations: z.array(AskCitationSchema).optional(),
});
export type AskChatMessage = z.infer<typeof AskChatMessageSchema>;

export const AskRepoBodySchema = z.object({
  question: z.string().min(2).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .max(10)
    .optional(),
});
export type AskRepoBody = z.infer<typeof AskRepoBodySchema>;