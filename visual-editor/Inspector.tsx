import { useRef, useState } from 'react';
import type { ChangeCategory, DraftChange, ElementInfo, Lang } from './types';
import type { ChangeInput } from './store';
import { Button, Chip, ColorField, Row, Section, Segmented, Select, SliderField, TextArea, TextInput, parsePx } from './ui';

const LANG_LABEL: Record<Lang, string> = { sq: 'Shqip', en: 'English', de: 'Deutsch' };
const TEXTY = new Set(['text', 'button', 'nav']);

export interface InspectorProps {
  info: ElementInfo;
  changes: DraftChange[];
  onUpsert: (items: ChangeInput[], coalesce?: boolean) => void;
  onRemove: (ids: string[]) => void;
  onSelect: (selector: string) => void;
  onKeyChoice: (key: string) => void;
}

export function Inspector({ info, changes, onUpsert, onRemove, onSelect, onKeyChoice }: InspectorProps) {
  const route = info.global ? '*' : info.route;
  const styleKey = (prop: string) => `${route}|all|${info.selector}|${prop}`;
  const textKey = (lang: Lang) => (info.i18nKey ? `i18n|${lang}|${info.i18nKey}` : `${route}|${lang}|${info.selector}|text`);
  const find = (key: string) => changes.find((c) => c.key === key);
  const mine = changes.filter(
    (c) =>
      c.selector === info.selector ||
      (info.i18nKey && c.i18nKey === info.i18nKey) ||
      (info.canReorder && c.property === 'section-order' && c.route === info.route && (JSON.parse(c.proposed) as string[]).indexOf(info.id) !== (JSON.parse(c.original) as string[]).indexOf(info.id)),
  );

  const base = (category: ChangeCategory, property: string, proposed: string, original: string, key: string, lang: Lang | 'all'): ChangeInput => ({
    key,
    route,
    url: info.url,
    lang,
    elementId: info.id,
    selector: info.selector,
    elementType: info.type,
    derived: info.derived,
    label: info.label,
    i18nKey: property === 'text' ? info.i18nKey : undefined,
    sourceFile: info.sourceFile,
    assetFolder: info.image?.folder,
    category,
    property,
    original,
    proposed,
  });

  /** current (draft or computed) value of a CSS property */
  const val = (prop: string) => find(styleKey(prop))?.proposed ?? info.styles[prop] ?? '';
  const setStyle = (category: ChangeCategory, prop: string, value: string, coalesce = false) =>
    onUpsert([base(category, prop, value, find(styleKey(prop))?.original ?? info.styles[prop] ?? '', styleKey(prop), 'all')], coalesce);
  const setStyles = (category: ChangeCategory, entries: [string, string][]) =>
    onUpsert(entries.map(([p, v]) => base(category, p, v, find(styleKey(p))?.original ?? info.styles[p] ?? '', styleKey(p), 'all')));

  const textVal = (lang: Lang) => find(textKey(lang))?.proposed ?? (info.i18nKey ? info.textValues?.[lang] ?? '' : info.text ?? '');
  const setText = (lang: Lang, value: string) =>
    onUpsert([base('text', 'text', value, find(textKey(lang))?.original ?? (info.i18nKey ? info.textValues?.[lang] ?? '' : info.text ?? ''), textKey(lang), lang)], true);

  const isTexty = TEXTY.has(info.type);
  const isBlock = info.type === 'section' || info.type === 'card' || info.type === 'container';

  return (
    <div data-testid="inspector" data-selected-id={info.id} data-selected-type={info.type}>
      {/* Header */}
      <div className="border-b border-white/[0.07] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{info.type}</Chip>
          {info.global && <Chip>global</Chip>}
          {info.derived && <Chip tone="warn">located by DOM path</Chip>}
          {mine.length > 0 && <Chip tone="draft">{mine.length} draft</Chip>}
        </div>
        <p className="mt-2.5 break-all font-mono text-[0.72rem] leading-relaxed text-white" data-testid="inspector-id">
          {info.id}
        </p>
        <p className="mt-1 text-[0.68rem] text-white/40">
          &lt;{info.tag}&gt;{info.sourceFile ? ` · ${info.sourceFile}` : ''}
          {info.i18nKey ? ` · ${info.i18nKey}` : ''}
        </p>
        {info.breadcrumb.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {info.breadcrumb.slice(0, 4).map((b) => (
              <button key={b.selector} type="button" onClick={() => onSelect(b.selector)} className="rounded-md border border-white/10 px-2 py-1 text-[0.62rem] text-white/60 hover:border-white/30 hover:text-white" title="Select parent">
                ↑ {b.id}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button testid="reset-element" disabled={!mine.length} onClick={() => onRemove(mine.map((c) => c.id))}>
            Reset element
          </Button>
        </div>
      </div>

      {/* Content */}
      {(isTexty || info.textEditable) && (
        <Section title="Content" testid="sec-content">
          {info.textEditable ? (
            <>
              {info.keyCandidates.length > 1 && (
                <Row label="Translation key" hint="same text in several keys">
                  <Select value={info.i18nKey ?? ''} options={info.keyCandidates.map((k) => ({ value: k, label: k }))} onChange={onKeyChoice} />
                </Row>
              )}
              <Row label={`Text · ${LANG_LABEL[info.lang]}`} hint={info.i18nKey ? 'translation' : 'this page only'}>
                <TextArea value={textVal(info.lang)} onChange={(v) => setText(info.lang, v)} testid="text-input" rows={Math.min(8, Math.max(2, Math.ceil(textVal(info.lang).length / 38)))} />
              </Row>
              {info.i18nKey && (
                <details className="rounded-lg border border-white/8 px-3 py-2 text-white/70">
                  <summary className="cursor-pointer text-[0.7rem]">Other languages</summary>
                  <div className="mt-3 flex flex-col gap-3">
                    {(['sq', 'en', 'de'] as Lang[])
                      .filter((l) => l !== info.lang)
                      .map((l) => (
                        <Row key={l} label={LANG_LABEL[l]}>
                          <TextArea value={textVal(l)} onChange={(v) => setText(l, v)} testid={`text-input-${l}`} rows={2} />
                        </Row>
                      ))}
                  </div>
                </details>
              )}
            </>
          ) : (
            <p className="text-[0.72rem] leading-relaxed text-white/45">This element contains several pieces of text. Select a specific child element to edit its text.</p>
          )}
        </Section>
      )}

      {/* Image */}
      {info.type === 'image' && <ImageControls info={info} val={val} setStyle={setStyle} find={find} styleKey={styleKey} onUpsert={onUpsert} base={base} />}

      {/* Typography */}
      {isTexty && (
        <Section title="Typography" testid="sec-typography">
          <SliderField label="Font size" value={val('font-size')} min={8} max={160} onChange={(v, c) => setStyle('typography', 'font-size', v, c)} testid="font-size" />
          <Row label="Font weight">
            <Select value={val('font-weight')} options={['300', '400', '500', '600', '700', '800'].map((w) => ({ value: w, label: w }))} onChange={(v) => setStyle('typography', 'font-weight', v)} testid="font-weight" />
          </Row>
          <SliderField label="Line height" value={val('line-height')} min={8} max={200} onChange={(v, c) => setStyle('typography', 'line-height', v, c)} />
          <Row label="Letter spacing">
            <TextInput value={val('letter-spacing')} onChange={(v) => setStyle('typography', 'letter-spacing', v, true)} />
          </Row>
          <Row label="Alignment">
            <Segmented
              value={(['left', 'center', 'right', 'justify'].includes(val('text-align')) ? val('text-align') : 'left') as string}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
                { value: 'justify', label: 'Justify' },
              ]}
              onChange={(v) => setStyle('typography', 'text-align', v)}
              testid="text-align"
            />
          </Row>
          <ColorField label="Text color" value={val('color')} onChange={(v, c) => setStyle('color', 'color', v, c)} testid="text-color" />
        </Section>
      )}

      {/* Button */}
      {info.type === 'button' && (
        <Section title="Button" testid="sec-button">
          <Row label="Size">
            <Segmented
              value="custom"
              options={[
                { value: 'sm', label: 'S' },
                { value: 'md', label: 'M' },
                { value: 'lg', label: 'L' },
              ]}
              onChange={(v) =>
                setStyles('button', ({
                  sm: [['font-size', '11px'], ['padding-top', '10px'], ['padding-bottom', '10px'], ['padding-left', '18px'], ['padding-right', '18px']] as [string, string][],
                  md: [['font-size', '12.5px'], ['padding-top', '16px'], ['padding-bottom', '16px'], ['padding-left', '28px'], ['padding-right', '28px']] as [string, string][],
                  lg: [['font-size', '14px'], ['padding-top', '20px'], ['padding-bottom', '20px'], ['padding-left', '38px'], ['padding-right', '38px']] as [string, string][],
                } as Record<string, [string, string][]>)[v] ?? [])
              }
              testid="button-size"
            />
          </Row>
          <ColorField label="Background" value={val('background-color')} onChange={(v, c) => setStyle('button', 'background-color', v, c)} testid="button-bg" />
          <ColorField label="Text color" value={val('color')} onChange={(v, c) => setStyle('button', 'color', v, c)} />
          <SliderField label="Border radius" value={val('border-radius')} min={0} max={60} onChange={(v, c) => setStyle('button', 'border-radius', v, c)} />
        </Section>
      )}

      {/* Colors */}
      {info.type !== 'image' && <ColorControls info={info} val={val} setStyle={setStyle} isBlock={isBlock} />}

      {/* Section */}
      {(info.type === 'section' || info.type === 'card') && (
        <Section title={info.type === 'section' ? 'Section' : 'Card'} testid="sec-section">
          <Row label="Draft preview visibility">
            <Segmented
              value={val('display') === 'none' ? 'hidden' : 'visible'}
              options={[
                { value: 'visible', label: 'Visible' },
                { value: 'hidden', label: 'Hidden' },
              ]}
              onChange={(v) => setStyle('visibility', 'display', v === 'hidden' ? 'none' : find(styleKey('display'))?.original ?? info.styles.display)}
              testid="visibility"
            />
          </Row>
          <SliderField label="Spacing top" value={val('padding-top')} min={0} max={320} onChange={(v, c) => setStyle('section', 'padding-top', v, c)} testid="spacing-top" />
          <SliderField label="Spacing bottom" value={val('padding-bottom')} min={0} max={320} onChange={(v, c) => setStyle('section', 'padding-bottom', v, c)} />
          {info.canReorder && info.sectionOrder && <OrderControls info={info} changes={changes} onUpsert={onUpsert} base={base} />}
        </Section>
      )}

      {/* Layout */}
      <LayoutControls info={info} val={val} setStyle={setStyle} setStyles={setStyles} />
    </div>
  );
}

type Val = (p: string) => string;
type SetStyle = (category: ChangeCategory, prop: string, value: string, coalesce?: boolean) => void;

function ColorControls({ info, val, setStyle, isBlock }: { info: ElementInfo; val: Val; setStyle: SetStyle; isBlock: boolean }) {
  const bgImg = val('background-image');
  const grad = bgImg.match(/linear-gradient\((-?[\d.]+)deg,\s*(.+?),\s*(.+)\)$/);
  const [angle, c1, c2] = grad ? [grad[1], grad[2], grad[3]] : ['135', '#1a1a1c', '#5a5a60'];
  const setGrad = (a: string, x: string, y: string) => setStyle('color', 'background-image', `linear-gradient(${a}deg, ${x}, ${y})`, true);
  return (
    <Section title="Colors" testid="sec-colors" defaultOpen={isBlock}>
      <ColorField label="Background color" value={val('background-color')} onChange={(v, c) => setStyle('color', 'background-color', v, c)} testid="bg-color" />
      {info.type !== 'text' && info.type !== 'nav' && <ColorField label="Text color" value={val('color')} onChange={(v, c) => setStyle('color', 'color', v, c)} />}
      <ColorField label="Border color" value={val('border-color')} onChange={(v, c) => setStyle('color', 'border-color', v, c)} />
      <SliderField
        label="Border width"
        value={val('border-width')}
        min={0}
        max={8}
        onChange={(v, c) => {
          setStyle('color', 'border-width', v, c);
          if (parseFloat(v) > 0 && val('border-style') === 'none') setStyle('color', 'border-style', 'solid');
        }}
      />
      {(isBlock || info.type === 'button') && (
        <div className="rounded-lg border border-white/8 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[0.7rem] font-medium text-white/60">Gradient</span>
            <Segmented
              size="sm"
              value={grad ? 'on' : 'off'}
              options={[
                { value: 'off', label: 'Off' },
                { value: 'on', label: 'On' },
              ]}
              onChange={(v) => (v === 'on' ? setGrad(angle, c1, c2) : setStyle('color', 'background-image', 'none'))}
              testid="gradient-toggle"
            />
          </div>
          {grad && (
            <div className="flex flex-col gap-3">
              <SliderField label="Angle" value={`${angle}deg`} min={0} max={360} unit="deg" onChange={(v) => setGrad(String(parseFloat(v)), c1, c2)} />
              <ColorField label="From" value={c1} onChange={(v) => setGrad(angle, v, c2)} />
              <ColorField label="To" value={c2} onChange={(v) => setGrad(angle, c1, v)} />
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function LayoutControls({ info, val, setStyle, setStyles }: { info: ElementInfo; val: Val; setStyle: SetStyle; setStyles: (c: ChangeCategory, e: [string, string][]) => void }) {
  const [tx, ty] = (val('translate') === 'none' ? '0px 0px' : val('translate')).split(' ').concat('0px').map((x) => parsePx(x));
  const side = (p: string) => (['top', 'right', 'bottom', 'left'] as const).map((s) => `${p}-${s}`);
  return (
    <Section title="Layout" testid="sec-layout" defaultOpen={info.type === 'image' || info.type === 'container'}>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Width">
          <TextInput value={val('width')} onChange={(v) => setStyle('layout', 'width', v, true)} testid="width" />
        </Row>
        <Row label="Height">
          <TextInput value={val('height')} onChange={(v) => setStyle('layout', 'height', v, true)} testid="height" />
        </Row>
      </div>
      {(['padding', 'margin'] as const).map((p) => (
        <Row key={p} label={p === 'padding' ? 'Padding (T R B L)' : 'Margin (T R B L)'}>
          <div className="grid grid-cols-4 gap-1.5">
            {side(p).map((s) => (
              <TextInput key={s} value={val(s)} onChange={(v) => setStyle('layout', s, v, true)} testid={s} />
            ))}
          </div>
        </Row>
      ))}
      <SliderField label="Border radius" value={val('border-radius')} min={0} max={80} onChange={(v, c) => setStyle('layout', 'border-radius', v, c)} testid="radius" />
      <Row label="Horizontal alignment" hint="block elements">
        <Segmented
          value="none"
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(v) =>
            setStyles('layout', v === 'left' ? [['margin-left', '0px'], ['margin-right', 'auto']] : v === 'right' ? [['margin-left', 'auto'], ['margin-right', '0px']] : [['margin-left', 'auto'], ['margin-right', 'auto']])
          }
        />
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <SliderField label="Offset X" value={`${tx}px`} min={-300} max={300} onChange={(v, c) => setStyle('layout', 'translate', `${parsePx(v)}px ${ty}px`, c)} />
        <SliderField label="Offset Y" value={`${ty}px`} min={-300} max={300} onChange={(v, c) => setStyle('layout', 'translate', `${tx}px ${parsePx(v)}px`, c)} />
      </div>
      <SliderField label="Opacity" value={val('opacity')} min={0} max={1} step={0.05} unit="" onChange={(v, c) => setStyle('layout', 'opacity', v, c)} />
    </Section>
  );
}

function ImageControls({
  info,
  val,
  setStyle,
  find,
  styleKey,
  onUpsert,
  base,
}: {
  info: ElementInfo;
  val: Val;
  setStyle: SetStyle;
  find: (k: string) => DraftChange | undefined;
  styleKey: (p: string) => string;
  onUpsert: (items: ChangeInput[], coalesce?: boolean) => void;
  base: (category: ChangeCategory, property: string, proposed: string, original: string, key: string, lang: Lang | 'all') => ChangeInput;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const srcChange = find(styleKey('src'));
  const original = srcChange?.original ?? (info.image?.src || '(empty placeholder)');
  const current = srcChange?.proposed ?? info.image?.src ?? '';
  const setSrc = (url: string) => onUpsert([base('image', 'src', url, original, styleKey('src'), 'all')]);
  const [ox, oy] = (val('object-position') || '50% 50%').split(' ').map((x) => parsePx(x, 50));

  const upload = async (f: File) => {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/__visual-editor/api/upload', { method: 'POST', headers: { 'x-filename': f.name }, body: f });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setSrc(j.url);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Image" testid="sec-image">
      <div className="grid grid-cols-2 gap-2">
        {[
          ['Original', srcChange ? (original.startsWith('(') ? '' : original) : current],
          ['Preview', srcChange ? current : ''],
        ].map(([l, src]) => (
          <div key={l} className="flex flex-col gap-1">
            <span className="text-[0.6rem] uppercase tracking-[0.2em] text-white/40">{l}</span>
            <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] text-[0.6rem] text-white/30">
              {src ? <img src={src} alt="" className="h-full w-full object-cover" data-testid={`image-${l.toLowerCase()}`} /> : l === 'Original' ? 'placeholder' : 'no replacement'}
            </div>
          </div>
        ))}
      </div>
      {info.image?.folder && <p className="text-[0.68rem] text-white/45">Slot folder: public/assets/{info.image.folder}/</p>}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml" className="hidden" data-testid="image-file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => fileRef.current?.click()} disabled={busy} testid="image-upload">
          {busy ? 'Uploading…' : 'Replace image…'}
        </Button>
        {srcChange && <Button onClick={() => setSrc(original)}>Undo replacement</Button>}
      </div>
      {err && <p className="text-[0.7rem] text-red-300">{err}</p>}
      <Row label="…or image path / URL" hint="e.g. /assets/gallery/01.webp">
        <TextInput value={srcChange ? current : ''} placeholder="/assets/…" onChange={(v) => v && setSrc(v)} mono testid="image-path" />
      </Row>
      <Row label="Object fit">
        <Select value={val('object-fit') || 'cover'} options={['cover', 'contain', 'fill', 'none', 'scale-down'].map((v) => ({ value: v, label: v }))} onChange={(v) => setStyle('image', 'object-fit', v)} testid="object-fit" />
      </Row>
      <Row label="Object position">
        <div className="grid w-28 grid-cols-3 gap-1">
          {[0, 50, 100].flatMap((y) =>
            [0, 50, 100].map((x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                aria-label={`Position ${x}% ${y}%`}
                onClick={() => setStyle('image', 'object-position', `${x}% ${y}%`)}
                className={`h-7 rounded border ${Math.round(ox) === x && Math.round(oy) === y ? 'border-white bg-white/80' : 'border-white/15 hover:border-white/40'}`}
              />
            )),
          )}
        </div>
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <SliderField label="Position X" value={`${ox}%`} min={0} max={100} unit="%" onChange={(v, c) => setStyle('image', 'object-position', `${parsePx(v)}% ${oy}%`, c)} />
        <SliderField label="Position Y" value={`${oy}%`} min={0} max={100} unit="%" onChange={(v, c) => setStyle('image', 'object-position', `${ox}% ${parsePx(v)}%`, c)} />
      </div>
    </Section>
  );
}

function OrderControls({
  info,
  changes,
  onUpsert,
  base,
}: {
  info: ElementInfo;
  changes: DraftChange[];
  onUpsert: (items: ChangeInput[]) => void;
  base: (category: ChangeCategory, property: string, proposed: string, original: string, key: string, lang: Lang | 'all') => ChangeInput;
}) {
  const key = `${info.route}|all|#main|section-order`;
  const existing = changes.find((c) => c.key === key);
  const original = existing?.original ?? JSON.stringify(info.sectionOrder);
  const order: string[] = JSON.parse(existing?.proposed ?? original);
  const i = order.indexOf(info.id);
  const move = (d: number) => {
    const j = i + d;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onUpsert([{ ...base('order', 'section-order', JSON.stringify(next), original, key, 'all'), elementId: 'page.sections', selector: '#main', label: `Section order (${info.route})`, elementType: 'section', derived: false }]);
  };
  return (
    <Row label="Section order (draft preview)" hint={`${i + 1} / ${order.length}`}>
      <div className="flex gap-2">
        <Button onClick={() => move(-1)} disabled={i <= 0} testid="move-up">
          ↑ Move up
        </Button>
        <Button onClick={() => move(1)} disabled={i >= order.length - 1} testid="move-down">
          ↓ Move down
        </Button>
      </div>
    </Row>
  );
}
