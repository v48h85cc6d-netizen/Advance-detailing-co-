import { useT } from '../lib/useT';
import { logo } from '../config/images';
import { cn } from '../lib/cn';

type Variant = 'nav' | 'full' | 'symbol';
const SRC: Record<Variant, { white: string; black: string; ratio: number }> = {
  nav: { white: logo.navWhite, black: logo.navBlack, ratio: 1518 / 400 },
  full: { white: logo.fullWhite, black: logo.fullBlack, ratio: 922 / 1021 },
  symbol: { white: logo.symbolWhite, black: logo.symbolBlack, ratio: 756 / 760 },
};

/**
 * Official logo — white version on dark theme, black version on light theme.
 * Both are rendered and swapped with CSS so the switch is instant and flash-free.
 * `tone="white"` forces the white version (e.g. on the intro / photography).
 */
export function Logo({ variant = 'nav', className, tone, eager }: { variant?: Variant; className?: string; tone?: 'white' | 'black'; eager?: boolean }) {
  const { t } = useT();
  const s = SRC[variant];
  const common = { alt: t('a11y.logoAlt'), draggable: false, decoding: 'async' as const, loading: eager ? ('eager' as const) : ('lazy' as const) };
  const style = { aspectRatio: String(s.ratio) };
  if (tone) return <img src={tone === 'white' ? s.white : s.black} {...common} className={cn('block h-full w-auto', className)} style={style} />;
  return (
    <span className={cn('relative inline-block', className)} style={style}>
      <img src={s.white} {...common} className="hidden h-full w-auto dark:block" style={style} />
      <img src={s.black} {...common} className="block h-full w-auto dark:hidden" style={style} />
    </span>
  );
}
