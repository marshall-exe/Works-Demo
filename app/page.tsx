import Experience from '../components/Experience';
import { faqs } from '../lib/content';
import { SITE_URL, ORG, DESCRIPTION } from '../lib/site';

// Static export: the date is fixed at build time.
const updated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();

// Structured data with verified facts only: the organisation, the service and its published starting price, and the on-page questions.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: ORG.name, alternateName: ORG.short, url: `${SITE_URL}/`, logo: `${SITE_URL}/icon-512.png`, telephone: ORG.phone,
      areaServed: { '@type': 'Country', name: 'United Arab Emirates' }, address: { '@type': 'PostalAddress', addressLocality: ORG.city, addressCountry: ORG.country },
      contactPoint: [{ '@type': 'ContactPoint', telephone: ORG.phone, contactType: 'sales', availableLanguage: ['en', 'ar'] }],
    },
    {
      '@type': 'Service', '@id': `${SITE_URL}/#service`, name: 'Managed AI employees', serviceType: 'AI employee build and management', description: DESCRIPTION,
      provider: { '@id': `${SITE_URL}/#org` }, areaServed: { '@type': 'Country', name: 'United Arab Emirates' }, availableLanguage: ['en', 'ar'],
      offers: { '@type': 'Offer', priceCurrency: 'AED', price: '15000', priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'AED', minPrice: 15000, description: 'One-time build from AED 15,000, then a monthly management fee agreed with the scope.' }, url: `${SITE_URL}/#pricing` },
    },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, url: `${SITE_URL}/`, name: ORG.name, publisher: { '@id': `${SITE_URL}/#org` }, inLanguage: 'en-AE' },
    { '@type': 'FAQPage', '@id': `${SITE_URL}/#faq`, mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Experience updated={updated} />
    </>
  );
}
