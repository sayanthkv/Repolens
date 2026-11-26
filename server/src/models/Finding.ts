import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { FindingStatus, FindingType, Severity } from '@repolens/shared';

export interface IFinding extends Document {
  scanId: Types.ObjectId;
  repoId: Types.ObjectId;
  type: FindingType;
  severity: Severity;
  title: string;
  filePath: string;
  lineNumber: number;
  maskedPreview: string;
  ruleId: string;
  description: string;
  aiExplanation?: string;
  aiSuggestedFix?: string;
  status: FindingStatus;
  prUrl?: string;
  isRegressionNew?: boolean;
  createdAt: Date;
}

const FindingSchema = new Schema<IFinding>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: 'Scan', required: true, index: true },
    repoId: { type: Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
    type: { type: String, enum: ['secret', 'dependency', 'code_pattern'], required: true },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
    title: { type: String, required: true },
    filePath: { type: String, required: true },
    lineNumber: { type: Number, required: true },
    maskedPreview: { type: String, required: true },
    ruleId: { type: String, required: true },
    description: { type: String, required: true },
    aiExplanation: { type: String, required: false },
    aiSuggestedFix: { type: String, required: false },
    prUrl: { type: String, required: false },
    isRegressionNew: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['open', 'resolved', 'ignored'],
      default: 'open',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

FindingSchema.index({ repoId: 1, scanId: 1 });

export const Finding = mongoose.model<IFinding>('Finding', FindingSchema);