import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../lib/useT';
import { ImageSlot } from './ImageSlot';
import { ChevronIcon, CloseIcon, ExpandIcon } from './Icons';

export interface LightboxItem {
  src?: string;
  alt: string;
  caption?: string;
  folder?: string;
}

/** Full-screen lightbox with keyboard, swipe, next/previous and native fullscreen. */
export function Lightbox({ items, index, onClose, onIndex }: { items: LightboxItem[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const { t } = useT();
  const [dir, setDir] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = index !== null;
  const count = items.length;

  const go = useCallback(
    (d: number) => {
      if (index === null) return;
      setDir(d);
      onIndex((index + d + count) % count);
    },
    [index, count, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add('scroll-locked');
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab' && rootRef.current) {
        const f = rootRef.current.querySelectorAll<HTMLElement>('button');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.documentElement.classList.remove('scroll-locked');
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      prevFocus?.focus?.();
    };
  }, [open, go, onClose]);

  // Preload the previous and next full-size photo while the current one is shown.
  useEffect(() => {
    if (index === null || count < 2) return;
    for (const d of [1, -1]) {
      const s = items[(index + d + count) % count]?.src;
      if (s) {
        const img = new Image();
        img.decoding = 'async';
        img.src = s;
      }
    }
  }, [index, count, items]);

  const toggleFs = () => {
    if (!document.fullscreenElement) rootRef.current?.requestFullscreen?.().catch(() => undefined);
    else document.exitFullscreen().catch(() => undefined);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  };

  const item = index !== null ? items[index] : null;

  return createPortal(
    <AnimatePresence>
      {open && item && (
        <motion.div
          ref={rootRef}
          role="dialog"
          aria-modal="true"
          aria-label={item.alt}
          data-testid="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[80] flex flex-col bg-black/95 text-white backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <span className="text-xs font-semibold tracking-[0.3em] text-white/60" data-testid="lightbox-counter">
              {String(index! + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
            <div className="flex gap-2">
              {'requestFullscreen' in document.documentElement && (
                <button type="button" onClick={toggleFs} aria-label={isFs ? t('common.exitFullscreen') : t('common.fullscreen')} className="grid grid-cols-1 h-11 w-11 place-items-center rounded-full border border-white/15 hover:bg-white/10">
                  <ExpandIcon />
                </button>
              )}
              <button ref={closeRef} type="button" onClick={onClose} aria-label={t('common.close')} data-testid="lightbox-close" className="grid grid-cols-1 h-11 w-11 place-items-center rounded-full border border-white/15 hover:bg-white/10">
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 sm:px-20">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div
                key={index}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 80, scale: 0.97 }),
                  center: { opacity: 1, x: 0, scale: 1 },
                  exit: (d: number) => ({ opacity: 0, x: d * -80, scale: 0.97 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                drag={count > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={onDragEnd}
                className="flex h-full w-full items-center justify-center"
              >
                {item.src ? (
                  <img src={item.src} alt={item.alt} decoding="async" className="max-h-full max-w-full select-none rounded-lg object-contain" draggable={false} />
                ) : (
                  <ImageSlot alt={item.alt} folder={item.folder} index={index! + 1} className="aspect-[4/3] w-full max-w-4xl rounded-2xl" />
                )}
              </motion.div>
            </AnimatePresence>

            {count > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label={t('common.previous')} data-testid="lightbox-prev" className="absolute left-3 top-1/2 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur hover:bg-white/10 sm:grid">
                  <ChevronIcon dir="left" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label={t('common.next')} data-testid="lightbox-next" className="absolute right-3 top-1/2 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur hover:bg-white/10 sm:grid">
                  <ChevronIcon />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
            <p className="text-sm text-white/70">{item.caption ?? item.alt}</p>
            {count > 1 && (
              <div className="flex gap-2 sm:hidden">
                <button type="button" onClick={() => go(-1)} aria-label={t('common.previous')} className="grid grid-cols-1 h-11 w-11 place-items-center rounded-full border border-white/15">
                  <ChevronIcon dir="left" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label={t('common.next')} className="grid grid-cols-1 h-11 w-11 place-items-center rounded-full border border-white/15">
                  <ChevronIcon />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
