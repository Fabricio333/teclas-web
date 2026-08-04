'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGear,
  faKeyboard,
  faMusic,
  faSliders,
} from '@fortawesome/free-solid-svg-icons';
import { updateSettings, useHydrated, useSettings } from '@/lib/progress';
import styles from './LearnOnboarding.module.scss';

/**
 * First-run prompt for the practice apps.
 *
 * Asks once how the student is going to play, because the answer changes what
 * the app should offer: an acoustic piano needs the microphone calibrated
 * before note detection is any good, while a MIDI keyboard needs nothing at
 * all. Before this, calibration was a toolbar button most students never
 * pressed, so the microphone was judged on its uncalibrated performance.
 *
 * Shown unprompted only while `settings.inputMode` is `unset`, so it appears
 * exactly once — and, because the field defaults to `unset`, once for existing
 * students too. After that it opens on request, from the sheet toolbar.
 */
export default function LearnOnboarding() {
  const hydrated = useHydrated();
  const settings = useSettings();
  // Dismissing without choosing keeps `inputMode` unset, so the prompt returns
  // on the next visit. This flag just stops it reappearing within this one.
  const [dismissed, setDismissed] = useState(false);
  // Opened from the toolbar, whatever the setting currently says.
  const [requested, setRequested] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // `useSettings()` returns the empty-document defaults during the prerender
  // and the first client render, and `inputMode` is `unset` there — so without
  // the hydration gate this would flash open for every returning student.
  const open =
    hydrated && !dismissed && (requested || settings.inputMode === 'unset');

  /*
   * Reopening is an explicit request, not a side effect of writing a setting.
   *
   * The toolbar button used to set `inputMode` back to `unset` and let the
   * condition above notice. That worked exactly once: dismissing without
   * choosing leaves `inputMode` already `unset`, so the next press wrote the
   * value it already had, nothing changed, and `dismissed` stayed true with no
   * way to clear it — the button was dead for the rest of the session. It also
   * threw away a choice the student had already made, just for opening the
   * dialog to look at it.
   */
  useEffect(() => {
    const onOpenRequest = () => {
      setRequested(true);
      setDismissed(false);
    };
    window.addEventListener('teclas:choose-input', onOpenRequest);
    return () =>
      window.removeEventListener('teclas:choose-input', onOpenRequest);
  }, []);

  const close = useCallback(() => {
    setDismissed(true);
    setRequested(false);
  }, []);

  const choose = useCallback((inputMode: 'acoustic' | 'midi' | 'keyboard') => {
    updateSettings({ inputMode });
    setRequested(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);

    // Move focus into the dialog so keyboard and screen-reader users land on
    // it rather than continuing from wherever the page had focus.
    dialogRef.current?.focus();

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className={styles.scrim} role="presentation">
      <div
        aria-labelledby="learn-onboarding-title"
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 className={styles.title} id="learn-onboarding-title">
          ¿Cómo vas a tocar?
        </h2>
        <p className={styles.subtitle}>
          Contanos con qué practicás y preparamos todo para vos.
        </p>

        <div className={styles.options}>
          {/* The acoustic path is the only one that needs setup, so it links
              straight into the wizard instead of just closing the dialog. */}
          <Link
            className={`${styles.option} ${styles.optionPrimary}`}
            href="/calibracion"
            onClick={() => choose('acoustic')}
          >
            <span className={styles.optionIcon}>
              <FontAwesomeIcon icon={faMusic} />
            </span>
            <span className={styles.optionBody}>
              <span className={styles.optionTitle}>Un piano acústico</span>
              <span className={styles.optionText}>
                Te escuchamos por el micrófono. Calibramos una vez, dura menos
                de un minuto.
              </span>
            </span>
            <span className={styles.optionBadge}>Recomendado</span>
          </Link>

          <button
            className={styles.option}
            onClick={() => choose('midi')}
            type="button"
          >
            <span className={styles.optionIcon}>
              <FontAwesomeIcon icon={faSliders} />
            </span>
            <span className={styles.optionBody}>
              <span className={styles.optionTitle}>Un teclado MIDI</span>
              <span className={styles.optionText}>
                Conectalo por USB y listo, no hace falta configurar nada.
              </span>
            </span>
          </button>

          <button
            className={styles.option}
            onClick={() => choose('keyboard')}
            type="button"
          >
            <span className={styles.optionIcon}>
              <FontAwesomeIcon icon={faKeyboard} />
            </span>
            <span className={styles.optionBody}>
              <span className={styles.optionTitle}>
                El teclado de la computadora
              </span>
              <span className={styles.optionText}>
                Usá las teclas de la compu o hacé clic en el piano de la
                pantalla.
              </span>
            </span>
          </button>
        </div>

        {/* The nudge: whichever they pick, they need to know where this lives
            from now on — the calibrate button is no longer in the toolbar. */}
        <p className={styles.footNote}>
          <FontAwesomeIcon aria-hidden="true" icon={faGear} />
          Podés cambiarlo cuando quieras desde <strong>Ajustes</strong>, arriba
          a la derecha.
        </p>

        <button className={styles.later} onClick={close} type="button">
          Cerrar
        </button>
      </div>
    </div>
  );
}
