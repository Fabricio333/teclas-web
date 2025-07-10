'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './PianoStarGame.module.scss';

export default function PianoStarGame() {
  const pianoRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const [toneReady, setToneReady] = useState(false);
  const [vexReady, setVexReady] = useState(false);

  useEffect(() => {
    if (!toneReady || !vexReady || !pianoRef.current || !hintRef.current) {
      return;
    }

    const WHITE_KEYS = ['A', 'S', 'D', 'F', 'G', 'H', 'J'];
    const BLACK_KEYS = ['W', 'E', 'T', 'Y', 'U'];
    const NOTE_MAP: Record<string, string> = {
      A: 'C4',
      W: 'C#4',
      S: 'D4',
      E: 'D#4',
      D: 'E4',
      F: 'F4',
      T: 'F#4',
      G: 'G4',
      Y: 'G#4',
      H: 'A4',
      U: 'A#4',
      J: 'B4',
    };

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

    const pianoDiv = pianoRef.current;
    pianoDiv.innerHTML = '';
    WHITE_KEYS.forEach((key, i) => {
      const k = document.createElement('div');
      k.className = styles.key;
      k.dataset.note = NOTE_MAP[key];
      k.textContent = key;
      if (![2, 6].includes(i)) {
        const bk = document.createElement('div');
        bk.className = `${styles.key} ${styles.black}`;
        bk.textContent = BLACK_KEYS[[0, 1, 3, 4, 5][i]];
        bk.dataset.note = NOTE_MAP[BLACK_KEYS[[0, 1, 3, 4, 5][i]]];
        k.appendChild(bk);
      }
      pianoDiv.appendChild(k);
    });

    const Tone = (window as any).Tone;
    const synth = new Tone.Sampler({
      urls: { C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3' },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    }).toDestination();

    function play(note: string) {
      synth.triggerAttackRelease(note, '8n');
    }

    const Vex = (window as any).Vex;
    const VF = Vex.Flow;
    const vf = new VF.Factory({
      renderer: { elementId: 'sheet', width: 600, height: 160 },
    });
    const score = vf.EasyScore();
    const system = vf.System();
    system.addStave({
      voices: [
        score.voice(
          score.notes(SONG.map((n) => n.replace('4', '/q')).join(',')),
        ),
      ],
    });
    vf.draw();
    const noteElems = document.querySelectorAll<SVGElement>(
      '#sheet svg .vf-note',
    );

    let pos = 0;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function nextExpected() {
      return SONG[pos];
    }

    function highlightSheet(idx: number, col: string) {
      noteElems[idx].style.fill = col;
    }

    function clearIdle() {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      hintRef.current!.textContent = '';
    }

    function startIdle() {
      idleTimer = setTimeout(() => {
        hintRef.current!.innerHTML = `→ Pulsa <strong>${getKeyFromNote(nextExpected())}</strong>`;
      }, IDLE_TIMEOUT_MS);
    }

    function getKeyFromNote(note: string) {
      return Object.entries(NOTE_MAP).find(([k, v]) => v === note)?.[0] || '';
    }

    function handlePress(note: string, origEl: HTMLElement) {
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
      origEl.classList.add(styles.pressed);
      setTimeout(() => origEl.classList.remove(styles.pressed), 80);
    }

    function keydownListener(e: KeyboardEvent) {
      const key = e.key.toUpperCase();
      if (!NOTE_MAP[key]) return;
      const note = NOTE_MAP[key];
      const el = Array.from(pianoDiv.querySelectorAll(`.${styles.key}`)).find(
        (k) => (k as HTMLElement).dataset.note === note,
      ) as HTMLElement | undefined;
      if (!el) return;
      play(note);
      handlePress(note, el);
    }

    function clickListener(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const note = target.dataset.note;
      if (!note) return;
      play(note);
      handlePress(note, target);
    }

    document.addEventListener('keydown', keydownListener);
    pianoDiv.addEventListener('click', clickListener);
    startIdle();

    return () => {
      document.removeEventListener('keydown', keydownListener);
      pianoDiv.removeEventListener('click', clickListener);
    };
  }, [toneReady, vexReady]);

  return (
    <section id="piano-star-game" className={styles.gameSection}>
      <h2 className={styles.title}>Juega a “Estrellita”</h2>
      <canvas id="sheet" width={600} height={160} />
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
