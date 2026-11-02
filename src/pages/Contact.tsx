import { useT } from '../lib/useT';
import { PageHeader } from '../components/PageHeader';
import { ContactInfo } from '../components/ContactInfo';
import { ContactForm } from '../components/ContactForm';
import { MapEmbed } from '../components/MapEmbed';
import { SocialSection } from '../components/SocialSection';
import { Reveal } from '../components/Reveal';
import { usePageSeo } from '../lib/usePageSeo';
import { visual } from '../lib/visual';

const ve = visual('src/pages/Contact.tsx');

export default function Contact() {
  const { t } = useT();
  usePageSeo('contact');
  return (
    <>
      <PageHeader page="contact" keys={{ eyebrow: 'contact.eyebrow', title: 'contact.title' }} eyebrow={t('contact.eyebrow')} title={t('contact.title')} />
      <section {...ve('contact.main', 'section')} className="pb-20" aria-label={t('contact.eyebrow')}>
        <div className="container-lux grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
          <Reveal>
            <ContactInfo />
          </Reveal>
          <Reveal>
            <div {...ve('contact.form', 'card')} id="form" className="card-lux p-6 sm:p-10">
              <h2 {...ve('contact.form.title', 'text', { key: 'contact.form.title' })} className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">{t('contact.form.title')}</h2>
              <ContactForm />
            </div>
          </Reveal>
        </div>
        <div className="container-lux mt-6 lg:mt-10">
          <div {...ve('contact.map', 'container')} className="card-lux aspect-[4/5] overflow-hidden sm:aspect-[21/9]">
            <MapEmbed />
          </div>
        </div>
      </section>
      <SocialSection />
    </>
  );
}
