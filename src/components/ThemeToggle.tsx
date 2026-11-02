import { motion } from 'motion/react';
import { useT } from '../lib/useT';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/cn';

const spring = { type: 'spring' as const, stiffness: 260, damping: 22 };

/** Animated switch: the Sun morphs into the Moon (and back) when the theme changes. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const { t } = useT();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
      title={dark ? t('theme.toLight') : t('theme.toDark')}
      data-testid="theme-toggle"
      data-theme-state={theme}
      className={cn(
        'group relative grid h-11 w-11 place-items-center rounded-full border border-line text-fg transition-colors duration-300 hover:border-line-strong hover:bg-surface-2',
        className,
      )}
    >
      <motion.svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" animate={{ rotate: dark ? 40 : 90 }} transition={spring} aria-hidden="true">
        <mask id="moon-mask">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <motion.circle r="9" fill="black" initial={false} animate={dark ? { cx: 17, cy: 5 } : { cx: 30, cy: -6 }} transition={spring} />
        </mask>
        <motion.circle cx="12" cy="12" fill="currentColor" stroke="none" mask="url(#moon-mask)" initial={false} animate={{ r: dark ? 8.5 : 4.6 }} transition={spring} />
        <motion.g initial={false} animate={{ opacity: dark ? 0 : 1, scale: dark ? 0.4 : 1, rotate: dark ? -45 : 0 }} style={{ originX: '12px', originY: '12px' }} transition={spring}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="2.2" x2="12" y2="4.4" transform={`rotate(${a} 12 12)`} />
          ))}
        </motion.g>
      </motion.svg>
      <span className="sr-only">{dark ? t('theme.dark') : t('theme.light')}</span>
    </button>
  );
}
