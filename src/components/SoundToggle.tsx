import { motion } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { sound } from '../lib/sound';
import { useT } from '../lib/useT';
import { cn } from '../lib/cn';

const spring = { type: 'spring' as const, stiffness: 320, damping: 26 };

/** Minimal Sound ON/OFF switch for the navigation (styled like the theme switch). */
export function SoundToggle({ className }: { className?: string }) {
  const { t } = useT();
  const on = useSyncExternalStore(
    (cb) => sound.subscribe(cb),
    () => sound.enabled,
    () => true,
  );
  if (!sound.supported) return null;
  return (
    <button
      type="button"
      data-sound="none"
      data-testid="sound-toggle"
      data-sound-state={on ? 'on' : 'off'}
      aria-pressed={on}
      aria-label={on ? t('sound.turnOff') : t('sound.turnOn')}
      title={on ? t('sound.turnOff') : t('sound.turnOn')}
      onClick={() => {
        const next = !on;
        sound.setEnabled(next);
        if (next) sound.play('switch'); // audible confirmation only when turning sound on
      }}
      className={cn(
        'group relative grid h-11 w-11 place-items-center rounded-full border border-line text-fg transition-colors duration-300 hover:border-line-strong hover:bg-surface-2',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5h3.2L11.5 6v12l-4.3-3.5H4z" fill="currentColor" fillOpacity={0.12} />
        <motion.path d="M15 9.2a4 4 0 0 1 0 5.6" initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={spring} />
        <motion.path d="M17.6 6.8a7.4 7.4 0 0 1 0 10.4" initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ ...spring, delay: on ? 0.06 : 0 }} />
        <motion.path d="M15.5 10l4 4M19.5 10l-4 4" initial={false} animate={{ pathLength: on ? 0 : 1, opacity: on ? 0 : 1 }} transition={spring} />
      </svg>
      <span className="sr-only">{on ? t('sound.on') : t('sound.off')}</span>
    </button>
  );
}
