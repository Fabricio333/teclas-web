'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ProgressDoc } from './schema';
import {
  getHydrated,
  getHydratedServer,
  getServerSnapshot,
  getSnapshot,
  hydrate,
  subscribe,
  subscribeHydration,
} from './store';

/**
 * Select a slice of the progress document.
 *
 * Memoised on the document's identity rather than on the selected value. The
 * store only ever replaces `current` with a new object when something actually
 * changed, and untouched sub-objects keep their references, so a selector
 * returning `d.settings` yields a stable reference across unrelated updates.
 *
 * Deliberately does not cache through a ref: reading or writing `ref.current`
 * during render is unsafe under concurrent rendering (and is what
 * `react-hooks` flags).
 */
export function useProgress<T>(select: (doc: ProgressDoc) => T): T {
  const doc = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // `select` is expected to be a pure, cheap projection; callers pass inline
  // arrow functions, so keying on `doc` alone is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => select(doc), [doc]);
}

/**
 * False during the prerender and the first client render, true once
 * localStorage has been read.
 *
 * Anything that displays stored progress must render a neutral placeholder
 * until this flips, otherwise the static HTML and the hydrated tree disagree.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    getHydrated,
    getHydratedServer,
  );
}

/** Mount once, near the root, to load storage. */
export function useHydrateProgress(): void {
  useEffect(() => {
    hydrate();
  }, []);
}

export function useSettings() {
  return useProgress((d) => d.settings);
}

/** Stable callback returning the current doc without subscribing to it. */
export function useProgressSnapshot(): () => ProgressDoc {
  return useCallback(() => getSnapshot(), []);
}
