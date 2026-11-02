import { motion } from 'motion/react';
import { useT } from '../lib/useT';
import type { ServiceCategory } from '../config/services';
import { cn } from '../lib/cn';
import { visual } from '../lib/visual';

const ve = visual('src/components/ServiceCard.tsx');

export function ServiceCard({ id, category, index, className }: { id: string; category: ServiceCategory; index: number; className?: string }) {
  const { t } = useT();
  return (
    <motion.article
      {...ve(`card.service.${id}`, 'card')}
      data-testid="service-card"
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'group card-lux relative flex min-h-[16rem] flex-col justify-between gap-10 p-7 transition-colors duration-500 hover:border-line-strong sm:p-8',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--fg)_14%,transparent),transparent_70%)] opacity-0 transition-opacity duration-700 group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-4">
        <span className="text-silver animate-shimmer text-4xl font-light tracking-tight tabular-nums sm:text-5xl">{String(index + 1).padStart(2, '0')}</span>
        <span className="rounded-full border border-line px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted">
          {t(`services.categories.${category}`)}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <h3 {...ve(`card.service.${id}.name`, 'text', { key: `services.items.${id}.name` })} className="text-xl font-semibold leading-snug tracking-tight hyphens-auto">{t(`services.items.${id}.name`)}</h3>
        <p {...ve(`card.service.${id}.description`, 'text', { key: `services.items.${id}.description` })} className="text-sm leading-relaxed text-muted">{t(`services.items.${id}.description`)}</p>
      </div>
      <span aria-hidden="true" className="absolute inset-x-8 bottom-0 h-px origin-left scale-x-0 bg-fg transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
    </motion.article>
  );
}
