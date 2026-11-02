import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Link } from 'react-router';
import { useT } from '../lib/useT';
import type { Project } from '../config/projects';
import { coverImage } from '../config/images';
import { useLang } from '../lib/useLang';
import { ImageSlot } from './ImageSlot';
import { ArrowIcon } from './Icons';
import { cn } from '../lib/cn';

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

  return (
    <motion.article
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
      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-7" style={{ transform: 'translateZ(30px)' }}>
        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-muted">{t(`${p}.service`)}</span>
          <Title className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{t(`${p}.vehicle`)}</Title>
          {project.slug === 'ferrari-488-pista' && <p className="serif-accent text-lg text-fg-2">{t(`${p}.title`)}</p>}
          {color && <p className="text-sm text-fg-2">{color}</p>}
        </div>
        <Link
          to={href}
          data-testid={`project-link-${project.slug}`}
          className="mt-auto inline-flex items-center gap-3 self-start border-b border-line-strong pb-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.22em] transition-colors hover:border-fg"
        >
          {t('common.viewMore')}
          <span className="sr-only">: {t(`${p}.vehicle`)}</span>
          <ArrowIcon width={16} height={16} className="transition-transform duration-500 group-hover:translate-x-1.5" />
        </Link>
      </div>
    </motion.article>
  );
}
