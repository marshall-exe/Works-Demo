'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Mic, MicOff, Send, X, Keyboard, Volume2, MapPin, Check, ArrowUpRight, Phone } from 'lucide-react';
import type { AnamClient } from '@anam-ai/js-sdk';
import { placeById } from '../../lib/shams/places';
import type { MapView } from './ShamsMap';
import './shams.css';
import './shams-book.css';

const ShamsHolo3D = dynamic(() => import('./ShamsHolo3D'), { ssr: false });
const ShamsMap = dynamic(() => import('./ShamsMap'), { ssr: false, loading: () => <div className="shams-map-canvas loading" /> });

type Phase = 'idle' | 'connecting' | 'live' | 'ended';
type Book = { business: string; needs: string; employee: string };
type Msg = { id: string; role: 'you' | 'shams'; text: string; plan?: { title: string; days: { label: string; names: string[] }[] }; book?: Book };

// OCA's published booking page and phone number (same as the rest of the site).
const BOOK_URL = 'https://oneclickaway.io/book?utm_source=oca-hermes&utm_medium=website&utm_campaign=shams';
const PHONE = '+971565354435';
const PHONE_PRETTY = '+971 56 535 4435';

const IDLE_LIMIT_MS = 75_000; // no one has typed or spoken for this long: hang up
const AWAY_LIMIT_MS = 20_000; // section scrolled out of view for this long: hang up
const CHIPS = [
  'Plan me 3 days from Erbil',
  'What does OCA do?',
  'Is the Hamilton Road worth it?',
  'Which AI employee fits my clinic?',
  'What should I eat in Kurdistan?',
  'Book me a call with OCA',
  'Tell me the story of the Erbil Citadel',
  'كيف أروح من أربيل للسليمانية؟',
];

// Her opening line is fixed server-side; show it whole even if the first streamed chunk is missed.
const GREETING = "Hi, I'm Shams. Ask me anything about Kurdistan, or about OCA and what an AI employee could do for your business.";
// House style: no em or en dashes in anything shown on screen.
const tidy = (t: string) => t.replace(/\s*[\u2014\u2013]\s*/g, ', ');
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

function silentStream() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const dest = ctx.createMediaStreamDestination();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain).connect(dest);
  osc.start();
  return { stream: dest.stream, close: () => { try { osc.stop(); ctx.close(); } catch { /* already closed */ } } };
}

export default function Shams() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [voice, setVoice] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [showCap, setShowCap] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [left, setLeft] = useState(240);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');
  const [needsTap, setNeedsTap] = useState(false);
  const [view, setView] = useState<MapView>({ kind: 'overview' });
  const [mapLabel, setMapLabel] = useState('Kurdistan Region');
  const [reduced, setReduced] = useState(false);
  const [noGl, setNoGl] = useState(false);

  const client = useRef<AnamClient | null>(null);
  const silent = useRef<{ close: () => void } | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const micOnSession = useRef(false);
  const lastActive = useRef(Date.now());
  const awaySince = useRef<number | null>(null);
  const hiddenSince = useRef<number | null>(null);
  const queued = useRef<string | null>(null);
  const greeted = useRef(false);
  const greetId = useRef<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const speakingRef = useRef(false);
  speakingRef.current = speaking;
  const store = useRef<Msg[]>([]);
  const commit = (m: Msg[]) => { store.current = m; setMsgs(m); };

  useEffect(() => { setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  useEffect(() => {
    if (speaking) { setShowCap(true); return; }
    const t = window.setTimeout(() => setShowCap(false), 2600);
    return () => window.clearTimeout(t);
  }, [speaking]);
  useEffect(() => { const l = list.current; if (l) l.scrollTop = l.scrollHeight; }, [msgs, thinking]);

  // Reveal on scroll (the page's own reveal runs before this section exists).
  useEffect(() => {
    const els = root.current?.querySelectorAll('[data-shams-reveal]');
    if (!els) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  const end = useCallback(async (why?: string) => {
    const c = client.current;
    client.current = null;
    silent.current?.close(); silent.current = null;
    micStream.current?.getTracks().forEach((t) => t.stop()); micStream.current = null;
    micOnSession.current = false;
    setSpeaking(false); setListening(false); setThinking(false); setNeedsTap(false);
    if (phaseRef.current !== 'idle') setPhase('ended');
    if (why) setNote(why);
    try { await c?.stopStreaming(); } catch { /* already closed */ }
  }, []);

  useEffect(() => () => { void end(); }, [end]);

  const send = useCallback((text: string) => {
    const clean = text.trim().slice(0, 400);
    if (!clean) return;
    const c = client.current;
    if (!c || !c.isStreaming()) return;
    lastActive.current = Date.now();
    commit([...store.current, { id: `you-${Date.now()}`, role: 'you', text: clean }]);
    setThinking(true);
    try { if (speakingRef.current) c.interruptPersona(); } catch { /* not speaking */ }
    c.sendUserMessage(clean);
  }, []);

  const start = useCallback(async (withVoice: boolean, firstMessage?: string) => {
    if (phaseRef.current === 'connecting' || phaseRef.current === 'live') return;
    setPhase('connecting'); setNote(''); commit([]); setView({ kind: 'overview' }); setMapLabel('Kurdistan Region');
    greeted.current = false;
    greetId.current = null;
    queued.current = firstMessage?.trim() || null;
    let audio: MediaStream | undefined;
    if (withVoice) {
      try {
        audio = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        micStream.current = audio;
        micOnSession.current = true;
      } catch {
        withVoice = false;
        setNote('Microphone blocked, so we are typing. You can allow it later with the mic button.');
      }
    }
    setVoice(withVoice);
    if (!audio) { const s = silentStream(); silent.current = s; audio = s.stream; }

    let token = '', maxSeconds = 240;
    try {
      const r = await fetch('/api/shams-session/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.sessionToken) {
        const why = d.error === 'busy' ? 'Shams is talking to other visitors right now. Try again in a minute.'
          : d.error === 'rate_limited' ? 'You have had a few chats with Shams already. Come back in a few minutes.'
          : 'Shams could not connect just now. Please try again.';
        await end(why); setPhase('idle'); return;
      }
      token = d.sessionToken; maxSeconds = d.maxSeconds || 240;
    } catch {
      await end('Shams could not connect just now. Please try again.'); setPhase('idle'); return;
    }

    const { createClient, AnamEvent, MessageRole } = await import('@anam-ai/js-sdk');
    const c = createClient(token);
    client.current = c;
    setLeft(maxSeconds);

    c.registerToolCallHandler('show_places', {
      onStart: async (p) => {
        const ids = ((p.arguments?.place_ids as string[]) || []).filter((id) => placeById(id));
        if (!ids.length) throw new Error('No known places in that request');
        const cap = typeof p.arguments?.caption === 'string' ? p.arguments.caption.slice(0, 48) : '';
        setView({ kind: 'places', ids, caption: cap });
        setMapLabel(cap || ids.map((id) => placeById(id)!.name).slice(0, 3).join(', '));
        return `Pinned on the map: ${ids.map((id) => placeById(id)!.name).join(', ')}.`;
      },
    });
    c.registerToolCallHandler('book_call', {
      onStart: async (p) => {
        const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
        const book = { business: str(p.arguments?.business, 80), needs: str(p.arguments?.needs, 240), employee: str(p.arguments?.suggested_employee, 20) };
        commit([...store.current, { id: `book-${Date.now()}`, role: 'shams', text: '', book }]);
        return 'Booking card with the OCA booking link and phone number is now showing under the video.';
      },
    });
    c.registerToolCallHandler('show_plan', {
      onStart: async (p) => {
        const rawDays = (p.arguments?.days as { label: string; place_ids: string[] }[]) || [];
        const days = rawDays.map((d) => ({ label: String(d.label || '').slice(0, 40), ids: (d.place_ids || []).filter((id) => placeById(id)) })).filter((d) => d.ids.length);
        if (!days.length) throw new Error('No known places in that plan');
        const title = String(p.arguments?.title || 'Your plan').slice(0, 48);
        setView({ kind: 'plan', title, days });
        setMapLabel(title);
        commit([...store.current, { id: `plan-${Date.now()}`, role: 'shams', text: '', plan: { title, days: days.map((d) => ({ label: d.label, names: d.ids.map((id) => placeById(id)!.name) })) } }]);
        return `Plan drawn on the map with ${days.length} day(s).`;
      },
    });

    c.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (e) => {
      const role = e.role === MessageRole.PERSONA ? 'shams' : 'you';
      if (role === 'shams') { setThinking(false); setSpeaking(!e.endOfSpeech); goLive(); }
      if (role === 'you') lastActive.current = Date.now();
      const m = store.current;
      const i = m.findIndex((x) => x.id === e.id);
      if (i === -1) {
        if (e.content) {
          const first = role === 'shams' && !greetId.current;
          if (first) greetId.current = e.id;
          commit([...m, { id: e.id, role, text: first ? GREETING : e.content }]);
        }
      }
      else if (e.id === greetId.current) { /* greeting already shown in full */ }
      else { const next = m.slice(); next[i] = { ...next[i], text: next[i].text + e.content }; commit(next); }
      if (role === 'shams' && e.endOfSpeech) {
        lastActive.current = Math.max(lastActive.current, Date.now() - 20_000);
        if (!greeted.current) {
          greeted.current = true;
          const q = queued.current; queued.current = null;
          if (q) window.setTimeout(() => send(q), 250);
        }
      }
      if (role === 'you' && e.endOfSpeech) setThinking(true);
    });
    // The completed history is authoritative: it repairs any streamed chunk that arrived before we were listening.
    c.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (history) => {
      const byId = new Map(history.map((h) => [h.id, h.content]));
      let changed = false;
      const next = store.current.map((m) => { const full = byId.get(m.id); if (full && full !== m.text && m.id !== greetId.current) { changed = true; return { ...m, text: full }; } return m; });
      if (changed) commit(next);
    });
    c.addListener(AnamEvent.USER_SPEECH_STARTED, () => { setListening(true); lastActive.current = Date.now(); });
    c.addListener(AnamEvent.USER_SPEECH_ENDED, () => setListening(false));
    const goLive = () => {
      if (client.current !== c || phaseRef.current === 'live') return;
      phaseRef.current = 'live';
      setPhase('live');
      lastActive.current = Date.now();
      const v = video.current;
      if (v && v.paused) setNeedsTap(true);
      // If the greeting never finishes (muted autoplay), still send the queued question.
      window.setTimeout(() => { if (!greeted.current && queued.current) { greeted.current = true; const q = queued.current; queued.current = null; send(q); } }, 7000);
    };
    // The SDK event does not always fire, so the video element actually playing counts too.
    c.addListener(AnamEvent.VIDEO_PLAY_STARTED, goLive);
    video.current?.addEventListener('playing', goLive, { once: true });
    c.addListener(AnamEvent.CONNECTION_CLOSED, () => { if (client.current === c) void end(phaseRef.current === 'live' ? 'The session ended. Start again any time.' : 'Shams could not connect just now. Please try again.'); });

    try {
      window.setTimeout(() => { if (client.current === c && phaseRef.current === 'connecting') void end('Shams could not connect from this network. Please try again.'); }, 25_000);
      await c.streamToVideoElement('shams-video', audio);
      const v = video.current;
      if (v) { v.muted = false; v.play().catch(() => setNeedsTap(true)); }
    } catch {
      await end('Shams could not connect just now. Please try again.');
    }
  }, [end, send]);

  // Countdown, idle hang-up, away hang-up.
  useEffect(() => {
    if (phase !== 'live') return;
    const t = window.setInterval(() => {
      setLeft((s) => { if (s <= 1) { void end('That is the end of this demo session. Start again any time.'); return 0; } return s - 1; });
      const now = Date.now();
      if (!speaking && !listening && now - lastActive.current > IDLE_LIMIT_MS) void end('Shams hung up after a quiet minute to save your time. Start again any time.');
      if (awaySince.current && now - awaySince.current > AWAY_LIMIT_MS) void end('Shams hung up when you scrolled away. Start again any time.');
      if (hiddenSince.current && now - hiddenSince.current > AWAY_LIMIT_MS) void end('Shams hung up while the tab was hidden. Start again any time.');
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, speaking, listening, end]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { awaySince.current = e.isIntersecting ? null : awaySince.current ?? Date.now(); }, { threshold: 0.08 });
    io.observe(el);
    const vis = () => { hiddenSince.current = document.hidden ? Date.now() : null; };
    const bye = () => { void end(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', bye);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', bye); };
  }, [end]);

  const toggleMic = async () => {
    const c = client.current;
    if (!c) return;
    if (voice) { c.muteInputAudio(); setVoice(false); return; }
    if (micOnSession.current) { c.unmuteInputAudio(); setVoice(true); lastActive.current = Date.now(); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const id = s.getAudioTracks()[0]?.getSettings().deviceId;
      s.getTracks().forEach((t) => t.stop());
      if (id) await c.changeAudioInputDevice(id);
      c.unmuteInputAudio();
      micOnSession.current = true;
      setVoice(true); setNote(''); lastActive.current = Date.now();
    } catch {
      setNote('Microphone blocked. Allow it in your browser settings, or keep typing.');
    }
  };

  const submit = (text: string) => {
    if (phase === 'live') { send(text); setDraft(''); return; }
    if (phase === 'idle' || phase === 'ended') { setDraft(''); void start(false, text); }
  };

  const live = phase === 'live';
  const caption = [...msgs].reverse().find((m) => m.role === 'shams' && !m.plan && !m.book)?.text || '';
  const status = !live ? '' : listening ? 'Listening' : speaking ? 'Speaking' : thinking ? 'Thinking' : voice ? 'Your turn, just talk' : 'Your turn, type below';

  return (
    <section id="shams" ref={root} className={`section shams${live ? ' is-live' : ''}`} aria-labelledby="shams-h">
      <div className="anchor" data-core-anchor data-x="1.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ top: '0' }} />
      <div className="anchor" data-core-anchor data-x="1.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ bottom: '0' }} />

      <div className="shams-head">
        <div data-shams-reveal>
          <p className="kicker">Beyond the inbox</p>
          <h2 id="shams-h">Most AI reads your emails back to you.<br /><span>Ours looks you in the eye.</span></h2>
        </div>
        <div className="shams-lede" data-shams-reveal>
          <p>&ldquo;Good morning, you have 3 new emails&rdquo; is not the future. Meet Shams: a live AI with a face, a voice and real knowledge. Ask her to plan a trip to Kurdistan, or ask what an AI employee could do for your business. She answers out loud, drives the map and can set up your call with us.</p>
          <ul className="demo-points">
            <li><Check size={14} aria-hidden="true" /> Real-time video and voice, not a recording</li>
            <li><Check size={14} aria-hidden="true" /> Type or talk, in English or Arabic</li>
            <li><Check size={14} aria-hidden="true" /> Plans trips and drives the map as she speaks</li>
            <li><Check size={14} aria-hidden="true" /> Knows OCA and books your call</li>
          </ul>
        </div>
      </div>

      <div className="shams-stage" data-shams-reveal>
        <div ref={stageEl} className={`shams-screen phase-${phase}${noGl ? ' no-gl' : ''}${speaking ? ' is-speaking' : ''}`}>
          <div className="shams-holo-area">
            {!noGl && <ShamsHolo3D live={video} stage={stageEl} isLive={live} connecting={phase === 'connecting'} speaking={speaking} reduced={reduced} onFail={() => setNoGl(true)} />}
            {noGl && <img className="shams-still" src="/images/shams-poster.webp" alt="" aria-hidden="true" width={1152} height={768} />}
            <video id="shams-video" ref={video} className="shams-video" autoPlay playsInline aria-label="Shams, live AI video" />
            {live && showCap && caption && <p className="shams-caption" aria-hidden="true">{tidy(caption.length > 190 ? '…' + caption.slice(-190) : caption)}</p>}
            {needsTap && live && <button type="button" className="shams-tap" onClick={() => { video.current?.play().then(() => setNeedsTap(false)).catch(() => {}); }}><Volume2 size={18} aria-hidden="true" /> Tap to hear Shams</button>}
            {phase === 'connecting' && <div className="shams-connecting" aria-hidden="true"><i /><i /><i /></div>}
          </div>

          <div className="shams-controls">
            {live ? (
              <div className="shams-bar">
                <span className="shams-live"><i aria-hidden="true" />LIVE <b>{fmt(left)}</b></span>
                <span className="shams-status micro" aria-live="polite">{status}</span>
                <div className="shams-bar-actions">
                  <button type="button" className={`shams-round${voice ? ' on' : ''}`} onClick={toggleMic} aria-pressed={voice} aria-label={voice ? 'Mute microphone and type instead' : 'Talk with your microphone'}>{voice ? <Mic size={16} aria-hidden="true" /> : <MicOff size={16} aria-hidden="true" />}</button>
                  <button type="button" className="shams-round" onClick={() => void end('Session ended. Start again any time.')} aria-label="End the session"><X size={16} aria-hidden="true" /></button>
                </div>
              </div>
            ) : (
              <div className="shams-intro">
                <div className="shams-name">
                  <b>Shams</b>
                  <span className="micro">KURDISTAN &amp; OCA · LIVE AI</span>
                </div>
                <div className="shams-cta">
                  <button type="button" className="shams-btn primary" onClick={() => void start(true)} disabled={phase === 'connecting'}>
                    <Mic size={16} aria-hidden="true" /> {phase === 'connecting' ? 'Connecting…' : phase === 'ended' ? 'Talk again' : 'Talk to Shams'}
                  </button>
                  <button type="button" className="shams-btn ghost" onClick={() => void start(false)} disabled={phase === 'connecting'}>
                    <Keyboard size={16} aria-hidden="true" /> Type instead
                  </button>
                </div>
                <p className="micro shams-fine">Live session up to 4 minutes. Talking uses your microphone.</p>
              </div>
            )}
          </div>
        </div>

        <div className="shams-side">
          <div className="shams-map">
            <ShamsMap view={view} reduced={reduced} />
            <span className="shams-map-label micro"><MapPin size={12} aria-hidden="true" /> {mapLabel}</span>
          </div>

          <div className="shams-chat">
            <div className="shams-log" ref={list} role="log" aria-live="polite" aria-label="Conversation with Shams" tabIndex={0} data-lenis-prevent>
              {msgs.length === 0 && (
                <p className="shams-empty">{note || (phase === 'connecting' ? 'Connecting to Shams…' : 'Your conversation appears here. Start with a question below, or press Talk to Shams.')}</p>
              )}
              {msgs.map((m) => m.book ? (
                <div key={m.id} className="bubble desk shams-book">
                  <span className="micro">Your call with OCA</span>
                  {m.book.business && <p className="shams-book-biz">{m.book.business}</p>}
                  {m.book.needs && <p>{tidy(m.book.needs)}</p>}
                  {m.book.employee && m.book.employee !== 'Not sure yet' && <p className="shams-book-hire">Suggested first hire: <b>{m.book.employee}</b></p>}
                  <div className="shams-book-actions">
                    <a className="shams-btn primary" href={BOOK_URL} target="_blank" rel="noopener noreferrer">Book a call <ArrowUpRight size={15} aria-hidden="true" /></a>
                    <a className="text-link" href={`tel:${PHONE}`}><Phone size={14} aria-hidden="true" /> {PHONE_PRETTY}</a>
                  </div>
                  <span className="small muted">No commitment. A person from OCA takes it from here.</span>
                </div>
              ) : m.plan ? (
                <div key={m.id} className="bubble desk shams-plan">
                  <span className="micro">{m.plan.title}</span>
                  <ol>{m.plan.days.map((d) => <li key={d.label}><b>{d.label}</b> {d.names.join(', ')}</li>)}</ol>
                </div>
              ) : (
                <div key={m.id} className={m.role === 'you' ? 'bubble you' : 'bubble desk'} dir="auto"><p>{tidy(m.text)}</p></div>
              ))}
              {thinking && <div className="bubble desk typing" aria-label="Shams is thinking"><i /><i /><i /></div>}
              {msgs.length > 0 && note && <p className="shams-note">{note}</p>}
            </div>
            <div className="chat-chips shams-chips">
              {CHIPS.map((c) => <button key={c} type="button" dir="auto" onClick={() => submit(c)} disabled={phase === 'connecting'}>{c}</button>)}
            </div>
            <form className="chat-input" onSubmit={(e) => { e.preventDefault(); submit(draft); }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} dir="auto" placeholder={live ? 'Ask about Kurdistan or OCA' : 'Ask a question to start'} aria-label="Your message to Shams" maxLength={400} autoComplete="off" disabled={phase === 'connecting'} />
              <button type="submit" className="send" aria-label="Send" disabled={phase === 'connecting' || !draft.trim()}><Send size={16} aria-hidden="true" /></button>
            </form>
          </div>
        </div>
      </div>
      <p className="micro muted shams-legal">AI-generated character and voice. Conversations are processed by our avatar provider to run the session. Check official travel advice before you go.</p>
    </section>
  );
}
