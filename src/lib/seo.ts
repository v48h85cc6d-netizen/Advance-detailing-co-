import { useEffect } from 'react';
import { SITE_URL } from '../config/site';
import { HREFLANG, LANGS, localizePath, type Lang } from './lang';

/**
 * Keeps <head> in sync during client-side navigation. The same tags are also
 * written statically per route at build time by scripts/generate-pages.mjs.
 */
function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}
function setLink(rel: string, href: string, hreflang?: string) {
  const sel = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function useSeo(opts: { lang: Lang; path: string; title: string; description: string; ogLocale: string; noindex?: boolean }) {
  const { lang, path, title, description, ogLocale, noindex } = opts;
  useEffect(() => {
    const url = SITE_URL + localizePath(lang, path);
    document.title = title;
    document.documentElement.lang = lang;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:locale', ogLocale);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setLink('canonical', url);
    for (const l of LANGS) setLink('alternate', SITE_URL + localizePath(l, path), HREFLANG[l]);
    setLink('alternate', SITE_URL + localizePath('sq', path), 'x-default');
  }, [lang, path, title, description, ogLocale, noindex]);
}
