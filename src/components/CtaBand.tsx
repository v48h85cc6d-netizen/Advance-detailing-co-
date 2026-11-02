import { Link } from 'react-router';
import { useT } from '../lib/useT';
import { business } from '../config/site';
import { useLang } from '../lib/useLang';
import { ArrowIcon, PhoneIcon } from './Icons';
import { Reveal, SplitHeading } from './Reveal';

export function CtaBand({ title, text }: { title: string; text: string }) {
  const { t } = useT();
  const { to } = useLang();
  return (
    <section className="section">
      <div className="container-lux">
        <div className="card-lux noise relative overflow-hidden bg-invert-bg px-6 py-16 text-invert-fg sm:px-14 sm:py-24">
          <div className="tri-pattern pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
          <div className="relative flex flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <SplitHeading text={title} className="h-display-md" />
              <Reveal>
                <p className="mt-6 max-w-lg text-base leading-relaxed opacity-70 sm:text-lg">{text}</p>
              </Reveal>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link to={to('/contact')} className="btn bg-invert-fg text-invert-bg hover:-translate-y-0.5">
                {t('common.contactUs')} <ArrowIcon width={16} height={16} />
              </Link>
              <a href={business.phone.href} className="btn border border-current/30 hover:-translate-y-0.5">
                <PhoneIcon width={16} height={16} /> {business.phone.display}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
