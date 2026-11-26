import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IChunk extends Document {
  repoId: Types.ObjectId;
  commitSha: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  createdAt: Date;
}

const ChunkSchema = new Schema<IChunk>(
  {
    repoId: { type: Schema.Types.ObjectId, ref: 'Repo', required: true },
    commitSha: { type: String, required: true },
    filePath: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

ChunkSchema.index({ repoId: 1, commitSha: 1 });
ChunkSchema.index(
  { filePath: 'text', content: 'text' },
  { weights: { filePath: 4, content: 1 }, name: 'chunk_text_search' },
);

export const Chunk = mongoose.model<IChunk>('Chunk', ChunkSchema);