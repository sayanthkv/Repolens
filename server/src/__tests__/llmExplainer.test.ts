import { describe, it, expect, vi } from 'vitest';
import {
  enrichCriticalAndHighFindings,
  MAX_AI_FINDINGS_PER_SCAN,
} from '../services/llm/findingExplainer';
import type { LlmClient } from '../services/llm/llmClient';
import type { RawFinding } from '../services/scanners/secretsScanner';

describe('enrichCriticalAndHighFindings', () => {
  it('redacts raw secrets before sending code context to LLM and attaches explanation + fix', async () => {
    const promptsSent: string[] = [];

    const mockClient: LlmClient = {
      generateText: vi.fn(),
      streamText: vi.fn(),
      generateJson: vi.fn(async (opts) => {
        promptsSent.push(opts.messages[0]?.content ?? '');
        return {
          explanation: 'Hardcoded AWS keys expose cloud infrastructure.',
          suggestedFix: 'const key = process.env.AWS_ACCESS_KEY_ID;',
        } as never;
      }),
    };

    const findings: RawFinding[] = [
      {
        type: 'secret',
        severity: 'critical',
        title: 'Hardcoded AWS Access Key ID',
        filePath: 'src/config.ts',
        lineNumber: 2,
        maskedPreview: 'const key = "AKIA****PLE";',
        ruleId: 'SEC-AWS-ACCESS-KEY',
        description: 'AWS key committed.',
      },
      {
        type: 'code_pattern',
        severity: 'low',
        title: 'Low severity note',
        filePath: 'src/util.ts',
        lineNumber: 1,
        maskedPreview: 'console.log(x)',
        ruleId: 'LOW-1',
        description: 'Minor issue.',
      },
    ];

    const files = [
      {
        path: 'src/config.ts',
        size: 80,
        content: 'export const region = "ap-south-1";\nconst key = "AKIAIOSFODNN7EXAMPLE";',
      },
    ];

    const result = await enrichCriticalAndHighFindings(findings, files, mockClient);

    expect(mockClient.generateJson).toHaveBeenCalledTimes(1);
    expect(promptsSent[0]).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(promptsSent[0]).toContain('[REDACTED:AKIA****PLE]');
    expect(result[0]?.aiExplanation).toBe('Hardcoded AWS keys expose cloud infrastructure.');
    expect(result[0]?.aiSuggestedFix).toBe('const key = process.env.AWS_ACCESS_KEY_ID;');
    expect(result[1]?.aiExplanation).toBeUndefined();
  });

  it('caps LLM calls at 20 critical/high findings per scan', async () => {
    const mockClient: LlmClient = {
      generateText: vi.fn(),
      streamText: vi.fn(),
      generateJson: vi.fn(async () => ({
        explanation: 'Explanation text.',
        suggestedFix: 'Fix snippet.',
      }) as never),
    };

    const findings: RawFinding[] = Array.from({ length: 26 }, (_, idx) => ({
      type: 'code_pattern',
      severity: 'high',
      title: `Finding ${idx}`,
      filePath: `src/file${idx}.ts`,
      lineNumber: 10,
      maskedPreview: 'eval(x)',
      ruleId: 'PAT-EVAL',
      description: 'Unsafe eval',
    }));

    await enrichCriticalAndHighFindings(findings, [], mockClient);
    expect(mockClient.generateJson).toHaveBeenCalledTimes(MAX_AI_FINDINGS_PER_SCAN);
  });
});