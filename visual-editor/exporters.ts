import type { DraftChange } from './types';

export const UPLOAD_PREFIX = '/__visual-editor/uploads/';
const pending = (c: DraftChange[]) => c.filter((x) => x.status !== 'implemented');

/** How Claude Code should implement a single change in the real source code. */
export function implementationHint(c: DraftChange): string {
  const where = c.sourceFile ? ` in ${c.sourceFile}` : '';
  const scope = c.route === '*' ? 'global element (all pages)' : `page ${c.route}`;
  if (c.property === 'text' && c.i18nKey) return `Set translation key "${c.i18nKey}" in src/locales/${c.lang}.json to the proposed text (the key is shared by every element that uses it).`;
  if (c.property === 'text') return `Change the hard-coded / config text of ${c.elementId}${where} (${scope}, language ${c.lang}). It is not a translation key — check src/config/*.ts if not found in the component.`;
  if (c.property === 'src') {
    const file = c.proposed.startsWith(UPLOAD_PREFIX) ? `.visual-editor/uploads/${c.proposed.slice(UPLOAD_PREFIX.length)}` : c.proposed;
    return c.assetFolder
      ? `Copy ${file} into public/assets/${c.assetFolder}/ with the name for this slot (cover.* for the cover, otherwise the NN.* order), optimise with "npm run images".`
      : `Replace the image of ${c.elementId}${where} with ${file} (move it into public/assets/).`;
  }
  if (c.property === 'section-order') return `Reorder the top-level sections on ${c.route} in the page component to: ${(JSON.parse(c.proposed) as string[]).join(' → ')}.`;
  if (c.property === 'display' && c.proposed === 'none') return `Remove or hide ${c.elementId}${where} on ${scope}. (Preview-only "hide" — confirm before deleting content.)`;
  return `Apply \`${c.property}: ${c.proposed}\` to ${c.elementId}${where} (${scope}) using Tailwind classes / the design tokens in src/styles/index.css, for both dark and light themes. Selector in dev: ${c.selector}`;
}

export function buildExport(changes: DraftChange[]) {
  const p = pending(changes);
  const by = <K extends string>(f: (c: DraftChange) => K) => p.reduce<Record<string, number>>((a, c) => ((a[f(c)] = (a[f(c)] ?? 0) + 1), a), {});
  return {
    $schema: 'advance-detailing-co/visual-editor-draft@1',
    project: 'ADVANCE DETAILING CO. website',
    generatedAt: new Date().toISOString(),
    notice:
      'DRAFT ONLY — these changes exist in the private Visual Editor preview and are NOT implemented in the source code. ' +
      'Implement each change with status "draft" in the real source, verify it (npm run build + tests), then set its status to "implemented" in .visual-editor/draft.json.',
    summary: {
      total: changes.length,
      pending: p.length,
      implemented: changes.length - p.length,
      byCategory: by((c) => c.category),
      byPage: by((c) => (c.route === '*' ? '* (global)' : c.route)),
      byLanguage: by((c) => c.lang),
    },
    changes: changes.map((c) => ({
      id: c.id,
      status: c.status,
      page: { route: c.route, url: c.url, language: c.lang },
      element: { id: c.elementId, type: c.elementType, label: c.label, selector: c.selector, derivedLocation: c.derived, sourceFile: c.sourceFile ?? null, i18nKey: c.i18nKey ?? null, assetFolder: c.assetFolder ?? null },
      change: { category: c.category, property: c.property, original: c.original, proposed: c.proposed },
      uploadedFile: c.proposed.startsWith(UPLOAD_PREFIX) ? `.visual-editor/uploads/${c.proposed.slice(UPLOAD_PREFIX.length)}` : null,
      implementation: implementationHint(c),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      implementationNote: c.implementationNote ?? null,
    })),
  };
}

const short = (s: string, n = 160) => (s.length > n ? s.slice(0, n) + '…' : s);

/** Markdown request to paste into Claude Code. */
export function buildChangeRequest(changes: DraftChange[]): string {
  const p = pending(changes);
  if (!p.length) return 'No pending Visual Editor changes.';
  const lines = [
    `# Visual Editor change request — ADVANCE DETAILING CO.`,
    ``,
    `Please implement these ${p.length} draft change(s) from the private Visual Editor in the real source code.`,
    `They are currently preview-only drafts and are NOT implemented yet.`,
    ``,
    `Rules: preserve the existing design system, animations, routing, SEO and the 3 languages; use translation files for text (src/locales/*.json),`,
    `Tailwind classes / tokens for styles (both dark and light theme), and public/assets/<folder>/ for images. Do not change anything else.`,
    `After implementing: run \`npm run build\` and the browser tests, then set each implemented change's "status" to "implemented" in .visual-editor/draft.json.`,
    `Full machine-readable draft: .visual-editor/draft-export.json (also .visual-editor/draft.json).`,
    ``,
    `## Changes`,
  ];
  p.forEach((c, i) => {
    lines.push(
      ``,
      `### ${i + 1}. [${c.category}] ${c.label} — ${c.property}`,
      `- Page: \`${c.route === '*' ? '* (global: navigation/footer)' : c.route}\` · URL: \`${c.url}\` · Language: \`${c.lang}\``,
      `- Element: \`${c.elementId}\` (${c.elementType}${c.derived ? ', located by DOM path' : ''})${c.sourceFile ? ` · File: \`${c.sourceFile}\`` : ''}${c.i18nKey ? ` · Key: \`${c.i18nKey}\`` : ''}`,
      `- Original: \`${short(c.original).replace(/`/g, "'")}\``,
      `- Proposed: \`${short(c.proposed).replace(/`/g, "'")}\``,
      `- How: ${implementationHint(c)}`,
      `- Change id: \`${c.id}\``,
    );
  });
  lines.push('', '## JSON', '', '```json', JSON.stringify(buildExport(changes).changes.filter((c) => c.status !== 'implemented'), null, 2), '```', '');
  return lines.join('\n');
}
