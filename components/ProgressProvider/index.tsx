'use client';

import { useHydrateProgress } from '@/lib/progress/useProgress';

/**
 * Loads saved progress out of localStorage on mount.
 *
 * This exists as a component purely so the read happens inside an effect. The
 * site is statically exported, so any module-scope storage access would run
 * during prerender where `window` is undefined, and any render-time read would
 * make the first client render disagree with the prerendered HTML.
 */
export default function ProgressProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  useHydrateProgress();
  return <>{children}</>;
}
