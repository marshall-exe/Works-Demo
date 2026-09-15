'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Industry } from '../lib/content';

// Missed-revenue estimate. Every number is the visitor's own assumption; the page claims nothing about recovery rates.
const fmt = (n: number) => new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(Math.round(n));

function Field({ id, label, hint, v, set, min, max, step, unit }: { id: string; label: string; hint: string; v: number; set: (n: number) => void; min: number; max: number; step: number; unit: string }) {
  return (
    <div className="calc-field">
      <label htmlFor={id}>{label}<small>{hint}</small></label>
      <div className="calc-row">
        <input type="range" id={id} min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} aria-describedby={`${id}-v`} />
        <span className="calc-value" id={`${id}-v`}><input type="number" min={min} max={max * 4} step={step} value={v} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))} aria-label={`${label}, exact value`} /><em>{unit}</em></span>
      </div>
    </div>
  
  );
}

export default function Calculator({ industry }: { industry: Industry }) {
  const [missed, setMissed] = useState(12);
  const [wouldBook, setWouldBook] = useState(40);
  const [value, setValue] = useState(industry.jobValue);
  useEffect(() => setValue(industry.jobValue), [industry]);

  const r = useMemo(() => {
    const jobsWeek = missed * (wouldBook / 100);
    const week = jobsWeek * value;
    return { jobsMonth: jobsWeek * 4.33, month: week * 4.33, year: week * 52 };
  }, [missed, wouldBook, value]);

  return (
    <div className="calc" data-lit>
      <div className="calc-inputs">
        <Field id="calc-missed" label="Calls and messages you miss each week" hint="Rang out, went to voicemail, or waited hours for a reply" v={missed} set={setMissed} min={0} max={100} step={1} unit="per week" />
        <Field id="calc-book" label="Share that would have booked" hint="Your guess, from what you see in your own calendar" v={wouldBook} set={setWouldBook} min={0} max={100} step={5} unit="%" />
        <Field id="calc-value" label={`Average value of one ${industry.job}`} hint="What a typical first visit is worth to you" v={value} set={setValue} min={50} max={5000} step={10} unit="AED" />
      </div>
      <div className="calc-out" role="status" aria-live="polite">
        <span className="micro">MISSED REVENUE, BY YOUR NUMBERS</span>
        <div className="calc-big"><small>AED</small>{fmt(r.month)}<span>a month</span></div>
        <ul>
          <li><b>{fmt(r.jobsMonth)}</b> {industry.job}s a month that never happened</li>
          <li><b>AED {fmt(r.year)}</b> a year at the same pace</li>
        </ul>
        <p className="small muted">An estimate from your three inputs, nothing more. An AI front desk answers every one of those messages; how many then book is up to your service and your prices.</p>
      </div>
    </div>
  );
}
