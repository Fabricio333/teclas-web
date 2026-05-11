'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './EarTraining.module.scss';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
import {
  LEVELS,
  KEY_TO_MIDI,
  MIDI_TO_KEY,
  MIDI_TO_SOLFEGE,
  WHITE_KEYS,
  BLACK_KEYS,
  generateRound,
} from '@/lib/ear-training/levels';
import { useMicrophonePitch } from '@/hooks/use-microphone-pitch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophone,
  faMicrophoneSlash,
} from '@fortawesome/free-solid-svg-icons';

function getDifficultyLabel(d: 1 | 2 | 3): string {
  return '\u2B50'.repeat(d);
}

export default function EarTraining() {
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
    let Tone: any;
    let keydownListener: (e: KeyboardEvent) => void;
    let keyupListener: (e: KeyboardEvent) => void;
    let pointerDownListener: (e: PointerEvent) => void;
    let pointerUpListener: (e: PointerEvent) => void;
    let midiInputs: any[] = [];
    let aborted = false;

    (async () => {
      const ToneModule = await import('tone');
      Tone = ToneModule;

      if (aborted) return;
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

      // Pre-compute MIDI -> note name lookup
      const midiToName: Record<number, string> = {};
      for (let m = 21; m <= 108; m++) {
        midiToName[m] = midiNumberToNote(m, undefined, true);
      }

      synth = new Tone.Sampler({
        urls,
        baseUrl: '/samples/mp3/',
        release: 0.8,
        onload: () => {
          if (aborted) return;
          const loadingEl = document.getElementById('ear-loading');
          if (loadingEl) loadingEl.style.display = 'none';
          // Auto-play the first note once samples are loaded
          playTargetNote();
        },
        onerror: (err: Error) => {
          console.error('Failed to load piano samples:', err);
          const loadingEl = document.getElementById('ear-loading');
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

      const startOnGesture = () => {
        ensureAudio();
        document.removeEventListener('pointerdown', startOnGesture);
        document.removeEventListener('keydown', startOnGesture);
      };
      document.addEventListener('pointerdown', startOnGesture, { once: true });
      document.addEventListener('keydown', startOnGesture, { once: true });

      // ---------- Sustain audio ----------
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
          synth.triggerRelease(name, Tone.now() + 0.08);
        } catch {
          // ignore release errors
        }
        setTimeout(() => micUnmuteRef.current?.(), 200);
      };

      const playNoteForDuration = (midiNumber: number) => {
        if (!synth.loaded) return;
        const name = midiToName[midiNumber];
        if (!name) return;
        micMuteRef.current?.();
        try {
          synth.triggerAttackRelease(name, '2n', Tone.now());
        } catch (err) {
          console.error('Play error:', err);
        }
        setTimeout(() => micUnmuteRef.current?.(), 800);
      };

      // Track pressed elements
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
      let level = LEVELS[currentLevelIndex];
      let sequence = generateRound(level);
      const IDLE_TIMEOUT_MS = 4500;

      let pos = 0;
      let score = 0;
      let hits = 0;
      let attempts = 0;
      let streak = 0;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      let canAnswer = false;
      let advanceTimer: ReturnType<typeof setTimeout> | null = null;
      const pressedMidi = new Set<number>();

      // ---------- Octave shift ----------
      let midiOffset = 0;
      const physicalKeyMidi = new Map<string, number>();

      const updateOctaveIndicator = () => {
        const el = document.getElementById('octave-indicator');
        if (el) {
          const octave = Math.floor((60 + midiOffset) / 12) - 1;
          el.textContent = `Octava ${octave}`;
          el.style.opacity = midiOffset === 0 ? '0.5' : '1';
        }
      };

      const checkOctaveShift = (targetNote: number) => {
        const low = 60 + midiOffset;
        const high = 71 + midiOffset;
        if (targetNote >= low && targetNote <= high) return;

        const newOffset = Math.floor((targetNote - 60) / 12) * 12;
        if (newOffset === midiOffset) return;
        midiOffset = newOffset;
        updateOctaveIndicator();
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

      // ---------- UI helpers ----------
      const scoreEl = document.getElementById('score-val');
      const streakEl = document.getElementById('streak-val');
      const accuracyEl = document.getElementById('accuracy-val');
      const counterEl = document.getElementById('note-counter');
      const noteNameEl = document.getElementById('note-name-display');
      const progressEl = document.getElementById('progress');

      const updateScoreUI = () => {
        if (scoreEl) scoreEl.textContent = String(score);
        if (streakEl) streakEl.textContent = String(streak);
        if (accuracyEl)
          accuracyEl.textContent = attempts
            ? Math.round((hits / attempts) * 100) + '%'
            : '\u2014';
      };

      const updateCounter = () => {
        if (counterEl)
          counterEl.textContent = `Nota ${pos + 1} de ${sequence.length}`;
      };

      const updateProgress = () => {
        if (progressEl) {
          const pct = Math.round((pos / sequence.length) * 100);
          progressEl.style.width = pct + '%';
        }
      };

      const getKeyLabel = (midiNumber: number) => {
        const baseMidi = midiNumber - midiOffset;
        return MIDI_TO_KEY[baseMidi] || '';
      };

      const showNoteName = (midiNumber: number) => {
        if (!noteNameEl) return;
        noteNameEl.textContent = MIDI_TO_SOLFEGE[midiNumber] || '';
        noteNameEl.style.opacity = '1';
        setTimeout(() => {
          noteNameEl.style.opacity = '0';
        }, 600);
      };

      const flashKey = (midiNumber: number, correct: boolean) => {
        const baseMidi = midiNumber - midiOffset;
        const el = pianoDiv.querySelector<HTMLElement>(
          `[data-midi="${baseMidi}"]`,
        );
        if (!el) return;
        const cls = correct ? styles.correctFlash : styles.incorrectFlash;
        el.classList.remove(styles.correctFlash, styles.incorrectFlash);
        // Force reflow
        void el.offsetWidth;
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 600);
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

      const clearHintKey = () => {
        const prevHint = pianoDiv.querySelector<HTMLElement>(
          `.${styles.hintKey}`,
        );
        prevHint?.classList.remove(styles.hintKey);
      };

      const showHintKey = (midiNumber: number) => {
        const baseMidi = midiNumber - midiOffset;
        const el = pianoDiv.querySelector<HTMLElement>(
          `[data-midi="${baseMidi}"]`,
        );
        if (el) el.classList.add(styles.hintKey);
      };

      // ---------- Idle hint system ----------
      const clearIdle = () => {
        if (idleTimer) clearTimeout(idleTimer);
        if (hintRef.current) hintRef.current.textContent = '';
        clearHintKey();
      };

      const startIdle = () => {
        idleTimer = setTimeout(() => {
          const target = sequence[pos];
          if (hintRef.current)
            hintRef.current.innerHTML = `\u2192 Pulsa <strong>${getKeyLabel(target)}</strong>`;
          showHintKey(target);
        }, IDLE_TIMEOUT_MS);
      };

      // ---------- Play target note ----------
      const playTargetNote = () => {
        if (pos >= sequence.length) return;
        const target = sequence[pos];

        checkOctaveShift(target);
        updateCounter();
        updateProgress();
        clearIdle();
        clearHintKey();

        // Small delay so audio context has time to start
        setTimeout(() => {
          playNoteForDuration(target);
          canAnswer = true;
          startIdle();
        }, 150);
      };

      // ---------- Game logic ----------
      const handleNotePress = (midiNumber: number) => {
        attackNote(midiNumber);
        pressKey(midiNumber);

        if (!canAnswer || pos >= sequence.length) return;

        const target = sequence[pos];
        const correct = midiNumber === target;
        attempts += 1;
        if (correct) hits += 1;

        showFeedback(midiNumber, correct);

        if (correct) {
          score += 10;
          streak += 1;
          canAnswer = false;
          flashKey(midiNumber, true);
          showNoteName(midiNumber);
          clearIdle();
          pos += 1;

          if (pos === sequence.length) {
            // Round complete
            updateProgress();
            if (hintRef.current)
              hintRef.current.textContent = '\u00A1Bien hecho!';
            doneRef.current?.classList.add(styles.doneVisible);
            // Show final score in done overlay
            const doneScoreEl = document.getElementById('done-score');
            if (doneScoreEl) {
              const acc = attempts ? Math.round((hits / attempts) * 100) : 0;
              doneScoreEl.textContent = `${score} puntos \u00B7 ${acc}% precision`;
            }
            updateScoreUI();
            return;
          }

          updateScoreUI();
          // Advance to next note after a brief pause
          advanceTimer = setTimeout(() => {
            playTargetNote();
          }, 800);
        } else {
          score = Math.max(0, score - 5);
          streak = 0;
          flashKey(midiNumber, false);
          showHintKey(target);
          if (hintRef.current)
            hintRef.current.textContent = 'Esa no es \uD83E\uDD14';
          updateScoreUI();
        }
      };

      const handleNoteRelease = (midiNumber: number) => {
        releaseNote(midiNumber);
        releaseKey(midiNumber);
      };

      // Bridge refs for microphone pitch detection
      notePressRef.current = handleNotePress;
      noteReleaseRef.current = handleNoteRelease;

      // ---------- Replay button ----------
      const playBtn = document.getElementById('play-btn');
      if (playBtn) {
        playBtn.addEventListener('click', () => {
          ensureAudio();
          if (pos < sequence.length) {
            clearIdle();
            playNoteForDuration(sequence[pos]);
            startIdle();
          }
        });
      }

      // ---------- PC keyboard input ----------
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

      // ---------- Pointer (mouse + touch) ----------
      const pointerMidi = new Map<number, number>();

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
              } else if (
                status === 0x80 ||
                (status === 0x90 && velocity === 0)
              ) {
                handleNoteRelease(note);
              }
            };
          });
        } catch {
          // MIDI not available
        }
      }

      // ---------- Reset ----------
      const resetGame = () => {
        if (synth?.loaded) synth.releaseAll();
        pressedElements.forEach((el) => el.classList.remove(styles.pressed));
        pressedElements.clear();
        pressedMidi.clear();
        physicalKeyMidi.clear();
        if (advanceTimer) clearTimeout(advanceTimer);
        midiOffset = 0;
        pos = 0;
        score = 0;
        hits = 0;
        attempts = 0;
        streak = 0;
        canAnswer = false;
        clearIdle();
        clearHintKey();
        updateScoreUI();
        updateOctaveIndicator();
        if (noteNameEl) noteNameEl.style.opacity = '0';
        doneRef.current?.classList.remove(styles.doneVisible);

        sequence = generateRound(level);
        setTimeout(() => playTargetNote(), 100);
      };

      const switchLevel = (idx: number) => {
        currentLevelIndex = idx;
        level = LEVELS[idx];
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
        if (currentLevelIndex >= LEVELS.length - 1) {
          (doneNextBtn as HTMLButtonElement).style.display = 'none';
        }
      }

      // Initial state
      updateOctaveIndicator();
      updateCounter();
    })().catch((err) => {
      console.error('EarTraining setup error:', err);
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
        <h2 className={styles.title}>Entrenamiento Auditivo</h2>
        <p className={styles.subtitle}>
          Escucha la nota y encontrala en el piano. Usa el teclado o hace clic
          en las teclas.
        </p>
      </div>

      {/* Controls panel */}
      <div className={styles.controlsPanel}>
        <div className={styles.controls}>
          <label className={styles.selectLabel}>
            Nivel:{' '}
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

      {/* Prompt area */}
      <div className={styles.promptArea}>
        <p id="note-counter" className={styles.noteCounter}>
          Nota 1 de {LEVELS[0].notesPerRound}
        </p>
        <button id="play-btn" className={styles.playBtn}>
          Escuchar nota
        </button>
        <p id="note-name-display" className={styles.noteNameDisplay} />
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

      {/* Hint text */}
      <p ref={hintRef} className={styles.hint} />

      {/* Done overlay */}
      <div ref={doneRef} className={styles.done}>
        <div className={styles.doneCard}>
          <span className={styles.doneIcon}>{'\u2713'}</span>
          <span className={styles.doneText}>{'\u00A1Bien hecho!'}</span>
          <span id="done-score" className={styles.doneScore} />
          <div className={styles.doneActions}>
            <button id="done-replay-btn" className={styles.doneBtn}>
              Repetir
            </button>
            <button
              id="done-next-btn"
              className={`${styles.doneBtn} ${styles.doneBtnPrimary}`}
            >
              Siguiente nivel
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

      <p id="ear-loading" className={styles.loading}>
        Cargando sonidos...
      </p>
    </section>
  );
}
