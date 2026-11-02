import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useT } from '../lib/useT';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLang } from '../lib/useLang';
import { business } from '../config/site';
import { cn } from '../lib/cn';
import { visual } from '../lib/visual';

const ve = visual('src/components/Navbar.tsx');

export const NAV_ITEMS = [
  { key: 'home', path: '/' },
  { key: 'services', path: '/services' },
  { key: 'about', path: '/about' },
  { key: 'gallery', path: '/gallery' },
  { key: 'contact', path: '/contact' },
] as const;

function isActive(rest: string, path: string) {
  if (path === '/') return rest === '/';
  if (path === '/gallery' && rest.startsWith('/projects')) return true;
  return rest === path || rest.startsWith(path + '/');
}

export function Navbar() {
  const { t } = useT();
  const { to, rest } = useLang();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(y > 320 && y > prev + 4 && !open);
    if (y < prev - 4) setHidden(false);
  });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle('scroll-locked', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? -120 : 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
      >
        <nav
          {...ve('nav.bar', 'nav')}
          aria-label={t('a11y.mainNav')}
          className={cn(
            'glass mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 rounded-full pl-5 pr-2.5 transition-[box-shadow,background-color] duration-500 sm:h-[4.25rem] sm:pl-7',
            scrolled && 'shadow-[var(--shadow)]',
          )}
        >
          <Link {...ve('nav.logo', 'image')} to={to('/')} aria-label={t('a11y.home')} className="flex h-8 shrink-0 items-center sm:h-9" data-testid="nav-logo">
            <Logo variant="nav" className="h-full" eager />
          </Link>

          {/* Desktop navigation — no hamburger */}
          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(rest, item.path);
              return (
                <li key={item.key}>
                  <NavLink
                    {...ve(`nav.link.${item.key}`, 'nav', { key: `nav.${item.key}` })}
                    to={to(item.path)}
                    end={item.path === '/'}
                    aria-current={active ? 'page' : undefined}
                    data-testid={`nav-${item.key}`}
                    className={cn(
                      'relative block rounded-full px-4 py-2.5 text-[0.8rem] font-medium tracking-wide transition-colors duration-300 xl:px-5',
                      active ? 'text-bg' : 'text-fg-2 hover:text-fg',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-fg"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{t(`nav.${item.key}`)}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
            <Link {...ve('nav.book', 'button', { key: 'nav.book' })} to={to('/contact')} className="btn btn-primary !hidden !px-5 !py-3 xl:!inline-flex" style={{ minHeight: 44 }}>
              {t('nav.book')}
            </Link>
            <button
              type="button"
              className="relative grid grid-cols-1 h-11 w-11 place-items-center rounded-full border border-line lg:hidden"
              aria-label={open ? t('a11y.closeMenu') : t('a11y.openMenu')}
              aria-expanded={open}
              aria-controls="mobile-menu"
              data-testid="menu-toggle"
              onClick={() => setOpen((o) => !o)}
            >
              <motion.span animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }} className="absolute h-[1.5px] w-5 bg-fg" />
              <motion.span animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }} className="absolute h-[1.5px] w-5 bg-fg" />
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile / tablet premium menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('a11y.mainNav')}
            initial={{ clipPath: 'circle(0% at calc(100% - 44px) 44px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 44px) 44px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 44px) 44px)' }}
            transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }}
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-bg px-6 pb-10 pt-28 lg:hidden"
          >
            <div className="tri-pattern pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
            <ul className="relative flex flex-col gap-1">
              {NAV_ITEMS.map((item, i) => (
                <motion.li
                  key={item.key}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NavLink
                    to={to(item.path)}
                    end={item.path === '/'}
                    className={cn(
                      'flex items-baseline gap-4 border-b border-line py-4 text-[2.1rem] font-semibold tracking-tight xs:text-[2.5rem]',
                      isActive(rest, item.path) ? 'text-fg' : 'text-muted',
                    )}
                  >
                    <span className="text-xs font-medium tracking-[0.2em] text-muted">0{i + 1}</span>
                    {t(`nav.${item.key}`)}
                  </NavLink>
                </motion.li>
              ))}
            </ul>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="relative mt-10 flex flex-col gap-6">
              <LanguageSwitcher inline onSelect={() => setOpen(false)} />
              <div className="flex flex-col gap-2 text-fg-2">
                <a href={business.phone.href} className="text-lg">{business.phone.display}</a>
                <a href={`mailto:${business.email}`} className="text-lg break-all">{business.email}</a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
