import { useT } from '../lib/useT';
import { PageHeader } from '../components/PageHeader';
import { usePageSeo } from '../lib/usePageSeo';
import { useConsent } from '../lib/consent';

type Doc = 'privacy' | 'cookies' | 'terms';

export default function Legal({ doc }: { doc: Doc }) {
  const { t } = useT();
  const { openSettings } = useConsent();
  usePageSeo(doc);
  const sections = t(`legal.${doc}.sections`, { returnObjects: true }) as { h: string; p: string[] }[];
  return (
    <>
      <PageHeader eyebrow={`${t('common.lastUpdated')}: ${t('legal.updated')}`} title={t(`legal.${doc}.title`)} text={t(`legal.${doc}.intro`)} />
      <section className="pb-28" data-testid={`legal-${doc}`}>
        <div className="container-lux">
          <div className="mx-auto max-w-3xl">
            {sections.map((s) => (
              <section key={s.h} className="border-t border-line py-10">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{s.h}</h2>
                {s.p.map((para, i) => (
                  <p key={i} className="mt-4 leading-relaxed text-fg-2">
                    {para}
                  </p>
                ))}
              </section>
            ))}
            {doc === 'cookies' && (
              <button type="button" onClick={openSettings} className="btn btn-primary mt-6">
                {t('footer.cookieSettings')}
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
