import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IRepo extends Document {
  userId: Types.ObjectId;
  githubRepoId: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  webhookId?: number;
  encryptedWebhookSecret: string;
  lastScannedSha?: string;
  securityScore?: number;
  createdAt: Date;
}

const RepoSchema = new Schema<IRepo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    githubRepoId: { type: String, required: true },
    fullName: { type: String, required: true },
    defaultBranch: { type: String, required: true },
    isPrivate: { type: Boolean, required: true, default: false },
    webhookId: { type: Number, required: false },
    encryptedWebhookSecret: { type: String, required: true },
    lastScannedSha: { type: String, required: false },
    securityScore: { type: Number, required: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

RepoSchema.index({ userId: 1, githubRepoId: 1 }, { unique: true });

export const Repo = mongoose.model<IRepo>('Repo', RepoSchema);