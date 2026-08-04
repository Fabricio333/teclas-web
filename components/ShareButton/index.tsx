'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faShareNodes } from '@fortawesome/free-solid-svg-icons';
import { copyText } from '@/lib/clipboard';
import styles from './ShareButton.module.scss';

type ShareButtonProps = {
  /** Site-relative path to share, e.g. `/piano-player/estrellita`. */
  path: string;
  /** Title handed to the native share sheet. */
  title: string;
  /** Line above the link in the share sheet. */
  text?: string;
  /** Button text. Defaults to "Compartir". */
  label?: string;
  /** Shown after the link lands on the clipboard. */
  doneLabel?: string;
  className?: string;
};

/**
 * Share the page you are on.
 *
 * On a phone this opens the system share sheet, which is where WhatsApp lives
 * and therefore where a link to a song is actually going to go. On a desktop
 * browser, where `navigator.share` mostly does not exist, it copies the link
 * and says so — the same local-state confirmation the media kit's copy buttons
 * use, rather than a toast, because this project has no toast renderer mounted.
 */
export default function ShareButton({
  path,
  title,
  text,
  label = 'Compartir',
  doneLabel = 'Link copiado',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const share = useCallback(async () => {
    // Resolved at click time rather than at render: the same markup is served
    // from localhost, from a preview build and from the real domain, and the
    // link has to point at wherever the student actually is.
    const url = new URL(path, window.location.origin).toString();

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // Closing the sheet is a decision, not a failure — copying the link
        // behind the student's back after they backed out would be wrong.
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        // Anything else (a payload the browser refuses, a blocked permission)
        // falls through to the clipboard so the button still does something.
      }
    }

    if (!(await copyText(url))) return;

    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2200);
  }, [path, title, text]);

  return (
    <button
      className={[styles.share, copied ? styles.shared : '', className]
        .filter(Boolean)
        .join(' ')}
      onClick={share}
      type="button"
    >
      <FontAwesomeIcon icon={copied ? faCheck : faShareNodes} />
      {/*
        No `aria-label`: it would take over the accessible name and hide this
        text, and the confirmation is the whole point of the control. Leaving
        the name to the text means it reads "Compartir" and then "Link
        copiado", and `role="status"` announces the change for someone who has
        already moved on.
      */}
      <span role="status">{copied ? doneLabel : label}</span>
    </button>
  );
}
