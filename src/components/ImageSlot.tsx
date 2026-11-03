import { useState } from 'react';
import { useT } from '../lib/useT';
import { cn } from '../lib/cn';
import { visual } from '../lib/visual';

const ve = visual('src/components/ImageSlot.tsx');

/**
 * A single, independent image container. If `src` is undefined (no photo uploaded yet)
 * or the file fails to load, an elegant branded placeholder is shown instead —
 * never a stock or AI photograph.
 */
export function ImageSlot({
  src,
  alt,
  index,
  folder,
  className,
  imgClassName,
  sizes,
  priority,
  label,
  thumb,
}: {
  src?: string;
  alt: string;
  index?: number;
  folder?: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  label?: string;
  /** lighter image to display (falls back to `src` automatically if it is missing) */
  thumb?: string;
}) {
  const { t } = useT();
  const [failed, setFailed] = useState(false);
  const [useThumb, setUseThumb] = useState(Boolean(thumb));
  const [loaded, setLoaded] = useState(false);
  const hasImage = Boolean(src) && !failed;

  return (
    <div {...ve(`image.${folder ?? 'misc'}.${index !== undefined ? String(index).padStart(2, '0') : 'cover'}`, 'image')} className={cn(/\b(absolute|fixed)\b/.test(className ?? '') ? '' : 'relative', 'overflow-hidden', className)} data-slot={folder} data-filled={hasImage ? 'true' : 'false'}>
      {hasImage ? (
        <img
          src={useThumb && thumb ? thumb : src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => (useThumb ? setUseThumb(false) : setFailed(true))}
          className={cn(
            'h-full w-full object-cover transition-[opacity,transform,filter] duration-[1.2s] ease-[var(--ease-out-expo)]',
            loaded ? 'scale-100 opacity-100 blur-0' : 'scale-[1.04] opacity-0 blur-md',
            imgClassName,
          )}
        />
      ) : (
        <div role="img" aria-label={`${alt} — ${t('common.photoComingSoon')}`} className="placeholder-surface noise absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className="tri-pattern absolute inset-0 opacity-60" aria-hidden="true" />
          <svg className="relative h-10 w-10 text-muted opacity-60" viewBox="0 0 24 21" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
            <path d="M12 1 23 20H1L12 1Z" />
            <path d="M6.5 10.5h11L12 20 6.5 10.5Z" />
          </svg>
          <span className="relative text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">
            {label ?? t('common.photoComingSoon')}
            {index !== undefined && ` · ${String(index).padStart(2, '0')}`}
          </span>
          {import.meta.env.DEV && folder && (
            <code className="relative rounded bg-surface-2 px-2 py-1 text-[0.6rem] text-muted">/public/assets/{folder}/</code>
          )}
        </div>
      )}
    </div>
  );
}
