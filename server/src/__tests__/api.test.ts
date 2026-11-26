import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { signPayload } from '../utils/crypto';
import { User } from '../models/User';
import { Repo } from '../models/Repo';
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } from '../middleware/auth';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('API Auth, CSRF & Ownership Isolation', () => {
  const app = createApp();

  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/repos');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects state-changing requests missing X-CSRF-Token with 403', async () => {
    const userId = new mongoose.Types.ObjectId();
    vi.spyOn(User, 'findById').mockResolvedValueOnce({
      _id: userId,
      githubId: '101',
      username: 'alice',
      avatarUrl: 'https://example.com/a.png',
      encryptedAccessToken: 'enc',
      createdAt: new Date(),
    } as never);

    const sessionToken = signPayload({
      userId: String(userId),
      exp: Date.now() + 60_000,
    });

    const res = await request(app)
      .post('/api/repos')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sessionToken}`, `${CSRF_COOKIE_NAME}=csrf123`])
      .send({ fullName: 'alice/demo' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
  });

  it('enforces cross-user repository ownership isolation (returns 404 when accessing another user repo)', async () => {
    const aliceId = new mongoose.Types.ObjectId();
    const bobRepoId = new mongoose.Types.ObjectId();

    vi.spyOn(User, 'findById').mockResolvedValueOnce({
      _id: aliceId,
      githubId: '101',
      username: 'alice',
      avatarUrl: 'https://example.com/a.png',
      encryptedAccessToken: 'enc',
      createdAt: new Date(),
    } as never);

    vi.spyOn(Repo, 'findOne').mockResolvedValueOnce(null);

    const sessionToken = signPayload({
      userId: String(aliceId),
      exp: Date.now() + 60_000,
    });

    const res = await request(app)
      .get(`/api/repos/${String(bobRepoId)}`)
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sessionToken}`]);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REPO_NOT_FOUND');
  });
});