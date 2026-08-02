'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import styles from './CopyButton.module.scss';

type CopyButtonProps = {
  /** What lands on the clipboard. */
  value: string;
  /** Button text. Defaults to "Copiar". */
  label?: string;
  /** Announced and shown after a successful copy. */
  doneLabel?: string;
  className?: string;
};

/**
 * Copy-to-clipboard control for the media kit.
 *
 * Everything a journalist needs from this page is a string — a hex code, the
 * boilerplate, the address — so every one of them is one click away rather
 * than something to select by hand.
 */
export default function CopyButton({
  value,
  label = 'Copiar',
  doneLabel = 'Copiado',
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard access is refused on insecure origins and in some embedded
      // browsers. Fall back to a selection the visitor can copy by hand
      // rather than silently doing nothing.
      const area = document.createElement('textarea');
      area.value = value;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
      } catch {
        document.body.removeChild(area);
        return;
      }
      document.body.removeChild(area);
    }

    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1800);
  }, [value]);

  return (
    <button
      className={[styles.copy, copied ? styles.copied : '', className]
        .filter(Boolean)
        .join(' ')}
      onClick={copy}
      type="button"
    >
      <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
      <span>{copied ? doneLabel : label}</span>
    </button>
  );
}
