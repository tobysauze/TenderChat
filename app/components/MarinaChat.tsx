'use client';

// Open chat room per marina — the community feature that makes Tender a
// yacht-crew network, not just a dating app. Anyone signed in can read and
// post in the marina room they pick.

import { useEffect, useRef, useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { supabase } from '../../lib/supabase';
import { MARINAS } from '../../lib/yachting';
import MarinaPicker from './MarinaPicker';

interface MarinaMessage {
  id: string;
  marina: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface SenderInfo {
  name: string;
  photo?: string;
}

interface MarinaChatProps {
  userId: string;
  defaultMarina: string;
}

const PAGE_LIMIT = 200;

export default function MarinaChat({ userId, defaultMarina }: MarinaChatProps) {
  const [marina, setMarina] = useState(defaultMarina || MARINAS[0]);
  const [messages, setMessages] = useState<MarinaMessage[]>([]);
  const [senders, setSenders] = useState<Record<string, SenderInfo>>({});
  const [composing, setComposing] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Load messages for the active marina + subscribe to new ones.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);

    (async () => {
      const { data } = await supabase
        .from('marina_messages')
        .select('*')
        .eq('marina', marina)
        .order('created_at', { ascending: true })
        .limit(PAGE_LIMIT);
      if (cancelled) return;
      setMessages((data as MarinaMessage[]) || []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`marina:${marina}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marina_messages', filter: `marina=eq.${marina}` },
        (payload: any) => {
          const row = payload.new as MarinaMessage;
          if (!row) return;
          setMessages(prev => (prev.some(m => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [marina]);

  // Fetch sender profile info for any sender we don't already know.
  useEffect(() => {
    const need = Array.from(new Set(messages.map(m => m.sender_id))).filter(id => !senders[id]);
    if (need.length === 0) return;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, name, photos(url, order)')
        .in('user_id', need);
      if (!data) return;
      setSenders(prev => {
        const next = { ...prev };
        for (const p of data as any[]) {
          const photo = (p.photos || []).slice().sort((a: any, b: any) => a.order - b.order)[0]?.url;
          next[p.user_id] = { name: p.name || 'Crew', photo };
        }
        return next;
      });
    })();
  }, [messages]);

  // Stick to the bottom as messages arrive.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const send = async () => {
    const trimmed = composing.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const { error } = await supabase
      .from('marina_messages')
      .insert({ marina, sender_id: userId, content: trimmed });
    if (!error) setComposing('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-0">
      {/* Marina picker */}
      <div className="bg-white border-b shrink-0 p-4">
        <label className="block text-xs font-semibold text-[var(--tender-navy)] uppercase tracking-wide mb-1">Marina room</label>
        <MarinaPicker value={marina} onChange={v => v && setMarina(v)} placeholder="Search marinas…" />
        <p className="text-xs text-gray-500 mt-2">Open chat for anyone currently in {marina}. Be kind — the same Terms apply.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-semibold text-[var(--tender-navy)] mb-1">No messages yet in {marina}</p>
            <p className="text-sm text-gray-500">Say hello and start the conversation.</p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === userId;
            const sender = senders[m.sender_id];
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--tender-blue)]/30 shrink-0">
                    {sender?.photo ? (
                      <img src={sender.photo} alt={sender.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--tender-navy)]">
                        {sender?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-[var(--tender-red)] text-white rounded-br-sm' : 'bg-white text-[var(--tender-navy)] rounded-bl-sm shadow-sm'}`}>
                  {!mine && <p className="text-xs font-semibold opacity-70 mb-0.5">{sender?.name || 'Crew'}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Composer */}
      <div
        className="bg-white border-t shrink-0 p-3 flex gap-2"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <input
          type="text"
          value={composing}
          onChange={e => setComposing(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${marina}…`}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
          maxLength={2000}
        />
        <button
          onClick={send}
          disabled={!composing.trim() || sending}
          className="w-10 h-10 rounded-full bg-[var(--tender-red)] text-white flex items-center justify-center disabled:opacity-50"
          aria-label="Send"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
