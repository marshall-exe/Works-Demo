import type { MetadataRoute } from 'next';
import { SITE_URL, INDEXABLE } from '../lib/site';

export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots {
  return INDEXABLE
    ? { rules: { userAgent: '*', allow: '/' }, sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL }
    : { rules: { userAgent: '*', disallow: '/' } };
}
