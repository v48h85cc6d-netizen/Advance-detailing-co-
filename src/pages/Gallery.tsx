import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useT } from '../lib/useT';
import { PageHeader } from '../components/PageHeader';
import { ImageSlot } from '../components/ImageSlot';
import { Lightbox, type LightboxItem } from '../components/Lightbox';
import { ParallaxReveal, Reveal, SectionHeading } from '../components/Reveal';
import { ArrowIcon, ExpandIcon } from '../components/Icons';
import { SocialSection } from '../components/SocialSection';
import { coverImage, slots } from '../config/images';
import { getProject } from '../config/projects';
import { usePageSeo } from '../lib/usePageSeo';
import { useLang } from '../lib/useLang';
import { cn } from '../lib/cn';
import { visual } from '../lib/visual';

const ve = visual('src/pages/Gallery.tsx');

const GALLERY_SLOTS = 16;
// Editorial bento rhythm for the 16 containers (desktop)
// 28 cells = 7 complete rows of 4 → no gaps
const SPANS = ['lg:col-span-2 lg:row-span-2', '', '', 'lg:row-span-2', '', 'lg:col-span-2', '', '', 'lg:col-span-2 lg:row-span-2', '', 'lg:row-span-2', '', 'lg:col-span-2', '', 'lg:col-span-2', ''];

export default function Gallery() {
  const { t } = useT();
  const { to } = useLang();
  usePageSeo('gallery');
  const [open, setOpen] = useState<number | null>(null);
  const lambo = getProject('lamborghini-aventador')!;
  const m135 = getProject('bmw-m135i')!;

  const items: LightboxItem[] = useMemo(
    () => slots('gallery', GALLERY_SLOTS).map((src, i) => ({ src, alt: t('gallery.photoAlt', { n: i + 1 }), folder: 'gallery' })),
    [t],
  );

  return (
    <>
      <PageHeader page="gallery" keys={{ eyebrow: 'gallery.eyebrow', title: 'gallery.title', text: 'gallery.intro' }} eyebrow={t('gallery.eyebrow')} title={t('gallery.title')} text={t('gallery.intro')} />

      {/* Featured: Lamborghini Aventador SV Roadster — one large container */}
      <section {...ve('gallery.featured', 'section')} className="container-lux" aria-labelledby="lambo-title" data-testid="gallery-featured">
        <Link to={to(`/projects/${lambo.slug}`)} className="group block">
          <ParallaxReveal className="relative aspect-[4/5] rounded-[1.75rem] sm:aspect-[16/9]">
            <div data-parallax className="absolute -inset-y-[10%] inset-x-0">
              <ImageSlot src={coverImage(lambo.folder)} alt={t('projects.lamborghini-aventador.vehicle')} folder={lambo.folder} className="h-full w-full transition-transform duration-[1.6s] group-hover:scale-[1.04]" priority />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 text-white sm:p-12 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-3">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/70">{t('gallery.featuredLabel')}</span>
                <h2 id="lambo-title" className="display h-display-md max-w-[22ch]">
                  {t('projects.lamborghini-aventador.title')}
                </h2>
                <p className="serif-accent text-xl text-white/85 sm:text-2xl">1 of 500 · {t('projects.lamborghini-aventador.service')}</p>
              </div>
              <span className="btn self-start border border-white/40 text-white transition-colors group-hover:bg-white group-hover:text-black">
                {t('home.spotlight.cta')} <ArrowIcon width={16} height={16} />
              </span>
            </div>
          </ParallaxReveal>
        </Link>
      </section>

      {/* 16 independent gallery containers */}
      <section {...ve('gallery.grid', 'section')} className="section" aria-labelledby="grid-title">
        <div className="container-lux">
          <h2 id="grid-title" className="eyebrow mb-10">
            {t('gallery.gridTitle')}
          </h2>
          <Reveal as="ul" className="grid auto-rows-[46vw] grid-cols-2 gap-3 sm:auto-rows-[30vw] sm:gap-4 lg:auto-rows-[15vw] lg:grid-flow-row-dense lg:grid-cols-4 2xl:auto-rows-[220px]" stagger={0.04} y={30}>
            {items.map((it, i) => (
              <li key={i} data-reveal className={cn('relative', SPANS[i])} data-testid="gallery-slot">
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={t('common.openImage', { n: i + 1 })}
                  className="group relative block h-full w-full overflow-hidden rounded-2xl border border-line"
                >
                  <ImageSlot src={it.src} alt={it.alt} folder="gallery" index={i + 1} className="h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]" />
                  <span className="absolute right-3 top-3 grid grid-cols-1 h-10 w-10 scale-75 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
                    <ExpandIcon width={16} height={16} />
                  </span>
                </button>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Special project: BMW M135i Engine — 1 of 1, +1000 HP */}
      <section {...ve('gallery.m135i', 'section')} className="section border-t border-line bg-bg-2" aria-labelledby="m135-title" data-testid="gallery-m135i">
        <div className="container-lux grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Link to={to(`/projects/${m135.slug}`)} className="group block" tabIndex={-1} aria-hidden="true">
            <ParallaxReveal className="relative aspect-[4/3] rounded-[1.75rem]">
              <div data-parallax className="absolute -inset-y-[10%] inset-x-0">
                <ImageSlot src={coverImage(m135.folder)} alt={t('projects.bmw-m135i.vehicle')} folder={m135.folder} className="h-full w-full transition-transform duration-[1.6s] group-hover:scale-[1.04]" />
              </div>
              <span className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-black">1 / 1</span>
            </ParallaxReveal>
          </Link>
          <div className="flex flex-col gap-7">
            <SectionHeading eyebrow={t('gallery.specialLabel')} title={t('projects.bmw-m135i.title')} />
            <Reveal>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
                <div className="bg-bg-2 p-5">
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted">{t('common.vehicle')}</dt>
                  <dd className="mt-2 font-medium">{t('projects.bmw-m135i.vehicle')}</dd>
                </div>
                <div className="bg-bg-2 p-5">
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted">{t('common.service')}</dt>
                  <dd className="mt-2 font-medium">{t('projects.bmw-m135i.service')}</dd>
                </div>
              </dl>
              <p className="lead mt-7">{t('projects.bmw-m135i.description')}</p>
              <Link to={to(`/projects/${m135.slug}`)} className="btn btn-ghost mt-8" data-testid="m135-link">
                {t('common.viewMore')} <ArrowIcon width={16} height={16} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <SocialSection />
      <Lightbox items={items} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </>
  );
}
