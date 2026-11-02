import { useT } from '../lib/useT';
import { PageHeader } from '../components/PageHeader';
import { ContactInfo } from '../components/ContactInfo';
import { ContactForm } from '../components/ContactForm';
import { MapEmbed } from '../components/MapEmbed';
import { SocialSection } from '../components/SocialSection';
import { Reveal } from '../components/Reveal';
import { usePageSeo } from '../lib/usePageSeo';

export default function Contact() {
  const { t } = useT();
  usePageSeo('contact');
  return (
    <>
      <PageHeader eyebrow={t('contact.eyebrow')} title={t('contact.title')} />
      <section className="pb-20" aria-label={t('contact.eyebrow')}>
        <div className="container-lux grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
          <Reveal>
            <ContactInfo />
          </Reveal>
          <Reveal>
            <div id="form" className="card-lux p-6 sm:p-10">
              <h2 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">{t('contact.form.title')}</h2>
              <ContactForm />
            </div>
          </Reveal>
        </div>
        <div className="container-lux mt-6 lg:mt-10">
          <div className="card-lux aspect-[4/5] overflow-hidden sm:aspect-[21/9]">
            <MapEmbed />
          </div>
        </div>
      </section>
      <SocialSection />
    </>
  );
}
