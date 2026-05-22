'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './PianoPlayer.module.scss';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
import {
  LEVELS,
  DEBUG_LEVEL,
  DEBUG_CANON,
  KEY_TO_MIDI,
  MIDI_TO_KEY,
  WHITE_KEYS,
  BLACK_KEYS,
} from '@/lib/piano-player/songs';
import { useMicrophonePitch } from '@/hooks/use-microphone-pitch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophone,
  faMicrophoneSlash,
} from '@fortawesome/free-solid-svg-icons';

const ALL_LEVELS =
  process.env.NODE_ENV === 'development'
    ? [...LEVELS, DEBUG_LEVEL, DEBUG_CANON]
    : LEVELS;

function getDifficultyLabel(d: 1 | 2 | 3): string {
  return '\u2B50'.repeat(d);
}

export default function PianoPlayer() {
  const pianoRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  // Bridge refs for microphone pitch detection
  const notePressRef = useRef<((midi: number) => void) | null>(null);
  const noteReleaseRef = useRef<((midi: number) => void) | null>(null);
  const micMuteRef = useRef<(() => void) | null>(null);
  const micUnmuteRef = useRef<(() => void) | null>(null);

  const {
    status: micStatus,
    startListening,
    stopListening,
    error: micError,
    muteDetection,
    unmuteDetection,
  } = useMicrophonePitch({
    onNotePressRef: notePressRef,
    onNoteReleaseRef: noteReleaseRef,
  });

  // Keep mute/unmute refs current
  useEffect(() => {
    micMuteRef.current = muteDetection;
    micUnmuteRef.current = unmuteDetection;
  }, [muteDetection, unmuteDetection]);

  const [micEnabled, setMicEnabled] = useState(false);

  const toggleMic = useCallback(async () => {
    if (micEnabled) {
      stopListening();
      setMicEnabled(false);
    } else {
      await startListening();
      setMicEnabled(true);
    }
  }, [micEnabled, startListening, stopListening]);

  useEffect(() => {
    let synth: any; // Tone.Sampler
    let keydownListener: (e: KeyboardEvent) => void;
    let keyupListener: (e: KeyboardEvent) => void;
    let pointerDownListener: (e: PointerEvent) => void;
    let pointerUpListener: (e: PointerEvent) => void;
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
      for (let octave = 1; octave <= 7; octave++) {
        for (const n of noteNames) {
          const name = `${n}${octave}`;
          urls[name] = `${name}.mp3`;
        }
      }

      // Pre-compute MIDI → note name lookup (avoids per-press function calls)
      const midiToName: Record<number, string> = {};
      for (let m = 21; m <= 108; m++) {
        midiToName[m] = midiNumberToNote(m, undefined, true);
      }

      synth = new Tone.Sampler({
        urls,
        baseUrl: '/samples/mp3/',
        release: 0.8, // natural damper decay time in seconds
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

      // ---------- Audio context: start once on first interaction ----------
      let audioStarted = false;
      const ensureAudio = async () => {
        if (audioStarted) return;
        await Tone.start();
        audioStarted = true;
      };

      // Eagerly start audio on first user gesture (removes latency from first note)
      const startOnGesture = () => {
        ensureAudio();
        document.removeEventListener('pointerdown', startOnGesture);
        document.removeEventListener('keydown', startOnGesture);
      };
      document.addEventListener('pointerdown', startOnGesture, {
        once: true,
      });
      document.addEventListener('keydown', startOnGesture, { once: true });

      // ---------- Sustain audio: attack on press, release on lift ----------
      const attackNote = (midiNumber: number) => {
        if (!synth.loaded) return;
        const name = midiToName[midiNumber];
        if (!name) return;
        micMuteRef.current?.();
        try {
          synth.triggerAttack(name, Tone.now());
        } catch (err) {
          console.error('Attack error:', err);
        }
      };

      const releaseNote = (midiNumber: number) => {
        if (!synth.loaded) return;
        const name = midiToName[midiNumber];
        if (!name) return;
        try {
          // Schedule release slightly in the future for natural damper feel
          synth.triggerRelease(name, Tone.now() + 0.08);
        } catch {
          // ignore release errors
        }
        setTimeout(() => micUnmuteRef.current?.(), 200);
      };

      // Track pressed elements by actual MIDI so release works across offset changes
      const pressedElements = new Map<number, HTMLElement>();

      const pressKey = (midiNumber: number) => {
        const baseMidi = midiNumber - midiOffset;
        const el = pianoDiv.querySelector<HTMLElement>(
          `[data-midi="${baseMidi}"]`,
        );
        if (el) {
          el.classList.add(styles.pressed);
          pressedElements.set(midiNumber, el);
        }
      };

      const releaseKey = (midiNumber: number) => {
        const el = pressedElements.get(midiNumber);
        if (el) {
          el.classList.remove(styles.pressed);
          pressedElements.delete(midiNumber);
        }
      };

      // ---------- Level state ----------
      let currentLevelIndex = 0;
      let level = ALL_LEVELS[currentLevelIndex];
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

      // ---------- Octave shift ----------
      let midiOffset = 0; // added to base MIDI (KEY_TO_MIDI) to get actual MIDI
      // physical keyboard key → actual MIDI that was attacked (stable across offset changes)
      const physicalKeyMidi = new Map<string, number>();

      const updateOctaveIndicator = () => {
        const el = document.getElementById('octave-indicator');
        if (el) {
          const octave = Math.floor((60 + midiOffset) / 12) - 1;
          el.textContent = `Octava ${octave}`;
          // Show/hide based on whether we're shifted
          el.style.opacity = midiOffset === 0 ? '0.5' : '1';
        }
      };

      const showShiftPopup = (direction: 'down' | 'up') => {
        const popup = document.getElementById('octave-popup');
        const noteEl = noteElems()[pos];
        const sheetWrapper = document.getElementById('sheet-wrapper');
        if (!popup || !noteEl || !sheetWrapper) return;

        const noteRect = noteEl.getBoundingClientRect();
        const wrapperRect = sheetWrapper.getBoundingClientRect();

        const octave = Math.floor((60 + midiOffset) / 12) - 1;
        popup.textContent =
          direction === 'down'
            ? `\u2B07 Octava ${octave}`
            : `\u2B06 Octava ${octave}`;
        popup.style.left = `${noteRect.left - wrapperRect.left + noteRect.width / 2}px`;
        popup.style.top = `${noteRect.top - wrapperRect.top - 28}px`;
        popup.classList.remove(styles.octavePopupVisible);
        // Force reflow so re-adding the class triggers the animation
        void popup.offsetWidth;
        popup.classList.add(styles.octavePopupVisible);
        setTimeout(
          () => popup.classList.remove(styles.octavePopupVisible),
          2500,
        );
      };

      const checkOctaveShift = () => {
        if (pos >= SONG.length) return;
        const target = SONG[pos];
        const low = 60 + midiOffset;
        const high = 71 + midiOffset;
        if (target >= low && target <= high) return; // in range

        // Compute new offset (full octaves)
        const newOffset = Math.floor((target - 60) / 12) * 12;
        if (newOffset === midiOffset) return;

        const direction = newOffset < midiOffset ? 'down' : 'up';
        midiOffset = newOffset;
        updateOctaveIndicator();
        showShiftPopup(direction);
      };

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

        pianoDiv.appendChild(wEl);
      });

      BLACK_KEYS.forEach((black) => {
        const bEl = document.createElement('div');
        bEl.className = `${styles.key} ${styles.black}`;
        bEl.dataset.midi = String(black.midi);
        bEl.dataset.keyPosition = String(black.afterWhiteIndex);

        const bLabel = document.createElement('span');
        bLabel.className = styles.keyLabel;
        bLabel.textContent = black.label;
        bEl.appendChild(bLabel);

        pianoDiv.appendChild(bEl);
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

      const getKeyLabel = (midiNumber: number) => {
        const baseMidi = midiNumber - midiOffset;
        return MIDI_TO_KEY[baseMidi] || '';
      };

      const highlightCurrent = () => {
        // Check if the next note needs an octave shift
        checkOctaveShift();

        const elems = noteElems();
        if (highlighted >= 0 && elems[highlighted]) {
          removeClass(elems[highlighted], styles.sheetHighlight);
          removeClass(elems[highlighted], styles.sheetError);
        }
        if (elems[pos]) {
          applyClass(elems[pos], styles.sheetHighlight);
          highlighted = pos;
        }

        // hint key outline on piano (use base MIDI for DOM lookup)
        const prevHint = pianoDiv.querySelector<HTMLElement>(
          `.${styles.hintKey}`,
        );
        prevHint?.classList.remove(styles.hintKey);
        const expected = SONG[pos];
        const baseMidi = expected - midiOffset;
        const expectedEl = pianoDiv.querySelector<HTMLElement>(
          `[data-midi="${baseMidi}"]`,
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
        const baseMidi = midiNumber - midiOffset;
        const el = pianoDiv.querySelector<HTMLElement>(
          `[data-midi="${baseMidi}"]`,
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
      updateOctaveIndicator();
      startIdle();

      // ---------- Game logic ----------
      const handleNotePress = (midiNumber: number) => {
        attackNote(midiNumber);
        pressKey(midiNumber);
        if (pos >= SONG.length) return;

        const correct = midiNumber === SONG[pos];
        attempts += 1;
        if (correct) hits += 1;

        showFeedback(midiNumber, correct);

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

      const handleNoteRelease = (midiNumber: number) => {
        releaseNote(midiNumber);
        releaseKey(midiNumber);
      };

      // Bridge refs for microphone pitch detection
      notePressRef.current = handleNotePress;
      noteReleaseRef.current = handleNoteRelease;

      // ---------- PC keyboard input (with offset) ----------
      keydownListener = (e) => {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        const baseMidi = KEY_TO_MIDI[key];
        if (baseMidi === undefined) return;
        if (physicalKeyMidi.has(key)) return;
        const midi = baseMidi + midiOffset;
        physicalKeyMidi.set(key, midi);
        pressedMidi.add(midi);
        handleNotePress(midi);
      };

      keyupListener = (e) => {
        const key = e.key.toLowerCase();
        const midi = physicalKeyMidi.get(key);
        if (midi !== undefined) {
          physicalKeyMidi.delete(key);
          pressedMidi.delete(midi);
          handleNoteRelease(midi);
        }
      };

      document.addEventListener('keydown', keydownListener);
      document.addEventListener('keyup', keyupListener);

      // ---------- Pointer (mouse + touch) on piano (with offset) ----------
      const pointerMidi = new Map<number, number>(); // pointerId → actual midi

      pointerDownListener = (e) => {
        const target = (e.target as HTMLElement).closest<HTMLElement>(
          `.${styles.key}`,
        );
        if (!target) return;
        const baseMidi = Number(target.dataset.midi);
        if (isNaN(baseMidi)) return;
        e.preventDefault();
        pianoDiv.setPointerCapture(e.pointerId);
        const midi = baseMidi + midiOffset;
        pointerMidi.set(e.pointerId, midi);
        handleNotePress(midi);
      };

      pointerUpListener = (e) => {
        const midi = pointerMidi.get(e.pointerId);
        if (midi !== undefined) {
          pointerMidi.delete(e.pointerId);
          handleNoteRelease(midi);
        }
      };

      pianoDiv.addEventListener('pointerdown', pointerDownListener);
      pianoDiv.addEventListener('pointerup', pointerUpListener);
      pianoDiv.addEventListener('pointercancel', pointerUpListener);

      // ---------- MIDI keyboard input (no offset — sends real MIDI) ----------
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
              } else if (
                status === 0x80 ||
                (status === 0x90 && velocity === 0)
              ) {
                handleNoteRelease(note);
              }
            };
          });
        } catch {
          // MIDI not available — that's fine
        }
      }

      // ---------- Shared reset helper ----------
      const resetGame = () => {
        // Release any held notes
        if (synth?.loaded) synth.releaseAll();
        pressedElements.forEach((el) => el.classList.remove(styles.pressed));
        pressedElements.clear();
        pressedMidi.clear();
        physicalKeyMidi.clear();
        midiOffset = 0;
        pos = 0;
        score = 0;
        hits = 0;
        attempts = 0;
        streak = 0;
        highlighted = -1;
        errorHighlighted = false;
        updateScoreUI();
        updateOctaveIndicator();
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
        level = ALL_LEVELS[idx];
        SONG = level.notes;
        const songSelect = document.getElementById(
          'level-select',
        ) as HTMLSelectElement | null;
        if (songSelect) songSelect.value = String(idx);
        const nextBtn = document.getElementById('done-next-btn');
        if (nextBtn) {
          (nextBtn as HTMLButtonElement).style.display =
            idx >= ALL_LEVELS.length - 1 ? 'none' : '';
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
          if (currentLevelIndex < ALL_LEVELS.length - 1) {
            switchLevel(currentLevelIndex + 1);
          }
        });
        // Hide "next" if already on last song
        if (currentLevelIndex >= ALL_LEVELS.length - 1) {
          (doneNextBtn as HTMLButtonElement).style.display = 'none';
        }
      }
    })().catch((err) => {
      console.error('PianoPlayer setup error:', err);
    });

    return () => {
      aborted = true;
      notePressRef.current = null;
      noteReleaseRef.current = null;
      if (keydownListener)
        document.removeEventListener('keydown', keydownListener);
      if (keyupListener) document.removeEventListener('keyup', keyupListener);
      if (pointerDownListener)
        pianoRef.current?.removeEventListener(
          'pointerdown',
          pointerDownListener as any,
        );
      if (pointerUpListener) {
        pianoRef.current?.removeEventListener(
          'pointerup',
          pointerUpListener as any,
        );
        pianoRef.current?.removeEventListener(
          'pointercancel',
          pointerUpListener as any,
        );
      }
      midiInputs.forEach((input) => {
        try {
          input.close();
        } catch {}
      });
      if (synth) {
        synth.releaseAll();
        synth.dispose();
      }
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
              {ALL_LEVELS.map((lev, i) => (
                <option key={lev.id} value={i}>
                  {getDifficultyLabel(lev.difficulty)} {lev.name}
                </option>
              ))}
            </select>
          </label>

          <button id="restart-btn" className={styles.restartBtn}>
            Reiniciar
          </button>

          <button
            type="button"
            onClick={toggleMic}
            className={`${styles.micBtn} ${micStatus === 'listening' ? styles.micBtnActive : ''} ${micStatus === 'error' ? styles.micBtnError : ''}`}
            title={
              micStatus === 'listening'
                ? 'Desactivar microfono'
                : 'Activar microfono'
            }
          >
            <FontAwesomeIcon
              icon={
                micStatus === 'listening' ? faMicrophone : faMicrophoneSlash
              }
            />
          </button>
        </div>
        {micError && <p className={styles.micErrorText}>{micError}</p>}
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

      {/* Play area: sheet (left) + piano (right) on desktop */}
      <div className={styles.playArea}>
        {/* Sheet music */}
        <div id="sheet-wrapper" className={styles.sheetWrapper}>
          <div id="sheet" className={styles.sheet} />
          <div id="octave-popup" className={styles.octavePopup} />
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
          <span id="octave-indicator" className={styles.octaveIndicator}>
            Octava 4
          </span>
          <div ref={pianoRef} className={styles.piano} />
        </div>
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
