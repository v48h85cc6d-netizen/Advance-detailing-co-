import { useEffect, useState, type ReactNode } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Section({ title, children, defaultOpen = true, testid }: { title: string; children: ReactNode; defaultOpen?: boolean; testid?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-white/[0.07]" data-testid={testid}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.24em] text-white/55 hover:text-white">
        {title}
        <span className={cx('transition-transform', open ? 'rotate-180' : '')}>⌄</span>
      </button>
      {open && <div className="flex flex-col gap-3.5 px-5 pb-5">{children}</div>}
    </section>
  );
}

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[0.7rem] font-medium text-white/60">
        {label}
        {hint && <span className="text-[0.62rem] text-white/35">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.8rem] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/40';

/** Text input that commits on change but keeps local state while typing. */
export function TextInput({ value, onChange, placeholder, testid, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; testid?: string; mono?: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className={cx(inputCls, mono && 'font-mono text-[0.72rem]')}
      value={v}
      placeholder={placeholder}
      data-testid={testid}
      onChange={(e) => {
        setV(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

export function TextArea({ value, onChange, testid, rows = 3, disabled }: { value: string; onChange: (v: string) => void; testid?: string; rows?: number; disabled?: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <textarea
      className={cx(inputCls, 'resize-y leading-relaxed', disabled && 'opacity-40')}
      rows={rows}
      value={v}
      disabled={disabled}
      data-testid={testid}
      onChange={(e) => {
        setV(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

export function Select({ value, options, onChange, testid }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; testid?: string }) {
  return (
    <select className={cx(inputCls, 'appearance-none bg-[#141416]')} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
      {!options.some((o) => o.value === value) && <option value={value}>{value || '—'}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({ value, options, onChange, testid, size = 'md' }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; testid?: string; size?: 'sm' | 'md' }) {
  return (
    <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5" role="radiogroup" data-testid={testid}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          aria-label={o.title}
          data-value={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors',
            size === 'sm' ? 'px-2 py-1 text-[0.65rem]' : 'px-2.5 py-1.5 text-[0.7rem]',
            value === o.value ? 'bg-[#f4f4f3] text-[#050505]' : 'text-white/60 hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const parsePx = (v: string | undefined, fallback = 0) => {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? n : fallback;
};

/** Slider + free CSS value input. */
export function SliderField({ label, value, min, max, step = 1, unit = 'px', onChange, testid }: { label: string; value: string; min: number; max: number; step?: number; unit?: string; onChange: (v: string, coalesce: boolean) => void; testid?: string }) {
  const n = parsePx(value, min);
  return (
    <Row label={label} hint={value}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, n))}
          onChange={(e) => onChange(`${e.target.value}${unit}`, true)}
          className="h-1 flex-1 cursor-pointer accent-[#f4f4f3]"
          data-testid={testid}
          aria-label={label}
        />
        <div className="w-20">
          <TextInput value={value} onChange={(v) => onChange(v, true)} />
        </div>
      </div>
    </Row>
  );
}

export function toHex(c: string): string {
  const m = c.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map((x) => Math.round(+x).toString(16).padStart(2, '0')).join('');
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
  return '#000000';
}

export function ColorField({ label, value, onChange, testid }: { label: string; value: string; onChange: (v: string, coalesce: boolean) => void; testid?: string }) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/15" style={{ background: value }}>
          <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value, true)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={label} data-testid={testid} />
        </span>
        <TextInput value={value} onChange={(v) => onChange(v, true)} mono />
      </div>
    </Row>
  );
}

export function Button({ children, onClick, variant = 'ghost', disabled, testid, title, className }: { children: ReactNode; onClick?: () => void; variant?: 'ghost' | 'primary' | 'danger' | 'quiet'; disabled?: boolean; testid?: string; title?: string; className?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className={cx(
        'inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-[0.72rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30',
        variant === 'primary' && 'bg-[#f4f4f3] text-[#050505] hover:bg-white',
        variant === 'ghost' && 'border border-white/12 text-white/85 hover:border-white/35 hover:text-white',
        variant === 'danger' && 'border border-red-500/40 text-red-300 hover:bg-red-500/10',
        variant === 'quiet' && 'text-white/60 hover:bg-white/5 hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'draft' | 'done' | 'warn' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.16em]',
        tone === 'neutral' && 'bg-white/8 text-white/70',
        tone === 'draft' && 'bg-amber-400/15 text-amber-200',
        tone === 'done' && 'bg-emerald-400/15 text-emerald-200',
        tone === 'warn' && 'bg-red-400/15 text-red-200',
      )}
    >
      {children}
    </span>
  );
}
