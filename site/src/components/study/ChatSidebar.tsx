import { useRef, useState } from 'react';
import type { SuttaFixture } from '@tipitaka/contracts';
import { useI18n } from '../../i18n/react';

interface Props {
  fixture: SuttaFixture;
  apiBase: string;
}
interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

// L3 對話研經側欄（V2；僅在設定 PUBLIC_L3_API 時掛載）。
// grounded on 當前經 context；回應由 serverless proxy 串流，標 AI 徽章。
export default function ChatSidebar({ fixture, apiBase }: Props) {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = {
    suttaId: fixture.sutta.id,
    title: `${fixture.sutta.title_pali}（${fixture.sutta.title_zh}）`,
    segments: fixture.segments.map((s) => ({
      id: s.segment_id,
      pali: s.pali_tokens.map((tk) => tk.surface).join(' '),
      vernacular: s.vernacular_gloss?.content,
    })),
  };

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    let acc = '';
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);
    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context, messages: next }),
      });
      if (!res.ok || !res.body) {
        acc = res.status === 429 ? t.chat.rateLimited : t.chat.error;
        setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: acc }]);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: acc }]);
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
      }
    } catch {
      setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: t.chat.error }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="chat-fab chrome" type="button" onClick={() => setOpen(true)}>
        {t.chat.open} <span className="ai-badge">{t.study.aiBadge}</span>
      </button>
    );
  }

  return (
    <aside className="chat-panel" aria-label={t.chat.title}>
      <header className="chat-head">
        <span>
          {t.chat.title} <span className="ai-badge">{t.study.aiBadge}</span>
        </span>
        <button type="button" className="chat-close" onClick={() => setOpen(false)} aria-label="關閉">
          ✕
        </button>
      </header>
      <p className="chat-note calm-note">{t.chat.grounding}</p>
      <div className="chat-msgs" ref={scrollRef}>
        {messages.length === 0 && <p className="calm-note chat-empty">{t.chat.placeholder}</p>}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'chat-msg user' : 'chat-msg ai l2'}>
            {m.content || (busy && i === messages.length - 1 ? '…' : '')}
          </div>
        ))}
      </div>
      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.chat.inputPlaceholder}
          disabled={busy}
        />
        <button type="submit" className="chat-send" disabled={busy || !input.trim()}>
          {t.chat.send}
        </button>
      </form>
    </aside>
  );
}
