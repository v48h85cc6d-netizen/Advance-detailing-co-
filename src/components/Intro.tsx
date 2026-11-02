import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../lib/useT';
import { introVideo } from '../config/images';
import { Logo } from './Logo';

export const INTRO_KEY = 'adc-intro';

/** Should the intro play for this visit? Only when landing on the homepage, once per session. */
export function shouldShowIntro(rest: string) {
  if (rest !== '/') return false;
  if (/[?&]nointro\b/.test(location.search)) return false;
  try {
    return sessionStorage.getItem(INTRO_KEY) !== '1';
  } catch {
    return true;
  }
}

/**
 * Cinematic intro using the supplied video (muted, autoplay, playsInline).
 * Portrait screens: full-bleed video. Wide screens: sharp portrait video in the
 * centre over a full-screen blurred ambient copy, with the official logo.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [wide, setWide] = useState(() => window.matchMedia('(min-aspect-ratio: 4/5)').matches);
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const progress = useMotionValue(0);
  const smooth = useSpring(progress, { stiffness: 120, damping: 30 });

  const finish = useCallback(() => {
    setLeaving((l) => {
      if (!l) {
        try {
          sessionStorage.setItem(INTRO_KEY, '1');
        } catch {
          /* ignore */
        }
      }
      return true;
    });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-aspect-ratio: 4/5)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    document.documentElement.classList.add('scroll-locked');
    return () => {
      mq.removeEventListener('change', on);
      document.documentElement.classList.remove('scroll-locked');
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduced) {
      setBlocked(true);
      const id = window.setTimeout(finish, 2600);
      return () => window.clearTimeout(id);
    }
    let started = false;
    // Slow network: never keep the visitor waiting on a black screen.
    const stall = window.setTimeout(() => !started && finish(), 4500);
    const onPlaying = () => (started = true);
    const onTime = () => v.duration && progress.set(v.currentTime / v.duration);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', finish);
    v.play().catch(() => {
      // Autoplay refused (e.g. iOS Low Power Mode) — present the logo instead.
      setBlocked(true);
      window.setTimeout(finish, 3500);
    });
    return () => {
      window.clearTimeout(stall);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', finish);
    };
  }, [finish, progress, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [finish]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {!leaving && (
        <motion.div
          key="intro"
          role="dialog"
          aria-label={t('intro.label')}
          data-testid="intro"
          className="fixed inset-0 z-[100] overflow-hidden bg-black text-white"
          exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          transition={{ duration: 1.1, ease: [0.7, 0, 0.2, 1] }}
        >
          {wide && !reduced && (
            <video
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
              src={introVideo.ambient}
              autoPlay
              muted
              playsInline
              loop
              preload="auto"
              aria-hidden="true"
            />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)]" aria-hidden="true" />

          <motion.video
            ref={videoRef}
            className={
              wide
                ? 'absolute left-1/2 top-0 h-full w-auto -translate-x-1/2 object-cover shadow-[0_0_120px_rgba(0,0,0,0.9)]'
                : 'absolute inset-0 h-full w-full object-cover'
            }
            style={wide ? { aspectRatio: '9 / 16' } : undefined}
            muted
            playsInline
            autoPlay={!reduced}
            preload="auto"
            poster={introVideo.poster}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: blocked ? 0.35 : 1, scale: 1 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
            data-testid="intro-video"
          >
            <source src={introVideo.webm} type="video/webm" />
            <source src={introVideo.mp4} type="video/mp4" />
          </motion.video>

          {/* Gradient for legibility */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 to-transparent" />

          {/* Logo presentation */}
          {wide ? (
            <>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-[6vw] top-1/2 hidden w-[min(22vw,320px)] -translate-y-1/2 md:block"
              >
                <Logo variant="full" tone="white" eager className="!h-auto w-full" />
              </motion.div>
              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.25, delayChildren: 1 } } }}
                className="absolute right-[6vw] top-1/2 hidden -translate-y-1/2 flex-col items-end gap-4 md:flex"
              >
                {(t('pillars', { returnObjects: true }) as string[]).map((p) => (
                  <motion.li
                    key={p}
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } } }}
                    className="text-[clamp(0.8rem,1.3vw,1.1rem)] font-semibold uppercase tracking-[0.45em] text-white/85"
                  >
                    {p}
                  </motion.li>
                ))}
              </motion.ul>
            </>
          ) : null}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1.2 }}
            className={wide ? 'absolute left-1/2 top-7 h-9 -translate-x-1/2 md:hidden' : 'absolute left-1/2 top-[max(1.5rem,env(safe-area-inset-top))] h-10 -translate-x-1/2'}
          >
            <Logo variant="nav" tone="white" eager className="h-full" />
          </motion.div>

          {blocked && (
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2 }} className="absolute inset-0 grid grid-cols-1 place-items-center">
              <div className="flex flex-col items-center gap-8">
                <Logo variant="full" tone="white" eager className="!h-auto w-48 sm:w-64" />
                <button type="button" onClick={finish} className="btn border border-white/40 text-white hover:bg-white hover:text-black">
                  {t('intro.enter')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Controls */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10 sm:pb-10">
            <div className="h-px flex-1 overflow-hidden bg-white/20" aria-hidden="true">
              <motion.div className="h-full origin-left bg-white" style={{ scaleX: smooth }} />
            </div>
            <button
              type="button"
              onClick={finish}
              data-testid="skip-intro"
              className="group flex h-12 items-center gap-3 rounded-full border border-white/30 bg-black/30 px-6 text-[0.72rem] font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black"
            >
              {t('intro.skip')}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M5 5l8 7-8 7M14 5l5 7-5 7" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
