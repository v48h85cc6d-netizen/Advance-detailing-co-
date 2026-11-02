/**
 * Dev-only element identifiers for the private Visual Editor (see /visual-editor).
 *
 *   const ve = visual('src/components/Hero.tsx');
 *   <p {...ve('home.hero.subtitle', 'text', { key: 'hero.subtitle' })}>…</p>
 *
 * In development this adds data-visual-id / data-visual-type / data-visual-file / data-visual-key.
 * In production builds the `{...ve(...)}` spreads are removed entirely (vite-plugins/visual-editor.ts),
 * so the website's HTML is unchanged.
 */
export type VisualType = 'text' | 'image' | 'button' | 'section' | 'card' | 'nav' | 'container';

export function visual(file: string) {
  return (id: string, type: VisualType, meta?: { key?: string }): Record<string, string> => {
    if (!import.meta.env.DEV) return {};
    const a: Record<string, string> = { 'data-visual-id': id, 'data-visual-type': type, 'data-visual-file': file };
    if (meta?.key) a['data-visual-key'] = meta.key;
    return a;
  };
}
