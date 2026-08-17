'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS, type Level } from '@/lib/piano-player/songs';
import {
  DifficultyPills,
  SongGrid,
  filterSongs,
  stars,
  type DifficultyFilter,
} from '@/components/SongCatalog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import styles from './SongBrowser.module.scss';

/**
 * The player's song picker.
 *
 * It replaces a `<select>` that could only be read one option at a time, and
 * that gave no way to ask the only question a student actually has here: which
 * of these can I play yet? The same cards and the same difficulty filter as the
 * list at the foot of the page, so the two are one idea.
 *
 * The engine still owns which song is loaded. This does not try to take that
 * over — it writes the choice into the hidden `<select>` the engine already
 * listens to, so the in-place switch, the URL rewrite and the
 * `teclas:level-changed` broadcast all keep working untouched.
 */
export default function SongBrowser({
  currentLevel,
  onPick,
}: {
  currentLevel: Level;
  onPick: (level: Level) => void;
}) {
  const [open, setOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(null);
  const [query, setQuery] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const byDifficulty: Record<number, number> = {};
    for (const level of LEVELS) {
      byDifficulty[level.difficulty] =
        (byDifficulty[level.difficulty] ?? 0) + 1;
    }
    return byDifficulty;
  }, []);

  const songs = useMemo(
    () => filterSongs(difficulty, query),
    [difficulty, query],
  );

  // Escape closes, and focus goes back where it came from — otherwise a
  // keyboard user lands at the top of the document with the piano behind them.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // The player listens for letter keys on the document to play notes, so
      // this must not reach it.
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown, true);
    searchRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  const pick = (level: Level) => {
    onPick(level);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        title="Elegir otra canción"
        type="button"
      >
        <span aria-hidden="true" className={styles.triggerStars}>
          {stars(currentLevel.difficulty)}
        </span>
        <span className={styles.triggerName}>{currentLevel.name}</span>
        <FontAwesomeIcon className={styles.triggerCaret} icon={faChevronDown} />
      </button>

      {open && (
        <div
          className={styles.scrim}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            aria-labelledby="song-browser-title"
            aria-modal="true"
            className={styles.dialog}
            ref={dialogRef}
            role="dialog"
          >
            <div className={styles.head}>
              <h2 className={styles.headTitle} id="song-browser-title">
                Elegí una canción
              </h2>
              <button
                aria-label="Cerrar"
                className={styles.close}
                onClick={() => setOpen(false)}
                type="button"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className={styles.filters}>
              <DifficultyPills
                counts={counts}
                onChange={setDifficulty}
                value={difficulty}
              />
              <input
                aria-label="Buscar una canción"
                className={styles.search}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                ref={searchRef}
                type="search"
                value={query}
              />
            </div>

            <div className={styles.body}>
              <SongGrid
                currentId={currentLevel.id}
                onPick={pick}
                songs={songs}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
