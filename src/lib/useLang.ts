import { useLocation } from 'react-router';
import { useCallback } from 'react';
import { langFromPath, localizePath, type Lang } from './lang';

export function useLang() {
  const { pathname } = useLocation();
  const { lang, rest } = langFromPath(pathname);
  const to = useCallback((path: string) => localizePath(lang, path), [lang]);
  const switchTo = useCallback((l: Lang) => localizePath(l, rest), [rest]);
  return { lang, rest, to, switchTo };
}
