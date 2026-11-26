import { z } from 'zod';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmGenerateOptions {
  systemPrompt: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface LlmClient {
  generateText(options: LlmGenerateOptions): Promise<string>;
  generateJson<T>(options: LlmGenerateOptions, schema: z.ZodType<T>): Promise<T>;
  streamText(options: LlmGenerateOptions, onChunk: (chunk: string) => void): Promise<string>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryDelayMs(errText: string, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const secs = Number(retryAfterHeader);
    if (!Number.isNaN(secs) && secs > 0) return Math.min(secs * 1000, 30_000);
  }
  const match = errText.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (match?.[1]) {
    return Math.min(Math.ceil(Number(match[1]) * 1000) + 500, 30_000);
  }
  return 4_000;
}

function isPlaceholderApiKey(key: string): boolean {
  const lower = key.trim().toLowerCase();
  return !lower || lower === 'your_llm_api_key' || lower.startsWith('replace_with');
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw.trim();
}

async function callAnthropic(options: LlmGenerateOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 25_000);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.LLM_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.2,
        system: options.systemPrompt,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Anthropic API error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return (
      data.content
        ?.filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text)
        .join('\n') ?? ''
    );
  } finally {
    clearTimeout(timeout);
  }
}

const GEMINI_FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];

async function callGeminiSingleModel(
  model: string,
  options: LlmGenerateOptions,
  attempt = 1,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.LLM_API_KEY)}`;
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.systemPrompt }] },
        contents: options.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.2,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const isTransient =
        res.status === 503 ||
        res.status === 502 ||
        res.status === 504 ||
        (res.status === 429 && !errText.includes('limit: 0'));

      if (isTransient && attempt <= 2) {
        const waitMs =
          res.status === 429
            ? parseRetryDelayMs(errText, res.headers.get('retry-after'))
            : 2_000 * attempt;
        logger.warn({ model, status: res.status, waitMs, attempt }, 'Gemini transient error, retrying');
        await sleep(waitMs);
        return callGeminiSingleModel(model, options, attempt + 1);
      }

      throw new Error(`Gemini API error (${res.status}) on ${model}: ${errText.slice(0, 220)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('') ?? ''
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(options: LlmGenerateOptions): Promise<string> {
  const modelsToTry = Array.from(new Set([env.LLM_MODEL, ...GEMINI_FALLBACK_MODELS]));
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      return await callGeminiSingleModel(model, options);
    } catch (err) {
      lastError = err;
      logger.warn({ model, err }, 'Gemini model failed, trying next fallback model if available');
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All Gemini models failed');
}

async function callOpenAI(options: LlmGenerateOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 25_000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.2,
        messages: [
          { role: 'system', content: options.systemPrompt },
          ...options.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timeout);
  }
}

export const llmClient: LlmClient = {
  async generateText(options: LlmGenerateOptions): Promise<string> {
    if (isPlaceholderApiKey(env.LLM_API_KEY)) {
      throw new Error('LLM_API_KEY is not configured');
    }

    if (env.LLM_PROVIDER === 'gemini') {
      return callGemini(options);
    }
    if (env.LLM_PROVIDER === 'openai') {
      return callOpenAI(options);
    }
    return callAnthropic(options);
  },

  async generateJson<T>(options: LlmGenerateOptions, schema: z.ZodType<T>): Promise<T> {
    const raw = await this.generateText(options);
    const jsonText = extractJsonBlock(raw);
    const parsed = JSON.parse(jsonText) as unknown;
    return schema.parse(parsed);
  },

  async streamText(options: LlmGenerateOptions, onChunk: (chunk: string) => void): Promise<string> {
    if (isPlaceholderApiKey(env.LLM_API_KEY)) {
      throw new Error('LLM_API_KEY is not configured');
    }

    if (env.LLM_PROVIDER === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.LLM_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: env.LLM_MODEL,
          max_tokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.2,
          stream: true,
          system: options.systemPrompt,
          messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const fallback = await this.generateText(options);
        onChunk(fallback);
        return fallback;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const event = JSON.parse(payload) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text;
              onChunk(event.delta.text);
            }
          } catch {
            // ignore malformed SSE chunk
          }
        }
      }
      return fullText;
    }

    try {
      const full = await this.generateText(options);
      const words = full.split(/(\s+)/);
      for (const word of words) {
        if (word) onChunk(word);
      }
      return full;
    } catch (err) {
      logger.warn({ err }, 'LLM stream failed');
      throw err;
    }
  },
};