import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="notfound">
      <span className="brand"><span className="brand-dot" aria-hidden="true" /><span className="brand-name">OCA</span></span>
      <p className="kicker">404</p>
      <h1>This page is not on the roster.</h1>
      <p>The link is old or the address is off by a letter. The homepage has everything: the employees, how Hermes routes work, pricing and booking.</p>
      <div className="notfound-actions">
        <Link className="button red" href="/">Back to the homepage</Link>
        <Link className="text-link" href="/#pricing">See pricing</Link>
      </div>
    </main>
  );
}
