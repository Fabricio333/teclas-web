'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PianoStarGame.module.scss';

interface NoteKey {
  key: string;
  note: string;
  position: number;
}

const WHITE_KEYS: NoteKey[] = [
  { key: 'A', note: 'C4', position: 0 },
  { key: 'S', note: 'D4', position: 1 },
  { key: 'D', note: 'E4', position: 2 },
  { key: 'F', note: 'F4', position: 3 },
  { key: 'G', note: 'G4', position: 4 },
  { key: 'H', note: 'A4', position: 5 },
  { key: 'J', note: 'B4', position: 6 },
];

const BLACK_KEYS: NoteKey[] = [
  { key: 'W', note: 'C#4', position: 0 },
  { key: 'E', note: 'D#4', position: 1 },
  { key: 'T', note: 'F#4', position: 3 },
  { key: 'Y', note: 'G#4', position: 4 },
  { key: 'U', note: 'A#4', position: 5 },
];

const NOTE_MAP: Record<string, string> = {};
[...WHITE_KEYS, ...BLACK_KEYS].forEach(
  ({ key, note }) => (NOTE_MAP[key] = note),
);

const SONG = [
  'C4',
  'C4',
  'G4',
  'G4',
  'A4',
  'A4',
  'G4',
  'F4',
  'F4',
  'E4',
  'E4',
  'D4',
  'D4',
  'C4',
];

const IDLE_TIMEOUT_MS = 4500;

export default function PianoStarGame() {
  const pianoRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  const synthRef = useRef<InstanceType<
    (typeof import('tone'))['PolySynth']
  > | null>(null);
  const noteElemsRef = useRef<SVGElement[]>([]);
  const posRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playRef = useRef<(note: string) => void>();
  const handlePressRef = useRef<(note: string) => void>();

  const [pressed, setPressed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const Tone = await import('tone');
      await import('vexflow');
      const abcjs = (await import('abcjs')).default;

      synthRef.current = new Tone.PolySynth().toDestination();
      playRef.current = async (note: string) => {
        await Tone.start();
        synthRef.current?.triggerAttackRelease(note, '8n');
      };

      const abc = `
X:1
T:Estrellita
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
`;
      abcjs.renderAbc('sheet', abc, {
        add_classes: true,
        responsive: 'resize',
      });
      noteElemsRef.current = Array.from(
        document.querySelectorAll<SVGElement>('#sheet svg .vf-notehead'),
      );

      const nextExpected = () => SONG[posRef.current];

      const getKeyFromNote = (note: string) =>
        [...WHITE_KEYS, ...BLACK_KEYS].find((n) => n.note === note)?.key || '';

      const highlightSheet = (idx: number, color: string) => {
        const el = noteElemsRef.current[idx];
        if (el) el.style.fill = color;
      };

      const clearIdle = () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        hintRef.current!.textContent = '';
      };

      const startIdle = () => {
        idleTimerRef.current = setTimeout(() => {
          hintRef.current!.innerHTML = `→ Pulsa <strong>${getKeyFromNote(
            nextExpected(),
          )}</strong>`;
        }, IDLE_TIMEOUT_MS);
      };

      const handlePress = (note: string) => {
        if (note === nextExpected()) {
          highlightSheet(posRef.current, '#22c55e');
          posRef.current += 1;

          if (posRef.current === SONG.length) {
            hintRef.current!.textContent = '¡Bien hecho!';
            clearIdle();
            return;
          }
          clearIdle();
          startIdle();
        } else {
          hintRef.current!.textContent = 'Esa no es 🤔';
        }

        setPressed((prev) => ({ ...prev, [note]: true }));
        setTimeout(
          () => setPressed((prev) => ({ ...prev, [note]: false })),
          80,
        );
      };

      handlePressRef.current = handlePress;
      startIdle();
      pianoRef.current?.focus();
    })();

    return () => {
      if (synthRef.current) synthRef.current.dispose();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const handleNote = (note: string) => {
    playRef.current?.(note);
    handlePressRef.current?.(note);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const note = NOTE_MAP[e.key.toUpperCase()];
    if (!note) return;
    handleNote(note);
  };

  return (
    <section id="piano-star-game" className={styles.gameSection}>
      <h2 className={styles.title}>Juega a “Estrellita”</h2>
      <div id="sheet" />
      <div
        ref={pianoRef}
        className={styles.piano}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {WHITE_KEYS.map((white) => {
          const black = BLACK_KEYS.find((b) => b.position === white.position);
          return (
            <div
              key={white.note}
              data-note={white.note}
              className={`${styles.key} ${
                pressed[white.note] ? styles.pressed : ''
              }`}
              onClick={() => handleNote(white.note)}
            >
              {white.key}
              {black && (
                <div
                  data-note={black.note}
                  className={`${styles.key} ${styles.black} ${
                    pressed[black.note] ? styles.pressed : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNote(black.note);
                  }}
                >
                  {black.key}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p ref={hintRef} className={styles.hint} />
    </section>
  );
}
