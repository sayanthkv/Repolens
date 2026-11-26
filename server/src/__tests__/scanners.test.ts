import { describe, it, expect, vi, afterEach } from 'vitest';
import { scanFileForPatterns } from '../services/scanners/patternScanner';
import { scanDependenciesWithOSV } from '../services/scanners/dependencyScanner';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scanFileForPatterns', () => {
  it('detects eval / new Function (positive) and ignores normal functions (negative)', () => {
    const pos = scanFileForPatterns('src/calc.ts', 'const out = eval(userInput);');
    expect(pos.some((f) => f.ruleId === 'PAT-EVAL')).toBe(true);

    const neg = scanFileForPatterns('src/calc.ts', 'const out = JSON.parse(userInput);');
    expect(neg.some((f) => f.ruleId === 'PAT-EVAL')).toBe(false);
  });

  it('detects command injection in exec (positive) and ignores execFile array args (negative)', () => {
    const pos = scanFileForPatterns('src/git.ts', 'exec(`git log ${branch}`);');
    expect(pos.some((f) => f.ruleId === 'PAT-CMD-INJECTION')).toBe(true);

    const neg = scanFileForPatterns('src/git.ts', 'execFile("git", ["log", branch]);');
    expect(neg.some((f) => f.ruleId === 'PAT-CMD-INJECTION')).toBe(false);
  });

  it('detects NoSQL injection from req.body (positive) and ignores explicit string cast (negative)', () => {
    const pos = scanFileForPatterns('src/user.ts', 'const u = await User.findOne(req.body);');
    expect(pos.some((f) => f.ruleId === 'PAT-NOSQL-INJECTION')).toBe(true);

    const neg = scanFileForPatterns('src/user.ts', 'const u = await User.findOne({ email: String(req.body.email) });');
    expect(neg.some((f) => f.ruleId === 'PAT-NOSQL-INJECTION')).toBe(false);
  });

  it('detects missing helmet in Express app (positive) and passes when helmet is used (negative)', () => {
    const pos = scanFileForPatterns('src/server.ts', 'import express from "express";\nconst app = express();');
    expect(pos.some((f) => f.ruleId === 'PAT-MISSING-HELMET')).toBe(true);

    const neg = scanFileForPatterns(
      'src/server.ts',
      'import express from "express";\nimport helmet from "helmet";\nconst app = express();\napp.use(helmet());',
    );
    expect(neg.some((f) => f.ruleId === 'PAT-MISSING-HELMET')).toBe(false);
  });

  it('detects open CORS with credentials (positive) and allows strict origin (negative)', () => {
    const pos = scanFileForPatterns(
      'src/cors.ts',
      'app.use(cors({ origin: "*", credentials: true }));',
    );
    expect(pos.some((f) => f.ruleId === 'PAT-OPEN-CORS-CREDENTIALS')).toBe(true);

    const neg = scanFileForPatterns(
      'src/cors.ts',
      'app.use(cors({ origin: "https://app.example.com", credentials: true }));',
    );
    expect(neg.some((f) => f.ruleId === 'PAT-OPEN-CORS-CREDENTIALS')).toBe(false);
  });

  it('detects JWT none algorithm / unverified decode (positive) and allows jwt.verify (negative)', () => {
    const pos = scanFileForPatterns('src/jwt.ts', 'const payload = jwt.decode(token);');
    expect(pos.some((f) => f.ruleId === 'PAT-JWT-NONE-ALG')).toBe(true);

    const neg = scanFileForPatterns('src/jwt.ts', 'const payload = jwt.verify(token, secret);');
    expect(neg.some((f) => f.ruleId === 'PAT-JWT-NONE-ALG')).toBe(false);
  });

  it('detects dynamic dangerouslySetInnerHTML (positive) and ignores safe JSX (negative)', () => {
    const pos = scanFileForPatterns(
      'src/Bio.tsx',
      'return <div dangerouslySetInnerHTML={{ __html: bioHtml }} />;',
    );
    expect(pos.some((f) => f.ruleId === 'PAT-DANGEROUS-HTML')).toBe(true);

    const neg = scanFileForPatterns('src/Bio.tsx', 'return <div>{bioText}</div>;');
    expect(neg.some((f) => f.ruleId === 'PAT-DANGEROUS-HTML')).toBe(false);
  });

  it('detects plaintext password comparison (positive) and ignores bcrypt.compare (negative)', () => {
    const pos = scanFileForPatterns('src/login.ts', 'if (user.password === req.body.password) {}');
    expect(pos.some((f) => f.ruleId === 'PAT-PLAINTEXT-PASSWORD')).toBe(true);

    const neg = scanFileForPatterns('src/login.ts', 'if (await bcrypt.compare(password, user.passwordHash)) {}');
    expect(neg.some((f) => f.ruleId === 'PAT-PLAINTEXT-PASSWORD')).toBe(false);
  });
});

describe('scanDependenciesWithOSV', () => {
  it('reports vulnerabilities returned by OSV batch API with fixed versions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              vulns: [
                {
                  id: 'GHSA-1234-5678',
                  summary: 'Prototype pollution in lodash',
                  database_specific: { severity: 'HIGH' },
                  affected: [{ ranges: [{ events: [{ introduced: '0' }, { fixed: '4.17.21' }] }] }],
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const findings = await scanDependenciesWithOSV([
      {
        path: 'package.json',
        size: 100,
        content: JSON.stringify({ dependencies: { lodash: '^4.17.15' } }),
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.type).toBe('dependency');
    expect(findings[0]?.severity).toBe('high');
    expect(findings[0]?.maskedPreview).toContain('4.17.21');
  });
});