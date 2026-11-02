import { useRef, type ElementType, type ReactNode } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';
import { cn } from '../lib/cn';
import { visual } from '../lib/visual';

const ve = visual('src/components/Reveal.tsx');

/** Fades/lifts children into view on scroll (GSAP ScrollTrigger). Children with [data-reveal] are staggered. */
export function Reveal({ children, className, as: Tag = 'div', stagger = 0.08, y = 40, delay = 0 }: { children: ReactNode; className?: string; as?: ElementType; stagger?: number; y?: number; delay?: number }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const targets = ref.current.querySelectorAll('[data-reveal]');
      gsap.from(targets.length ? targets : ref.current, {
        y,
        opacity: 0,
        duration: 1.1,
        delay,
        stagger,
        ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
      });
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** Headline that reveals word-by-word from behind a mask. */
export function SplitHeading({ text, as: Tag = 'h2', className, delay = 0, immediate = false, id, visual: vis }: { text: string; as?: ElementType; className?: string; delay?: number; immediate?: boolean; id?: string; visual?: Record<string, string> }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const words = ref.current.querySelectorAll('.sw');
      gsap.from(words, {
        yPercent: 110,
        rotate: 4,
        duration: 1.2,
        delay,
        stagger: 0.06,
        ease: 'expo.out',
        scrollTrigger: immediate ? undefined : { trigger: ref.current, start: 'top 88%', once: true },
      });
    },
    { scope: ref, dependencies: [text] },
  );
  return (
    <Tag ref={ref} id={id} {...vis} className={cn('display', className)} aria-label={text}>
      {text.split(' ').map((w, i, arr) => (
        <span key={i}>
          <span aria-hidden="true" className="-mt-[0.12em] inline-block max-w-full overflow-hidden pt-[0.12em] pb-[0.08em] align-bottom">
            <span className="sw inline-block max-w-full will-change-transform">{w}</span>
          </span>
          {i < arr.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}

/** Image reveal: clip-path wipe + subtle parallax. */
export function ParallaxReveal({ children, className, amount = 8 }: { children: ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const inner = ref.current.querySelector('[data-parallax]');
      gsap.fromTo(ref.current, { clipPath: 'inset(12% 8% 12% 8% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true } });
      if (inner)
        gsap.fromTo(inner, { yPercent: -amount }, { yPercent: amount, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={cn('overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, text, align = 'left', className, as = 'h2', i18nBase }: { eyebrow?: string; title: string; text?: string; align?: 'left' | 'center'; className?: string; as?: ElementType; i18nBase?: string }) {
  return (
    <div className={cn('flex flex-col gap-6', align === 'center' && 'items-center text-center', className)}>
      {eyebrow && <span {...(i18nBase ? ve(`${i18nBase}.eyebrow`, 'text', { key: `${i18nBase}.eyebrow` }) : {})} className="eyebrow">{eyebrow}</span>}
      <SplitHeading as={as} text={title} className="h-display-lg max-w-[18ch]" visual={i18nBase ? ve(`${i18nBase}.title`, 'text', { key: `${i18nBase}.title` }) : undefined} />
      {text && (
        <Reveal>
          <p {...(i18nBase ? ve(`${i18nBase}.text`, 'text', { key: `${i18nBase}.text` }) : {})} className={cn('lead max-w-xl', align === 'center' && 'mx-auto')}>{text}</p>
        </Reveal>
      )}
    </div>
  );
}
