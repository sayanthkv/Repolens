// import { z } from 'zod';

// export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
// export type Severity = z.infer<typeof SeveritySchema>;

// export const FindingTypeSchema = z.enum(['secret', 'dependency', 'code_pattern']);
// export type FindingType = z.infer<typeof FindingTypeSchema>;

// export const FindingStatusSchema = z.enum(['open', 'resolved', 'ignored']);
// export type FindingStatus = z.infer<typeof FindingStatusSchema>;

// export const ScanTriggerSchema = z.enum(['manual', 'push', 'pull_request']);
// export type ScanTrigger = z.infer<typeof ScanTriggerSchema>;

// export const ScanStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);
// export type ScanStatus = z.infer<typeof ScanStatusSchema>;

// export const HealthResponseSchema = z.object({
//   status: z.enum(['ok', 'degraded']),
//   service: z.string(),
//   timestamp: z.string(),
//   uptimeSeconds: z.number(),
//   database: z.enum(['connected', 'disconnected']),
// });
// export type HealthResponse = z.infer<typeof HealthResponseSchema>;