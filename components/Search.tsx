'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search as SearchIcon, X } from 'lucide-react';
import { searchIndex, faqs, employees } from '../lib/content';

type Hit = { id: string; title: string; hint: string };

// On-page search: sections, employees and questions. Enter jumps to the best match.
export default function Search({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);

  const corpus = useMemo<Hit[]>(() => [
    ...searchIndex.map((s) => ({ id: s.id, title: s.title, hint: s.text })),
    ...employees.map((e) => ({ id: 'workforce', title: `${e.name}, ${e.role}`, hint: e.tasks.join(' ') })),
    ...faqs.map(([qq, a]) => ({ id: 'faq', title: qq, hint: a })),
  ], []);

  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return corpus.slice(0, 6);
    // Questions and employees outrank section summaries on a body-text match.
    return corpus.map((h, i) => ({ h, score: (h.title.toLowerCase().includes(t) ? 2 : 0) + (h.hint.toLowerCase().includes(t) ? (i >= searchIndex.length ? 1.5 : 1) : 0) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.h).slice(0, 8);
  }, [q, corpus]);

  useEffect(() => {
    const d = dialog.current; if (!d) return;
    if (open && !d.open) { d.showModal(); setQ(''); setCursor(0); setTimeout(() => input.current?.focus(), 30); }
    if (!open && d.open) d.close();
  }, [open]);

  const go = (hit: Hit) => {
    onClose();
    const el = document.getElementById(hit.id);
    if (!el) return;
    if (hit.id === 'faq') {
      const det = Array.from(document.querySelectorAll<HTMLDetailsElement>('.faq details')).find((x) => x.querySelector('summary')?.textContent?.startsWith(hit.title));
      if (det) det.open = true;
    }
    setTimeout(() => window.dispatchEvent(new CustomEvent('oca:scrollto', { detail: el })), 60);
  };

  return (
    <dialog ref={dialog} className="modal search" aria-label="Search this page" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === dialog.current) onClose(); }}>
      <div className="modal-inner">
        <button className="close" onClick={onClose} aria-label="Close search"><X size={18} aria-hidden="true" /></button>
        <label className="search-field">
          <SearchIcon size={18} aria-hidden="true" />
          <input ref={input} type="search" value={q} placeholder="Search: bookings, pricing, Hermes, refunds" aria-label="Search this page" onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, hits.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); } if (e.key === 'Enter' && hits[cursor]) go(hits[cursor]); }} />
        </label>
        <ul className="search-hits" role="listbox" aria-label="Results">
          {hits.map((h, i) => (
            <li key={h.id + h.title} role="option" aria-selected={i === cursor}>
              <button className={i === cursor ? 'hit active' : 'hit'} onMouseEnter={() => setCursor(i)} onClick={() => go(h)}>
                <span>{h.title}</span><ArrowRight size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
          {hits.length === 0 && <li className="no-hit">Nothing on this page matches. Try “booking”, “price” or “refund”.</li>}
        </ul>
        <span className="micro muted">Enter to jump. Esc to close.</span>
      </div>
    </dialog>
  );
}
