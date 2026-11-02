import { motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useT } from '../lib/useT';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CookieConsent } from './CookieConsent';
import { ScrollTrigger } from '../lib/gsap';
import { langFromPath } from '../lib/lang';

export function Layout({ children, introActive }: { children: ReactNode; introActive: boolean }) {
  const { t, i18n } = useT();
  const { pathname, hash } = useLocation();
  const { lang, rest } = langFromPath(pathname);
  const prevRest = useRef(rest);

  useLayoutEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  }, [lang, i18n]);

  // Scroll handling: top on page change, keep position when only the language changed.
  useEffect(() => {
    const sameDoc = prevRest.current === rest;
    prevRest.current = rest;
    if (hash) {
      window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 120);
    } else if (!sameDoc) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 700);
    return () => window.clearTimeout(id);
  }, [pathname, rest, hash]);

  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-fg focus:px-5 focus:py-3 focus:text-bg">
        {t('a11y.skipToContent')}
      </a>
      <Navbar />
      <motion.main
        id="main"
        key={rest}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        tabIndex={-1}
        className="outline-none"
      >
        {children}
      </motion.main>
      <Footer />
      <CookieConsent suppressed={introActive} />
    </>
  );
}
