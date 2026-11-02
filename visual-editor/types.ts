/**
 * Shared types for the PRIVATE Visual Editor (development only).
 * Nothing in /visual-editor is part of the production build.
 */
export type Lang = 'sq' | 'en' | 'de';
export type VisualType = 'text' | 'image' | 'button' | 'section' | 'card' | 'nav' | 'container';

export type ChangeCategory = 'text' | 'typography' | 'color' | 'layout' | 'image' | 'button' | 'section' | 'visibility' | 'order';

export interface DraftChange {
  /** unique id of this change */
  id: string;
  /** de-duplication key: one change per element + property + scope */
  key: string;
  /** language-neutral route, e.g. "/services" — "*" = global element (navigation / footer) */
  route: string;
  /** localized URL where the change was made, e.g. "/en/services" */
  url: string;
  /** language of the change — "all" for language-independent (style) changes */
  lang: Lang | 'all';
  /** stable element identifier (data-visual-id) or derived path for un-annotated elements */
  elementId: string;
  /** CSS selector used by the preview (and useful to locate the element) */
  selector: string;
  elementType: VisualType;
  /** true if the element has no data-visual-id and was located by its DOM path (less stable) */
  derived: boolean;
  label: string;
  /** translation key in src/locales/<lang>.json, if the text comes from translations */
  i18nKey?: string;
  /** component file that renders the element, when known */
  sourceFile?: string;
  /** image folder in /public/assets/, for image slots */
  assetFolder?: string;
  category: ChangeCategory;
  /** "text", "src", "section-order" or a CSS property such as "font-size" */
  property: string;
  original: string;
  proposed: string;
  /** "draft" until Claude Code has implemented AND verified it in the source code */
  status: 'draft' | 'implemented';
  createdAt: string;
  updatedAt: string;
  /** optional note from Claude Code after implementation */
  implementationNote?: string;
}

export interface DraftFile {
  version: 1;
  updatedAt: string;
  changes: DraftChange[];
}

export interface ElementInfo {
  id: string;
  selector: string;
  type: VisualType;
  derived: boolean;
  label: string;
  tag: string;
  global: boolean;
  sourceFile?: string;
  /** chosen translation key + all candidates whose text matches the element */
  i18nKey?: string;
  keyCandidates: string[];
  /** pristine values of the key in all languages (before any draft) */
  textValues?: Partial<Record<Lang, string>>;
  /** plain text (for non-translated single-text elements) */
  text?: string;
  textEditable: boolean;
  image?: { src: string | null; folder?: string; filled: boolean };
  styles: Record<string, string>;
  canReorder: boolean;
  sectionOrder?: string[];
  breadcrumb: { id: string; selector: string; type: VisualType; label: string }[];
  route: string;
  lang: Lang;
  url: string;
}

/** editor → preview */
export type ToBridge =
  | { type: 've:mode'; selecting: boolean }
  | { type: 've:apply'; changes: DraftChange[] }
  | { type: 've:select'; selector: string; scroll?: boolean }
  | { type: 've:deselect' };

/** preview → editor */
export type FromBridge =
  | { type: 've:ready'; route: string; lang: Lang; url: string; title: string }
  | { type: 've:navigated'; route: string; lang: Lang; url: string; title: string }
  | { type: 've:selected'; info: ElementInfo }
  | { type: 've:deselected' };
