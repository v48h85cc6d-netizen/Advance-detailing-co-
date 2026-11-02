import { useMemo, useState } from 'react';
import type { DraftChange } from './types';
import type { SaveState } from './store';
import { Button, Chip, cx } from './ui';
import { implementationHint } from './exporters';

const isColor = (s: string) => /^(#|rgb|hsl|oklch|color\()/i.test(s.trim());

function Value({ c, which }: { c: DraftChange; which: 'original' | 'proposed' }) {
  const v = c[which];
  if (c.property === 'src')
    return v && !v.startsWith('(') ? (
      <img src={v} alt="" className="h-14 w-20 rounded-md border border-white/10 object-cover" />
    ) : (
      <span className="grid h-14 w-20 place-items-center rounded-md border border-dashed border-white/15 text-[0.55rem] text-white/35">placeholder</span>
    );
  if (c.property === 'section-order')
    return (
      <ol className="list-decimal pl-4 text-[0.65rem] text-white/70">
        {(JSON.parse(v) as string[]).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    );
  return (
    <span className={cx('flex items-start gap-2 break-words text-[0.72rem]', which === 'original' ? 'text-white/45 line-through decoration-white/25' : 'text-white')}>
      {isColor(v) && <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-white/20" style={{ background: v }} />}
      <span className="min-w-0">{v.length > 220 ? v.slice(0, 220) + '…' : v || '—'}</span>
    </span>
  );
}

export function Review({
  changes,
  saveState,
  compare,
  onCompare,
  onView,
  onRemove,
  onClear,
  onCopy,
  onExport,
  onReload,
}: {
  changes: DraftChange[];
  saveState: SaveState;
  compare: 'draft' | 'original';
  onCompare: (m: 'draft' | 'original') => void;
  onView: (c: DraftChange) => void;
  onRemove: (ids: string[]) => void;
  onClear: () => void;
  onCopy: () => void;
  onExport: () => void;
  onReload: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const pending = changes.filter((c) => c.status !== 'implemented');
  const groups = useMemo(() => {
    const m = new Map<string, DraftChange[]>();
    for (const c of changes) {
      const g = `${c.route === '*' ? 'Global (navigation / footer)' : c.route} · ${c.lang === 'all' ? 'all languages' : c.lang.toUpperCase()}`;
      m.set(g, [...(m.get(g) ?? []), c]);
    }
    return [...m];
  }, [changes]);

  return (
    <div className="flex min-h-full flex-col" data-testid="review">
      <div className="border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[0.95rem] font-semibold">Change review</h2>
          <span className="text-[0.65rem] text-white/40" data-testid="save-state">
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved · .visual-editor/draft.json' : saveState === 'error' ? 'File save failed (kept in browser)' : 'Stored locally'}
          </span>
        </div>
        <p className="mt-1 text-[0.72rem] text-white/50">
          <span className="font-semibold text-white" data-testid="pending-count">
            {pending.length}
          </span>{' '}
          pending draft change{pending.length === 1 ? '' : 's'}
          {changes.length > pending.length && ` · ${changes.length - pending.length} implemented`}. Drafts are previews only — the source code is unchanged.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={onCopy} disabled={!pending.length} testid="copy-request">
            Copy Change Request
          </Button>
          <Button onClick={onExport} disabled={!changes.length} testid="export-json">
            Export Draft JSON
          </Button>
          <Button onClick={() => onCompare(compare === 'draft' ? 'original' : 'draft')} testid="preview-all">
            {compare === 'draft' ? 'Preview: all changes ✓' : 'Preview All Changes'}
          </Button>
          {confirm ? (
            <div className="flex gap-1">
              <Button variant="danger" onClick={() => (onClear(), setConfirm(false))} testid="clear-confirm" className="flex-1">
                Clear all
              </Button>
              <Button variant="quiet" onClick={() => setConfirm(false)}>
                ✕
              </Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirm(true)} disabled={!changes.length} testid="clear-draft">
              Clear Draft
            </Button>
          )}
        </div>
        <button type="button" onClick={onReload} className="mt-3 text-[0.65rem] text-white/40 underline-offset-4 hover:text-white hover:underline">
          Reload statuses from .visual-editor/draft.json
        </button>
      </div>

      {!changes.length ? (
        <div className="grid flex-1 place-items-center px-8 py-16 text-center text-[0.78rem] leading-relaxed text-white/40">
          No draft changes yet.
          <br />
          Turn on Select, click any element in the preview and edit it in the inspector.
        </div>
      ) : (
        <div className="flex flex-col gap-6 px-5 py-5">
          {groups.map(([g, list]) => (
            <div key={g}>
              <h3 className="mb-2.5 text-[0.6rem] font-bold uppercase tracking-[0.22em] text-white/40">{g}</h3>
              <ul className="flex flex-col gap-2.5">
                {list.map((c) => (
                  <li key={c.id} data-testid="change-item" data-change-id={c.id} className="rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip>{c.category}</Chip>
                      {c.status === 'implemented' ? <Chip tone="done">implemented ✓</Chip> : <Chip tone="draft">draft · not in source</Chip>}
                      <span className="ml-auto font-mono text-[0.6rem] text-white/35">{c.property}</span>
                    </div>
                    <p className="mt-2 break-all font-mono text-[0.66rem] text-white/70">{c.elementId}</p>
                    {c.i18nKey && <p className="font-mono text-[0.62rem] text-white/40">key: {c.i18nKey}</p>}
                    <div className="mt-2.5 grid grid-cols-1 gap-1.5">
                      <Value c={c} which="original" />
                      <Value c={c} which="proposed" />
                    </div>
                    <p className="mt-2.5 text-[0.62rem] leading-relaxed text-white/35">{implementationHint(c)}</p>
                    {c.implementationNote && <p className="mt-1 text-[0.62rem] text-emerald-200/70">{c.implementationNote}</p>}
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => onView(c)} testid="change-view">
                        View
                      </Button>
                      <Button variant="quiet" onClick={() => onRemove([c.id])} testid="change-remove">
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
