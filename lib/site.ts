// Site-wide constants. Only verified facts: the published phone number, the UAE positioning and the published build price.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oca-hermes-homepage.vercel.app').replace(/\/$/, '');
export const INDEXABLE = process.env.NEXT_PUBLIC_INDEX === 'true'; // Preview builds stay noindex until this is set for the real domain.
export const ORG = { name: 'One Click Away', short: 'OCA', phone: '+971565354435', city: 'Dubai', country: 'AE' };
export const TITLE = 'AI employees for UAE service businesses | One Click Away';
export const DESCRIPTION = 'Your WhatsApp answered, jobs booked, deposits chased. OCA builds and runs managed AI employees for UAE service businesses. Build from AED 15,000.';
