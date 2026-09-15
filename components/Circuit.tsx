'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, MessageSquare } from 'lucide-react';
import { scenarios as base } from '../lib/content';

export type ScenarioOverride = { input: string; steps: [string, string, string]; result: string };

// Routing board. Traces are measured from the real DOM boxes, so the lines always meet the cards.
export default function Circuit({ scenario, onSelect, booking }: { scenario: number; onSelect: (i: number) => void; booking?: ScenarioOverride }) {
  // The booking route follows the industry the visitor picked in the hero.
  const scenarios = booking ? [{ ...base[0], ...booking }, base[1], base[2]] : base;
  const body = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ base: string[]; active: string; w: number; h: number }>({ base: [], active: '', w: 1000, h: 500 });
  const sc = scenarios[scenario];

  const measure = () => {
    const el = body.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const rel = (r: DOMRect) => ({ l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cy: r.top - box.top + r.height / 2, cx: r.left - box.left + r.width / 2 });
    const input = el.querySelector('.circuit-input')?.getBoundingClientRect();
    const chip = el.querySelector('.hermes-chip')?.getBoundingClientRect();
    const specs = Array.from(el.querySelectorAll<HTMLElement>('.specialist')).map((s) => s.getBoundingClientRect());
    if (!input || !chip || specs.length < 3 || box.width < 700) { setPaths({ base: [], active: '', w: box.width, h: box.height }); return; }
    const i = rel(input), c = rel(chip);
    const inTrace = `M${i.r} ${i.cy}H${c.l - 6}`;
    const midX = c.r + (rel(specs[0]).l - c.r) * 0.55;
    const out = specs.map((s) => { const q = rel(s); return `M${c.r + 6} ${c.cy}H${midX}V${q.cy}H${q.l}`; });
    setPaths({ base: [inTrace, ...out], active: `${inTrace}${out[sc.branch]}`, w: box.width, h: box.height });
  };

  useLayoutEffect(measure, [scenario]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (body.current) ro.observe(body.current);
    document.fonts.ready.then(measure);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="board" data-route={sc.branch} data-reveal data-lit>
      <div className="board-grid" aria-hidden="true" />
      <span className="screw tl" aria-hidden="true" /><span className="screw tr" aria-hidden="true" /><span className="screw bl" aria-hidden="true" /><span className="screw br" aria-hidden="true" />
      <span className="board-caption micro" aria-hidden="true">OCA / ROUTING SYSTEM / H-01</span>
      <div className="scenario-tabs" role="tablist" aria-label="Pick a customer message">
        {scenarios.map((v, i) => (
          <button role="tab" id={`route-${i}`} aria-selected={scenario === i} aria-controls="route-panel" tabIndex={scenario === i ? 0 : -1} className={scenario === i ? 'active' : ''} key={v.label} onClick={() => onSelect(i)}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') onSelect((scenario + 1) % scenarios.length); if (e.key === 'ArrowLeft') onSelect((scenario + scenarios.length - 1) % scenarios.length); }}>
            {v.label}
          </button>
        ))}
      </div>
      <div className="board-body" id="route-panel" role="tabpanel" aria-labelledby={`route-${scenario}`} ref={body}>
        <svg className="traces" viewBox={`0 0 ${paths.w} ${paths.h}`} width={paths.w} height={paths.h} aria-hidden="true">
          {paths.base.map((d, i) => <path className="trace" d={d} key={i} />)}
          {paths.active && <path className="active-trace" d={paths.active} key={`a-${scenario}`} />}
        </svg>
        <div className="circuit-input">
          <MessageSquare size={18} aria-hidden="true" />
          <span className="micro">CUSTOMER MESSAGE</span>
          <p>“{sc.input}”</p>
        </div>
        <div className="hermes-chip" aria-label="Hermes, the orchestrator">
          <span className="chip-ring" aria-hidden="true" />
          <div className="anchor" data-core-anchor data-x=".5" data-y=".5" data-scale=".34" data-mobile-x=".5" data-mobile-y=".5" data-mobile-scale=".2" style={{ top: '50%', left: '50%' }} />
          <b>HERMES</b><span className="micro">ROUTES IT</span>
        </div>
        <ul className="specialists">
          {['Front desk', 'Sales', 'Marketing'].map((n, i) => (
            <li className={sc.branch === i ? 'specialist active' : 'specialist'} key={n} aria-current={sc.branch === i ? 'true' : undefined}>
              <i aria-hidden="true" /><span>{n}</span><small>{['Hermes', 'Dana', 'Mira'][i]}</small>
            </li>
          ))}
        </ul>
        <ol className="route-steps" key={`steps-${scenario}`}>
          {sc.steps.map((st, i) => <li key={st} style={{ animationDelay: `${0.25 + i * 0.35}s` }}><span className="micro">0{i + 1}</span>{st}</li>)}
        </ol>
        <div className="circuit-result" role="status" aria-live="polite" key={`r-${scenario}`}><Check size={15} aria-hidden="true" /><span>{sc.result}</span><span className="demo-tag">DEMO</span></div>
      </div>
    </div>
  );
}
