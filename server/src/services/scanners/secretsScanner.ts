import type { Severity } from '@repolens/shared';
import { maskLinePreview, maskSecret } from '../../utils/mask';

export interface RawFinding {
  type: 'secret' | 'dependency' | 'code_pattern';
  severity: Severity;
  title: string;
  filePath: string;
  lineNumber: number;
  maskedPreview: string;
  ruleId: string;
  description: string;
}

export interface SecretRule {
  id: string;
  title: string;
  severity: Severity;
  pattern: RegExp;
  description: string;
}

export const SECRET_RULES: SecretRule[] = [
  {
    id: 'SEC-AWS-ACCESS-KEY',
    title: 'Hardcoded AWS Access Key ID',
    severity: 'critical',
    pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/,
    description:
      'An AWS access key identifier was found in source code. Anyone with repository access can authenticate to AWS services.',
  },
  {
    id: 'SEC-GITHUB-TOKEN',
    title: 'Hardcoded GitHub Personal or App Token',
    severity: 'critical',
    pattern: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}|gho_[A-Za-z0-9]{36}|ghs_[A-Za-z0-9]{36})\b/,
    description:
      'A GitHub token is committed in plaintext, granting repository or account access to anyone who reads the code.',
  },
  {
    id: 'SEC-GOOGLE-API-KEY',
    title: 'Hardcoded Google API Key',
    severity: 'high',
    pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/,
    description:
      'A Google Cloud / Firebase API key was detected in code. Restrict the key or move it to server-side environment variables.',
  },
  {
    id: 'SEC-STRIPE-KEY',
    title: 'Hardcoded Stripe Secret or Restricted Key',
    severity: 'critical',
    pattern: /\b(sk_live|rk_live|sk_test)_[0-9a-zA-Z]{24,}\b/,
    description:
      'A Stripe API key was found in source code. Live keys can charge customers or issue refunds.',
  },
  {
    id: 'SEC-PRIVATE-KEY',
    title: 'Committed Private Key Block',
    severity: 'critical',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
    description:
      'A cryptographic private key is stored inside the repository. Rotate the key immediately and remove it from git history.',
  },
  {
    id: 'SEC-MONGODB-URI',
    title: 'MongoDB Connection URI with Embedded Credentials',
    severity: 'critical',
    pattern: /mongodb(?:\+srv)?:\/\/([^:\s'"`]+):([^@\s'"`]+)@[^\s'"`]+/,
    description:
      'A MongoDB connection string containing a username and password was committed. Load MONGODB_URI from environment variables.',
  },
  {
    id: 'SEC-JWT-SECRET',
    title: 'Hardcoded JWT Signing Secret',
    severity: 'high',
    pattern: /(?:jwt[_-]?secret|JWT_SECRET)\s*[:=]\s*['"`]([^'"`\s]{8,})['"`]/i,
    description:
      'A hardcoded JWT signing secret allows attackers who read the repo to forge arbitrary authentication tokens.',
  },
];

const ENTROPY_ASSIGNMENT_REGEX =
  /\b([a-zA-Z0-9_]*(?:key|secret|token|password|passwd|api_key|apikey)[a-zA-Z0-9_]*)\s*[:=]\s*['"`]([^\s'"`]{20,})['"`]/i;

const PLACEHOLDER_HINTS = [
  'example',
  'placeholder',
  'your_',
  'replace_with',
  'changeme',
  'dummy',
  'sample',
  'test_token',
  'xxxx',
];

export function isPlaceholderPassword(pass: string): boolean {
  if (!pass) return true;
  const trimmed = pass.trim();
  const lower = trimmed.toLowerCase();

  // Angle brackets, square brackets, curly braces, or template expressions
  if (
    trimmed.startsWith('<') ||
    trimmed.endsWith('>') ||
    trimmed.startsWith('[') ||
    trimmed.endsWith(']') ||
    trimmed.startsWith('{') ||
    trimmed.endsWith('}') ||
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.startsWith('$')
  ) {
    return true;
  }

  const DUMMY_PASSWORDS = [
    'password',
    'pass',
    'pwd',
    'dbpassword',
    'db_password',
    'placeholder',
    'example',
    'sample',
    'dummy',
    'changeme',
    'replace_with',
    'replaceme',
    'secret',
    'mysecret',
    'xxxx',
    'xxxxxx',
    '****',
    '123456',
    '12345678',
    'admin',
    'root',
  ];

  if (
    DUMMY_PASSWORDS.includes(lower) ||
    lower.startsWith('your_') ||
    lower.startsWith('your-') ||
    lower.startsWith('your') ||
    lower.includes('placeholder') ||
    lower.includes('changeme') ||
    lower.includes('example') ||
    lower.includes('replace_with')
  ) {
    return true;
  }

  return false;
}

export function isPlaceholderUsername(user: string): boolean {
  if (!user) return true;
  const trimmed = user.trim();
  const lower = trimmed.toLowerCase();

  if (
    trimmed.startsWith('<') ||
    trimmed.endsWith('>') ||
    trimmed.startsWith('[') ||
    trimmed.endsWith(']') ||
    trimmed.startsWith('{') ||
    trimmed.endsWith('}') ||
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.startsWith('$')
  ) {
    return true;
  }

  const DUMMY_USERNAMES = [
    'username',
    'user',
    'dbuser',
    'db_user',
    'placeholder',
    'example',
    'sample',
    'dummy',
    'changeme',
  ];

  if (
    DUMMY_USERNAMES.includes(lower) ||
    lower.startsWith('your_') ||
    lower.startsWith('your-') ||
    lower.includes('placeholder') ||
    lower.includes('example') ||
    lower.includes('changeme')
  ) {
    return true;
  }

  return false;
}

export function isPlaceholderMongoUri(user: string, pass: string): boolean {
  if (isPlaceholderUsername(user) || isPlaceholderPassword(pass)) {
    return true;
  }
  if (user.toLowerCase() === 'admin' && pass.toLowerCase() === 'admin') {
    return true;
  }
  if (user.toLowerCase() === 'root' && pass.toLowerCase() === 'root') {
    return true;
  }
  return false;
}

export function calculateShannonEntropy(str: string): number {
  if (!str) return 0;
  const counts = new Map<string, number>();
  for (const ch of str) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function scanFileForSecrets(filePath: string, content: string): RawFinding[] {
  const findings: RawFinding[] = [];
  const baseName = filePath.split('/').pop() ?? filePath;

  if (
    /^\.env(?:\..+)?$/i.test(baseName) &&
    !/^\.env\.(example|sample|template|dist)$/i.test(baseName)
  ) {
    findings.push({
      type: 'secret',
      severity: 'high',
      title: 'Committed .env Environment File',
      filePath,
      lineNumber: 1,
      maskedPreview: `${baseName} (environment file committed to repository)`,
      ruleId: 'SEC-COMMITTED-ENV',
      description:
        'Environment files often hold API keys and database credentials and should be excluded via .gitignore.',
    });
  }

  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    let matchedRuleOnLine = false;

    for (const rule of SECRET_RULES) {
      const match = line.match(rule.pattern);
      if (match) {
        if (rule.id === 'SEC-MONGODB-URI' && match[1] && match[2]) {
          if (isPlaceholderMongoUri(match[1], match[2])) {
            continue;
          }
        }

        if (rule.id === 'SEC-JWT-SECRET' && match[1]) {
          if (isPlaceholderPassword(match[1])) {
            continue;
          }
        }

        matchedRuleOnLine = true;
        const secretToken = match[1] && rule.id === 'SEC-JWT-SECRET' ? match[1] : match[0];
        findings.push({
          type: 'secret',
          severity: rule.severity,
          title: rule.title,
          filePath,
          lineNumber,
          maskedPreview:
            rule.id === 'SEC-PRIVATE-KEY'
              ? '-----BEGIN PRIVATE KEY----- (****)'
              : maskLinePreview(line, secretToken),
          ruleId: rule.id,
          description: rule.description,
        });
      }
    }

    if (!matchedRuleOnLine) {
      const entropyMatch = line.match(ENTROPY_ASSIGNMENT_REGEX);
      if (entropyMatch && entropyMatch[1] && entropyMatch[2]) {
        const varName = entropyMatch[1];
        const candidate = entropyMatch[2];
        const lower = candidate.toLowerCase();
        const isPlaceholder = PLACEHOLDER_HINTS.some((hint) => lower.includes(hint));

        if (!isPlaceholder && calculateShannonEntropy(candidate) >= 3.6) {
          findings.push({
            type: 'secret',
            severity: 'high',
            title: `High-Entropy Secret Assigned to "${varName}"`,
            filePath,
            lineNumber,
            maskedPreview: `${varName} = "${maskSecret(candidate)}"`,
            ruleId: 'SEC-HIGH-ENTROPY',
            description:
              'A high-entropy string literal is assigned to a credential-like variable name. Move secrets into environment variables.',
          });
        }
      }
    }
  });

  return findings;
}

export function redactSecretsInText(text: string): string {
  let sanitized = text;
  for (const rule of SECRET_RULES) {
    const globalRegex = new RegExp(
      rule.pattern.source,
      rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`,
    );
    sanitized = sanitized.replace(globalRegex, (match, p1, p2) => {
      if (rule.id === 'SEC-MONGODB-URI' && p1 && p2 && isPlaceholderMongoUri(p1, p2)) {
        return match;
      }
      if (rule.id === 'SEC-JWT-SECRET' && p1 && isPlaceholderPassword(p1)) {
        return match;
      }
      return `[REDACTED:${maskSecret(match)}]`;
    });
  }
  return sanitized;
}