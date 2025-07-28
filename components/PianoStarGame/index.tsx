'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './PianoStarGame.module.scss';

interface NoteKey {
  key: string;
  note: string;
  position: number;
}

export default function PianoStarGame() {
  const pianoRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const [toneReady, setToneReady] = useState(false);
  const [vexReady, setVexReady] = useState(false);

  useEffect(() => {
    if (!toneReady || !vexReady || !pianoRef.current || !hintRef.current) {
      return;
    }

    // ---------- Keyboard–note mapping ----------
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
    [...WHITE_KEYS, ...BLACK_KEYS].forEach(({ key, note }) => {
      NOTE_MAP[key] = note;
    });

    // ---------- Song ("Twinkle Twinkle Little Star") ----------
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

    /* ---------- Build piano UI ---------- */
    const pianoDiv = pianoRef.current;
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
        bEl.textContent = black.key;
        bEl.dataset.note = black.note;
        wEl.appendChild(bEl);
      }

      pianoDiv.appendChild(wEl);
    });

    /* ---------- Tone.js setup ---------- */
    const Tone = (window as any).Tone;
    const synth = new Tone.PolySynth().toDestination();

    function play(note: string) {
      synth.triggerAttackRelease(note, '8n');
    }

    /* ---------- VexFlow sheet ---------- */
    const Vex = (window as any).Vex;
    const VF = Vex.Flow;
    const vf = new VF.Factory({
      renderer: { elementId: 'sheet', width: 600, height: 160 },
    });
    const score = vf.EasyScore();
    const system = vf.System();
    system.addStave({
      voices: [score.voice(score.notes(SONG.map((n) => n.replace('4', '/q')).join(',')))],
    });
    vf.draw();

    const noteElems = document.querySelectorAll<SVGElement>('#sheet svg .vf-note');

    /* ---------- Game state ---------- */
    let pos = 0;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const nextExpected = () => SONG[pos];

    const highlightSheet = (idx: number, color: string) => {
      const target = noteElems[idx];
      if (target) {
        target.style.fill = color;
      }
    };

    /* ---------- Idle hint helpers ---------- */
    const clearIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      hintRef.current!.textContent = '';
    };

    const startIdle = () => {
      idleTimer = setTimeout(() => {
        hintRef.current!.innerHTML = `→ Pulsa <strong>${getKeyFromNote(nextExpected())}</strong>`;
      }, IDLE_TIMEOUT_MS);
    };

    const getKeyFromNote = (note: string) => {
      const entry = [...WHITE_KEYS, ...BLACK_KEYS].find((nk) => nk.note === note);
      return entry?.key || '';
    };

    /* ---------- Interaction ---------- */
    const handlePress = (note: string, el: HTMLElement) => {
      if (note === nextExpected()) {
        highlightSheet(pos, '#22c55e');
        pos += 1;
        if (pos === SONG.length) {
          hintRef.current!.textContent = '¡Bien hecho!';
          clearIdle();
          return;
        }
        clearIdle();
        startIdle();
      } else {
        hintRef.current!.textContent = 'Esa no es 🤔';
      }

      el.classList.add(styles.pressed);
      setTimeout(() => el.classList.remove(styles.pressed), 80);
    };

    const keydownListener = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const note = NOTE_MAP[key];
      if (!note) return;

      const el = pianoDiv.querySelector<HTMLElement>(`[data-note="${note}"]`);
      if (!el) return;

      play(note);
      handlePress(note, el);
    };

    const clickListener = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>(`.${styles.key}`);
      if (!target) return;
      const note = target.dataset.note;
      if (!note) return;
      play(note);
      handlePress(note, target);
    };

    document.addEventListener('keydown', keydownListener);
    pianoDiv.addEventListener('click', clickListener);
    startIdle();

    /* ---------- Cleanup ---------- */
    return () => {
      document.removeEventListener('keydown', keydownListener);
      pianoDiv.removeEventListener('click', clickListener);
      synth.dispose();
    };
  }, [toneReady, vexReady]);

  return (
      <section id="piano-star-game" className={styles.gameSection}>
        <h2 className={styles.title}>Juega a “Estrellita”</h2>
        {/* VexFlow renders into this div */}
        <div id="sheet" />
        <div ref={pianoRef} className={styles.piano} />
        <p ref={hintRef} className={styles.hint} />
        <Script
            src="https://unpkg.com/tone@latest/build/Tone.js"
            strategy="afterInteractive"
            onLoad={() => setToneReady(true)}
        />
        <Script
            src="https://unpkg.com/vexflow/releases/vexflow-debug.js"
            strategy="afterInteractive"
            onLoad={() => setVexReady(true)}
        />
      </section>
  );
}
