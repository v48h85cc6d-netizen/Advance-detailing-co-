import { useT } from './useT';
import { useSeo } from './seo';
import { useLang } from './useLang';

export function usePageSeo(key: string, override?: { title?: string; description?: string; noindex?: boolean }) {
  const { t } = useT();
  const { lang, rest } = useLang();
  const baseTitle = override?.title ?? t(`meta.pages.${key}.title`);
  const title = key === 'home' && !override?.title ? baseTitle : `${baseTitle} | ${t('meta.titleSuffix')}`;
  useSeo({
    lang,
    path: rest,
    title,
    description: override?.description ?? t(`meta.pages.${key}.description`),
    ogLocale: t('meta.locale'),
    noindex: override?.noindex,
  });
}
