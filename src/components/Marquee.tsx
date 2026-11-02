import { useT } from '../lib/useT';
import { TriangleMark } from './Icons';
import { visual } from '../lib/visual';

const ve = visual('src/components/Marquee.tsx');

export function Marquee() {
  const { t } = useT();
  const words = t('pillars', { returnObjects: true }) as string[];
  const row = [...words, ...words];
  return (
    <div {...ve('home.marquee', 'section')} className="relative overflow-hidden border-y border-line py-7 sm:py-9" aria-hidden="true">
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap will-change-transform sm:gap-16">
        {[...row, ...row].map((w, i) => (
          <span key={i} className="flex items-center gap-10 sm:gap-16">
            <span className={i % 2 ? 'serif-accent text-3xl text-fg-2 sm:text-5xl' : 'text-3xl font-semibold uppercase tracking-tight sm:text-5xl'}>{w}</span>
            <TriangleMark width={22} height={20} className="text-muted" />
          </span>
        ))}
      </div>
    </div>
  );
}
