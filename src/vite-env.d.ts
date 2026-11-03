/// <reference types="vite/client" />

declare module 'virtual:asset-manifest' {
  const manifest: Record<string, string[]>;
  export default manifest;
  /** responsive variants per original image URL: [width, url][] (ascending) */
  export const sizes: Record<string, [number, string][]>;
}

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_CONTACT_PROVIDER?: 'web3forms' | 'formspree' | 'custom' | '';
  readonly VITE_CONTACT_ENDPOINT?: string;
  readonly VITE_WEB3FORMS_KEY?: string;
  readonly VITE_GA_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
