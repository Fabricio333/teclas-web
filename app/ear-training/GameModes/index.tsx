'use client';

import { useState } from 'react';
import EarTraining from '@/components/EarTraining';
import SimonGame from '@/components/SimonGame';
import styles from './GameModes.module.scss';

type Mode = 'find' | 'simon';

/**
 * Mode switch for the listening page.
 *
 * Both games stay: "Encontrá la nota" is the existing note-finding exercise,
 * untouched, and "Simon" is the call-and-response game. Keeping them side by
 * side rather than replacing one avoids throwing away a working exercise, and
 * the switch is two buttons — the page is still something you land on and
 * immediately play.
 */
export default function GameModes() {
  const [mode, setMode] = useState<Mode>('find');

  return (
    <>
      <div className={styles.switcher} role="group" aria-label="Modo de juego">
        <button
          aria-pressed={mode === 'find'}
          className={`${styles.tab} ${mode === 'find' ? styles.tabOn : ''}`}
          onClick={() => setMode('find')}
          type="button"
        >
          Encontrá la nota
        </button>
        <button
          aria-pressed={mode === 'simon'}
          className={`${styles.tab} ${mode === 'simon' ? styles.tabOn : ''}`}
          onClick={() => setMode('simon')}
          type="button"
        >
          Simon musical
        </button>
      </div>

      {/*
        Unmounted rather than hidden. Each game owns an AudioContext and a
        sampler; leaving the other one mounted would keep a second audio graph
        alive and, worse, leave its microphone handler listening.
      */}
      {mode === 'find' ? <EarTraining /> : <SimonGame />}
    </>
  );
}
