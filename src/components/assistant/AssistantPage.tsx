'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { mockResponse, callAI, buildSystemPrompt, Message } from '@/lib/ai/assistant';
import { ChatMessage } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { Bot, Send, User, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const SUGGESTED_QUESTIONS = [
  'Which books are overdue?',
  'Is Clean Code available?',
  'What has Alice borrowed?',
  'How many books are issued today?',
  'Suggest a book from Science',
  'What are the library stats?',
];

// Simple markdown renderer without external deps
function MessageContent({ content }: { content: string }) {
  // Convert **bold** and bullet points to formatted text
  const parts = content.split('\n');
  return (
    <div className="text-sm leading-relaxed space-y-1">
      {parts.map((line, i) => {
        if (line.startsWith('• ') || line.startsWith('- ')) {
          const text = line.slice(2);
          return (
            <div key={i} className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        );
      })}
    </div>
  );
}

export default function AssistantPage() {
  const { state } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx = {
    books: state.books,
    members: state.members,
    transactions: state.transactions,
    settings: state.settings,
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setError('');

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text.trim(),
      timestamp: format(new Date(), 'HH:mm'),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let responseText: string;

      if (state.settings.aiApiKey && state.settings.aiApiKey.trim()) {
        // Real AI mode
        const history: Message[] = [
          { role: 'system', content: buildSystemPrompt(ctx) },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: text.trim() },
        ];
        responseText = await callAI(history, state.settings.aiApiKey.trim());
      } else {
        // Mock mode — answer using actual data
        await new Promise((r) => setTimeout(r, 600)); // simulate thinking
        responseText = mockResponse(text.trim(), ctx);
      }

      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: responseText,
        timestamp: format(new Date(), 'HH:mm'),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message ?? 'Failed to get a response. Please try again.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-500" />
            AI Library Assistant
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Ask questions about books, members, and loans
            {!state.settings.aiApiKey?.trim() && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                (Mock mode — <Link href="/settings" className="underline">add API key</Link> for real AI)
              </span>
            )}
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={clearChat}
          >
            Clear
          </Button>
        )}
      </div>

      {error && <Alert variant="error" message={error} className="mb-3" />}

      {/* Chat Window */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Ask me anything about your library
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                I have access to all your books, members, and transaction data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-600 hover:border-blue-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-blue-500" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <MessageContent content={msg.content} />
                    )}
                    <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about books, members, loans..."
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              icon={<Send className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
          {messages.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
              Try clicking a suggestion above or type your own question
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
