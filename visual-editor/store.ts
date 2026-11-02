import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { DraftChange, DraftFile } from './types';
import { buildChangeRequest, buildExport } from './exporters';

export type ChangeInput = Omit<DraftChange, 'id' | 'createdAt' | 'updatedAt' | 'status'>;

interface State {
  changes: DraftChange[];
  past: DraftChange[][];
  future: DraftChange[][];
  lastKey?: string;
  lastAt?: number;
  updatedAt: string;
  loaded: boolean;
}

type Action =
  | { type: 'upsert'; items: ChangeInput[]; coalesce?: boolean }
  | { type: 'remove'; ids: string[] }
  | { type: 'clear' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; changes: DraftChange[]; updatedAt: string };

const LS_KEY = 'adc-visual-editor-draft-v1';
const HISTORY = 150;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const now = () => new Date().toISOString();

function applyUpsert(list: DraftChange[], items: ChangeInput[]): DraftChange[] {
  let next = list;
  for (const item of items) {
    const i = next.findIndex((c) => c.key === item.key);
    const existing = i >= 0 ? next[i] : null;
    const original = existing ? existing.original : item.original;
    if (item.proposed === original) {
      if (existing) next = next.filter((c) => c.key !== item.key);
      continue;
    }
    const c: DraftChange = existing
      ? { ...existing, ...item, original, status: 'draft', implementationNote: undefined, updatedAt: now() }
      : { ...item, id: uid(), status: 'draft', createdAt: now(), updatedAt: now() };
    next = existing ? next.map((x, k) => (k === i ? c : x)) : [...next, c];
  }
  return next;
}

function reducer(s: State, a: Action): State {
  const push = (changes: DraftChange[], extra: Partial<State> = {}): State =>
    changes === s.changes ? s : { ...s, ...extra, changes, past: [...s.past, s.changes].slice(-HISTORY), future: [], updatedAt: now() };
  switch (a.type) {
    case 'upsert': {
      const changes = applyUpsert(s.changes, a.items);
      const key = a.items.map((x) => x.key).join(',');
      const t = Date.now();
      if (a.coalesce && s.lastKey === key && s.lastAt && t - s.lastAt < 1200 && s.past.length) {
        // typing / dragging: merge into the previous history step
        return { ...s, changes, future: [], lastAt: t, updatedAt: now() };
      }
      return push(changes, { lastKey: key, lastAt: t });
    }
    case 'remove':
      return push(s.changes.filter((c) => !a.ids.includes(c.id)), { lastKey: undefined });
    case 'clear':
      return push([], { lastKey: undefined });
    case 'undo':
      if (!s.past.length) return s;
      return { ...s, changes: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.changes, ...s.future], lastKey: undefined, updatedAt: now() };
    case 'redo':
      if (!s.future.length) return s;
      return { ...s, changes: s.future[0], past: [...s.past, s.changes], future: s.future.slice(1), lastKey: undefined, updatedAt: now() };
    case 'load':
      return { ...s, changes: a.changes, updatedAt: a.updatedAt, loaded: true, past: [], future: [] };
  }
}

function readLocal(): DraftFile | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const d = raw ? (JSON.parse(raw) as DraftFile) : null;
    return d && Array.isArray(d.changes) ? d : null;
  } catch {
    return null;
  }
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Draft store: undo/redo history, localStorage persistence and a mirror in ./.visual-editor/draft.json */
export function useDraft() {
  const [s, dispatch] = useReducer(reducer, undefined, () => {
    const local = readLocal();
    return { changes: local?.changes ?? [], past: [], future: [], updatedAt: local?.updatedAt ?? new Date(0).toISOString(), loaded: false };
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timer = useRef(0);
  const skipNextSave = useRef(true);

  // Load the file mirror (it may contain "implemented" statuses written by Claude Code).
  const syncFromFile = useCallback(async (force = false) => {
    try {
      const r = await fetch('/__visual-editor/api/draft', { cache: 'no-store' });
      const file = (await r.json()) as DraftFile | null;
      const local = readLocal();
      if (file && Array.isArray(file.changes) && (force || !local || file.updatedAt > local.updatedAt)) {
        skipNextSave.current = true;
        dispatch({ type: 'load', changes: file.changes, updatedAt: file.updatedAt });
        return true;
      }
    } catch {
      /* dev API unavailable — localStorage only */
    }
    return false;
  }, []);

  useEffect(() => {
    syncFromFile().then((loaded) => {
      if (!loaded) dispatch({ type: 'load', changes: readLocal()?.changes ?? [], updatedAt: readLocal()?.updatedAt ?? new Date(0).toISOString() });
    });
    const onFocus = () => syncFromFile();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [syncFromFile]);

  useEffect(() => {
    if (!s.loaded) return;
    const file: DraftFile = { version: 1, updatedAt: s.updatedAt, changes: s.changes };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(file));
    } catch {
      /* quota */
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setSaveState('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        const r = await fetch('/__visual-editor/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: file, exportJson: JSON.stringify(buildExport(s.changes), null, 2), changeRequest: buildChangeRequest(s.changes) }),
        });
        setSaveState(r.ok ? 'saved' : 'error');
      } catch {
        setSaveState('error');
      }
    }, 500);
  }, [s.changes, s.updatedAt, s.loaded]);

  return {
    changes: s.changes,
    loaded: s.loaded,
    canUndo: s.past.length > 0,
    canRedo: s.future.length > 0,
    saveState,
    upsert: (items: ChangeInput[], coalesce = false) => dispatch({ type: 'upsert', items, coalesce }),
    remove: (ids: string[]) => dispatch({ type: 'remove', ids }),
    clear: () => dispatch({ type: 'clear' }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    reloadFromFile: () => syncFromFile(true),
  };
}
