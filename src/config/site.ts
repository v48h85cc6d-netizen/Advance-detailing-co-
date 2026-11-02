/**
 * CENTRAL BUSINESS / CONTACT CONFIGURATION
 * Edit these values to update contact details everywhere on the site
 * (header, footer, contact page, structured data, legal pages).
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://advancedetailingco.com').replace(/\/$/, '');

export const business = {
  name: 'ADVANCE DETAILING CO.',
  foundingYear: 2019,
  address: {
    street: 'Xhevat Qena',
    city: 'Prishtinë',
    postalCode: '10000',
    country: 'Kosovë',
    countryCode: 'XK',
  },
  phone: {
    display: '+383 (0) 49 909 229',
    href: 'tel:+38349909229',
    e164: '+38349909229',
  },
  email: 'info@advancedetailingco.com',
};

export const fullAddress = `${business.address.street}, ${business.address.city} ${business.address.postalCode}, ${business.address.country}`;

/**
 * GOOGLE MAPS
 * No verified Google Maps listing/coordinates were available while building the site,
 * so the links use an address search (no invented coordinates).
 * To point at your exact verified Google Business listing, paste its share link
 * (Google Maps → your business → Share → Copy link) into `placeUrl`.
 */
const mapsQuery = encodeURIComponent(`${business.name} ${fullAddress}`);
export const maps = {
  placeUrl: '' as string,
  get directionsUrl() {
    return this.placeUrl || `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
  },
  embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&z=16&output=embed`,
};

export const social = [
  { id: 'instagram', label: 'Instagram', handle: '@advancedetailingco', url: 'https://www.instagram.com/advancedetailingco?xtok=MWVwanAyN2k1NW5wOA==' },
  { id: 'tiktok', label: 'TikTok', handle: '@advansplakolli', url: 'https://www.tiktok.com/@advansplakolli?_r=1&_t=ZS-9B4qXYAusga' },
  { id: 'facebook', label: 'Facebook', handle: 'ADVANCE DETAILING CO.', url: 'https://www.facebook.com/share/1PaJiT11Eh/?mibextid=wwXIfr' },
] as const;

export type SocialId = (typeof social)[number]['id'];

/** Contact-form delivery — configured through environment variables (see .env.example / README). */
export const contactForm = {
  provider: (import.meta.env.VITE_CONTACT_PROVIDER || '') as '' | 'web3forms' | 'formspree' | 'custom',
  endpoint: import.meta.env.VITE_CONTACT_ENDPOINT || '',
  web3formsKey: import.meta.env.VITE_WEB3FORMS_KEY || '',
  get configured() {
    if (this.provider === 'web3forms') return Boolean(this.web3formsKey);
    if (this.provider === 'formspree' || this.provider === 'custom') return Boolean(this.endpoint);
    return false;
  },
};

export const analytics = { gaId: import.meta.env.VITE_GA_ID || '' };
