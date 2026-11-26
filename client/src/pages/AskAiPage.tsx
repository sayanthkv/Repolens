import { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  FileCode,
  ShieldCheck,
  Database,
  Route as RouteIcon,
  Lock,
} from 'lucide-react';
import type { AskChatMessage, ConnectedRepo } from '@repolens/shared';
import { AppShell } from '@/components/app-shell';
import { HypnoticLoader } from '@/components/hypnotic-loader';
import { apiFetch, API_BASE_URL, ensureCsrfToken } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

const STARTER_PROMPTS = [
  { label: 'Authentication Flow', prompt: 'Explain how authentication, session cookies, and GitHub OAuth work in this codebase.', icon: Lock },
  { label: 'API Architecture', prompt: 'List the main Express routes, how input is validated, and where error handlers are placed.', icon: RouteIcon },
  { label: 'Database Models', prompt: 'What Mongoose schemas exist, what collections do they use, and how do they relate?', icon: Database },
  { label: 'Security Vulnerabilities', prompt: 'Are there any potential security vulnerabilities, command injection risks, or leaked credentials?', icon: ShieldCheck },
];

export function AskAiPage() {
  const { user, loading: authLoading, logout } = useAuth({ redirectToIfUnauthenticated: '/' });
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [messages, setMessages] = useState<AskChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [statusStage, setStatusStage] = useState('');

  const loadRepos = useCallback(async () => {
    try {
      const res = await apiFetch<{ repos: ConnectedRepo[] }>('/api/repos');
      const loaded = res.repos || [];
      setRepos(loaded);
      if (loaded.length > 0 && loaded[0]) {
        setSelectedRepoId(loaded[0].id);
      }
    } catch (err) {
      console.error('Failed to load repositories:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadRepos();
    }
  }, [user, loadRepos]);

  const handleSend = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || streaming || !selectedRepoId) return;

    setInput('');
    setStreaming(true);
    setStatusStage('Searching codebase chunks...');

    const nextHistory = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages([...nextHistory, { role: 'assistant', content: '', citations: [] }]);

    try {
      const csrf = await ensureCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/repos/${selectedRepoId}/ask`, {
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
        throw new Error(`Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = 'message';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            try {
              const parsed = JSON.parse(raw);
              if (currentEvent === 'stage' && parsed.stage) {
                setStatusStage(parsed.stage);
              } else if (currentEvent === 'token' && parsed.token) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content += parsed.token;
                  }
                  return updated;
                });
              } else if (currentEvent === 'citations' && parsed.citations) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.citations = parsed.citations;
                  }
                  return updated;
                });
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          last.content = err instanceof Error ? err.message : 'Error retrieving AI response.';
        }
        return updated;
      });
    } finally {
      setStreaming(false);
      setStatusStage('');
    }
  };

  if (authLoading || !user) {
    return (
      <HypnoticLoader
        message="Loading AI Codebase Assistant..."
        subMessage="Preparing contextual AST embedding models"
      />
    );
  }

  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="flex h-[calc(100vh-120px)] flex-col space-y-4">
        {/* Header with Repo Switcher */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="animate-text-reveal">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Ask AI Codebase Assistant
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 animate-text-delay-1">
              Natural-language technical queries with cited file paths and line ranges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Repository:</span>
            <select
              value={selectedRepoId}
              onChange={(e) => {
                setSelectedRepoId(e.target.value);
                setMessages([]);
              }}
              className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#df3407] focus:outline-none shadow-sm"
            >
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Area Container - Matching Unified Card Styling */}
        <div className="card-uniform flex flex-1 flex-col overflow-hidden rounded-3xl">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center max-w-xl mx-auto">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-900 border border-slate-200 mb-3.5 shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Ask anything about {selectedRepo?.fullName || 'your codebase'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">
                  Semantic code search retrieves relevant AST snippets and provides grounded answers.
                </p>

                {/* Starter Prompts Grid */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 w-full text-left">
                  {STARTER_PROMPTS.map((starter, i) => {
                    const Icon = starter.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSend(starter.prompt)}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all hover:bg-slate-100 hover:border-slate-300 group"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-slate-900 truncate">{starter.label}</span>
                          <span className="block text-[10px] text-slate-500 truncate">{starter.prompt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-900 border border-slate-200">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-none border border-slate-900'
                        : 'border border-slate-200 bg-slate-50 text-slate-900 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content || '...'}</p>

                    {/* File Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 border-t border-slate-200 pt-2">
                        <span className="text-[10px] font-medium text-slate-500 block mb-1.5">
                          Citations:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((cite, cIdx) => (
                            <span
                              key={cIdx}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-700"
                            >
                              <FileCode className="h-2.5 w-2.5 text-slate-500" />
                              {cite.filePath}:{cite.startLine}-{cite.endLine}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {streaming && statusStage && (
              <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px] animate-pulse">
                <Sparkles className="h-3 w-3" />
                <span>{statusStage}</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="border-t border-slate-200 bg-slate-50 p-3.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 focus-within:border-slate-300 transition-colors"
            >
              <input
                type="text"
                placeholder="Ask about authentication, routes, schemas, or security..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={streaming || !selectedRepoId}
                className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming || !selectedRepoId}
                className="liquid-btn-primary flex h-7 w-7 items-center justify-center rounded-lg transition-opacity disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
export default AskAiPage;
