'use client';

import { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/app/services/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    try {
      const data = await apiClient.post<{ reply: string }>('/api/ai/chat', { messages: nextMessages });
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('not configured')) {
        setUnavailable(true);
      }
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: error instanceof Error ? error.message : 'Something went wrong.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <div className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-xl border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              AI Assistant
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500">
                Ask me how to use Trimurti TMS — e.g. &quot;how do I create an LR?&quot;
                {unavailable ? ' (Note: AI Assistant needs to be enabled in Settings > Integrations first.)' : ''}
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    m.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
                  )}
                >
                  {m.content}
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSend} className="flex gap-2 border-t p-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question..."
              className="h-9"
              disabled={sending}
            />
            <Button type="submit" size="sm" disabled={sending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800"
          title="AI Assistant"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
