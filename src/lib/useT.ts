import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { langFromPath } from './lang';

/**
 * Translation hook bound to the language in the URL (/, /en, /de).
 * Rendering is always in the URL's language — no frame in the previous language
 * after switching or using browser back/forward.
 */
export function useT() {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  const { lang } = langFromPath(pathname);
  const t = useMemo(() => i18n.getFixedT(lang), [i18n, lang]);
  return { t, i18n, lang };
}
