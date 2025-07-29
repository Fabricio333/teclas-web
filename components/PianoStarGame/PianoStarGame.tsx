'use client';

import { useEffect, useRef } from 'react';
import styles from './PianoStarGame.module.scss';
import abcjs from 'abcjs';

interface NoteKey {
  key: string;
  note: string;
  position: number;
}

export default function PianoStarGame() {
  const pianoRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let synth: InstanceType<(typeof import('tone'))['PolySynth']>;
    let keydownListener: (e: KeyboardEvent) => void;
    let clickListener: (e: MouseEvent) => void;

    (async () => {
      const [Tone, VexFlow] = await Promise.all([
        import('tone'),
        import('vexflow'),
      ]);

      if (!pianoRef.current || !hintRef.current) return;
      const pianoDiv = pianoRef.current;

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

      pianoDiv.innerHTML = '';
      WHITE_KEYS.forEach((white) => {
        const wEl = document.createElement('div');
        wEl.className = styles.key;
        wEl.dataset.note = white.note;
        wEl.textContent = white.key;

        const black = BLACK_KEYS.find((b) => b.position === white.position);
        if (black) {
          const bEl = document.createElement('div');
          bEl.className = `${styles.key} ${styles.black}`;
          bEl.dataset.note = black.note;
          bEl.textContent = black.key;
          wEl.appendChild(bEl);
        }

        pianoDiv.appendChild(wEl);
      });

      synth = new Tone.PolySynth().toDestination();
      const play = async (note: string) => {
        await Tone.start(); // resume audio context
        synth.triggerAttackRelease(note, '8n');
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

      const noteElems = document.querySelectorAll<SVGElement>(
        '#sheet svg .vf-notehead',
      );

      const nextExpected = () => SONG[pos];
      let pos = 0;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;

      let highlighted = -1;
      const highlightCurrent = () => {
        if (highlighted >= 0) {
          noteElems[highlighted]?.classList.remove(styles.sheetHighlight);
        }
        noteElems[pos]?.classList.add(styles.sheetHighlight);
        highlighted = pos;
      };

      const markCorrect = (idx: number) => {
        noteElems[idx]?.classList.remove(styles.sheetHighlight);
        noteElems[idx]?.classList.add(styles.sheetCorrect);
      };

      const showFeedback = (el: HTMLElement, ok: boolean) => {
        let fb = el.querySelector<HTMLSpanElement>(`.${styles.feedback}`);
        if (!fb) {
          fb = document.createElement('span');
          fb.className = styles.feedback;
          el.appendChild(fb);
        }
        fb.textContent = ok ? '✓' : '✗';
        fb.classList.add(styles.feedbackVisible);
        setTimeout(() => fb?.classList.remove(styles.feedbackVisible), 300);
      };

      highlightCurrent();

      const getKeyFromNote = (note: string) =>
        [...WHITE_KEYS, ...BLACK_KEYS].find((n) => n.note === note)?.key || '';

      const clearIdle = () => {
        if (idleTimer) clearTimeout(idleTimer);
        hintRef.current!.textContent = '';
      };

      const startIdle = () => {
        idleTimer = setTimeout(() => {
          hintRef.current!.innerHTML = `→ Pulsa <strong>${getKeyFromNote(nextExpected())}</strong>`;
        }, IDLE_TIMEOUT_MS);
      };

      const handlePress = (note: string, el: HTMLElement) => {
        const correct = note === nextExpected();
        showFeedback(el, correct);
        if (correct) {
          markCorrect(pos);
          pos += 1;

          if (pos === SONG.length) {
            hintRef.current!.textContent = '¡Bien hecho!';
            clearIdle();
            return;
          }
          clearIdle();
          highlightCurrent();
          startIdle();
        } else {
          hintRef.current!.textContent = 'Esa no es 🤔';
          highlightCurrent();
        }

        el.classList.add(styles.pressed);
        setTimeout(() => el.classList.remove(styles.pressed), 80);
      };

      keydownListener = (e) => {
        const note = NOTE_MAP[e.key.toUpperCase()];
        if (!note) return;
        const el = pianoDiv.querySelector<HTMLElement>(`[data-note="${note}"]`);
        if (!el) return;
        play(note);
        handlePress(note, el);
      };

      clickListener = (e) => {
        const target = (e.target as HTMLElement).closest<HTMLElement>(
          `.${styles.key}`,
        );
        if (!target) return;
        const note = target.dataset.note;
        if (!note) return;
        play(note);
        handlePress(note, target);
      };

      document.addEventListener('keydown', keydownListener);
      pianoDiv.addEventListener('click', clickListener);
      startIdle();
    })();

    return () => {
      document.removeEventListener('keydown', keydownListener as any);
      pianoRef.current?.removeEventListener('click', clickListener as any);
      if (synth) synth.dispose();
    };
  }, []);

  return (
    <section id="piano-star-game" className={styles.gameSection}>
      <h2 className={styles.title}>Estrellita</h2>
      <div id="sheet" />
      <div ref={pianoRef} className={styles.piano} />
      <p ref={hintRef} className={styles.hint} />
    </section>
  );
}
