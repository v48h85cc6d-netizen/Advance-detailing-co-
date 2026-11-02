import { useT } from '../lib/useT';
import { PageHeader } from '../components/PageHeader';
import { ServiceCard } from '../components/ServiceCard';
import { CertCarousel } from '../components/CertCarousel';
import { CtaBand } from '../components/CtaBand';
import { Reveal } from '../components/Reveal';
import { services } from '../config/services';
import { usePageSeo } from '../lib/usePageSeo';

export default function Services() {
  const { t } = useT();
  usePageSeo('services');
  return (
    <>
      <PageHeader eyebrow={t('services.eyebrow')} title={t('services.title')} text={t('services.intro')} />
      <section className="pb-24" aria-label={t('services.eyebrow')}>
        <Reveal as="ul" className="container-lux grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" stagger={0.05}>
          {services.map((s, i) => (
            <li key={s.id} data-reveal className="h-full">
              <ServiceCard id={s.id} category={s.category} index={i} className="h-full" />
            </li>
          ))}
        </Reveal>
      </section>
      <div className="border-t border-line bg-bg-2">
        <CertCarousel />
      </div>
      <CtaBand title={t('services.ctaTitle')} text={t('services.ctaText')} />
    </>
  );
}
