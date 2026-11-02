import routes from '../config/routes.json';

export type Lang = 'sq' | 'en' | 'de';
export const LANGS = routes.languages as Lang[];
export const DEFAULT_LANG: Lang = 'sq';
export const HREFLANG: Record<Lang, string> = { sq: 'sq', en: 'en', de: 'de' };

/** Split a pathname into its language prefix and the language-neutral rest. */
export function langFromPath(pathname: string): { lang: Lang; rest: string } {
  const m = pathname.match(/^\/(en|de)(?=\/|$)(.*)$/);
  if (m) return { lang: m[1] as Lang, rest: m[2] || '/' };
  return { lang: DEFAULT_LANG, rest: pathname || '/' };
}

/** Build the URL of `path` (language-neutral, e.g. "/services") in `lang`. */
export function localizePath(lang: Lang, path: string): string {
  const clean = path === '' ? '/' : path;
  if (lang === DEFAULT_LANG) return clean;
  return `/${lang}${clean === '/' ? '' : clean}`;
}
