import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { SITE_URL, INDEXABLE, TITLE, DESCRIPTION, ORG } from '../lib/site';

// OCA's own brand fonts, self-hosted from the live site's public assets.
const display = localFont({
  src: [
    { path: '../public/fonts/just_sans_light.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/just_sans_regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/just_sans_medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/just_sans_semibold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
});
const body = localFont({
  src: [
    { path: '../public/fonts/kross_neue_grotesk_light.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/kross_neue_grotesk_regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/kross_neue_grotesk_bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | One Click Away' },
  description: DESCRIPTION,
  applicationName: ORG.name,
  alternates: { canonical: '/' },
  // Preview builds are noindex. Set NEXT_PUBLIC_INDEX=true in the production environment for the real domain.
  robots: INDEXABLE ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } } : { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: ORG.name,
    locale: 'en_AE',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/images/og.jpg', width: 1200, height: 630, alt: 'The Hermes Core, the mark of OCA’s managed AI employees' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/images/og.jpg'] },
};
export const viewport: Viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f5f2eb' }, { media: '(prefers-color-scheme: dark)', color: '#100f0e' }], width: 'device-width', initialScale: 1, viewportFit: 'cover' };

// Applies saved motion/contrast preferences before first paint to avoid a flash.
const prePaint = `try{var m=localStorage.getItem('oca-motion');var c=localStorage.getItem('oca-contrast');var t=localStorage.getItem('oca-theme');var r=m?m==='reduce':matchMedia('(prefers-reduced-motion: reduce)').matches;var h=document.documentElement;if(r)h.classList.add('reduce-motion');if(c==='high')h.classList.add('high-contrast');h.dataset.theme=t==='light'?'light':'dark';}catch(e){}`;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AE" className={`${display.variable} ${body.variable}`} data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: prePaint }} /></head>
      <body>{children}</body>
    </html>
  );
}
