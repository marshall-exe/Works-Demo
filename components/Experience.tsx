'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  ArrowUpRight, ArrowDown, ArrowRight, ArrowUp, Check, MessageSquare, Receipt, Star, Phone, Search as SearchIcon, Package,
  ChartNoAxesCombined, ShieldCheck, Plus, Settings2, X, Send, Clock3, Menu, Sun, Moon, MessageCircle, CalendarCheck,
} from 'lucide-react';
import { moments, employees, buildSteps, why, faqs, industries, type Industry } from '../lib/content';
import Circuit from './Circuit';
import Search from './Search';
import Demo from './Demo';
import Calculator from './Calculator';
import Compare from './Compare';

const CoreScene = dynamic(() => import('./CoreScene'), { ssr: false });

const icons = { brief: ChartNoAxesCombined, message: MessageSquare, star: Star, phone: Phone, search: SearchIcon, receipt: Receipt, chart: ChartNoAxesCombined, package: Package };
const employeeIcons = [MessageSquare, Receipt, Star, SearchIcon, Package, Send];

const UTM = 'utm_source=oca-hermes&utm_medium=website&utm_campaign=homepage';
const withUtm = (url: string) => (url ? url + (url.includes('?') ? '&' : '?') + UTM : url);
const CALENDLY = withUtm(process.env.NEXT_PUBLIC_CALENDLY_URL || '');
const BOOK_FALLBACK = withUtm('https://oneclickaway.io/book');
const NEWSLETTER = process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT || '';
const LEADS = process.env.NEXT_PUBLIC_LEAD_ENDPOINT || ''; // 'demo' simulates success on previews
const PHONE = '+971565354435'; // Published on oneclickaway.io
const PHONE_PRETTY = '+971 56 535 4435';

type Theme = 'dark' | 'light';

function Brand() {
  return (
    <a href="#top" className="brand" aria-label="One Click Away, back to top">
      <span className="brand-dot" aria-hidden="true" />
      <span className="brand-name">OCA</span>
    </a>
  );
}
function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="kicker">{children}</p>;
}
const pulse = () => window.dispatchEvent(new Event('oca:pulse'));

// Name + WhatsApp number. Posted as JSON to NEXT_PUBLIC_LEAD_ENDPOINT; hidden when no endpoint is set.
function LeadForm({ industry }: { industry: Industry }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error' | 'invalid'>('idle');
  if (!LEADS) return null;
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const digits = String(fd.get('whatsapp') || '').replace(/[^\d+]/g, '');
    const ok = /^\+?\d{9,15}$/.test(digits);
    if (!name || !ok) { setState('invalid'); return; }
    setState('sending');
    if (LEADS === 'demo') { setTimeout(() => setState('done'), 600); return; }
    try {
      const r = await fetch(LEADS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, whatsapp: digits, industry: industry.id, source: 'oca-hermes-homepage', page: location.href }) });
      setState(r.ok ? 'done' : 'error');
    } catch { setState('error'); }
  };
  if (state === 'done') return <p className="lead-ok" role="status"><Check size={16} aria-hidden="true" /> Got it. A person from OCA will message you on WhatsApp within one working day.{LEADS === 'demo' && <span className="micro muted"> PREVIEW: NOTHING WAS SENT</span>}</p>;
  return (
    <form className="lead" onSubmit={submit} aria-label="Ask OCA to message you on WhatsApp" noValidate>
      <div className="lead-head"><span className="micro">PREFER WHATSAPP?</span><p>Leave your number. A person from OCA messages you, not a bot.</p></div>
      <div className="lead-row">
        <label className="sr-only" htmlFor="lead-name">Your name</label>
        <input id="lead-name" name="name" type="text" required placeholder="Your name" autoComplete="name" maxLength={80} />
        <label className="sr-only" htmlFor="lead-wa">Your WhatsApp number</label>
        <input id="lead-wa" name="whatsapp" type="tel" required placeholder="+971 5X XXX XXXX" autoComplete="tel" inputMode="tel" maxLength={24} />
        <button className="button red" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending' : 'Message me'} <MessageCircle size={15} aria-hidden="true" /></button>
      </div>
      {state === 'invalid' && <p className="news-err" role="alert">Add your name and a WhatsApp number with the country code, like +971 5X XXX XXXX.</p>}
      {state === 'error' && <p className="news-err" role="alert">That did not go through. Call {PHONE_PRETTY} instead.</p>}
      <p className="small muted">Used once, to reach you about your first AI employee. No list, no newsletter.</p>
    </form>
  );
}

export default function Experience({ updated }: { updated: string }) {
  const [reduced, setReduced] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [settings, setSettings] = useState(false);
  const [contact, setContact] = useState(false);
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [moment, setMoment] = useState(1);
  const [scenario, setScenario] = useState(0);
  const [approval, setApproval] = useState<'pending' | 'approved' | 'assigned'>('pending');
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [cookie, setCookie] = useState(false);
  const [news, setNews] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [industryId, setIndustryId] = useState('pet');
  const accessDialog = useRef<HTMLDialogElement>(null);
  const contactDialog = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const industry = industries.find((i) => i.id === industryId) || industries[2];
  const still = reduced || webgl === false; // still image instead of the live core
  const m = moment === 1 ? { ...moments[1], ...industry.booking, incoming: industry.booking.incoming } : moments[moment];
  const MomentIcon = icons[m.icon];

  // Preferences: system first, then the visitor's saved choice.
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let saved: string | null = null, savedContrast: string | null = null, savedTheme: string | null = null, seen: string | null = null, savedInd: string | null = null;
    try { saved = localStorage.getItem('oca-motion'); savedContrast = localStorage.getItem('oca-contrast'); savedTheme = localStorage.getItem('oca-theme'); seen = localStorage.getItem('oca-notice'); savedInd = localStorage.getItem('oca-industry'); } catch {}
    const r = saved ? saved === 'reduce' : media.matches;
    setReduced(r);
    setContrast(savedContrast === 'high');
    setTheme(savedTheme === 'light' ? 'light' : 'dark');
    setCookie(!seen);
    if (savedInd && industries.some((i) => i.id === savedInd)) setIndustryId(savedInd);
    if (r) setLoaded(true);
    const change = () => { try { if (!localStorage.getItem('oca-motion')) setReduced(media.matches); } catch { setReduced(media.matches); } };
    media.addEventListener('change', change);
    const t = setTimeout(() => setLoaded(true), 2600); // Loader never blocks longer than this.
    return () => { media.removeEventListener('change', change); clearTimeout(t); };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced);
    document.documentElement.classList.toggle('high-contrast', contrast);
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('still', still);
    if (reduced) setLoaded(true);
  }, [reduced, contrast, theme, still]);

  // Header state, scroll progress, back-to-top.
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        setShowTop(y > innerHeight * 1.2);
        const max = document.documentElement.scrollHeight - innerHeight;
        if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);

  // Keyboard shortcut for search.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch((s) => !s); }
      if (e.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  // Smooth scroll and scroll-driven choreography.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = reduced ? null : new Lenis({ duration: 0.85, smoothWheel: true, anchors: { offset: -72 } });
    // One scroll helper for buttons and search, so Lenis and native scrolling never fight.
    const goTo = (e: Event) => {
      const target = (e as CustomEvent).detail as HTMLElement | number;
      if (lenis) lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : -72, duration: 1.1 });
      else if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'auto' });
      else target.scrollIntoView({ block: 'start' });
    };
    window.addEventListener('oca:scrollto', goTo);
    const tick = (time: number) => lenis?.raf(time * 1000);
    if (lenis) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0); }
    const ctx = gsap.context(() => {
      if (reduced) return;
      gsap.from('.hero-copy > *', { y: 26, opacity: 0, duration: 1.1, stagger: 0.09, ease: 'power3.out', delay: 1.3 });
      gsap.to('.hero-copy', { opacity: 0, y: -50, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: '6% top', scrub: 0.3 } });
      gsap.to('.hero-side', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: '5% top', scrub: 0.3 } });
      const stage = (sel: string, inStart: number, inEnd: number, outStart: number, outEnd: number) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.35 } });
        tl.fromTo(sel, { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: 'none', duration: inEnd - inStart }, inStart)
          .to(sel, { opacity: 0, y: -20, ease: 'none', duration: outEnd - outStart }, outStart);
        tl.to({}, { duration: 1 - outEnd }, outEnd);
      };
      stage('.hero-stage-1', 0.07, 0.12, 0.2, 0.26);
      stage('.hero-stage-2', 0.33, 0.39, 0.49, 0.54);
      stage('.hero-stage-3', 0.7, 0.75, 0.82, 0.86);
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((e) => {
        gsap.from(e, { y: 34, opacity: 0, duration: 1, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: e, start: 'top 90%', once: true } });
      });
      gsap.to('.frame-mask', { scale: 0.86, borderRadius: 22, ease: 'none', scrollTrigger: { trigger: '#frame', start: 'top top', end: 'bottom bottom', scrub: 0.35 } });
      gsap.fromTo('.frame-mask img', { scale: 1.18, xPercent: -4 }, { scale: 1.02, xPercent: 0, ease: 'none', scrollTrigger: { trigger: '#frame', start: 'top top', end: 'bottom bottom', scrub: 0.35 } });
    });
    const refresh = () => ScrollTrigger.refresh();
    document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);
    return () => { ctx.revert(); gsap.ticker.remove(tick); lenis?.destroy(); window.removeEventListener('load', refresh); window.removeEventListener('oca:scrollto', goTo); };
  }, [reduced]);

  // Native dialogs with focus return.
  const useDialog = (ref: React.RefObject<HTMLDialogElement | null>, open: boolean) => {
    useEffect(() => {
      const d = ref.current; if (!d) return;
      if (open && !d.open) { lastFocus.current = document.activeElement as HTMLElement; d.showModal(); }
      if (!open && d.open) { d.close(); lastFocus.current?.focus(); }
    }, [ref, open]);
  };
  useDialog(accessDialog, settings);
  useDialog(contactDialog, contact);

  const book = useCallback(() => {
    if (CALENDLY) window.open(CALENDLY, '_blank', 'noopener,noreferrer');
    else setContact(true);
  }, []);
  const save = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
  const setMotion = (reduce: boolean) => { setReduced(reduce); save('oca-motion', reduce ? 'reduce' : 'full'); };
  const setHighContrast = (high: boolean) => { setContrast(high); save('oca-contrast', high ? 'high' : 'normal'); };
  const toggleTheme = () => { const next: Theme = theme === 'dark' ? 'light' : 'dark'; setTheme(next); save('oca-theme', next); };
  const pickIndustry = (id: string) => { setIndustryId(id); save('oca-industry', id); setApproval('pending'); pulse(); };
  const onReady = useCallback((ok: boolean) => { setWebgl(ok); setTimeout(() => setLoaded(true), ok ? 150 : 0); }, []);
  const toTop = () => window.dispatchEvent(new CustomEvent('oca:scrollto', { detail: 0 }));

  async function subscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!NEWSLETTER) return;
    const fd = new FormData(e.currentTarget);
    setNews('sending');
    try {
      const r = await fetch(NEWSLETTER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fd.get('email'), source: 'oca-hermes-homepage' }) });
      setNews(r.ok ? 'done' : 'error');
    } catch { setNews('error'); }
  }

  const heroPoints = [industry.point, 'Built, trained and run by OCA. Nothing for you to manage', 'Refunds, complaints and anything sensitive go to a person'];

  return (
    <>
      <a className="skip-link" href="#day">Skip to content</a>
      <div className={loaded ? 'loader done' : 'loader'} aria-hidden={loaded}>
        <span className="loader-dot" /><span className="loader-word">OCA</span>
      </div>
      <div className="progress" aria-hidden="true"><span ref={progress} /></div>
      {!reduced && <CoreScene onReady={onReady} />}
      {!still && <div className="core-light" aria-hidden="true" />}

      <header className={scrolled ? 'nav scrolled' : 'nav'}>
        <Brand />
        <nav id="primary-nav" className={menu ? 'primary open' : 'primary'} aria-label="Primary">
          <a onClick={() => setMenu(false)} href="#workforce">Employees</a>
          <a onClick={() => setMenu(false)} href="#demo">Try it</a>
          <a onClick={() => setMenu(false)} href="#pricing">Pricing</a>
          <a onClick={() => setMenu(false)} href="#faq">Questions</a>
        </nav>
        <div className="nav-tools">
          <button className="icon-button" onClick={() => setSearch(true)} aria-label="Search this page (Ctrl K)"><SearchIcon size={17} aria-hidden="true" /></button>
          <button className="icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={theme === 'light'}>{theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}</button>
          <button className="nav-cta" onClick={book}>Book a call <ArrowUpRight size={15} aria-hidden="true" /></button>
          <button className="menu-button" aria-expanded={menu} aria-controls="primary-nav" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu(!menu)}>
            {menu ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main id="top">
        {/* 1. Hero */}
        <section id="hero" className="hero" aria-label="Introduction">
          <div className="hero-sticky">
            {still && <img className="hero-fallback" src="/images/hermes-core.webp" srcSet="/images/hermes-core-1200.webp 1200w, /images/hermes-core.webp 2200w" sizes="100vw" fetchPriority="high" alt="The Hermes Core: four interlocking loops of smoked glass and brushed titanium around a crimson signal" />}
            <div className="hero-copy">
              <Kicker>Managed AI employees for UAE service businesses</Kicker>
              <div className="industry" role="group" aria-label="Pick your kind of business">
                <span className="micro muted">I RUN A</span>
                {industries.map((i) => <button key={i.id} className={i.id === industry.id ? 'active' : ''} aria-pressed={i.id === industry.id} onClick={() => pickIndustry(i.id)}>{i.label}</button>)}
              </div>
              <h1 key={industry.id}>{industry.headline[0]}<br />{industry.headline[1]}<br />{industry.headline[2]}<br /><span>{industry.headline[3]}</span></h1>
              <ul className="hero-points">
                {heroPoints.map((p) => <li key={p}><Check size={14} aria-hidden="true" /> {p}</li>)}
              </ul>
              <div className="hero-actions">
                <button className="button red" onClick={book}>Book a call, see your first AI employee <ArrowUpRight size={17} aria-hidden="true" /></button>
                <a className="text-link" href="#demo">Try the front desk <ArrowDown size={15} aria-hidden="true" /></a>
              </div>
              <p className="hero-proof">Already running the WhatsApp front desk of a pet-care business in Abu Dhabi. <a href="#proof">See how</a></p>
            </div>
            <div className="hero-side" aria-hidden="true">
              <span className="micro">HERMES CORE</span>
              <span>Four systems. One employee.<br />Move your cursor.</span>
            </div>
            <div className="hero-stage hero-stage-1" aria-hidden="true">
              <span className="micro">INSIDE THE CORE</span>
              <h2>Front desk. Sales.<br />Content. Operations.</h2>
            </div>
            <div className="hero-stage hero-stage-2" aria-hidden="true">
              <span className="micro">THE CIRCUIT</span>
              <h2>Every message read,<br />routed and confirmed.</h2>
            </div>
            <div className="hero-stage hero-stage-3" aria-hidden="true">
              <span className="micro">NOTHING LEFT ON YOUR DESK</span>
            </div>
            <div className="hero-footer" aria-hidden="true">
              <span>MANAGED AI EMPLOYEES</span>
              <span className="hero-hint">SCROLL TO OPEN THE CORE <ArrowDown size={12} /></span>
              <span>DUBAI, UAE</span>
            </div>
          </div>
          <div className="anchor" id="a-hero" data-core-anchor data-x=".72" data-y=".5" data-scale="1.12" data-mobile-x=".5" data-mobile-y=".2" data-mobile-scale=".5" style={{ top: '50svh' }} />
          <div className="anchor" id="a-hero-end" data-core-anchor data-x=".72" data-y=".5" data-scale="1.12" data-mobile-x=".5" data-mobile-y=".2" data-mobile-scale=".5" style={{ top: 'calc(100% - 50svh)' }} />
        </section>

        {/* 2. A day, handled */}
        <section id="day" className="section day" aria-labelledby="day-h">
          <div className="anchor" data-core-anchor data-x=".8" data-y=".38" data-scale=".3" data-mobile-x=".86" data-mobile-y=".2" data-mobile-scale=".14" style={{ top: '38vh' }} />
          <div className="section-top" data-reveal><Kicker>01 / A day, handled</Kicker></div>
          <div className="day-heading" data-reveal>
            <h2 id="day-h">One day.<br /><span>Eight jobs you did not do.</span></h2>
            <p>Tap a time. Each one is a real type of job your AI employee finishes without you.</p>
          </div>
          <div className="day-panel" data-reveal data-lit>
            <div className="time-nav" role="tablist" aria-label="Moments in the day">
              {moments.map((it, i) => (
                <button key={it.time} role="tab" id={`tab-${i}`} aria-selected={moment === i} aria-controls="day-screen" tabIndex={moment === i ? 0 : -1} onClick={() => { setMoment(i); pulse(); }} className={moment === i ? 'active' : ''}
                  onKeyDown={(e) => { if (e.key === 'ArrowRight') setMoment((moment + 1) % moments.length); if (e.key === 'ArrowLeft') setMoment((moment + moments.length - 1) % moments.length); }}>
                  <span>{it.time}</span><i aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="day-screen" id="day-screen" role="tabpanel" aria-labelledby={`tab-${moment}`} key={moment + industry.id}>
              <div className="day-time">{m.time}<small>GST</small></div>
              <div className="day-task">
                <div className="task-head"><MomentIcon size={18} aria-hidden="true" /><span>{m.agent}: {m.title}</span><span className="demo-tag">DEMO</span></div>
                <div className="incoming"><span className="micro">INCOMING</span><p>“{m.incoming}”</p></div>
                <div className="processing-line"><span /><span className="micro">HERMES ROUTES IT</span><ArrowDown size={15} aria-hidden="true" /></div>
                <div className="outgoing"><span className="micro"><Check size={12} aria-hidden="true" /> HANDLED</span><h3>{m.handled}</h3><p>{m.detail}</p></div>
              </div>
            </div>
            <div className="day-bottom">
              <span className="muted small">Illustrative moments, not a live feed.</span>
              <button className="text-link" onClick={() => { setMoment((moment + 1) % moments.length); pulse(); }}>Next moment <ArrowRight size={15} aria-hidden="true" /></button>
            </div>
          </div>
        </section>

        {/* 3. Employees: the core splits into six */}
        <section id="workforce" className="section workforce" aria-labelledby="work-h">
          <div className="anchor" data-core-anchor data-x=".84" data-y=".55" data-scale=".34" data-mobile-x=".8" data-mobile-y=".14" data-mobile-scale=".16" style={{ top: '55vh' }} />
          <div className="section-top" data-reveal><Kicker>02 / The employees</Kicker></div>
          <h2 id="work-h" data-reveal>Six roles.<br /><span>Start with the one that hurts most.</span></h2>
          <p className="micro muted work-note" data-reveal>HIRE ONE. ADD THE NEXT WHEN YOU ARE READY.</p>
          <ul className="employee-grid">
            {employees.map((e, i) => {
              const Icon = employeeIcons[i];
              return (
                <li className={still ? 'employee still' : 'employee'} key={e.name} data-reveal data-lit>
                  <div className="employee-head">
                    <span className="employee-index">0{i + 1}</span>
                    <span className="employee-glyph" data-core-clone><Icon size={20} strokeWidth={1.5} aria-hidden="true" /></span>
                  </div>
                  <h3>{e.name}</h3>
                  <span className="role">{e.role}</span>
                  <ul className="employee-tasks">{e.tasks.map((t) => <li key={t}><Check size={12} aria-hidden="true" />{t}</li>)}</ul>
                  <span className="micro muted">{e.tools}</span>
                  <span className="rule-line"><ShieldCheck size={12} aria-hidden="true" /> {e.rule}</span>
                </li>
              );
            })}
          </ul>
          <div className="anchor" data-core-anchor data-x=".5" data-y=".55" data-scale=".3" data-mobile-x=".5" data-mobile-y=".5" data-mobile-scale=".16" style={{ bottom: '0' }} />
        </section>

        {/* 4. Circuit */}
        <section id="circuit" className="section circuit" aria-labelledby="circuit-h">
          <div className="section-top" data-reveal><Kicker>03 / How it works</Kicker><span className="micro muted">ONE MANAGER. MANY SPECIALISTS.</span></div>
          <div className="circuit-intro" data-reveal>
            <h2 id="circuit-h">One message in.<br /><span>One job done.</span></h2>
            <p>Hermes reads the message, hands it to the right specialist and confirms back to your customer. Pick a message and watch the route.</p>
          </div>
          <Circuit scenario={scenario} onSelect={(i) => { setScenario(i); pulse(); }} booking={{ input: industry.booking.scenario, steps: industry.booking.steps, result: industry.booking.result }} />
        </section>

        {/* 5. Try it */}
        <section id="demo" className="section demo" aria-labelledby="demo-h">
          <div className="anchor" data-core-anchor data-x="1.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ top: '0' }} />
          <div className="anchor" data-core-anchor data-x="1.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ bottom: '0' }} />
          <div className="demo-copy" data-reveal>
            <Kicker>04 / Try the front desk</Kicker>
            <h2 id="demo-h">Message it<br /><span>like a customer would.</span></h2>
            <p>Ask to book, ask the price, ask the hours. Then try a complaint and watch it stop and hand over. The replies are scripted for the {industry.label.toLowerCase()} example; the live version is trained on your business.</p>
            <ul className="demo-points">
              <li><Check size={14} aria-hidden="true" /> Books, quotes and answers without you</li>
              <li><Check size={14} aria-hidden="true" /> Stops on refunds, complaints and anything sensitive</li>
              <li><Check size={14} aria-hidden="true" /> Arabic in, Arabic out</li>
            </ul>
          </div>
          <div data-reveal><Demo industry={industry} /></div>
        </section>

        {/* 6. Managed */}
        <section id="managed" className="section managed" aria-labelledby="managed-h">
          <div className="anchor" data-core-anchor data-x=".92" data-y=".22" data-scale=".28" data-mobile-x=".88" data-mobile-y=".18" data-mobile-scale=".14" style={{ top: '22vh' }} />
          <Kicker>05 / A managed service</Kicker>
          <div className="managed-head">
            <h2 id="managed-h">We build it.<br />We run it.<br /><span>You get on with it.</span></h2>
            <div data-reveal>
              <p>After launch it is our job, not yours. We watch it daily, fix what breaks and improve it every month.</p>
              <span className="micro">NO TOOL TO LEARN. NO AI TO MANAGE.</span>
            </div>
          </div>
          <ol className="process" data-reveal>
            {buildSteps.map(([title, desc], i) => <li key={title} data-lit><span className="micro">0{i + 1}</span><h3>{title}</h3><p>{desc}</p></li>)}
          </ol>
        </section>

        {/* 7. Human in the loop */}
        <section id="human" className="section human" aria-labelledby="human-h">
          <div className="anchor" data-core-anchor data-x=".24" data-y=".84" data-scale=".2" data-mobile-scale="0" data-mobile-x="1.2" style={{ top: '50%' }} />
          <div className="human-copy" data-reveal>
            <Kicker>06 / Your call stays yours</Kicker>
            <h2 id="human-h">The AI does the routine.<br /><span>You keep the final say.</span></h2>
            <p>Refunds, angry customers, medical, legal or money questions and anything unclear stop and wait for a person. Try it on the right.</p>
            <div className="rule"><ShieldCheck size={17} aria-hidden="true" /><span>Your rules. Your approvals. Written down before launch.</span></div>
          </div>
          <div className="approval" data-reveal data-lit key={industry.id}>
            <div className="approval-header"><span className="micro">HERMES / FRONT DESK</span><span className={approval === 'pending' ? 'pending' : 'done'}><i aria-hidden="true" />{approval === 'pending' ? 'NEEDS YOUR CALL' : 'DEMO UPDATED'}</span></div>
            <div className="approval-message"><MessageSquare size={18} aria-hidden="true" /><p>“{industry.approval.message}”</p></div>
            <div className="approval-draft"><span className="micro">DRAFTED. NOT SENT.</span><p>“{industry.approval.draft}”</p></div>
            <ul className="approval-log">
              <li><Check size={12} aria-hidden="true" /> Message received</li>
              <li><Check size={12} aria-hidden="true" /> Reply drafted in your voice</li>
              <li><Clock3 size={12} aria-hidden="true" /> {industry.approval.rule}</li>
            </ul>
            <div className="approval-actions">
              <button className="button red" onClick={() => { setApproval('approved'); pulse(); }} disabled={approval !== 'pending'}>Approve draft <Check size={14} aria-hidden="true" /></button>
              <button className="button ghost" onClick={() => { setApproval('assigned'); pulse(); }} disabled={approval !== 'pending'}>I will take it <ArrowUpRight size={14} aria-hidden="true" /></button>
              {approval !== 'pending' && <button className="text-link" onClick={() => setApproval('pending')}>Reset demo</button>}
            </div>
            <p className="demo-notice" role="status" aria-live="polite">
              {approval === 'pending' ? 'Interactive example. Nothing is sent.' : approval === 'approved' ? 'Demo: approved. Live, Hermes would send it now.' : 'Demo: assigned to your team. Hermes stands down.'}
            </p>
          </div>
        </section>

        {/* 8. Proof */}
        <section id="proof" className="section proof" aria-labelledby="proof-h">
          <div className="anchor" data-core-anchor data-x="1.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ top: '0' }} />
          <div className="proof-visual" data-reveal>
            <img src="/images/hermes-exploded.webp" srcSet="/images/hermes-exploded-1200.webp 1200w, /images/hermes-exploded.webp 2200w" sizes="(max-width: 900px) 100vw, 55vw" alt="The Hermes Core opened: four black ceramic arcs around a glass heart" loading="lazy" width={2200} height={1244} />
            <div className="proof-overlay">
              <div className="mini-thread" aria-label="Example WhatsApp conversation">
                <div><span className="avatar" aria-hidden="true">M</span><b>Mochi’s booking</b><span className="micro">EXAMPLE</span></div>
                <p>Saturday at 10:00 works?</p>
                <p className="reply">Booked. Your AED 50 deposit link is ready. <Check size={12} aria-hidden="true" /></p>
              </div>
            </div>
          </div>
          <div className="proof-copy" data-reveal>
            <Kicker>07 / In use today</Kicker>
            <h2 id="proof-h">27 unread messages<br /><span>became one calm thread.</span></h2>
            <span className="micro proof-location">PET CARE, ABU DHABI</span>
            <p>Bookings, pet questions and deposit chasing lived in one overloaded WhatsApp. OCA built and now runs the AI front desk: it answers, books, collects the deposit and hands sensitive cases to the team.</p>
            <p className="small muted">Anonymised at the client’s request. Results depend on your volume and scope.</p>
          </div>
        </section>

        {/* 9. Cinematic frame */}
        <section id="frame" className="frame" aria-label="AI, handled">
          <div className="anchor" data-core-anchor data-x="1.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ top: '0' }} />
          <div className="frame-sticky">
            <div className="frame-mask">
              <img src="/images/hermes-prism.webp" srcSet="/images/hermes-prism-1200.webp 1200w, /images/hermes-prism.webp 2200w" sizes="100vw" alt="The Hermes routing prism: stacked smoked glass plates with a crimson signal through the center" loading="lazy" width={2200} height={1244} />
              <div className="frame-shade" aria-hidden="true" />
              <span className="frame-kicker micro">THE HERMES CORE</span>
              <div className="frame-title"><h2>AI, handled.</h2><span>LESS ON YOUR DESK. MORE IN YOUR DAY.</span></div>
            </div>
          </div>
          <div className="anchor" data-core-anchor data-x="1.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ bottom: '0' }} />
        </section>

        {/* 10. Why OCA */}
        <section id="why" className="section why" aria-labelledby="why-h">
          <div className="anchor" data-core-anchor data-x=".9" data-y=".25" data-scale=".24" data-mobile-x=".88" data-mobile-y=".18" data-mobile-scale=".14" style={{ top: '25vh' }} />
          <Kicker>08 / Why OCA</Kicker>
          <h2 id="why-h" data-reveal>Not another tool.<br /><span>A team that runs it.</span></h2>
          <ul className="why-list">
            {why.map(([title, copy], i) => <li key={title} data-reveal data-lit><span className="micro">0{i + 1}</span><h3>{title}</h3><p>{copy}</p></li>)}
          </ul>
        </section>

        {/* 11. Compare */}
        <section id="compare" className="section compare-section" aria-labelledby="compare-h">
          <div className="anchor" data-core-anchor data-x="1.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ top: '0' }} />
          <div className="anchor" data-core-anchor data-x="1.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ bottom: '0' }} />
          <Kicker>09 / Chatbot, AI employee or receptionist</Kicker>
          <div className="compare-head" data-reveal>
            <h2 id="compare-h">Same question,<br /><span>three very different answers.</span></h2>
            <p>A chatbot replies. A receptionist works office hours. An AI employee by OCA does the job around the clock and knows when to stop.</p>
          </div>
          <div data-reveal><Compare /></div>
        </section>

        {/* 12. Calculator */}
        <section id="calc" className="section calc-section" aria-labelledby="calc-h">
          <div className="anchor" data-core-anchor data-x=".9" data-y=".22" data-scale=".22" data-mobile-x=".88" data-mobile-y=".14" data-mobile-scale=".12" style={{ top: '22vh' }} />
          <Kicker>10 / What silence costs</Kicker>
          <div className="calc-head" data-reveal>
            <h2 id="calc-h">Every unanswered message<br /><span>has a price. Put in yours.</span></h2>
            <p>Three numbers you already know. Move the sliders or type exact figures. Nothing here is stored.</p>
          </div>
          <div data-reveal><Calculator industry={industry} /></div>
        </section>

        {/* 13. Pricing */}
        <section id="pricing" className="section pricing" aria-labelledby="pricing-h">
          <div className="anchor" data-core-anchor data-x=".26" data-y=".7" data-scale=".24" data-mobile-x=".88" data-mobile-y=".18" data-mobile-scale=".14" style={{ top: '55%' }} />
          <Kicker>11 / Pricing</Kicker>
          <div className="pricing-main" data-reveal>
            <h2 id="pricing-h">One employee.<br /><span>One clear price.</span></h2>
            <div className="price" data-lit>
              <span className="micro">ONE-TIME BUILD FROM</span>
              <div className="price-figure"><small>AED</small>15,000</div>
              <p>Then a monthly management fee, agreed with the scope before we build. It covers daily operation, monitoring, fixes and monthly improvements.</p>
              <button className="button red" onClick={book}>Book a call, get a scoped quote <ArrowUpRight size={17} aria-hidden="true" /></button>
              <span className="small muted">No commitment on the call.</span>
            </div>
          </div>
          <div className="pricing-columns" data-reveal>
            <div><span className="micro">THE BUILD</span><p>Discover, design, train, connect, test, launch.</p></div>
            <div><span className="micro">THE MONTHLY FEE</span><p>Monitor, maintain, report, tune, support, improve.</p></div>
            <div><span className="micro">OWNERSHIP</span><p>Your accounts. Your rules. Your system.</p></div>
          </div>
        </section>

        {/* FAQ: objections, before the last CTA */}
        <section id="faq" className="section faq" aria-labelledby="faq-h">
          <div className="anchor" data-core-anchor data-x="-.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ top: '0' }} />
          <div className="anchor" data-core-anchor data-x="-.2" data-y=".5" data-scale=".02" data-mobile-scale="0" style={{ bottom: '0' }} />
          <Kicker>12 / Before you book</Kicker>
          <div className="faq-layout">
            <h2 id="faq-h">The questions<br /><span>every owner asks.</span></h2>
            <div>
              {faqs.map(([q, a]) => (
                <details key={q}><summary>{q}<Plus size={16} aria-hidden="true" /></summary><p>{a}</p></details>
              ))}
            </div>
          </div>
        </section>

        {/* 14. Final CTA */}
        <section className="section final" id="contact" aria-labelledby="final-h">
          <div className="anchor" data-core-anchor data-x=".86" data-y=".64" data-scale=".55" data-mobile-x=".74" data-mobile-y=".72" data-mobile-scale=".28" style={{ top: '0' }} />
          <Kicker>Your next hire</Kicker>
          <h2 id="final-h" data-reveal>Book a call.<br /><span>Leave with a plan for your first AI employee.</span></h2>
          <div className="final-actions">
            <button className="button light" onClick={book}>Book a call <ArrowUpRight size={18} aria-hidden="true" /></button>
            <a className="text-link" href={`tel:${PHONE}`}><Phone size={14} aria-hidden="true" /> {PHONE_PRETTY}</a>
          </div>
          <LeadForm industry={industry} />
          {NEWSLETTER && (
            <form className="newsletter" onSubmit={subscribe} aria-label="Monthly notes">
              <label htmlFor="news-email">One email a month: what AI employees are doing for UAE businesses.</label>
              {news === 'done' ? (
                <p className="news-ok" role="status"><Check size={14} aria-hidden="true" /> You are on the list. First note lands next month.</p>
              ) : (
                <div className="news-row">
                  <input id="news-email" name="email" type="email" required placeholder="you@business.ae" autoComplete="email" />
                  <button className="button ghost" type="submit" disabled={news === 'sending'}>{news === 'sending' ? 'Sending' : 'Subscribe'}</button>
                </div>
              )}
              {news === 'error' && <p className="news-err" role="alert">That did not go through. Try again or call us.</p>}
            </form>
          )}
          <div className="final-bottom">
            <Brand />
            <span className="micro">BUILT AND RUN IN THE UAE</span>
            <span className="micro">LAST UPDATED {updated}</span>
            <span className="micro">© {new Date().getFullYear()} ONE CLICK AWAY</span>
          </div>
        </section>
      </main>

      <div className="float-stack">
        <button className={showTop ? 'float-button show' : 'float-button'} onClick={toTop} aria-label="Back to top" tabIndex={showTop ? 0 : -1}><ArrowUp size={18} aria-hidden="true" /></button>
        <button className="float-button" onClick={() => setContact(true)} aria-haspopup="dialog" aria-label="Contact OCA"><MessageCircle size={18} aria-hidden="true" /></button>
        <button className="float-button" onClick={() => setSettings(true)} aria-haspopup="dialog" aria-label="Display settings"><Settings2 size={18} aria-hidden="true" /></button>
      </div>

      <div className={scrolled ? 'mobile-bar show' : 'mobile-bar'} aria-label="Quick actions">
        <button className="button red" onClick={book}><CalendarCheck size={16} aria-hidden="true" /> Book a call</button>
        <a className="button ghost" href={`tel:${PHONE}`}><Phone size={16} aria-hidden="true" /> Call</a>
      </div>

      {cookie && (
        <div className="notice" role="region" aria-label="Privacy notice">
          <p>This site stores your display choices in your browser. No tracking cookies.</p>
          <button className="button ghost" onClick={() => { setCookie(false); save('oca-notice', '1'); }}>OK</button>
        </div>
      )}

      <Search open={search} onClose={() => setSearch(false)} />

      <dialog ref={accessDialog} onCancel={(e) => { e.preventDefault(); setSettings(false); }} onClick={(e) => { if (e.target === accessDialog.current) setSettings(false); }} className="modal" aria-labelledby="access-h">
        <div className="modal-inner">
          <button className="close" onClick={() => setSettings(false)} aria-label="Close display settings"><X size={18} aria-hidden="true" /></button>
          <Kicker>Display</Kicker>
          <h3 id="access-h">Make it comfortable.</h3>
          <label className="switch"><span>Light mode</span><input type="checkbox" checked={theme === 'light'} onChange={toggleTheme} /><i aria-hidden="true" /></label>
          <label className="switch"><span>Reduce motion<small>Shows a still of the core instead of the live scene</small></span><input type="checkbox" checked={reduced} onChange={(e) => setMotion(e.target.checked)} /><i aria-hidden="true" /></label>
          <label className="switch"><span>Higher contrast</span><input type="checkbox" checked={contrast} onChange={(e) => setHighContrast(e.target.checked)} /><i aria-hidden="true" /></label>
          <button className="text-link" onClick={() => { setMotion(matchMedia('(prefers-reduced-motion: reduce)').matches); setHighContrast(false); setTheme('dark'); try { ['oca-motion', 'oca-contrast', 'oca-theme'].forEach((k) => localStorage.removeItem(k)); } catch {} }}>Reset to defaults</button>
        </div>
      </dialog>

      <dialog ref={contactDialog} onCancel={(e) => { e.preventDefault(); setContact(false); }} onClick={(e) => { if (e.target === contactDialog.current) setContact(false); }} className="modal" aria-labelledby="contact-h">
        <div className="modal-inner">
          <button className="close" onClick={() => setContact(false)} aria-label="Close contact"><X size={18} aria-hidden="true" /></button>
          <Kicker>Talk to OCA</Kicker>
          <h3 id="contact-h">Book a call. Leave with a plan.</h3>
          <p>A short call on your WhatsApp flow, your tools and what the first AI employee should do. No commitment.</p>
          <a className="button red" href={BOOK_FALLBACK} target="_blank" rel="noreferrer">Book on oneclickaway.io <ArrowUpRight size={15} aria-hidden="true" /></a>
          <a className="text-link" href={`tel:${PHONE}`}><Phone size={14} aria-hidden="true" /> {PHONE_PRETTY}</a>
        </div>
      </dialog>
    </>
  );
}
