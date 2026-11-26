import type { Severity } from '@repolens/shared';
import type { RawFinding } from './secretsScanner';

export interface CodePatternRule {
  id: string;
  title: string;
  severity: Severity;
  pattern: RegExp;
  description: string;
  fileExtensions?: string[];
}

export const CODE_PATTERN_RULES: CodePatternRule[] = [
  {
    id: 'PAT-EVAL',
    title: 'Dynamic Code Execution via eval() or new Function()',
    severity: 'high',
    pattern: /(?<![.\w$])(?:eval\s*\(|new\s+Function\s*\()/,
    description:
      'Executing strings as JavaScript via eval() or new Function() enables arbitrary code execution if any input can be influenced by a user.',
  },
  {
    id: 'PAT-CMD-INJECTION',
    title: 'Potential OS Command Injection in child_process',
    severity: 'critical',
    pattern: /\b(?:exec|execSync)\s*\(\s*(?:`[^`]*\$\{|[^'"`\n)]*\+)/,
    description:
      'Passing interpolated or concatenated variables into child_process.exec/execSync allows shell command injection. Use execFile/spawn with an argument array instead.',
  },
  {
    id: 'PAT-NOSQL-INJECTION',
    title: 'Potential NoSQL Injection via Unvalidated Request Input',
    severity: 'high',
    pattern: /\.(?:find|findOne|findOneAndUpdate|updateOne|deleteOne|countDocuments)\s*\(\s*req\.(?:body|query|params)\b/,
    description:
      'Passing req.body, req.query, or req.params directly into a Mongoose query filter allows attackers to inject MongoDB operators like $ne or $gt.',
  },
  {
    id: 'PAT-OPEN-CORS-CREDENTIALS',
    title: 'Overly Permissive CORS Origin with Credentials Enabled',
    severity: 'high',
    pattern: /cors\s*\(\s*\{[^}]*origin\s*:\s*(?:['"`]\*['"`]|true)[^}]*credentials\s*:\s*true/s,
    description:
      'Combining wildcard or reflected CORS origins with credentials: true allows untrusted websites to make authenticated cross-origin requests.',
  },
  {
    id: 'PAT-JWT-NONE-ALG',
    title: 'Insecure JWT "none" Algorithm or Unverified Decode',
    severity: 'critical',
    pattern: /(?:algorithms\s*:\s*\[[^\]]*['"`]none['"`]|jwt\.decode\s*\()/i,
    description:
      'Accepting the "none" algorithm or trusting jwt.decode() without signature verification lets attackers forge arbitrary JWT payloads.',
  },
  {
    id: 'PAT-DANGEROUS-HTML',
    title: 'Potential XSS via dangerouslySetInnerHTML',
    severity: 'medium',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!['"`])/,
    description:
      'Rendering dynamic HTML with dangerouslySetInnerHTML can introduce Cross-Site Scripting (XSS) unless sanitized with DOMPurify.',
  },
  {
    id: 'PAT-PLAINTEXT-PASSWORD',
    title: 'Plaintext Password Comparison or Direct Storage',
    severity: 'high',
    pattern: /(?:\.password\s*===?\s*req\.body\.password|req\.body\.password\s*===?|\.create\s*\(\s*\{[^}]*\bpassword\s*:\s*req\.body\.password)/,
    description:
      'Passwords must never be stored or compared in plaintext. Hash passwords with bcrypt or Argon2 before saving and compare hashes.',
  },
];

const SCANNABLE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

export function scanFileForPatterns(filePath: string, content: string): RawFinding[] {
  const lower = filePath.toLowerCase();
  if (!SCANNABLE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return [];
  }

  // Skip test files so test fixtures don't trigger false positives on themselves
  if (lower.includes('.test.') || lower.includes('.spec.') || lower.includes('__tests__')) {
    return [];
  }

  const findings: RawFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (const rule of CODE_PATTERN_RULES) {
    if (rule.pattern.flags.includes('s')) {
      const match = content.match(rule.pattern);
      if (match && match.index !== undefined) {
        const lineNumber = content.slice(0, match.index).split(/\r?\n/).length;
        const snippet = (lines[lineNumber - 1] ?? match[0]).trim();
        findings.push({
          type: 'code_pattern',
          severity: rule.severity,
          title: rule.title,
          filePath,
          lineNumber,
          maskedPreview: snippet.slice(0, 150),
          ruleId: rule.id,
          description: rule.description,
        });
      }
      continue;
    }

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }
      if (rule.id === 'PAT-CMD-INJECTION' && /(?:Re|Regex|Pattern|\/[gimsuy]*)\s*\.\s*exec\s*\(/i.test(line)) {
        return;
      }
      if (rule.id === 'PAT-DANGEROUS-HTML' && /(?:DOMPurify\.sanitize|sanitizeHtml)\s*\(/i.test(line)) {
        return;
      }
      if (rule.pattern.test(line)) {
        findings.push({
          type: 'code_pattern',
          severity: rule.severity,
          title: rule.title,
          filePath,
          lineNumber: idx + 1,
          maskedPreview: line.trim().slice(0, 150),
          ruleId: rule.id,
          description: rule.description,
        });
      }
    });
  }

  // File-level check: Express server entrypoint missing helmet()
  if (/\bexpress\s*\(\s*\)/.test(content) && !/\bhelmet\s*\(/.test(content)) {
    const lineIdx = lines.findIndex((l) => /\bexpress\s*\(\s*\)/.test(l));
    findings.push({
      type: 'code_pattern',
      severity: 'medium',
      title: 'Express Application Missing Helmet Security Headers',
      filePath,
      lineNumber: lineIdx >= 0 ? lineIdx + 1 : 1,
      maskedPreview: (lines[lineIdx >= 0 ? lineIdx : 0] ?? 'const app = express()').trim().slice(0, 150),
      ruleId: 'PAT-MISSING-HELMET',
      description:
        'Express apps without helmet() miss standard HTTP security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options).',
    });
  }

  return findings;
}