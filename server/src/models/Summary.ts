import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { RepoSummaryContent } from '@repolens/shared';

export interface ISummary extends Document {
  repoId: Types.ObjectId;
  commitSha: string;
  content: RepoSummaryContent;
  createdAt: Date;
}

const SummarySchema = new Schema<ISummary>(
  {
    repoId: { type: Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
    commitSha: { type: String, required: true },
    content: {
      overview: { type: String, required: true },
      techStack: { type: [String], default: [] },
      folderStructure: {
        type: [{ _id: false, path: String, purpose: String }],
        default: [],
      },
      requestFlow: { type: String, required: true },
      apiRoutes: {
        type: [{ _id: false, method: String, path: String, purpose: String }],
        default: [],
      },
      dataModels: {
        type: [{ _id: false, name: String, fields: [String] }],
        default: [],
      },
      authApproach: { type: String, required: true },
      securityNotes: { type: [String], default: [] },
      keyFiles: {
        type: [{ _id: false, path: String, role: String }],
        default: [],
      },
      mermaidDiagram: { type: String, required: true },
      setupInstructions: { type: [String], default: [] },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

SummarySchema.index({ repoId: 1, commitSha: 1 }, { unique: true });

export const Summary = mongoose.model<ISummary>('Summary', SummarySchema);