import { describe, it, expect } from 'vitest';
import { scanFileForSecrets } from '../services/scanners/secretsScanner';
import { calculateSecurityScore, maskSecret } from '../utils/mask';

describe('maskSecret', () => {
  it('masks long secrets without exposing full token', () => {
    const masked = maskSecret('AKIAIOSFODNN7EXAMPLE');
    expect(masked).toBe('AKIA****PLE');
    expect(masked).not.toContain('IOSFODNN7EXAM');
  });

  it('masks short secrets safely', () => {
    expect(maskSecret('abc')).toBe('****');
  });
});

describe('calculateSecurityScore', () => {
  it('calculates weighted penalties and clamps at 0', () => {
    expect(calculateSecurityScore({ critical: 0, high: 0, medium: 0, low: 0 })).toBe(100);
    expect(calculateSecurityScore({ critical: 1, high: 2, medium: 1, low: 1 })).toBe(65);
    expect(calculateSecurityScore({ critical: 10, high: 5, medium: 0, low: 0 })).toBe(0);
  });
});

describe('scanFileForSecrets', () => {
  it('detects AWS access key (positive) and ignores normal identifiers (negative)', () => {
    const pos = scanFileForSecrets('src/aws.ts', 'const key = "AKIAIOSFODNN7EXAMPLE";');
    expect(pos.some((f) => f.ruleId === 'SEC-AWS-ACCESS-KEY')).toBe(true);
    expect(pos[0]?.maskedPreview).not.toContain('AKIAIOSFODNN7EXAMPLE');

    const neg = scanFileForSecrets('src/aws.ts', 'const key = process.env.AWS_ACCESS_KEY_ID;');
    expect(neg).toHaveLength(0);
  });

  it('detects GitHub token (positive) and ignores clean code (negative)', () => {
    const token = 'ghp_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';
    const pos = scanFileForSecrets('src/gh.ts', `const gh = "${token}";`);
    expect(pos.some((f) => f.ruleId === 'SEC-GITHUB-TOKEN')).toBe(true);

    const neg = scanFileForSecrets('src/gh.ts', 'const gh = req.headers.authorization;');
    expect(neg).toHaveLength(0);
  });

  it('detects Google API key (positive) and ignores normal strings (negative)', () => {
    const key = 'AIza' + 'SyD-9x8c7v6b5n4m3k2j1h0g9f8d7s6a5p4';
    const pos = scanFileForSecrets('src/maps.ts', `export const k = "${key}";`);
    expect(pos.some((f) => f.ruleId === 'SEC-GOOGLE-API-KEY')).toBe(true);

    const neg = scanFileForSecrets('src/maps.ts', 'export const k = "maps-endpoint-v1";');
    expect(neg).toHaveLength(0);
  });

  it('detects Stripe secret key (positive) and ignores publishable label (negative)', () => {
    const key = 'sk_live_' + '51AbCdEfGhIjKlMnOpQrStUvWxYz1234';
    const pos = scanFileForSecrets('src/pay.ts', `const stripe = "${key}";`);
    expect(pos.some((f) => f.ruleId === 'SEC-STRIPE-KEY')).toBe(true);

    const neg = scanFileForSecrets('src/pay.ts', 'const stripeMode = "live";');
    expect(neg).toHaveLength(0);
  });

  it('detects private key blocks (positive) and ignores public key header comments (negative)', () => {
    const pos = scanFileForSecrets('cert.pem', '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA');
    expect(pos.some((f) => f.ruleId === 'SEC-PRIVATE-KEY')).toBe(true);

    const neg = scanFileForSecrets('cert.pub', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0B');
    expect(neg).toHaveLength(0);
  });

  it('detects MongoDB URI with password (positive) and ignores local passwordless URI (negative)', () => {
    const pos = scanFileForSecrets('db.ts', 'const url = "mongodb+srv://admin:s3cr3tPass@cluster.mongodb.net/app";');
    expect(pos.some((f) => f.ruleId === 'SEC-MONGODB-URI')).toBe(true);

    const neg = scanFileForSecrets('db.ts', 'const url = "mongodb://localhost:27017/repolens";');
    expect(neg).toHaveLength(0);

    // Placeholder / example MongoDB URIs must be ignored (no false positives)
    const example1 = scanFileForSecrets(
      'config.ts',
      'const uri = "mongodb+srv://<username>:<password>@cluster.mongodb.net/ntorq-companion?retryWrites=true&w=majority";',
    );
    expect(example1.some((f) => f.ruleId === 'SEC-MONGODB-URI')).toBe(false);

    const example2 = scanFileForSecrets(
      '.env.example',
      'MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/app',
    );
    expect(example2.some((f) => f.ruleId === 'SEC-MONGODB-URI')).toBe(false);

    const example3 = scanFileForSecrets(
      'README.md',
      'mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/app',
    );
    expect(example3.some((f) => f.ruleId === 'SEC-MONGODB-URI')).toBe(false);
  });

  it('detects hardcoded JWT secret (positive) and ignores env lookup (negative)', () => {
    const pos = scanFileForSecrets('auth.ts', 'const JWT_SECRET = "super_secret_signing_key_123";');
    expect(pos.some((f) => f.ruleId === 'SEC-JWT-SECRET')).toBe(true);

    const neg = scanFileForSecrets('auth.ts', 'const JWT_SECRET = process.env.JWT_SECRET!;');
    expect(neg).toHaveLength(0);
  });

  it('detects high-entropy secret literal (positive) and ignores placeholder values (negative)', () => {
    const pos = scanFileForSecrets('cfg.ts', 'const apiSecret = "x9K#mP2$vL8@qR5!wN7&zT4*yB6^cF";');
    expect(pos.some((f) => f.ruleId === 'SEC-HIGH-ENTROPY')).toBe(true);

    const neg = scanFileForSecrets('cfg.ts', 'const apiSecret = "replace_with_your_api_secret_key";');
    expect(neg).toHaveLength(0);
  });

  it('flags committed .env files (positive) and allows .env.example (negative)', () => {
    const pos = scanFileForSecrets('.env', 'PORT=4000');
    expect(pos.some((f) => f.ruleId === 'SEC-COMMITTED-ENV')).toBe(true);

    const neg = scanFileForSecrets('.env.example', 'PORT=4000');
    expect(neg).toHaveLength(0);
  });
});