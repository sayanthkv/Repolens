import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { ScanStatus, ScanTrigger, SeverityCounts } from '@repolens/shared';

export interface IScan extends Document {
  repoId: Types.ObjectId;
  commitSha: string;
  trigger: ScanTrigger;
  status: ScanStatus;
  progress: number;
  startedAt?: Date;
  finishedAt?: Date;
  counts: SeverityCounts;
  securityScore?: number;
  scoreDelta?: number;
  previousScore?: number;
  isRegression?: boolean;
  sbom?: Record<string, unknown>;
  licenses?: Record<string, unknown>;
  error?: string;
  prNumber?: number;
  createdAt: Date;
}

const ScanSchema = new Schema<IScan>(
  {
    repoId: { type: Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
    commitSha: { type: String, required: true },
    trigger: { type: String, enum: ['manual', 'push', 'pull_request'], required: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
      required: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startedAt: { type: Date, required: false },
    finishedAt: { type: Date, required: false },
    counts: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
    },
    securityScore: { type: Number, required: false },
    scoreDelta: { type: Number, required: false },
    previousScore: { type: Number, required: false },
    isRegression: { type: Boolean, default: false },
    sbom: { type: Schema.Types.Mixed, required: false },
    licenses: { type: Schema.Types.Mixed, required: false },
    error: { type: String, required: false },
    prNumber: { type: Number, required: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

ScanSchema.index({ repoId: 1, commitSha: 1 });
ScanSchema.index({ repoId: 1, createdAt: -1 });

export const Scan = mongoose.model<IScan>('Scan', ScanSchema);