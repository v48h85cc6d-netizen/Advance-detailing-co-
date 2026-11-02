# Private Visual Editor — ADVANCE DETAILING CO.

A **development-only** tool for the site owner/developer to visually select elements, try changes in a live
preview and hand them to Claude Code as a structured change request. It is **not** a CMS and never edits the
source code by itself.

```bash
npm run dev
# open http://localhost:5173/__visual-editor
```

## How it is isolated

| | |
|---|---|
| Route | `/__visual-editor` is served by `vite-plugins/visual-editor.ts` with `apply: 'serve'` → exists only on the dev server. |
| Editor code | lives in `/visual-editor/` (outside `src/`) and is not an input of the production build. |
| Preview | the real website runs inside an iframe; a tiny dev-only loader starts `bridge.ts` **only** when the page is framed by the editor. Normal `npm run dev` browsing is unaffected. |
| Element IDs | components use `{...ve('id', 'type')}` (`src/lib/visual.ts`) → `data-visual-id`, `data-visual-type`, `data-visual-file`, `data-visual-key` in development. The build plugin `visualEditorStrip` removes these calls before bundling, so production HTML/JS contains no editor attributes. |
| Draft storage | browser `localStorage` + `./.visual-editor/` (git-ignored): `draft.json`, `draft-export.json`, `change-request.md`, `uploads/`. |

The preview applies drafts without touching React's DOM structure: translated text → temporary i18n overrides (React
re-renders normally), styles / images / hiding / order → one generated stylesheet with `!important` rules scoped by
`[data-visual-id]`.

## Using the editor

1. **Toolbar** — page (13 routes), language (SQ / EN / DE), device (Desktop 1440 · Tablet 768 · Mobile 390),
   undo / redo, **Draft / Original** comparison, **Select / Browse** mode (`V`), **Changes** counter.
2. **Select mode** — click any text, image, button, card, navigation item or section. A silver outline and a label
   (`type · id`) mark the selection. Links/buttons do not fire while selecting. Use the `↑ parent` chips in the
   inspector to select the surrounding card/section. **Browse mode** = the normal website (links, menus, carousels…).
3. **Inspector** (right on desktop, bottom sheet on phones) shows only relevant controls:
   - Text: content (all three languages for translated text), font size, weight, line height, letter spacing, alignment, color
   - Image: replace (upload or path), original vs. preview, object-fit, object-position (3×3 grid + X/Y)
   - Button: text, size S/M/L, background, text color, radius
   - Colors: background, text, border (+width), gradient (angle + 2 colors) for sections/cards/buttons
   - Layout: width, height, padding, margin, radius, horizontal alignment, offset X/Y, opacity
   - Section / card: hide/show in draft preview, spacing top/bottom, section order (move up/down, homepage & pages whose top-level sections are all identified)
4. **Changes** tab — every pending change with original → proposed (color swatches, image thumbnails, text),
   implementation hint, **View** (jumps to the page/language and selects the element) and **Remove**.
   Actions: **Copy Change Request**, **Export Draft JSON**, **Preview All Changes**, **Clear Draft**.
5. Shortcuts: `Ctrl/⌘ Z` undo · `Ctrl/⌘ Shift Z` / `Ctrl Y` redo · `V` select/browse · `Esc` deselect.

### Scope rules
- Text from translations is stored per language and per **translation key** (every place using the key changes, exactly as a real edit would).
- Style / image / layout changes are language-independent (`lang: "all"`) and page-specific; navigation and footer elements are global (`route: "*"`).
- Elements without a `data-visual-id` are located by DOM path (`derived: true`) — still usable, but less stable; annotate important elements with `ve()` if needed.

## Handing changes to Claude Code

Option A — paste: **Changes → Copy Change Request**, paste it into Claude Code.

Option B — file: just tell Claude Code *"Implement the Visual Editor draft"*. The editor auto-saves
`.visual-editor/draft.json`, `.visual-editor/draft-export.json` and `.visual-editor/change-request.md`.

Every change starts as `"status": "draft"` (preview only). Claude Code must implement it in the real source,
verify it (`npm run build`, `npm test`), and only then set `"status": "implemented"` (optionally
`"implementationNote"`) in `.visual-editor/draft.json`. The editor shows those changes as *implemented ✓* (after
"Reload statuses" or when the window regains focus) and stops overlaying them.

### Draft JSON (per change)
```json
{
  "id": "uuid", "status": "draft",
  "page": { "route": "/services", "url": "/en/services", "language": "en" },
  "element": { "id": "services.header.title", "type": "text", "selector": "[data-visual-id=\"services.header.title\"]",
               "derivedLocation": false, "sourceFile": "src/components/PageHeader.tsx", "i18nKey": "services.title", "assetFolder": null },
  "change": { "category": "text", "property": "text", "original": "Premium services for every detail.", "proposed": "…" },
  "uploadedFile": null,
  "implementation": "Set translation key \"services.title\" in src/locales/en.json to the proposed text …"
}
```
Categories: `text`, `typography`, `color`, `layout`, `image`, `button`, `section`, `visibility`, `order`.

## Tests
```bash
npm run dev &
npm run test:editor        # 48 checks: selection, editing, undo/redo, images, languages, persistence, export, 6 widths, isolation
```
The test backs up and restores your real `.visual-editor/draft.json`.

## Limitations
- Preview-only effects (hide, order, offsets) are CSS overrides; implementing them may need structural code changes.
- Inline `!important` previews can differ slightly from the final Tailwind implementation (e.g. hover states are not edited).
- Text that is not from a translation key and spans several text nodes must be edited via a child element.
- Draft text for a key changes every element using that key — the inspector shows the key and alternatives when the same text exists in several keys.
- The Google Maps iframe and the 3D canvas can be selected as containers, but their inner content cannot be edited.
