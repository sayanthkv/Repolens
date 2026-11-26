import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  ShieldCheck,
  Paperclip,
  Smile,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export function FloatingAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hello! I'm RepoLens AI, your continuous DevSecOps assistant. I monitor your repositories for leaked credentials, vulnerable dependencies, and AST code injections. How can I help you secure your codebase today?",
      timestamp: '1m ago',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      setTimeout(() => {
        let aiResponse = "I have analyzed your request against the latest repository security scans. ";
        const q = textToSend.toLowerCase();
        if (q.includes('mongo') || q.includes('secret') || q.includes('key')) {
          aiResponse += "For MongoDB URIs, RepoLens now uses smart placeholder filtering. Strings like `mongodb+srv://<username>:<password>...` are recognized as documentation and ignored, eliminating false positives!";
        } else if (q.includes('pr') || q.includes('fix') || q.includes('remediat')) {
          aiResponse += "1-Click AI Auto-Remediation creates an isolated branch, verifies JSON syntax (preventing Vercel npm install errors), and opens a pull request for human developer review.";
        } else if (q.includes('score') || q.includes('risk')) {
          aiResponse += "Your Security Health Score is computed on a 0-100 scale: Critical (-25), High (-15), Medium (-5), Low (-2). Any new regression alerts trigger an instant delta notification.";
        } else {
          aiResponse += "I'm monitoring your codebase structure, AST pattern execution, and OSV dependencies. You can ask me to explain any vulnerability or review code diffs.";
        }

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: aiResponse,
          timestamp: 'Just now',
        };

        setMessages((prev) => [...prev, aiMsg]);
        setLoading(false);
      }, 650);
    } catch {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button (Matches Guardz bottom-right trigger) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-13 w-13 p-3.5 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-[0_8px_30px_rgba(99,102,241,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_40px_rgba(99,102,241,0.7)]"
          aria-label="Open RepoLens AI Assistant"
        >
          <span className="relative flex items-center justify-center">
            <MessageSquare className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </span>
        </button>
      )}

      {/* Floating Chat Modal (Matches Guardz Chat Box in Screenshot) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[540px] w-[370px] flex-col overflow-hidden rounded-2xl border border-[#212952] bg-[#0c1026] shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all duration-300 sm:w-[390px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1b2349] bg-[#090d20] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">RepoLens AI</span>
                <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300 border border-indigo-500/30">
                  v2.0
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Subheader Banner (Matches Guardz screenshot avatar bubbles and status) */}
          <div className="border-b border-[#1b2349] bg-[#0f1430]/90 px-4 py-3 text-center">
            <div className="mb-2 flex items-center justify-center -space-x-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-[#0c1026]">
                F
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white ring-2 ring-[#0c1026]">
                O
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-[#0c1026]">
                G
              </div>
            </div>
            <p className="text-xs font-semibold text-white">We typically reply in under 2 minutes</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Ask us anything, or share your feedback
            </p>
          </div>

          {/* Quick Prompts */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-[#1b2349] bg-[#090d20] px-3 py-2 text-[10px]">
            <button
              onClick={() => handleSend('How does 1-Click Fix PR work?')}
              className="whitespace-nowrap rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
            >
              ⚡ 1-Click PRs
            </button>
            <button
              onClick={() => handleSend('How are MongoDB URIs filtered?')}
              className="whitespace-nowrap rounded-lg border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
            >
              🔑 Secret Scanner
            </button>
            <button
              onClick={() => handleSend('Explain AST Command Injection')}
              className="whitespace-nowrap rounded-lg border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 font-medium text-blue-300 hover:bg-blue-500/20 transition-colors"
            >
              🛡️ AST Detection
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[9px] text-slate-500 mb-1 px-1">
                  {msg.sender === 'user' ? '1m You' : 'RepoLens Bot'}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed text-xs ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-sm'
                      : 'border border-[#1f2852] bg-[#141a38] text-slate-200 rounded-bl-sm'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 rounded-2xl border border-[#1f2852] bg-[#141a38] px-3.5 py-2.5 w-fit">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar (Matches Guardz screenshot input) */}
          <div className="border-t border-[#1b2349] bg-[#090d20] p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 rounded-xl border border-[#212952] bg-[#070913] px-3 py-2 focus-within:border-indigo-500/50"
            >
              <input
                type="text"
                placeholder="Messages..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 text-slate-400">
                <button type="button" className="hover:text-slate-200 p-0.5">
                  <Smile className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="hover:text-slate-200 p-0.5">
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white transition-opacity disabled:opacity-40 hover:bg-indigo-500 ml-1"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
