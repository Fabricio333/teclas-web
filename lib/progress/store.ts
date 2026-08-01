import { EMPTY_PROGRESS, createEmptyProgress, type ProgressDoc } from './schema';
import { clampDoc, safeRead, safeWrite } from './storage';

type Listener = () => void;

/**
 * The live document. Starts as the frozen empty singleton so that the first
 * client render matches the prerendered HTML byte for byte — every page here
 * is statically exported, so hydration happens against markup built with no
 * knowledge of localStorage.
 */
let current: ProgressDoc = EMPTY_PROGRESS;
let hydrated = false;
/**
 * Whether anything has actually changed since load.
 *
 * Without this, the `pagehide` flush writes on every page view — so merely
 * visiting the landing page would stamp an empty document over storage, and
 * a document written by another tab (or a corrupt one we deliberately left in
 * place to quarantine) would be silently overwritten before it could be read.
 */
let dirty = false;

const listeners = new Set<Listener>();
const hydrationListeners = new Set<Listener>();

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function notify(set: Set<Listener>) {
  set.forEach((l) => l());
}

/**
 * NOTE: deliberately does NOT invoke the callback on subscribe. React's
 * `useSyncExternalStore` contract forbids it, which is one of the reasons the
 * existing `WritableStore` in lib/piano-player/ isn't reused here.
 */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Must return a cached reference — React throws if the identity changes. */
export function getSnapshot(): ProgressDoc {
  return current;
}

/** The prerender has no storage, so it always sees the zero state. */
export function getServerSnapshot(): ProgressDoc {
  return EMPTY_PROGRESS;
}

export function subscribeHydration(fn: Listener): () => void {
  hydrationListeners.add(fn);
  return () => {
    hydrationListeners.delete(fn);
  };
}

export function getHydrated(): boolean {
  return hydrated;
}

export function getHydratedServer(): boolean {
  return false;
}

function schedulePersist() {
  if (typeof window === 'undefined') return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(flush, 400);
}

export function flush() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!hydrated || !dirty) return;
  if (safeWrite(current) === 'ok') dirty = false;
}

export function setDoc(next: ProgressDoc) {
  if (next === current) return;
  current = clampDoc({ ...next, updatedAt: new Date().toISOString() });
  dirty = true;
  notify(listeners);
  schedulePersist();
}

/** Apply a pure reducer to the document. */
export function update(fn: (doc: ProgressDoc) => ProgressDoc) {
  setDoc(fn(current));
}

/**
 * Load from storage. Safe to call repeatedly; only the first call does work.
 * Must be invoked from an effect, never at module scope.
 */
export function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;

  const loaded = safeRead();
  current = loaded ?? createEmptyProgress();
  notify(listeners);
  notify(hydrationListeners);

  // Cross-tab sync: two open tabs must not clobber each other.
  window.addEventListener('storage', (e) => {
    if (e.key !== null && !e.key.startsWith('teclas.progress')) return;
    const fresh = safeRead();
    if (fresh) {
      current = fresh;
      notify(listeners);
    }
  });

  // A debounced write would otherwise be lost when the tab is closed or
  // backgrounded on mobile. `pagehide` is the reliable one on iOS.
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** Test/reset hook: wipes in-memory state and rewrites storage. */
export function resetAll() {
  current = createEmptyProgress();
  dirty = true;
  notify(listeners);
  flush();
}

/** Replace the whole document (used by import). */
export function replaceDoc(doc: ProgressDoc) {
  current = clampDoc(doc);
  dirty = true;
  notify(listeners);
  flush();
}
