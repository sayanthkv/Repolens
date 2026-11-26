import mongoose, { Schema, type Document } from 'mongoose';

export interface IUser extends Document {
  githubId: string;
  username: string;
  avatarUrl: string;
  email?: string;
  encryptedAccessToken: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    email: { type: String, required: false },
    encryptedAccessToken: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const User = mongoose.model<IUser>('User', UserSchema);