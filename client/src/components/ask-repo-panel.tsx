'use client';

import { useState } from 'react';
import { Send, Loader2, ExternalLink, Sparkles, MessageSquareCode } from 'lucide-react';
import type { AskChatMessage, AskCitation } from '@repolens/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL, ensureCsrfToken } from '@/lib/api';

interface AskRepoPanelProps {
  repoId: string;
  repoFullName: string;
  defaultBranch: string;
}

const STARTER_QUESTIONS = [
  'How does authentication and session management work?',
  'Where are the main API routes defined and how are requests validated?',
  'What database models exist and how do they relate to each other?',
  'Are there any background jobs, queues, or external API integrations?',
];

export function AskRepoPanel({ repoId, repoFullName, defaultBranch }: AskRepoPanelProps) {
  const [messages, setMessages] = useState<AskChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [statusStage, setStatusStage] = useState<string>('');
  const [citationCommitSha, setCitationCommitSha] = useState<string>(defaultBranch);
  const [error, setError] = useState<string | null>(null);

  async function sendQuestion(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || streaming) return;

    setError(null);
    setInput('');
    setStreaming(true);
    setStatusStage('Connecting...');

    const nextHistory = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages([...nextHistory, { role: 'assistant', content: '', citations: [] }]);

    try {
      const csrf = await ensureCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/ask`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: JSON.stringify({
          question: trimmed,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok || !response.body) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error?.message ?? `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trimEnd();
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const payloadStr = line.slice(6);
            try {
              const payload = JSON.parse(payloadStr) as Record<string, unknown>;
              if (currentEvent === 'status' && typeof payload.stage === 'string') {
                setStatusStage(payload.stage);
              } else if (currentEvent === 'citations') {
                if (typeof payload.commitSha === 'string') {
                  setCitationCommitSha(payload.commitSha);
                }
                const citations = (payload.citations as AskCitation[]) ?? [];
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === 'assistant') {
                    copy[copy.length - 1] = { ...last, citations };
                  }
                  return copy;
                });
              } else if (currentEvent === 'delta' && typeof payload.text === 'string') {
                setStatusStage('');
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === 'assistant') {
                    copy[copy.length - 1] = {
                      ...last,
                      content: last.content + payload.text,
                    };
                  }
                  return copy;
                });
              } else if (currentEvent === 'error' && typeof payload.message === 'string') {
                setError(payload.message);
              }
            } catch {
              // ignore partial JSON line
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get an answer');
    } finally {
      setStreaming(false);
      setStatusStage('');
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageSquareCode className="h-4 w-4 text-primary" aria-hidden="true" />
          Ask {repoFullName}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Answers are grounded in retrieved repository code chunks with clickable GitHub line
          citations.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-5">
        {messages.length === 0 ? (
          <div className="space-y-4 py-6">
            <div className="text-center">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium">Ask anything about this codebase</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try one of these starter questions or write your own below:
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendQuestion(q)}
                  className="rounded-md border border-border bg-muted/20 p-3 text-left text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-accent/50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.role === 'user'
                    ? 'ml-auto max-w-2xl rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground'
                    : 'mr-auto max-w-3xl space-y-3 rounded-lg border border-border bg-muted/25 p-4 text-sm'
                }
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.content || (streaming && idx === messages.length - 1 ? statusStage || 'Thinking...' : '')}
                </div>

                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                  <div className="border-t border-border pt-2.5">
                    <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Retrieved Sources
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cite, cIdx) => (
                        <a
                          key={`${cite.filePath}-${cite.startLine}-${cIdx}`}
                          href={`https://github.com/${repoFullName}/blob/${citationCommitSha}/${cite.filePath}#L${cite.startLine}-L${cite.endLine}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-primary hover:underline"
                        >
                          {cite.filePath}:{cite.startLine}-{cite.endLine}
                          <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-md border border-severity-critical/30 bg-severity-critical/10 p-3 text-xs text-severity-critical"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion(input);
          }}
          className="flex items-center gap-2 border-t border-border pt-4"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            placeholder="Ask a question about routes, auth, models, or architecture..."
            aria-label="Ask a question about this repository"
            className="h-10 flex-1 rounded-md border border-input bg-background px-3.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button type="submit" disabled={streaming || !input.trim()}>
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Ask
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}