'use client';

import { useEffect, useRef } from 'react';
import styles from './PianoPlayer.module.scss';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
import {
  LEVELS,
  KEY_TO_MIDI,
  MIDI_TO_KEY,
  WHITE_KEYS,
  BLACK_KEYS,
} from '@/lib/piano-player/songs';

function getDifficultyLabel(d: 1 | 2 | 3): string {
  return '\u2B50'.repeat(d);
}

export default function PianoPlayer() {
  const pianoRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let synth: any; // Tone.Sampler
    let keydownListener: (e: KeyboardEvent) => void;
    let keyupListener: (e: KeyboardEvent) => void;
    let clickListener: (e: MouseEvent) => void;
    let midiInputs: any[] = [];
    let abcjs: any;
    let aborted = false;

    (async () => {
      const [Tone, abcjsModule] = await Promise.all([
        import('tone'),
        import('abcjs'),
      ]);

      if (aborted) return;

      abcjs = abcjsModule.default || abcjsModule;

      if (!pianoRef.current || !hintRef.current) return;
      const pianoDiv = pianoRef.current;

      // ---------- Audio: Tone.Sampler with real piano samples ----------
      const urls: Record<string, string> = {};
      const noteNames = [
        'C',
        'Db',
        'D',
        'Eb',
        'E',
        'F',
        'Gb',
        'G',
        'Ab',
        'A',
        'Bb',
        'B',
      ];
      for (let octave = 3; octave <= 5; octave++) {
        for (const n of noteNames) {
          const name = `${n}${octave}`;
          urls[name] = `${name}.mp3`;
        }
      }

      synth = new Tone.Sampler({
        urls,
        baseUrl: '/samples/mp3/',
        onload: () => {
          if (aborted) return;
          const loadingEl = document.getElementById('piano-loading');
          if (loadingEl) loadingEl.style.display = 'none';
        },
        onerror: (err: Error) => {
          console.error('Failed to load piano samples:', err);
          const loadingEl = document.getElementById('piano-loading');
          if (loadingEl) loadingEl.textContent = 'Error loading sounds';
        },
      }).toDestination();

      const play = async (midiNumber: number) => {
        try {
          await Tone.start();
          const noteName = midiNumberToNote(midiNumber, undefined, true);
          if (synth.loaded) {
            synth.triggerAttackRelease(noteName, '8n');
          }
        } catch (err) {
          console.error('Play error:', err);
        }
      };

      // ---------- Level state ----------
      let currentLevelIndex = 0;
      let level = LEVELS[currentLevelIndex];
      let SONG = level.notes;
      const IDLE_TIMEOUT_MS = 4500;

      let pos = 0;
      let score = 0;
      let hits = 0;
      let attempts = 0;
      let streak = 0;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      let errorHighlighted = false;
      let highlighted = -1;
      const pressedMidi = new Set<number>();

      // ---------- Build piano DOM ----------
      pianoDiv.innerHTML = '';
      WHITE_KEYS.forEach((white, i) => {
        const wEl = document.createElement('div');
        wEl.className = styles.key;
        wEl.dataset.midi = String(white.midi);

        const labelEl = document.createElement('span');
        labelEl.className = styles.keyLabel;
        labelEl.textContent = white.label;
        wEl.appendChild(labelEl);

        const black = BLACK_KEYS.find((b) => b.afterWhiteIndex === i);
        if (black) {
          const bEl = document.createElement('div');
          bEl.className = `${styles.key} ${styles.black}`;
          bEl.dataset.midi = String(black.midi);

          const bLabel = document.createElement('span');
          bLabel.className = styles.keyLabel;
          bLabel.textContent = black.label;
          bEl.appendChild(bLabel);

          wEl.appendChild(bEl);
        }

        pianoDiv.appendChild(wEl);
      });

      // ---------- Sheet music ----------
      const renderSheet = (lev: typeof level) => {
        const sheetEl = document.getElementById('sheet');
        if (sheetEl) sheetEl.innerHTML = '';
        abcjs.renderAbc('sheet', lev.abc, {
          add_classes: true,
          responsive: 'resize',
        });
      };

      renderSheet(level);

      // Find note elements in the SVG rendered by abcjs
      const noteElems = (): SVGElement[] => {
        const sheet = document.getElementById('sheet');
        if (!sheet) return [];
        let els = sheet.querySelectorAll<SVGElement>('.abcjs-note');
        if (els.length === 0) {
          els = sheet.querySelectorAll<SVGElement>('[class*="abcjs-n"]');
        }
        return Array.from(els);
      };

      const applyClass = (el: SVGElement | undefined, cls: string) => {
        if (!el) return;
        el.classList.add(cls);
        el.querySelectorAll('path, ellipse, circle').forEach((p) =>
          p.classList.add(cls),
        );
      };

      const removeClass = (el: SVGElement | undefined, cls: string) => {
        if (!el) return;
        el.classList.remove(cls);
        el.querySelectorAll('path, ellipse, circle').forEach((p) =>
          p.classList.remove(cls),
        );
      };

      // ---------- UI helpers ----------
      const scoreEl = document.getElementById('score-val');
      const streakEl = document.getElementById('streak-val');
      const accuracyEl = document.getElementById('accuracy-val');

      const updateScoreUI = () => {
        if (scoreEl) scoreEl.textContent = String(score);
        if (streakEl) streakEl.textContent = String(streak);
        if (accuracyEl)
          accuracyEl.textContent = attempts
            ? Math.round((hits / attempts) * 100) + '%'
            : '\u2014';
      };

      const getKeyLabel = (midiNumber: number) => MIDI_TO_KEY[midiNumber] || '';

      const highlightCurrent = () => {
        const elems = noteElems();
        if (highlighted >= 0 && elems[highlighted]) {
          removeClass(elems[highlighted], styles.sheetHighlight);
          removeClass(elems[highlighted], styles.sheetError);
        }
        if (elems[pos]) {
          applyClass(elems[pos], styles.sheetHighlight);
          highlighted = pos;
        }

        // hint key outline on piano
        const prevHint = pianoDiv.querySelector<HTMLElement>(
          `.${styles.hintKey}`,
        );
        prevHint?.classList.remove(styles.hintKey);
        const expected = SONG[pos];
        const expectedEl = pianoDiv.querySelector<HTMLElement>(
          `[data-midi="${expected}"]`,
        );
        if (expectedEl) expectedEl.classList.add(styles.hintKey);

        // progress bar
        const progress = document.getElementById('progress');
        if (progress) {
          const pct = Math.round((pos / SONG.length) * 100);
          progress.style.width = pct + '%';
        }
      };

      const markCorrect = (idx: number) => {
        const elems = noteElems();
        if (elems[idx]) {
          removeClass(elems[idx], styles.sheetHighlight);
          applyClass(elems[idx], styles.sheetCorrect);
        }
      };

      const markError = () => {
        if (errorHighlighted) return;
        const el = noteElems()[pos];
        if (!el) return;
        applyClass(el, styles.sheetError);
        errorHighlighted = true;
      };

      const showFeedback = (midiNumber: number, ok: boolean) => {
        const el = pianoDiv.querySelector<HTMLElement>(
          `[data-midi="${midiNumber}"]`,
        );
        if (!el) return;
        let fb = el.querySelector<HTMLSpanElement>(`.${styles.feedback}`);
        if (!fb) {
          fb = document.createElement('span');
          fb.className = styles.feedback;
          el.appendChild(fb);
        }
        fb.textContent = ok ? '\u2713' : '\u2717';
        fb.classList.add(styles.feedbackVisible);
        setTimeout(() => fb?.classList.remove(styles.feedbackVisible), 300);
      };

      const clearIdle = () => {
        if (idleTimer) clearTimeout(idleTimer);
        if (hintRef.current) hintRef.current.textContent = '';
        if (errorHighlighted) {
          const elems = noteElems();
          if (elems[pos]) removeClass(elems[pos], styles.sheetError);
          errorHighlighted = false;
        }
      };

      const startIdle = () => {
        idleTimer = setTimeout(() => {
          if (hintRef.current)
            hintRef.current.innerHTML = `\u2192 Pulsa <strong>${getKeyLabel(SONG[pos])}</strong>`;
          markError();
        }, IDLE_TIMEOUT_MS);
      };

      highlightCurrent();
      startIdle();

      // ---------- Game logic ----------
      const handleNotePress = (midiNumber: number) => {
        play(midiNumber);
        if (pos >= SONG.length) return;

        const correct = midiNumber === SONG[pos];
        attempts += 1;
        if (correct) hits += 1;

        showFeedback(midiNumber, correct);

        // Highlight pressed key
        const el = pianoDiv.querySelector<HTMLElement>(
          `[data-midi="${midiNumber}"]`,
        );
        if (el) {
          el.classList.add(styles.pressed);
          setTimeout(() => el.classList.remove(styles.pressed), 120);
        }

        if (correct) {
          score += 10;
          streak += 1;
          markCorrect(pos);
          pos += 1;

          if (errorHighlighted) {
            const elems = noteElems();
            const prev = pos - 1;
            if (elems[prev]) removeClass(elems[prev], styles.sheetError);
            errorHighlighted = false;
          }

          if (pos === SONG.length) {
            if (hintRef.current)
              hintRef.current.textContent = '\u00A1Bien hecho!';
            doneRef.current?.classList.add(styles.doneVisible);
            clearIdle();
            updateScoreUI();
            return;
          }

          clearIdle();
          highlightCurrent();
          startIdle();
        } else {
          score = Math.max(0, score - 5);
          streak = 0;
          if (hintRef.current)
            hintRef.current.textContent = 'Esa no es \uD83E\uDD14';
          highlightCurrent();
        }

        updateScoreUI();
      };

      // ---------- PC keyboard input ----------
      keydownListener = (e) => {
        if (e.repeat) return;
        const midi = KEY_TO_MIDI[e.key.toLowerCase()];
        if (midi === undefined) return;
        if (pressedMidi.has(midi)) return;
        pressedMidi.add(midi);
        handleNotePress(midi);
      };

      keyupListener = (e) => {
        const midi = KEY_TO_MIDI[e.key.toLowerCase()];
        if (midi !== undefined) {
          pressedMidi.delete(midi);
        }
      };

      document.addEventListener('keydown', keydownListener);
      document.addEventListener('keyup', keyupListener);

      // ---------- Mouse click on piano ----------
      clickListener = (e) => {
        const target = (e.target as HTMLElement).closest<HTMLElement>(
          `.${styles.key}`,
        );
        if (!target) return;
        const midi = Number(target.dataset.midi);
        if (!isNaN(midi)) handleNotePress(midi);
      };
      pianoDiv.addEventListener('click', clickListener);

      // ---------- MIDI keyboard input ----------
      if (typeof navigator !== 'undefined' && navigator.requestMIDIAccess) {
        try {
          const access = await navigator.requestMIDIAccess();
          access.inputs.forEach((input) => {
            midiInputs.push(input);
            input.onmidimessage = (event: WebMidi.MIDIMessageEvent) => {
              const data = event.data;
              if (!data || data.length < 3) return;
              const status = data[0] & 0xf0;
              const note = data[1];
              const velocity = data[2];
              if (status === 0x90 && velocity > 0) {
                handleNotePress(note);
              }
            };
          });
        } catch {
          // MIDI not available — that's fine
        }
      }

      // ---------- Shared reset helper ----------
      const resetGame = () => {
        pos = 0;
        score = 0;
        hits = 0;
        attempts = 0;
        streak = 0;
        highlighted = -1;
        errorHighlighted = false;
        updateScoreUI();
        doneRef.current?.classList.remove(styles.doneVisible);
        renderSheet(level);
        setTimeout(() => {
          highlightCurrent();
          startIdle();
        }, 50);
        clearIdle();
      };

      const switchLevel = (idx: number) => {
        currentLevelIndex = idx;
        level = LEVELS[idx];
        SONG = level.notes;
        const songSelect = document.getElementById(
          'level-select',
        ) as HTMLSelectElement | null;
        if (songSelect) songSelect.value = String(idx);
        const nextBtn = document.getElementById('done-next-btn');
        if (nextBtn) {
          (nextBtn as HTMLButtonElement).style.display =
            idx >= LEVELS.length - 1 ? 'none' : '';
        }
        resetGame();
      };

      // ---------- Level select ----------
      const songSelect = document.getElementById(
        'level-select',
      ) as HTMLSelectElement | null;
      if (songSelect) {
        songSelect.addEventListener('change', (ev) => {
          const idx = parseInt((ev.target as HTMLSelectElement).value);
          switchLevel(idx);
        });
      }

      // ---------- Restart ----------
      const restartBtn = document.getElementById('restart-btn');
      if (restartBtn) {
        restartBtn.addEventListener('click', resetGame);
      }

      // ---------- Done overlay buttons ----------
      const doneReplayBtn = document.getElementById('done-replay-btn');
      if (doneReplayBtn) {
        doneReplayBtn.addEventListener('click', resetGame);
      }

      const doneNextBtn = document.getElementById('done-next-btn');
      if (doneNextBtn) {
        doneNextBtn.addEventListener('click', () => {
          if (currentLevelIndex < LEVELS.length - 1) {
            switchLevel(currentLevelIndex + 1);
          }
        });
        // Hide "next" if already on last song
        if (currentLevelIndex >= LEVELS.length - 1) {
          (doneNextBtn as HTMLButtonElement).style.display = 'none';
        }
      }
    })().catch((err) => {
      console.error('PianoPlayer setup error:', err);
    });

    return () => {
      aborted = true;
      if (keydownListener)
        document.removeEventListener('keydown', keydownListener);
      if (keyupListener) document.removeEventListener('keyup', keyupListener);
      pianoRef.current?.removeEventListener('click', clickListener as any);
      midiInputs.forEach((input) => {
        try {
          input.close();
        } catch {}
      });
      if (synth) synth.dispose();
    };
  }, []);

  return (
    <section className={styles.gameSection}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Aprende Piano</h2>
        <p className={styles.subtitle}>
          Sigue las notas en la partitura. Usa el teclado o haz clic en las
          teclas del piano.
        </p>
      </div>

      {/* Controls panel */}
      <div className={styles.controlsPanel}>
        <div className={styles.controls}>
          <label className={styles.selectLabel}>
            Cancion:{' '}
            <select id="level-select" className={styles.select}>
              {LEVELS.map((lev, i) => (
                <option key={lev.id} value={i}>
                  {getDifficultyLabel(lev.difficulty)} {lev.name}
                </option>
              ))}
            </select>
          </label>

          <button id="restart-btn" className={styles.restartBtn}>
            Reiniciar
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div className={styles.scoreCards}>
        <div className={`${styles.scoreCard} ${styles.scoreCardBlue}`}>
          <span className={styles.scoreCardLabel}>Puntos</span>
          <span id="score-val" className={styles.scoreCardValue}>
            0
          </span>
        </div>
        <div className={`${styles.scoreCard} ${styles.scoreCardAmber}`}>
          <span className={styles.scoreCardLabel}>Racha</span>
          <span id="streak-val" className={styles.scoreCardValue}>
            0
          </span>
        </div>
        <div className={`${styles.scoreCard} ${styles.scoreCardGreen}`}>
          <span className={styles.scoreCardLabel}>Precision</span>
          <span id="accuracy-val" className={styles.scoreCardValue}>
            {'\u2014'}
          </span>
        </div>
      </div>

      {/* Sheet music */}
      <div className={styles.sheetWrapper}>
        <div id="sheet" className={styles.sheet} />
      </div>

      {/* Progress bar */}
      <div className={styles.progressSection}>
        <span className={styles.progressLabel}>Progreso</span>
        <div className={styles.progressWrap} aria-hidden>
          <div
            id="progress"
            className={styles.progress}
            style={{ width: '0%' }}
          />
        </div>
      </div>

      {/* Piano */}
      <div className={styles.pianoWrapper}>
        <div ref={pianoRef} className={styles.piano} />
      </div>

      {/* Hint text */}
      <p ref={hintRef} className={styles.hint} />

      {/* Done overlay */}
      <div ref={doneRef} className={styles.done}>
        <div className={styles.doneCard}>
          <span className={styles.doneIcon}>{'\u2713'}</span>
          <span className={styles.doneText}>{'\u00A1Bien hecho!'}</span>
          <div className={styles.doneActions}>
            <button id="done-replay-btn" className={styles.doneBtn}>
              Repetir
            </button>
            <button
              id="done-next-btn"
              className={`${styles.doneBtn} ${styles.doneBtnPrimary}`}
            >
              Siguiente cancion
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard reference */}
      <div className={styles.keyboardRef}>
        <span className={styles.keyboardRefTitle}>Teclas:</span>
        {WHITE_KEYS.map((k) => (
          <span key={k.midi} className={styles.kbdGroup}>
            <kbd className={styles.kbd}>{k.label}</kbd>
            <span className={styles.kbdNote}>{k.note}</span>
          </span>
        ))}
      </div>

      <p id="piano-loading" className={styles.loading}>
        Cargando sonidos...
      </p>
    </section>
  );
}
