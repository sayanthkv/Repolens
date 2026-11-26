import { describe, it, expect } from 'vitest';
import { computeGitHubSignature, verifyGitHubSignature } from '../utils/webhookVerify';

describe('GitHub webhook HMAC SHA-256 signature verification', () => {
  const secret = 'test_webhook_secret_key_12345';
  const payload = JSON.stringify({
    ref: 'refs/heads/main',
    after: 'abcdef1234567890',
    repository: { id: 42, full_name: 'octocat/Hello-World' },
  });

  it('accepts a valid X-Hub-Signature-256 header', () => {
    const sig = computeGitHubSignature(payload, secret);
    expect(verifyGitHubSignature(payload, sig, secret)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const sig = computeGitHubSignature(payload, secret);
    const tampered = payload.replace('main', 'evil');
    expect(verifyGitHubSignature(tampered, sig, secret)).toBe(false);
  });

  it('rejects a signature signed with a different secret', () => {
    const sig = computeGitHubSignature(payload, 'wrong_secret');
    expect(verifyGitHubSignature(payload, sig, secret)).toBe(false);
  });

  it('rejects missing or malformed signature headers', () => {
    expect(verifyGitHubSignature(payload, undefined, secret)).toBe(false);
    expect(verifyGitHubSignature(payload, 'invalid-format', secret)).toBe(false);
  });
});