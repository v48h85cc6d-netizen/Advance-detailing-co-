import { Link } from 'react-router';
import { useT } from '../lib/useT';
import { Logo } from './Logo';
import { NAV_ITEMS } from './Navbar';
import { SocialIcon, ArrowIcon } from './Icons';
import { useLang } from '../lib/useLang';
import { useConsent } from '../lib/consent';
import { business, fullAddress, maps, social } from '../config/site';
import { visual } from '../lib/visual';

const ve = visual('src/components/Footer.tsx');

export function Footer() {
  const { t } = useT();
  const { to } = useLang();
  const { openSettings } = useConsent();
  const year = new Date().getFullYear();

  return (
    <footer {...ve('footer', 'section')} className="relative overflow-hidden border-t border-line bg-bg-2">
      <div className="tri-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="container-lux relative pt-20 pb-10 sm:pt-28">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-6">
            <Link {...ve('footer.logo', 'image')} to={to('/')} aria-label={t('a11y.home')} className="block w-40 sm:w-48">
              <Logo variant="full" className="!h-auto w-full" />
            </Link>
            <p {...ve('footer.tagline', 'text', { key: 'footer.tagline' })} className="max-w-xs text-sm leading-relaxed text-muted">{t('footer.tagline')}</p>
            <ul className="flex gap-2">
              {social.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t('social.follow', { network: s.label })} (${t('common.opensNewTab')})`}
                    className="grid grid-cols-1 h-11 w-11 place-items-center rounded-full border border-line text-fg-2 transition-colors hover:border-fg hover:text-fg"
                  >
                    <SocialIcon id={s.id} width={18} height={18} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label={t('footer.navigation')}>
            <h2 className="eyebrow mb-6">{t('footer.navigation')}</h2>
            <ul className="flex flex-col gap-3">
              {NAV_ITEMS.map((n) => (
                <li key={n.key}>
                  <Link to={to(n.path)} className="link-underline text-fg-2 hover:text-fg">
                    {t(`nav.${n.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow mb-6">{t('footer.contact')}</h2>
            <ul className="flex flex-col gap-3 text-fg-2">
              <li>
                <a href={maps.directionsUrl} target="_blank" rel="noopener noreferrer" className="link-underline hover:text-fg">
                  {fullAddress}
                </a>
              </li>
              <li>
                <a href={business.phone.href} className="link-underline hover:text-fg">
                  {business.phone.display}
                </a>
              </li>
              <li>
                <a href={`mailto:${business.email}`} className="link-underline break-all hover:text-fg">
                  {business.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="eyebrow mb-6">{t('footer.legal')}</h2>
            <ul className="flex flex-col gap-3 text-fg-2">
              <li><Link to={to('/privacy')} className="link-underline hover:text-fg">{t('footer.privacy')}</Link></li>
              <li><Link to={to('/cookies')} className="link-underline hover:text-fg">{t('footer.cookies')}</Link></li>
              <li><Link to={to('/terms')} className="link-underline hover:text-fg">{t('footer.terms')}</Link></li>
              <li>
                <button type="button" onClick={openSettings} className="link-underline text-left hover:text-fg" data-testid="footer-cookie-settings">
                  {t('footer.cookieSettings')}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 flex flex-col-reverse items-start justify-between gap-6 border-t border-line pt-8 text-xs text-muted sm:flex-row sm:items-center">
          <p>
            © {year} {business.name} {t('footer.rights')}
          </p>
          <p className="hidden tracking-[0.35em] uppercase md:block">{(t('pillars', { returnObjects: true }) as string[]).join(' · ')}</p>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group flex items-center gap-2 uppercase tracking-[0.2em] hover:text-fg">
            {t('footer.backToTop')}
            <ArrowIcon width={14} height={14} className="-rotate-90 transition-transform group-hover:-translate-y-1" />
          </button>
        </div>
      </div>
    </footer>
  );
}
