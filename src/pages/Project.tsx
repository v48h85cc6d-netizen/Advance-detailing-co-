import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useT } from '../lib/useT';
import { ImageSlot } from '../components/ImageSlot';
import { Lightbox, type LightboxItem } from '../components/Lightbox';
import { CtaBand } from '../components/CtaBand';
import { ParallaxReveal, Reveal, SplitHeading } from '../components/Reveal';
import { ArrowIcon, ChevronIcon, ExpandIcon } from '../components/Icons';
import { getProject, projects } from '../config/projects';
import { coverImage, slots } from '../config/images';
import { usePageSeo } from '../lib/usePageSeo';
import { useLang } from '../lib/useLang';
import NotFound from './NotFound';
import { visual } from '../lib/visual';

const ve = visual('src/pages/Project.tsx');

export default function Project() {
  const { slug = '' } = useParams();
  const project = getProject(slug);
  if (!project) return <NotFound />;
  return <ProjectView key={project.slug} slug={project.slug} />;
}

function ProjectView({ slug }: { slug: string }) {
  const { t } = useT();
  const { to } = useLang();
  const project = getProject(slug)!;
  const p = `projects.${slug}`;
  usePageSeo('project', { title: `${t(`${p}.vehicle`)} — ${t(`${p}.service`)}`, description: `${t(`${p}.service`)} — ${t(`${p}.description`)}` });
  const [open, setOpen] = useState<number | null>(null);
  const idx = projects.findIndex((x) => x.slug === slug);
  const next = projects[(idx + 1) % projects.length];
  const color = t(`${p}.color`);

  // Photos come ONLY from this project's own folder.
  const items: LightboxItem[] = useMemo(
    () => slots(project.folder, project.photoSlots).map((src, i) => ({ src, alt: `${t(`${p}.vehicle`)} — ${t('common.photo')} ${i + 1}`, folder: project.folder })),
    [project, p, t],
  );

  return (
    <article data-testid={`project-${slug}`} data-folder={project.folder}>
      <header {...ve('project.header', 'section')} className="relative pt-32 pb-12 sm:pt-40 sm:pb-16">
        <div className="container-lux flex flex-col gap-8">
          <Link to={to('/gallery')} className="group inline-flex items-center gap-2 self-start text-xs font-semibold uppercase tracking-[0.25em] text-muted hover:text-fg">
            <ChevronIcon dir="left" width={16} height={16} className="transition-transform group-hover:-translate-x-1" />
            {t('common.backToGallery')}
          </Link>
          <span className="eyebrow">
            {t('projects.eyebrow')} · {String(idx + 1).padStart(2, '0')}
            {project.badge ? ` · ${project.badge}` : ''}
          </span>
          <SplitHeading as="h1" text={t(`${p}.title`)} immediate className="h-display-xl max-w-[18ch]" visual={ve('project.title', 'text', { key: `${p}.title` })} />
          {slug === 'ferrari-488-pista' && <p className="serif-accent text-3xl text-fg-2">{t(`${p}.vehicle`)}</p>}
        </div>
      </header>

      <section {...ve('project.cover', 'section')} className="container-lux" aria-label={t(`${p}.vehicle`)}>
        <ParallaxReveal className="relative aspect-[4/5] rounded-[1.75rem] sm:aspect-[16/9]">
          <div data-parallax className="absolute -inset-y-[10%] inset-x-0">
            <ImageSlot src={coverImage(project.folder)} alt={`${t(`${p}.vehicle`)} — ${t(`${p}.service`)}`} folder={project.folder} className="h-full w-full" priority />
          </div>
        </ParallaxReveal>
      </section>

      <section {...ve('project.details', 'section')} className="section" aria-labelledby="details-title">
        <div className="container-lux grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-24">
          <div>
            <h2 id="details-title" className="eyebrow">
              {t('projects.detailsTitle')}
            </h2>
            <dl className="mt-8 flex flex-col divide-y divide-line border-y border-line">
              <div className="flex flex-col gap-1 py-5 sm:flex-row sm:justify-between sm:gap-6">
                <dt className="text-sm text-muted">{t('common.vehicle')}</dt>
                <dd className="font-medium sm:text-right" data-testid="project-vehicle">{t(`${p}.vehicle`)}</dd>
              </div>
              {color && (
                <div className="flex flex-col gap-1 py-5 sm:flex-row sm:justify-between sm:gap-6">
                  <dt className="text-sm text-muted">{t('common.color')}</dt>
                  <dd className="font-medium sm:text-right">{color}</dd>
                </div>
              )}
              <div className="flex flex-col gap-1 py-5 sm:flex-row sm:justify-between sm:gap-6">
                <dt className="text-sm text-muted">{t('common.service')}</dt>
                <dd className="font-medium sm:text-right">{t(`${p}.service`)}</dd>
              </div>
            </dl>
          </div>
          <Reveal>
            <p {...ve('project.description', 'text', { key: `${p}.description` })} className="text-[clamp(1.3rem,2.2vw,2rem)] font-light leading-[1.5] tracking-tight">{t(`${p}.description`)}</p>
          </Reveal>
        </div>
      </section>

      <section {...ve('project.gallery', 'section')} className="pb-24" aria-labelledby="project-gallery-title">
        <div className="container-lux">
          <h2 id="project-gallery-title" className="eyebrow mb-10">
            {t('projects.galleryTitle')}
          </h2>
          <Reveal as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05} y={30}>
            {items.map((it, i) => (
              <li key={i} data-reveal className={i % 5 === 0 ? 'sm:col-span-2 lg:col-span-2' : ''} data-testid="project-slot">
                <button type="button" onClick={() => setOpen(i)} aria-label={t('common.openImage', { n: i + 1 })} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line">
                  <ImageSlot src={it.src} alt={it.alt} folder={project.folder} index={i + 1} className="h-full w-full transition-transform duration-[1.2s] group-hover:scale-[1.05]" />
                  <span className="absolute right-3 top-3 grid grid-cols-1 h-10 w-10 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    <ExpandIcon width={16} height={16} />
                  </span>
                </button>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <section {...ve('project.next', 'section')} className="border-y border-line">
        <Link to={to(`/projects/${next.slug}`)} className="group container-lux flex flex-col gap-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-24" data-testid="next-project">
          <span className="eyebrow">{t('common.nextProject')}</span>
          <span className="flex items-center gap-6 text-[clamp(1.6rem,4vw,3.5rem)] font-semibold tracking-tight">
            {t(`projects.${next.slug}.vehicle`)}
            <ArrowIcon width={40} height={40} className="shrink-0 transition-transform duration-500 group-hover:translate-x-3" />
          </span>
        </Link>
      </section>

      <CtaBand title={t('projects.ctaTitle')} text={t('projects.ctaText')} keys={{ title: 'projects.ctaTitle', text: 'projects.ctaText' }} />
      <Lightbox items={items} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </article>
  );
}
