import { Check, Minus, X } from 'lucide-react';
import { compareRows, compareCols, type CompareCell } from '../lib/content';

const Cell = ({ v }: { v: CompareCell }) => (
  <span className={`cmp cmp-${v}`}>
    {v === 'yes' ? <Check size={16} aria-hidden="true" /> : v === 'part' ? <Minus size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
    <span className="sr-only">{v === 'yes' ? 'Yes' : v === 'part' ? 'Partly' : 'No'}</span>
  </span>
);

// Plain comparison. What each option does, nothing about what any of them cost.
export default function Compare() {
  return (
    <div className="compare-wrap" data-lit>
      <table className="compare">
        <caption className="sr-only">What a chatbot, an AI employee by OCA and a receptionist each do</caption>
        <thead>
          <tr><th scope="col"><span className="sr-only">Capability</span></th>{compareCols.map((c, i) => <th scope="col" key={c} className={i === 1 ? 'hi' : ''}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {compareRows.map(([label, a, b, c, note]) => (
            <tr key={label}>
              <th scope="row">{label}{note && <small>{note}</small>}</th>
              <td><Cell v={a} /></td><td className="hi"><Cell v={b} /></td><td><Cell v={c} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="compare-key"><Check size={12} aria-hidden="true" /> Yes <Minus size={12} aria-hidden="true" /> Partly, or depends on the setup <X size={12} aria-hidden="true" /> No</p>
    </div>
  );
}
