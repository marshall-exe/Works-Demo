import type { MetadataRoute } from 'next';
import { ORG, DESCRIPTION } from '../lib/site';

export const dynamic = 'force-static';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ORG.name, short_name: ORG.short, description: DESCRIPTION, start_url: '/', display: 'standalone', background_color: '#100f0e', theme_color: '#100f0e', lang: 'en-AE',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
