'use client';

import { useEffect, useState } from 'react';

/**
 * The id of the song the player currently has loaded.
 *
 * The player switches songs in place — there is no navigation, so nothing
 * around it re-renders on its own — and announces the switch on
 * `teclas:level-changed`. Anything outside the player that names the current
 * song has to follow that event, or it keeps describing the song the page was
 * built for while the address bar and the score have already moved on.
 *
 * `initialId` is what the server rendered, so the prerendered HTML is still the
 * page's own song and search engines see it unchanged.
 */
export function useCurrentSongId(initialId?: string): string | undefined {
  const [id, setId] = useState(initialId);

  useEffect(() => {
    const onLevelChanged = (event: Event) => {
      const next = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (next) setId(next);
    };
    window.addEventListener('teclas:level-changed', onLevelChanged);
    return () =>
      window.removeEventListener('teclas:level-changed', onLevelChanged);
  }, []);

  return id;
}
