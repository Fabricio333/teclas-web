'use client';

import Link from 'next/link';
import { useState } from 'react';
import EarTraining from '@/components/EarTraining';
import SimonGame from '@/components/SimonGame';
import {
  EAR_TRAINING_MODES,
  SIMON_MUSICAL,
  earTrainingModePath,
} from '@/lib/ear-training/modes';
import styles from './GameModes.module.scss';

/**
 * Mode switch for the listening page.
 *
 * Both games stay: "Encontrá la nota" is the existing note-finding exercise,
 * untouched, and "Simon" is the call-and-response game. Keeping them side by
 * side rather than replacing one avoids throwing away a working exercise, and
 * the switch is two buttons — the page is still something you land on and
 * immediately play.
 *
 * The tab labels and the permalinks below them both come from
 * `lib/ear-training/modes.ts`, so this hub and each game's own page can never
 * end up calling the same game two different things.
 */
export default function GameModes() {
  const [mode, setMode] = useState(EAR_TRAINING_MODES[0].slug);

  return (
    <>
      <div className={styles.switcher} role="group" aria-label="Modo de juego">
        {EAR_TRAINING_MODES.map((gameMode) => (
          <button
            key={gameMode.slug}
            aria-pressed={mode === gameMode.slug}
            className={`${styles.tab} ${mode === gameMode.slug ? styles.tabOn : ''}`}
            onClick={() => setMode(gameMode.slug)}
            type="button"
          >
            {gameMode.name}
          </button>
        ))}
      </div>

      {/*
        Both permalinks are always in the markup, not just the active one: the
        tabs are buttons, so without these anchors a crawler that only reads the
        prerendered HTML would never reach either game's page.
      */}
      <p className={styles.permalinks}>
        Cada juego tiene su propia página:{' '}
        {EAR_TRAINING_MODES.map((gameMode, index) => (
          <span key={gameMode.slug}>
            {index > 0 && ' · '}
            <Link
              href={earTrainingModePath(gameMode.slug)}
              className={styles.permalink}
            >
              {gameMode.name}
            </Link>
          </span>
        ))}
      </p>

      {/*
        Unmounted rather than hidden. Each game owns an AudioContext and a
        sampler; leaving the other one mounted would keep a second audio graph
        alive and, worse, leave its microphone handler listening.
      */}
      {mode === SIMON_MUSICAL.slug ? <SimonGame /> : <EarTraining />}
    </>
  );
}
