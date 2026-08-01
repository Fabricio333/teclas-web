import { useEffect } from 'react';

/**
 * `RefObject<T | null>` rather than `RefObject<T>`: under React 19's types,
 * `useRef<HTMLDivElement>(null)` produces the nullable form, so the stricter
 * signature this had made the hook uncallable with an ordinary element ref.
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler?: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    if (!handler) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
