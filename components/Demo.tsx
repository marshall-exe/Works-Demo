'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, ShieldCheck, RotateCcw } from 'lucide-react';
import type { Industry } from '../lib/content';

type Msg = { from: 'you' | 'desk'; text: string; escalated?: boolean };

// Scripted front-desk demo. Keyword rules only, no model behind it, nothing leaves the browser.
const ARABIC = /[؀-ۿ]/;

function reply(text: string, ind: Industry, stage: { booking: boolean }): Msg {
  const t = text.toLowerCase();
  if (ARABIC.test(text)) return { from: 'desk', text: 'أهلاً بك. أقدر أحجز لك موعداً أو أرسل الأسعار وساعات العمل. هذا عرض توضيحي، فالردود مكتوبة مسبقاً.' };
  if (/(refund|money back|complain|angry|terrible|lawyer|sue|allerg|pain|bleed|legal|insurance claim|discount)/.test(t)) {
    return { from: 'desk', text: 'I am sorry about that. I have passed this to a person on the team, and they will reply to you on this number today. I will not send anything else on it myself.', escalated: true };
  }
  if (stage.booking && /(sat|sun|mon|tue|wed|thu|fri|tomorrow|morning|afternoon|10|11|9 |am|pm)/.test(t)) { stage.booking = false; return { from: 'desk', text: ind.demo.slot }; }
  if (/(book|appointment|reserve|slot|available|availability|schedule|viewing|bring|come in)/.test(t)) { stage.booking = true; return { from: 'desk', text: ind.demo.booking }; }
  if (/(price|cost|how much|rate|fee|quote|rent)/.test(t)) return { from: 'desk', text: ind.demo.price };
  if (/(hour|open|close|time|when)/.test(t)) return { from: 'desk', text: ind.demo.hours };
  if (/(where|location|address|map|find you|directions)/.test(t)) return { from: 'desk', text: ind.demo.where };
  if (/(thank|shukran|great|perfect|ok)/.test(t)) return { from: 'desk', text: 'You are welcome. Message me any time, day or night.' };
  return { from: 'desk', text: 'I can book you in, share prices, hours or our location. Which one do you need? For anything else, a person on the team can step in.' };
}

export default function Demo({ industry }: { industry: Industry }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'desk', text: industry.demo.greeting }]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const stage = useRef({ booking: false });
  const list = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(0);

  useEffect(() => {
    setMsgs([{ from: 'desk', text: industry.demo.greeting }]);
    stage.current.booking = false;
    setTyping(false);
    clearTimeout(timer.current);
  }, [industry]);
  useEffect(() => { const l = list.current; if (l) l.scrollTop = l.scrollHeight; }, [msgs, typing]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || typing) return;
    setMsgs((m) => [...m, { from: 'you', text: clean }]);
    setDraft('');
    setTyping(true);
    const next = reply(clean, industry, stage.current);
    timer.current = window.setTimeout(() => { setTyping(false); setMsgs((m) => [...m, next]); window.dispatchEvent(new Event('oca:pulse')); }, 700 + Math.min(clean.length * 12, 700));
  };
  const reset = () => { clearTimeout(timer.current); setTyping(false); stage.current.booking = false; setMsgs([{ from: 'desk', text: industry.demo.greeting }]); };
  const chips = ['Can I book for Saturday morning?', 'How much is it?', 'What are your hours?', 'I want a refund'];

  return (
    <div className="chat" data-lit>
      <div className="chat-head">
        <span className="avatar" aria-hidden="true">H</span>
        <div><b>{industry.business}</b><span className="micro muted">HERMES · FRONT DESK · DEMO</span></div>
        <button className="text-link" onClick={reset} aria-label="Restart the demo"><RotateCcw size={14} aria-hidden="true" /> Restart</button>
      </div>
      <div className="chat-list" ref={list} role="log" aria-live="polite" aria-label="Demo conversation" tabIndex={0}>
        {msgs.map((m, i) => (
          <div key={i} className={m.from === 'you' ? 'bubble you' : 'bubble desk'}>
            <p>{m.text}</p>
            {m.escalated && <span className="escalated"><ShieldCheck size={12} aria-hidden="true" /> HANDED TO A PERSON</span>}
          </div>
        ))}
        {typing && <div className="bubble desk typing" aria-label="Hermes is typing"><i /><i /><i /></div>}
      </div>
      <div className="chat-chips">
        {chips.map((c) => <button key={c} onClick={() => send(c)} disabled={typing}>{c}</button>)}
      </div>
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type like a customer would" aria-label="Your message" maxLength={200} autoComplete="off" />
        <button type="submit" className="send" aria-label="Send" disabled={typing || !draft.trim()}><Send size={16} aria-hidden="true" /></button>
      </form>
      <p className="demo-notice">Demo. Scripted replies for the {industry.label.toLowerCase()} example. Nothing you type is sent or stored.</p>
    </div>
  );
}
