import { Reveal, SplitHeading } from './Reveal';
import { visual } from '../lib/visual';

const ve = visual('src/components/PageHeader.tsx');

export function PageHeader({ eyebrow, title, text, children, page = 'page', keys }: { eyebrow: string; title: string; text?: string; children?: React.ReactNode; page?: string; keys?: { eyebrow?: string; title?: string; text?: string } }) {
  return (
    <header {...ve(`${page}.header`, 'section')} className="relative overflow-hidden pt-36 pb-16 sm:pt-44 sm:pb-24">
      <div className="tri-pattern pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
      <div className="container-lux relative flex flex-col gap-7">
        <span {...ve(`${page}.header.eyebrow`, 'text', { key: keys?.eyebrow })} className="eyebrow">{eyebrow}</span>
        <SplitHeading as="h1" text={title} immediate delay={0.1} className="h-display-xl max-w-[16ch]" visual={ve(`${page}.header.title`, 'text', { key: keys?.title })} />
        {text && (
          <Reveal delay={0.3}>
            <p {...ve(`${page}.header.text`, 'text', { key: keys?.text })} className="lead max-w-2xl">{text}</p>
          </Reveal>
        )}
        {children}
      </div>
    </header>
  );
}
