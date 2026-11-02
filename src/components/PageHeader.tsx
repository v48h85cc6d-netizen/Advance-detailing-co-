import { Reveal, SplitHeading } from './Reveal';

export function PageHeader({ eyebrow, title, text, children }: { eyebrow: string; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden pt-36 pb-16 sm:pt-44 sm:pb-24">
      <div className="tri-pattern pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
      <div className="container-lux relative flex flex-col gap-7">
        <span className="eyebrow">{eyebrow}</span>
        <SplitHeading as="h1" text={title} immediate delay={0.1} className="h-display-xl max-w-[16ch]" />
        {text && (
          <Reveal delay={0.3}>
            <p className="lead max-w-2xl">{text}</p>
          </Reveal>
        )}
        {children}
      </div>
    </header>
  );
}
