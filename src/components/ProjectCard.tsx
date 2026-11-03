import { useMemo, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Link } from 'react-router';
import { useT } from '../lib/useT';
import type { Project } from '../config/projects';
import { coverImage, slots, thumbOf } from '../config/images';
import { useLang } from '../lib/useLang';
import { ImageSlot } from './ImageSlot';
import { Lightbox, type LightboxItem } from './Lightbox';
import { ArrowIcon } from './Icons';
import { cn } from '../lib/cn';
import { visual } from '../lib/visual';

const ve = visual('src/components/ProjectCard.tsx');

/** Featured vehicle card with 3D tilt, glare and image zoom on hover. */
export function ProjectCard({ project, index, className, titleAs: Title = 'h3' }: { project: Project; index: number; className?: string; titleAs?: 'h2' | 'h3' }) {
  const { t } = useT();
  const { to } = useLang();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 200, damping: 20 });
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(600px circle at ${gx} ${gy}, rgba(255,255,255,0.16), transparent 45%)`;
  const p = `projects.${project.slug}`;
  const color = t(`${p}.color`);
  const href = to(`/projects/${project.slug}`);
  const [open, setOpen] = useState<number | null>(null);
  const vehicle = t(`${p}.vehicle`);
  // Optional in-card photo gallery (only projects with `cardGallery` set — currently the Audi RS3)
  const gallery: LightboxItem[] = useMemo(
    () =>
      project.cardGallery
        ? slots(project.folder, project.cardGallery).map((src, i) => ({
            src,
            alt: `${vehicle} — ${t('common.photo')} ${i + 1}`,
            caption: `${vehicle} — ${i + 1} / ${project.cardGallery}`,
            folder: project.folder,
          }))
        : [],
    [project.cardGallery, project.folder, vehicle, t],
  );
  const overlays = (
    <>
      <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: glare }} />
      <span className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-md">
        {String(index + 1).padStart(2, '0')}
      </span>
    </>
  );

  return (
    <motion.article
      {...ve(`card.project.${project.slug}`, 'card')}
      data-testid={`project-card-${project.slug}`}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className={cn('group card-lux flex flex-col shadow-[var(--shadow)] [transform-style:preserve-3d]', className)}
    >
      {gallery.length ? (
        <div className="relative aspect-[4/5] overflow-hidden bg-black" role="group" aria-label={`${vehicle} — ${t('projects.galleryTitle')}`} data-testid={`card-gallery-${project.slug}`}>
          <ul className="grid h-full grid-cols-3 grid-rows-3 gap-[3px]">
            {gallery.map((it, i) => (
              <li key={i} className="relative overflow-hidden">
                <button
                  type="button"
                  data-sound="gallery"
                  data-testid="card-gallery-tile"
                  onClick={() => setOpen(i)}
                  aria-label={`${t('common.openImage', { n: i + 1 })}: ${vehicle}`}
                  className="group/tile absolute inset-0 block cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
                >
                  <ImageSlot
                    src={it.src}
                    thumb={it.src ? thumbOf(it.src) : undefined}
                    alt={it.alt}
                    folder={project.folder}
                    index={i + 1}
                    className="absolute inset-0 transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover/tile:scale-[1.08]"
                    imgClassName="brightness-[0.92] transition-[filter] duration-700 group-hover/tile:brightness-105"
                    sizes="(min-width: 1024px) 12vw, 33vw"
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/0 transition-[box-shadow] duration-500 group-hover/tile:ring-white/35" />
                </button>
              </li>
            ))}
          </ul>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />
          {overlays}
          <span className="pointer-events-none absolute right-5 top-5 flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-md">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <rect x="0" y="0" width="3.2" height="3.2" rx=".6" /><rect x="4.4" y="0" width="3.2" height="3.2" rx=".6" /><rect x="8.8" y="0" width="3.2" height="3.2" rx=".6" />
              <rect x="0" y="4.4" width="3.2" height="3.2" rx=".6" /><rect x="4.4" y="4.4" width="3.2" height="3.2" rx=".6" /><rect x="8.8" y="4.4" width="3.2" height="3.2" rx=".6" />
              <rect x="0" y="8.8" width="3.2" height="3.2" rx=".6" /><rect x="4.4" y="8.8" width="3.2" height="3.2" rx=".6" /><rect x="8.8" y="8.8" width="3.2" height="3.2" rx=".6" />
            </svg>
            {t('common.photoCount', { count: gallery.length })}
          </span>
        </div>
      ) : (
        <Link to={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/5] overflow-hidden">
        <ImageSlot
          src={coverImage(project.folder)}
          alt={`${t(`${p}.vehicle`)} — ${t(`${p}.service`)}`}
          folder={project.folder}
          className="absolute inset-0 transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
          sizes="(min-width: 1024px) 33vw, 100vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
        <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: glare }} />
        <span className="absolute left-5 top-5 rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-md">
          {String(index + 1).padStart(2, '0')}
        </span>
        {project.badge && (
          <span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-black">{project.badge}</span>
        )}
        </Link>
      )}
      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7" style={{ transform: 'translateZ(30px)' }}>
        <div className="flex flex-col gap-2">
          <span {...ve(`card.project.${project.slug}.service`, 'text', { key: `${p}.service` })} className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-muted">{t(`${p}.service`)}</span>
          <Title {...ve(`card.project.${project.slug}.vehicle`, 'text', { key: `${p}.vehicle` })} className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{t(`${p}.vehicle`)}</Title>
          {project.slug === 'ferrari-488-pista' && <p className="serif-accent text-lg text-fg-2">{t(`${p}.title`)}</p>}
          {color && <p className="text-sm text-fg-2">{color}</p>}
        </div>
        <Link
          {...ve(`card.project.${project.slug}.cta`, 'button', { key: 'common.viewMore' })}
          to={href}
          data-testid={`project-link-${project.slug}`}
          className="mt-auto inline-flex items-center gap-3 self-start border-b border-line-strong pb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.22em] transition-colors hover:border-fg"
        >
          {t('common.viewMore')}
          <span className="sr-only">: {t(`${p}.vehicle`)}</span>
          <ArrowIcon width={16} height={16} className="transition-transform duration-500 group-hover:translate-x-1.5" />
        </Link>
      </div>
      {gallery.length > 0 && <Lightbox items={gallery} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
    </motion.article>
  );
}
