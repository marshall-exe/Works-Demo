'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Shams from './Shams';

// Places the Shams section straight after the hero, as the first piece of work people see,
// without touching the page tree: a host element is inserted after #hero and the section is portalled into it.
export default function ShamsMount() {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el: HTMLElement | null = null;
    let tries = 0;
    let timer = 0;
    const place = () => {
      const after = document.getElementById('hero') ?? document.getElementById('demo');
      if (!after?.parentElement) { if (tries++ < 40) timer = window.setTimeout(place, 100); return; }
      el = document.createElement('div');
      el.className = 'shams-host';
      after.insertAdjacentElement('afterend', el);
      setHost(el);
    };
    place();
    return () => { window.clearTimeout(timer); el?.remove(); };
  }, []);

  // The page measured its scroll triggers before this section existed; re-measure once it is in.
  useEffect(() => {
    if (!host) return;
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => { try { ScrollTrigger.refresh(); } catch { /* gsap not ready */ } }); });
    const ro = new ResizeObserver(() => { try { ScrollTrigger.refresh(); } catch { /* ignore */ } });
    const first = host.firstElementChild;
    if (first) ro.observe(first);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [host]);

  return host ? createPortal(<Shams />, host) : null;
}
