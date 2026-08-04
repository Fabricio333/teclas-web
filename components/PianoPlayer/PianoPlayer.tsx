'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './PianoPlayer.module.scss';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
// Students read fixed-do. `midiNumberToNote` stays for the Tone.js sampler,
// whose note strings double as sample filenames.
import {
  letterNameToSolfege,
  midiToSolfege,
} from '@/lib/piano-player/noteNames';
import {
  LEVELS,
  DEBUG_LEVEL,
  KEY_TO_MIDI,
  MIDI_TO_KEY,
  WHITE_KEYS,
  BLACK_KEYS,
  getSectionForPosition,
  getSongPatterns,
  getSongSections,
  isGrandStaff,
  notesForHand,
  voiceClassForHand,
} from '@/lib/piano-player/songs';
import type { SongSection, SongSectionKind } from '@/lib/piano-player/songs';
import { useMicrophonePitch } from '@/hooks/use-microphone-pitch';
import { useCalibrationSettings } from '@/hooks/use-calibration-settings';
import { recordRun, updateSettings, useSettings } from '@/lib/progress';
import {
  computeSheetLayout,
  scrollOffsetFor,
  systemIndexForNote,
  viewportHeightFor,
  type SheetLayout,
} from '@/lib/piano-player/sheetSystems';
import Link from 'next/link';
import { useOnClickOutside } from '@/hooks/use-on-click-outside';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophone,
  faMicrophoneSlash,
  faExpand,
  faCompress,
  faGear,
  faSliders,
  faKeyboard,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';

const ALL_LEVELS =
  process.env.NODE_ENV === 'development' ? [...LEVELS, DEBUG_LEVEL] : LEVELS;

function getDifficultyLabel(d: 1 | 2 | 3): string {
  return '\u2B50'.repeat(d);
}

function getMidiStatusLabel(status: MidiStatus): string {
  switch (status) {
    case 'connected':
      return 'MIDI conectado';
    case 'available':
      return 'MIDI listo';
    case 'unsupported':
      return 'MIDI no disponible';
    case 'checking':
    default:
      return 'Buscando MIDI';
  }
}

function getSectionKindLabel(kind: SongSectionKind): string {
  switch (kind) {
    case 'intro':
      return 'Intro';
    case 'main':
      return 'Principal';
    case 'verse':
      return 'Verso';
    case 'chorus':
      return 'Coro';
    case 'bridge':
      return 'Puente';
    case 'ending':
      return 'Final';
    case 'practice':
    default:
      return 'Practica';
  }
}

type InputSource = 'qwerty' | 'pointer' | 'midi' | 'microphone' | 'system';
type NoteHandler = (
  midi: number,
  source?: InputSource,
  velocity?: number,
) => void;
type MidiStatus = 'checking' | 'unsupported' | 'available' | 'connected';

const MIN_PRESS_MS_BY_SOURCE: Record<InputSource, number> = {
  qwerty: 90,
  pointer: 75,
  midi: 0,
  microphone: 0,
  system: 110,
};

const DEFAULT_VELOCITY_BY_SOURCE: Record<InputSource, number> = {
  qwerty: 0.82,
  pointer: 0.88,
  midi: 0.9,
  microphone: 0,
  system: 0.72,
};

const MIN_QWERTY_OFFSET = -24;
const MAX_QWERTY_OFFSET = 24;

/** Semitones of the octave that are white keys. */
const WHITE_SET = new Set([0, 2, 4, 5, 7, 9, 11]);
/** Rendered white-key pitch, border included — the step the CSS uses. */
const KEY_STEP = 50;
const BLACK_HALF = 18;

const LETTER_BY_MIDI = new Map(
  [...WHITE_KEYS, ...BLACK_KEYS].map((k) => [k.midi, k]),
);

/**
 * Draws the keys for a midi range into the piano container.
 *
 * Extracted so fullscreen can widen the keyboard without re-running the engine
 * effect, which owns the synth, the MIDI bindings and the sheet. Only the keys
 * are replaced; the pointer handlers live on the container and survive.
 *
 * Black keys carry an inline `left` instead of the per-slot CSS rules, which
 * were pixel values hand-set for exactly one octave and could not describe a
 * third one.
 */
function buildPianoKeys(
  pianoDiv: HTMLElement,
  fromMidi: number,
  toMidi: number,
) {
  pianoDiv.innerHTML = '';

  const whites: number[] = [];
  for (let m = fromMidi; m <= toMidi; m += 1) {
    if (WHITE_SET.has(((m % 12) + 12) % 12)) whites.push(m);
  }
  const spanPx = whites.length * KEY_STEP;
  pianoDiv.style.setProperty('--piano-span', `${spanPx}px`);

  whites.forEach((midi) => {
    const known = LETTER_BY_MIDI.get(midi);
    const wEl = document.createElement('div');
    wEl.className = styles.key;
    wEl.dataset.midi = String(midi);

    const labelEl = document.createElement('span');
    labelEl.className = styles.keyLabel;
    const letterEl = document.createElement('span');
    letterEl.className = styles.keyLetter;
    letterEl.textContent = known?.label ?? '';
    labelEl.appendChild(letterEl);
    const fingerEl = document.createElement('span');
    fingerEl.className = styles.keyFinger;
    fingerEl.textContent = known ? String(known.finger) : '';
    labelEl.appendChild(fingerEl);
    wEl.appendChild(labelEl);

    pianoDiv.appendChild(wEl);
  });

  for (let m = fromMidi; m <= toMidi; m += 1) {
    if (WHITE_SET.has(((m % 12) + 12) % 12)) continue;
    // Whites strictly below this black key decide where it sits.
    const slot = whites.filter((w) => w < m).length;
    const known = LETTER_BY_MIDI.get(m);

    const bEl = document.createElement('div');
    bEl.className = `${styles.key} ${styles.black}`;
    bEl.dataset.midi = String(m);
    bEl.style.left = `calc(50% - ${spanPx / 2}px + ${slot * KEY_STEP - BLACK_HALF}px)`;

    const bLabel = document.createElement('span');
    bLabel.className = styles.keyLabel;
    const bLetter = document.createElement('span');
    bLetter.className = styles.keyLetter;
    bLetter.textContent = known?.label ?? '';
    bLabel.appendChild(bLetter);
    const bFinger = document.createElement('span');
    bFinger.className = styles.keyFinger;
    bFinger.textContent = known ? String(known.finger) : '';
    bLabel.appendChild(bFinger);
    bEl.appendChild(bLabel);

    pianoDiv.appendChild(bEl);
  }
}

export default function PianoPlayer() {
  const pianoRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  // Bridge refs for microphone pitch detection
  const notePressRef = useRef<NoteHandler | null>(null);
  const noteReleaseRef = useRef<NoteHandler | null>(null);
  const getExpectedMidiRef = useRef<(() => number | null) | null>(null);
  const micMuteRef = useRef<(() => void) | null>(null);
  const micUnmuteRef = useRef<(() => void) | null>(null);

  // Detector tuning measured from the student's own instrument and room.
  const { settings: calibrationSettings, isCalibrated } =
    useCalibrationSettings();

  const {
    status: micStatus,
    startListening,
    stopListening,
    error: micError,
    currentMidi: currentMicMidi,
    muteDetection,
    unmuteDetection,
  } = useMicrophonePitch({
    onNotePressRef: notePressRef,
    onNoteReleaseRef: noteReleaseRef,
    getExpectedMidiRef,
    settings: calibrationSettings,
  });

  // Keep mute/unmute refs current
  useEffect(() => {
    micMuteRef.current = muteDetection;
    micUnmuteRef.current = unmuteDetection;
  }, [muteDetection, unmuteDetection]);

  const [micEnabled, setMicEnabled] = useState(false);
  const [midiStatus, setMidiStatus] = useState<MidiStatus>('checking');

  // ---------- Sheet view ----------
  // The fullscreen target is the whole play area, not just the sheet. When it
  // was the sheet wrapper the keyboard was left behind on the normal page, so
  // going fullscreen silently took the piano away from anyone playing with the
  // mouse or the QWERTY keys.
  const stageRef = useRef<HTMLDivElement>(null);
  const pianoWrapperRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const settings = useSettings();
  const showPiano = settings.showPiano;
  const sheetLines = settings.sheetLines;
  const practiceHand = settings.practiceHand;

  // The student said they play an acoustic piano but never finished calibrating
  // — worth a nudge on the settings button, since that is now the only route to
  // the calibration wizard.
  const needsCalibration = settings.inputMode === 'acoustic' && !isCalibrated;

  useOnClickOutside(settingsRef, () => setSettingsOpen(false));

  const toggleFullscreen = useCallback(async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (err) {
      // Fullscreen can be refused (iOS Safari has no element fullscreen).
      // Not fatal — the sheet is still usable inline.
      console.warn('Fullscreen unavailable:', err);
    }
  }, []);

  // Mirror the browser's fullscreen state rather than assuming our toggle won
  // it: Escape and the browser's own UI can exit without going through us.
  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === stageRef.current;
      setIsFullscreen(active);
      // Re-measure: the SVG is responsive, so its systems move when the box
      // resizes, and the follow offset would otherwise point at stale
      // coordinates.
      window.dispatchEvent(new Event('teclas:relayout-sheet'));
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // The engine reads these from refs; it lives in a closure that never re-runs.
  const sheetLinesRef = useRef(sheetLines);
  useEffect(() => {
    sheetLinesRef.current = sheetLines;
    window.dispatchEvent(new Event('teclas:relayout-sheet'));
  }, [sheetLines]);

  // Which level is loaded, mirrored out of the engine. The engine owns this
  // (the "next song" button changes levels without the <select> ever firing a
  // change event), so it announces switches and React follows.
  const [levelIndex, setLevelIndex] = useState(0);
  const levelIsGrandStaff = isGrandStaff(
    ALL_LEVELS[levelIndex] ?? ALL_LEVELS[0],
  );

  useEffect(() => {
    const onLevelChanged = (event: Event) => {
      const index = (event as CustomEvent<{ index: number }>).detail?.index;
      if (typeof index === 'number') setLevelIndex(index);
    };
    window.addEventListener('teclas:level-changed', onLevelChanged);
    return () =>
      window.removeEventListener('teclas:level-changed', onLevelChanged);
  }, []);

  const practiceHandRef = useRef(practiceHand);
  useEffect(() => {
    practiceHandRef.current = practiceHand;
    // Switching hands changes which voice drives the game, so the level has to
    // be reloaded from the top rather than continuing mid-sequence.
    window.dispatchEvent(new Event('teclas:hand-changed'));
  }, [practiceHand]);

  useEffect(() => {
    // Hiding the piano changes the sheet's available height.
    window.dispatchEvent(new Event('teclas:relayout-sheet'));
  }, [showPiano]);
  const micNoteLabel =
    currentMicMidi !== null
      ? midiToSolfege(currentMicMidi, { octave: true })
      : null;

  const toggleMic = useCallback(async () => {
    if (micEnabled) {
      stopListening();
      setMicEnabled(false);
    } else {
      const started = await startListening();
      setMicEnabled(started);
    }
  }, [micEnabled, startListening, stopListening]);

  /*
   * Fullscreen widens the keyboard to three octaves.
   *
   * The engine effect below runs once and owns the synth, MIDI and sheet, so
   * it cannot be re-run just to redraw keys. It does not cache key elements —
   * every lookup is a querySelector by data-midi at call time — and the
   * pointer handlers are delegated on the container, so swapping the children
   * underneath it is safe.
   *
   * The extra octaves are for reading along: only the middle one is reachable
   * from the computer keyboard, which the badge below the piano says out loud
   * when that is the chosen input.
   */
  /*
   * What the piano currently draws. The engine effect below is a closure that
   * runs once, so it reads the range through this ref rather than capturing a
   * value that would go stale the moment fullscreen widened the keyboard.
   */
  const drawnRangeRef = useRef({ from: 60, to: 71 });

  useEffect(() => {
    const pianoDiv = pianoRef.current;
    if (!pianoDiv) return;
    const range = isFullscreen ? { from: 48, to: 83 } : { from: 60, to: 71 };
    drawnRangeRef.current = range;
    buildPianoKeys(pianoDiv, range.from, range.to);

    // The engine only refreshes this on an octave shift, and a widened
    // keyboard never shifts — so say what it now shows.
    const el = document.getElementById('octave-indicator');
    if (el && isFullscreen) {
      el.textContent = `${midiToSolfege(range.from, { octave: true })} - ${midiToSolfege(range.to, { octave: true })}`;
      el.style.opacity = '0.5';
    }
  }, [isFullscreen]);

  useEffect(() => {
    let synth: any; // Tone.Sampler
    let keydownListener: (e: KeyboardEvent) => void;
    let keyupListener: (e: KeyboardEvent) => void;
    let pointerDownListener: (e: PointerEvent) => void;
    let pointerUpListener: (e: PointerEvent) => void;
    let midiInputs: any[] = [];
    let midiAccess: any;
    let abcjs: any;
    let aborted = false;
    /**
     * Teardown for listeners registered inside the async body. The existing
     * cleanup below can only see the variables hoisted out here, and the sheet
     * viewport binds its own window listeners deeper in.
     */
    const cleanupFns: (() => void)[] = [];

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
      const attackNote = (
        midiNumber: number,
        source: InputSource,
        velocity = DEFAULT_VELOCITY_BY_SOURCE[source],
      ) => {
        if (!synth.loaded) return;
        const name = midiToName[midiNumber];
        if (!name) return;
        if (source !== 'microphone') micMuteRef.current?.();
        try {
          synth.triggerAttack(name, Tone.now(), velocity);
        } catch (err) {
          console.error('Attack error:', err);
        }
      };

      const releaseNote = (midiNumber: number, source: InputSource) => {
        if (!synth.loaded) return;
        const name = midiToName[midiNumber];
        if (!name) return;
        try {
          // Schedule release slightly in the future for natural damper feel
          synth.triggerRelease(name, Tone.now() + 0.08);
        } catch {
          // ignore release errors
        }
        if (source !== 'microphone') {
          setTimeout(() => micUnmuteRef.current?.(), 220);
        }
      };

      // Track pressed elements by actual MIDI so release works across offset changes
      const pressedElements = new Map<number, HTMLElement>();

      const pressKey = (midiNumber: number) => {
        const el = keyEl(midiNumber);
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
      let SONG = notesForHand(level, practiceHandRef.current);
      let sections = getSongSections(level);
      let patterns = getSongPatterns(level);
      let activePracticeSection: SongSection | null = null;
      let resetGame: (
        startPosition?: number,
        practiceSection?: SongSection | null,
      ) => void = () => {};
      const IDLE_TIMEOUT_MS = 4500;

      let pos = 0;
      let score = 0;
      let hits = 0;
      let attempts = 0;
      let streak = 0;
      // Progress reporting: when the run started, and which input the student
      // actually used (the last non-'system' source wins).
      let runStartedAt = Date.now();
      let lastInputSource: InputSource = 'pointer';
      let runReported = false;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      let errorHighlighted = false;
      let highlighted = -1;
      const pressedMidi = new Set<number>();
      const pressedAt = new Map<number, number>();
      const pendingReleases = new Map<number, ReturnType<typeof setTimeout>>();
      const sustainedMidi = new Set<number>();
      let sustainPedalDown = false;

      getExpectedMidiRef.current = () => (pos < SONG.length ? SONG[pos] : null);

      // ---------- Octave shift ----------
      let midiOffset = 0; // added to base MIDI (KEY_TO_MIDI) to get actual MIDI

      /*
       * Which drawn key stands for a pitch.
       *
       * On the one-octave keyboard a note outside 60-71 has no key of its own,
       * so the whole keyboard is shifted by `midiOffset` and the note is drawn
       * on the transposed key. Once three octaves are on screen that trick is
       * wrong: the real key exists, so use it. Everything that lights, hints or
       * marks a key goes through here.
       */
      const keyEl = (midi: number): HTMLElement | null => {
        const { from, to } = drawnRangeRef.current;
        const wanted = midi >= from && midi <= to ? midi : midi - midiOffset;
        return pianoDiv.querySelector<HTMLElement>(`[data-midi="${wanted}"]`);
      };

      /** True when the drawn keyboard already covers this pitch. */
      const inDrawnRange = (midi: number) => {
        const { from, to } = drawnRangeRef.current;
        return midi >= from && midi <= to;
      };
      // physical keyboard key → actual MIDI that was attacked (stable across offset changes)
      const physicalKeyMidi = new Map<string, number>();

      const updateOctaveIndicator = () => {
        const el = document.getElementById('octave-indicator');
        if (el) {
          const { from, to } = drawnRangeRef.current;
          const wide = to - from > 11;
          if (wide) {
            // Nothing is being transposed here, so naming a single octave
            // would be wrong. Say what is actually on screen.
            const low = midiToSolfege(from, { octave: true });
            const high = midiToSolfege(to, { octave: true });
            el.textContent = `${low} - ${high}`;
            el.style.opacity = '0.5';
          } else {
            const octave = Math.floor((60 + midiOffset) / 12) - 1;
            el.textContent = `Octava ${octave}`;
            // Show/hide based on whether we're shifted
            el.style.opacity = midiOffset === 0 ? '0.5' : '1';
          }
        }

        const windowEl = document.getElementById('qwerty-window');
        if (windowEl) {
          const low = midiToSolfege(60 + midiOffset, { octave: true });
          const high = midiToSolfege(71 + midiOffset, { octave: true });
          windowEl.textContent = `${low}-${high}`;
        }
      };

      const updateSongMeta = () => {
        const el = document.getElementById('song-meta');
        if (!el) return;
        const noteCount = SONG.length;
        const inputHint =
          level.difficulty === 3 ? 'Ideal con teclado MIDI' : 'QWERTY o MIDI';
        el.textContent = `${noteCount} notas · ${sections.length} partes · ${patterns.length} patrones · ${inputHint}`;
      };

      const getCompletionTarget = () =>
        activePracticeSection?.end ?? SONG.length;

      const getCurrentSection = () =>
        getSectionForPosition(level, Math.min(pos, SONG.length - 1));

      const updateSectionProgress = () => {
        const section = getCurrentSection();
        const sectionNameEl = document.getElementById('stage-name');
        const sectionKindEl = document.getElementById('stage-kind');
        const sectionPatternEl = document.getElementById('stage-pattern');
        const sectionProgressEl = document.getElementById('stage-progress');

        if (sectionNameEl) sectionNameEl.textContent = section.name;
        if (sectionKindEl)
          sectionKindEl.textContent = getSectionKindLabel(section.kind);
        if (sectionPatternEl)
          sectionPatternEl.textContent = `Patron: ${section.patternName}`;
        if (sectionProgressEl) {
          const current = Math.min(
            Math.max(pos - section.start, 0) + 1,
            section.end - section.start,
          );
          sectionProgressEl.textContent = `${current}/${section.end - section.start}`;
        }

        const modeEl = document.getElementById('stage-mode');
        if (modeEl) {
          modeEl.textContent = activePracticeSection
            ? `Practica: ${activePracticeSection.name}`
            : 'Cancion completa';
        }

        const track = document.getElementById('stage-track');
        if (track) {
          track
            .querySelectorAll<HTMLElement>('[data-section-id]')
            .forEach((button) => {
              button.classList.toggle(
                styles.stageChipActive,
                button.dataset.sectionId === section.id,
              );
              button.classList.toggle(
                styles.stageChipPractice,
                button.dataset.sectionId === activePracticeSection?.id,
              );
            });
        }
      };

      const jumpToSection = (sectionId: string) => {
        const section = sections.find((item) => item.id === sectionId);
        if (!section) return;
        resetGame(section.start, section);
      };

      const renderSectionTracker = () => {
        const track = document.getElementById('stage-track');
        if (!track) return;

        track.innerHTML = '';
        sections.forEach((section, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = styles.stageChip;
          button.dataset.sectionId = section.id;
          button.innerHTML = `<span>${index + 1}. ${section.name}</span><small>${getSectionKindLabel(section.kind)}</small>`;
          button.addEventListener('click', () => jumpToSection(section.id));
          track.appendChild(button);
        });

        updateSectionProgress();
      };

      const shiftQwertyOctave = (direction: -1 | 1) => {
        const nextOffset = Math.min(
          MAX_QWERTY_OFFSET,
          Math.max(MIN_QWERTY_OFFSET, midiOffset + direction * 12),
        );
        if (nextOffset === midiOffset) return;
        midiOffset = nextOffset;
        updateOctaveIndicator();
        highlightCurrent();
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
        // Three octaves already show this note on its own key — shifting the
        // whole keyboard under the student would be a lie about where it is.
        if (inDrawnRange(target)) return;
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
      buildPianoKeys(pianoDiv, 60, 71);

      // ---------- Sheet music ----------
      /** Durations of the rendered notes, in whole-notes, parallel to
       *  `noteElems()`. Empty when it could not be aligned — see below. */
      let noteDurations: number[] = [];

      const renderSheet = (lev: typeof level) => {
        const sheetEl = document.getElementById('sheet');
        if (sheetEl) sheetEl.innerHTML = '';
        const tunes = abcjs.renderAbc('sheet', lev.abc, {
          add_classes: true,
          paddingbottom: 14,
          paddingleft: 12,
          paddingright: 12,
          paddingtop: 10,
          responsive: 'resize',
          scale: 1.08,
          staffwidth: 700,
        });

        // Real rhythm for the playback below, read out of abcjs's own parse
        // rather than assumed. Rests are skipped so the array lines up with
        // `noteElems()`, which only returns noteheads — and if the two lengths
        // disagree for any reason (a grand staff filters to one voice, for
        // instance) the array is dropped and playback falls back to an even
        // pulse. A wrong-length array would desynchronise the highlight from
        // the sound, which is worse than a flat rhythm.
        noteDurations = collectNoteDurations(tunes?.[0]);
      };

      const collectNoteDurations = (tune: unknown): number[] => {
        const durations: number[] = [];
        try {
          const lines = (tune as { lines?: unknown[] })?.lines ?? [];
          for (const line of lines as { staff?: unknown[] }[]) {
            for (const staff of (line.staff ?? []) as {
              voices?: unknown[];
            }[]) {
              for (const voice of (staff.voices ?? []) as unknown[][]) {
                for (const item of voice as {
                  el_type?: string;
                  rest?: unknown;
                  duration?: number;
                }[]) {
                  if (item.el_type !== 'note' || item.rest) continue;
                  durations.push(item.duration ?? 0.25);
                }
              }
            }
          }
        } catch {
          return [];
        }
        return durations;
      };

      // ---------- Sheet viewport: show N systems and follow the current one ----------
      let sheetLayout: SheetLayout | null = null;

      const sheetViewport = () => document.getElementById('sheet-viewport');
      const sheetScroller = () => document.getElementById('sheet-scroller');

      /**
       * How many systems are actually visible.
       *
       * Inline, the viewport is sized from the student's line-count setting.
       * In fullscreen the sizing is inverted: flexbox gives the sheet whatever
       * height the piano leaves, and this reads that height back to decide how
       * far to scroll.
       *
       * The first attempt computed the height in JS instead — piano height plus
       * toolbar plus a guessed 64px of padding — and produced a 69px viewport
       * on an 800x544 screen, i.e. the score clipped through the middle of a
       * staff with 140px of the display left empty. Measuring beats guessing.
       */
      const visibleLines = (layout: SheetLayout): number => {
        if (document.fullscreenElement === null) return sheetLinesRef.current;

        const viewport = sheetViewport();
        const height = viewport?.getBoundingClientRect().height ?? 0;
        if (height <= 0 || layout.pitch <= 0) return 1;

        return Math.max(
          1,
          Math.min(
            layout.systems.length,
            Math.floor((height - layout.tallestSystem) / layout.pitch) + 1,
          ),
        );
      };

      /**
       * Re-measure the rendered score and resize the viewport. Must run after
       * any render, resize or fullscreen change, because abcjs is responsive
       * and every system moves when the box width changes.
       */
      const relayoutSheet = () => {
        const scroller = sheetScroller();
        const viewport = sheetViewport();
        if (!scroller || !viewport) return;

        const sheetEl = document.getElementById('sheet');
        sheetLayout = computeSheetLayout(
          scroller,
          noteElems(),
          sheetEl ?? scroller,
        );
        if (sheetLayout.systems.length === 0) return;

        if (document.fullscreenElement !== null) {
          // Hand the height back to CSS: the wrapper is a flex child that
          // already fills the space left over by the piano. An inline height
          // here would fight it and win, which is exactly what clipped the
          // staff.
          viewport.style.removeProperty('height');
        } else {
          const lines = sheetLinesRef.current;
          viewport.style.height = `${Math.ceil(viewportHeightFor(sheetLayout, lines))}px`;
        }

        followCurrentSystem(true);
      };

      /** Scroll so the current note's system is at the top of the viewport. */
      const followCurrentSystem = (immediate = false) => {
        const scroller = sheetScroller();
        if (!scroller || !sheetLayout || sheetLayout.systems.length === 0)
          return;

        const lines = visibleLines(sheetLayout);

        const system = systemIndexForNote(
          sheetLayout,
          Math.min(pos, SONG.length - 1),
        );

        // When the whole score already fits — the common case in fullscreen —
        // don't translate at all and let the viewport centre it. Otherwise the
        // score is pinned to the top with the leftover space dumped below it,
        // which on a short piece looked like the sheet had failed to load.
        const fitsEntirely =
          document.fullscreenElement !== null &&
          sheetLayout.systems.length <= lines;
        const offset = fitsEntirely
          ? 0
          : scrollOffsetFor(sheetLayout, system, lines);

        scroller.style.transition = immediate
          ? 'none'
          : 'transform var(--dur-base) var(--ease-out)';
        scroller.style.transform = `translateY(${-offset}px)`;
      };

      renderSheet(level);
      // abcjs finishes laying out synchronously, but fonts can still be
      // swapping; measure on the next frame so note boxes are final.
      requestAnimationFrame(relayoutSheet);

      const onRelayout = () => requestAnimationFrame(relayoutSheet);
      window.addEventListener('teclas:relayout-sheet', onRelayout);
      window.addEventListener('resize', onRelayout);

      // `fullscreenchange` fires before the element has been resized to fill
      // the display, so the single rAF above measures the old box. Observing
      // the stage catches the real resize whenever it lands — on entering
      // fullscreen, on leaving it, and on an ordinary window resize.
      const stage = document.getElementById('play-stage');
      const stageObserver = stage
        ? new ResizeObserver(() => requestAnimationFrame(relayoutSheet))
        : null;
      if (stage && stageObserver) stageObserver.observe(stage);

      cleanupFns.push(() => {
        window.removeEventListener('teclas:relayout-sheet', onRelayout);
        window.removeEventListener('resize', onRelayout);
        stageObserver?.disconnect();
      });

      /**
       * Note elements of the voice currently being practised.
       *
       * `add_classes: true` makes abcjs tag every note with `abcjs-vN` for its
       * voice index, so on a grand staff the two hands are separable. Without
       * that filter a two-voice score would interleave both hands into one
       * array and `noteElems()[pos]` would highlight the wrong notehead —
       * `SONG` only ever holds one hand's sequence.
       *
       * Single-voice scores are all tagged `abcjs-v0`, so the right-hand path
       * is exactly what every existing song already gets.
       */
      const noteElems = (): SVGElement[] => {
        const sheet = document.getElementById('sheet');
        if (!sheet) return [];
        const voice = voiceClassForHand(practiceHandRef.current);
        let els = sheet.querySelectorAll<SVGElement>(`.abcjs-note.${voice}`);
        if (els.length === 0) {
          // Either the score is single-voice and we asked for the left hand, or
          // this abcjs build tags notes differently. Fall back to every note.
          els = sheet.querySelectorAll<SVGElement>('.abcjs-note');
        }
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

      // ---------- Listen to the score ----------
      //
      // Two ways in, because "let me hear it" means two things: tap a notehead
      // to hear that one note, or press play to hear the phrase. Neither
      // touches the game — pos, score and streak are untouched — and the
      // microphone is muted throughout so the speakers are never mistaken for
      // the student playing.

      /** Quarter note, ms. Slow enough to follow, brisk enough not to drag. */
      const PREVIEW_QUARTER_MS = 560;
      let previewTimers: ReturnType<typeof setTimeout>[] = [];
      let previewIndex = -1;
      // An explicit flag, not `previewTimers.length`: finished timers stay in
      // the array, so length is true forever once anything has played and the
      // listen button toggled the wrong way on its first press.
      let playingAll = false;

      const noteMs = (index: number) => {
        const whole = noteDurations[index];
        // abcjs measures duration in whole notes; four quarters to the whole.
        return whole ? whole * 4 * PREVIEW_QUARTER_MS : PREVIEW_QUARTER_MS;
      };

      const markPreview = (index: number, on: boolean) => {
        const el = noteElems()[index];
        if (!el) return;
        if (on) applyClass(el, styles.sheetPreview);
        else removeClass(el, styles.sheetPreview);
      };

      const setListenButton = (active: boolean) => {
        const btn = document.getElementById('listen-btn');
        if (!btn) return;
        btn.setAttribute('aria-pressed', String(active));
        btn.setAttribute('title', active ? 'Detener' : 'Escuchar la partitura');
        btn.classList.toggle(styles.sheetToolBtnOn, active);
      };

      const stopPreview = () => {
        previewTimers.forEach(clearTimeout);
        previewTimers = [];
        if (previewIndex >= 0) markPreview(previewIndex, false);
        previewIndex = -1;
        playingAll = false;
        setListenButton(false);
        try {
          synth?.releaseAll();
        } catch {
          // Nothing was sounding — releasing anyway is harmless.
        }
        window.setTimeout(() => micUnmuteRef.current?.(), 250);
      };

      const soundNote = (midiNumber: number, seconds: number) => {
        const name = midiToName[midiNumber];
        if (!name) return;
        try {
          synth.triggerAttackRelease(name, seconds, Tone.now());
        } catch (err) {
          console.error('Preview error:', err);
        }
      };

      /** Sound one note, without involving the game at all. */
      const previewSingle = (index: number) => {
        if (!synth.loaded || SONG[index] === undefined) return;
        stopPreview();
        micMuteRef.current?.();
        markPreview(index, true);
        previewIndex = index;
        soundNote(SONG[index], noteMs(index) / 1000);
        previewTimers.push(
          window.setTimeout(() => {
            markPreview(index, false);
            previewIndex = -1;
            window.setTimeout(() => micUnmuteRef.current?.(), 250);
          }, noteMs(index)),
        );
      };

      /** Play from `startIndex` to the end, following the line as it goes. */
      const previewFrom = (startIndex: number) => {
        if (!synth.loaded) return;
        stopPreview();
        playingAll = true;
        setListenButton(true);
        micMuteRef.current?.();

        let at = 0;
        for (let index = startIndex; index < SONG.length; index++) {
          const duration = noteMs(index);
          const midiNumber = SONG[index];
          previewTimers.push(
            window.setTimeout(() => {
              if (previewIndex >= 0) markPreview(previewIndex, false);
              markPreview(index, true);
              previewIndex = index;

              // Keep the line being listened to on screen, the same way the
              // game does while the student is playing.
              if (sheetLayout) {
                const scroller = sheetScroller();
                if (scroller) {
                  const offset = scrollOffsetFor(
                    sheetLayout,
                    systemIndexForNote(sheetLayout, index),
                    visibleLines(sheetLayout),
                  );
                  scroller.style.transition =
                    'transform var(--dur-base) var(--ease-out)';
                  scroller.style.transform = `translateY(${-offset}px)`;
                }
              }

              soundNote(midiNumber, (duration * 0.95) / 1000);
            }, at),
          );
          at += duration;
        }

        previewTimers.push(window.setTimeout(stopPreview, at + 200));
      };

      cleanupFns.push(stopPreview);

      // Tap a notehead to hear it. Delegated, because abcjs replaces the whole
      // SVG on every re-render and per-note listeners would be lost each time.
      const sheetEl = document.getElementById('sheet');
      const onSheetClick = (event: MouseEvent) => {
        const target = event.target as Element | null;
        const noteEl = target?.closest('.abcjs-note');
        if (!noteEl) return;
        const index = noteElems().indexOf(noteEl as SVGElement);
        if (index < 0) return;
        previewSingle(index);
      };
      sheetEl?.addEventListener('click', onSheetClick);
      cleanupFns.push(() =>
        sheetEl?.removeEventListener('click', onSheetClick),
      );

      const listenBtn = document.getElementById('listen-btn');
      const onListen = () => {
        if (playingAll) stopPreview();
        else previewFrom(0);
      };
      listenBtn?.addEventListener('click', onListen);
      cleanupFns.push(() => listenBtn?.removeEventListener('click', onListen));

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

        // Keep the line being played in view.
        followCurrentSystem();

        // hint key outline on piano (use base MIDI for DOM lookup)
        const prevHint = pianoDiv.querySelector<HTMLElement>(
          `.${styles.hintKey}`,
        );
        prevHint?.classList.remove(styles.hintKey);
        const expected = SONG[pos];
        const expectedEl = keyEl(expected);
        if (expectedEl) expectedEl.classList.add(styles.hintKey);

        // progress bar
        const progress = document.getElementById('progress');
        if (progress) {
          const pct = Math.round((pos / SONG.length) * 100);
          progress.style.width = pct + '%';
        }

        updateSectionProgress();
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
        const el = keyEl(midiNumber);
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

      renderSectionTracker();
      highlightCurrent();
      updateOctaveIndicator();
      updateSongMeta();
      startIdle();

      // ---------- Game logic ----------
      const handleNotePress: NoteHandler = (
        midiNumber,
        source = 'system',
        velocity = DEFAULT_VELOCITY_BY_SOURCE[source],
      ) => {
        if (source !== 'system') lastInputSource = source;

        const pendingRelease = pendingReleases.get(midiNumber);
        if (pendingRelease) {
          clearTimeout(pendingRelease);
          pendingReleases.delete(midiNumber);
        }

        if (pressedMidi.has(midiNumber)) return;

        if (source === 'midi') sustainedMidi.delete(midiNumber);

        if (source !== 'microphone') {
          attackNote(midiNumber, source, velocity);
        }

        pressKey(midiNumber);
        pressedMidi.add(midiNumber);
        pressedAt.set(midiNumber, performance.now());

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

          if (pos === getCompletionTarget()) {
            if (hintRef.current)
              hintRef.current.textContent = activePracticeSection
                ? 'Parte completada'
                : '\u00A1Bien hecho!';
            const doneText = document.getElementById('done-text');
            if (doneText) {
              doneText.textContent = activePracticeSection
                ? 'Parte completada'
                : '\u00A1Bien hecho!';
            }
            const doneNextBtn = document.getElementById('done-next-btn');
            if (doneNextBtn) {
              doneNextBtn.textContent = activePracticeSection
                ? 'Continuar cancion'
                : 'Siguiente cancion';
              (doneNextBtn as HTMLButtonElement).style.display =
                !activePracticeSection &&
                currentLevelIndex >= ALL_LEVELS.length - 1
                  ? 'none'
                  : '';
            }
            doneRef.current?.classList.add(styles.doneVisible);
            // `highlightCurrent` draws the bar from `pos`, and it never runs
            // again once the piece is finished — so a flawless run topped out
            // at 93% (13 of 14 notes) and looked like something had been
            // missed. Fill it here, where completion is actually known.
            const progressEl = document.getElementById('progress');
            if (progressEl) progressEl.style.width = '100%';
            clearIdle();
            updateScoreUI();
            updateSectionProgress();
            // Persist the run. Guarded so re-entering this branch (e.g. a
            // trailing note event) can't double-count. Practising a single
            // section still counts as practice, but only a full run of the
            // piece is reported as `completed`.
            if (!runReported) {
              runReported = true;
              recordRun({
                kind: 'song',
                refId: level.id,
                hand: 'right',
                notesAttempted: attempts,
                notesCorrect: hits,
                completed: activePracticeSection === null,
                durationMs: Date.now() - runStartedAt,
                inputSource: lastInputSource,
                score,
              });
            }
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

      const handleNoteRelease: NoteHandler = (
        midiNumber,
        source = 'system',
      ) => {
        const startedAt = pressedAt.get(midiNumber) ?? performance.now();
        const heldFor = performance.now() - startedAt;
        const minPressMs = MIN_PRESS_MS_BY_SOURCE[source];

        const finishRelease = () => {
          pendingReleases.delete(midiNumber);
          pressedMidi.delete(midiNumber);
          pressedAt.delete(midiNumber);
          releaseKey(midiNumber);

          if (source === 'microphone') return;
          if (source === 'midi' && sustainPedalDown) {
            sustainedMidi.add(midiNumber);
            return;
          }
          releaseNote(midiNumber, source);
        };

        if (heldFor < minPressMs) {
          const releaseTimer = setTimeout(finishRelease, minPressMs - heldFor);
          pendingReleases.set(midiNumber, releaseTimer);
          return;
        }

        finishRelease();
      };

      // Bridge refs for microphone pitch detection
      notePressRef.current = handleNotePress;
      noteReleaseRef.current = handleNoteRelease;

      // ---------- PC keyboard input (with offset) ----------
      keydownListener = (e) => {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          shiftQwertyOctave(-1);
          return;
        }
        if (key === 'x') {
          e.preventDefault();
          shiftQwertyOctave(1);
          return;
        }
        const baseMidi = KEY_TO_MIDI[key];
        if (baseMidi === undefined) return;
        if (physicalKeyMidi.has(key)) return;
        const midi = baseMidi + midiOffset;
        physicalKeyMidi.set(key, midi);
        handleNotePress(midi, 'qwerty');
      };

      keyupListener = (e) => {
        const key = e.key.toLowerCase();
        const midi = physicalKeyMidi.get(key);
        if (midi !== undefined) {
          physicalKeyMidi.delete(key);
          handleNoteRelease(midi, 'qwerty');
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
        const drawnMidi = Number(target.dataset.midi);
        if (isNaN(drawnMidi)) return;
        e.preventDefault();
        pianoDiv.setPointerCapture(e.pointerId);
        // A widened keyboard draws real pitches, so the key already is the
        // note. Only the shifted one-octave keyboard needs the offset.
        const midi = inDrawnRange(drawnMidi)
          ? drawnMidi
          : drawnMidi + midiOffset;
        pointerMidi.set(e.pointerId, midi);
        handleNotePress(midi, 'pointer');
      };

      pointerUpListener = (e) => {
        const midi = pointerMidi.get(e.pointerId);
        if (midi !== undefined) {
          pointerMidi.delete(e.pointerId);
          handleNoteRelease(midi, 'pointer');
        }
      };

      pianoDiv.addEventListener('pointerdown', pointerDownListener);
      pianoDiv.addEventListener('pointerup', pointerUpListener);
      pianoDiv.addEventListener('pointercancel', pointerUpListener);

      // ---------- MIDI keyboard input (no offset — sends real MIDI) ----------
      if (typeof navigator !== 'undefined' && navigator.requestMIDIAccess) {
        try {
          const access = await navigator.requestMIDIAccess();
          midiAccess = access;

          const releaseSustainedNotes = () => {
            sustainedMidi.forEach((midiNumber) =>
              releaseNote(midiNumber, 'midi'),
            );
            sustainedMidi.clear();
          };

          const attachMidiInputs = () => {
            midiInputs.forEach((input) => {
              input.onmidimessage = null;
            });
            midiInputs = [];

            access.inputs.forEach((input: any) => {
              midiInputs.push(input);
              input.onmidimessage = (event: MIDIMessageEvent) => {
                const data = event.data;
                if (!data || data.length < 3) return;
                const status = data[0] & 0xf0;
                const note = data[1];
                const velocity = data[2];
                if (status === 0x90 && velocity > 0) {
                  handleNotePress(note, 'midi', velocity / 127);
                } else if (
                  status === 0x80 ||
                  (status === 0x90 && velocity === 0)
                ) {
                  handleNoteRelease(note, 'midi');
                } else if (status === 0xb0 && data[1] === 64) {
                  sustainPedalDown = velocity >= 64;
                  if (!sustainPedalDown) releaseSustainedNotes();
                }
              };
            });

            setMidiStatus(midiInputs.length > 0 ? 'connected' : 'available');
          };

          attachMidiInputs();
          access.onstatechange = attachMidiInputs;
        } catch {
          setMidiStatus('unsupported');
        }
      } else {
        setMidiStatus('unsupported');
      }

      // ---------- Shared reset helper ----------
      resetGame = (
        startPosition = 0,
        practiceSection: SongSection | null = activePracticeSection,
      ) => {
        // Release any held notes
        pendingReleases.forEach((timer) => clearTimeout(timer));
        pendingReleases.clear();
        sustainedMidi.clear();
        sustainPedalDown = false;
        if (synth?.loaded) synth.releaseAll();
        pressedElements.forEach((el) => el.classList.remove(styles.pressed));
        pressedElements.clear();
        pressedMidi.clear();
        pressedAt.clear();
        physicalKeyMidi.clear();
        midiOffset = 0;
        pos = startPosition;
        score = 0;
        hits = 0;
        attempts = 0;
        streak = 0;
        runStartedAt = Date.now();
        runReported = false;
        highlighted = -1;
        errorHighlighted = false;
        activePracticeSection = practiceSection;
        updateScoreUI();
        updateOctaveIndicator();
        updateSongMeta();
        renderSectionTracker();
        doneRef.current?.classList.remove(styles.doneVisible);
        const doneText = document.getElementById('done-text');
        if (doneText) doneText.textContent = '\u00A1Bien hecho!';
        const doneNextBtn = document.getElementById('done-next-btn');
        if (doneNextBtn) {
          doneNextBtn.textContent = activePracticeSection
            ? 'Continuar cancion'
            : 'Siguiente cancion';
        }
        renderSheet(level);
        // A different song has a different system layout, so re-measure
        // before the first highlight tries to scroll to it.
        requestAnimationFrame(relayoutSheet);
        setTimeout(() => {
          highlightCurrent();
          startIdle();
        }, 50);
        clearIdle();
      };

      const switchLevel = (idx: number) => {
        currentLevelIndex = idx;
        level = ALL_LEVELS[idx];
        SONG = notesForHand(level, practiceHandRef.current);
        window.dispatchEvent(
          new CustomEvent('teclas:level-changed', { detail: { index: idx } }),
        );
        sections = getSongSections(level);
        patterns = getSongPatterns(level);
        activePracticeSection = null;
        const songSelect = document.getElementById(
          'level-select',
        ) as HTMLSelectElement | null;
        if (songSelect) songSelect.value = String(idx);
        const nextBtn = document.getElementById('done-next-btn');
        if (nextBtn) {
          (nextBtn as HTMLButtonElement).style.display =
            idx >= ALL_LEVELS.length - 1 ? 'none' : '';
        }
        resetGame(0, null);
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

      // Changing hands swaps which voice `SONG` and `noteElems()` refer to, so
      // the run has to restart from the top — continuing mid-sequence would
      // point the cursor at a position that means nothing in the other hand.
      const onHandChanged = () => switchLevel(currentLevelIndex);
      window.addEventListener('teclas:hand-changed', onHandChanged);
      cleanupFns.push(() =>
        window.removeEventListener('teclas:hand-changed', onHandChanged),
      );

      const octaveDownBtn = document.getElementById('qwerty-octave-down');
      const octaveUpBtn = document.getElementById('qwerty-octave-up');
      octaveDownBtn?.addEventListener('click', () => shiftQwertyOctave(-1));
      octaveUpBtn?.addEventListener('click', () => shiftQwertyOctave(1));

      // ---------- Restart ----------
      const restartBtn = document.getElementById('restart-btn');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => resetGame(0, null));
      }

      // ---------- Done overlay buttons ----------
      const doneReplayBtn = document.getElementById('done-replay-btn');
      if (doneReplayBtn) {
        doneReplayBtn.addEventListener('click', () =>
          resetGame(activePracticeSection?.start ?? 0, activePracticeSection),
        );
      }

      const doneNextBtn = document.getElementById('done-next-btn');
      if (doneNextBtn) {
        doneNextBtn.addEventListener('click', () => {
          if (activePracticeSection) {
            if (activePracticeSection.end >= SONG.length) {
              if (currentLevelIndex < ALL_LEVELS.length - 1) {
                switchLevel(currentLevelIndex + 1);
              } else {
                resetGame(0, null);
              }
              return;
            }

            resetGame(activePracticeSection.end, null);
            return;
          }

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
      cleanupFns.forEach((fn) => fn());
      cleanupFns.length = 0;
      notePressRef.current = null;
      noteReleaseRef.current = null;
      getExpectedMidiRef.current = null;
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
          input.onmidimessage = null;
          input.close();
        } catch {}
      });
      if (midiAccess) midiAccess.onstatechange = null;
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

          {/* The standalone "Calibrar" link that used to sit here is gone.
              Calibration is a once-in-a-while task, so it now lives inside
              this panel and in the first-run prompt, instead of taking
              permanent space in the toolbar. */}
          <div className={styles.settingsMenu} ref={settingsRef}>
            <button
              type="button"
              className={`${styles.settingsBtn} ${settingsOpen ? styles.settingsBtnOpen : ''}`}
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
              aria-haspopup="true"
              title="Ajustes de la práctica"
            >
              <FontAwesomeIcon icon={faGear} />
              <span className={styles.settingsBtnLabel}>Ajustes</span>
              {needsCalibration && (
                <span
                  className={styles.settingsDot}
                  // Not decorative: this dot is the only signal that
                  // calibration is still pending.
                  role="status"
                  aria-label="Falta calibrar el micrófono"
                />
              )}
            </button>

            {settingsOpen && (
              <div className={styles.settingsPanel} role="dialog">
                <p className={styles.settingsGroupTitle}>Vista</p>

                <label className={styles.settingsRow}>
                  <span className={styles.settingsRowLabel}>
                    Mostrar el piano
                  </span>
                  <input
                    className={styles.settingsToggle}
                    type="checkbox"
                    role="switch"
                    checked={showPiano}
                    onChange={(e) =>
                      updateSettings({ showPiano: e.target.checked })
                    }
                  />
                </label>

                <div className={styles.settingsRow}>
                  <span className={styles.settingsRowLabel}>Renglones</span>
                  {/* Segmented rather than a <select>: four options, one tap
                      each, and the current value is readable without opening
                      anything. */}
                  <div
                    className={styles.segmented}
                    role="group"
                    aria-label="Renglones visibles"
                  >
                    {([1, 2, 3, 4] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`${styles.segment} ${sheetLines === n ? styles.segmentOn : ''}`}
                        aria-pressed={sheetLines === n}
                        onClick={() => updateSettings({ sheetLines: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {levelIsGrandStaff && (
                  <div className={styles.settingsRow}>
                    <span className={styles.settingsRowLabel}>Mano</span>
                    <div
                      className={styles.segmented}
                      role="group"
                      aria-label="Mano a practicar"
                    >
                      <button
                        type="button"
                        className={`${styles.segment} ${practiceHand === 'right' ? styles.segmentOn : ''}`}
                        aria-pressed={practiceHand === 'right'}
                        onClick={() =>
                          updateSettings({ practiceHand: 'right' })
                        }
                      >
                        Derecha
                      </button>
                      <button
                        type="button"
                        className={`${styles.segment} ${practiceHand === 'left' ? styles.segmentOn : ''}`}
                        aria-pressed={practiceHand === 'left'}
                        onClick={() => updateSettings({ practiceHand: 'left' })}
                      >
                        Izquierda
                      </button>
                    </div>
                  </div>
                )}

                <p className={styles.settingsGroupTitle}>Micrófono</p>

                <Link
                  href="/calibracion"
                  className={`${styles.settingsAction} ${isCalibrated ? styles.settingsActionDone : ''}`}
                >
                  <FontAwesomeIcon icon={faSliders} />
                  <span>
                    {isCalibrated
                      ? 'Calibrado — volver a calibrar'
                      : 'Calibrar el micrófono'}
                  </span>
                </Link>

                <p className={styles.settingsHint}>
                  {isCalibrated
                    ? 'Si cambiaste de piano o de lugar, conviene calibrar otra vez.'
                    : 'Calibrá una vez para que reconozcamos mejor tu piano, aunque esté un poco desafinado.'}
                </p>
              </div>
            )}
          </div>
        </div>
        <p id="song-meta" className={styles.songMeta}>
          {ALL_LEVELS[0].notes.length} notas · QWERTY o MIDI
        </p>
        <div className={styles.inputStatus} aria-live="polite">
          <span
            className={`${styles.inputPill} ${
              micStatus === 'listening' ? styles.inputPillActive : ''
            }`}
          >
            Mic{micNoteLabel ? `: ${micNoteLabel}` : ''}
          </span>
          <span
            className={`${styles.inputPill} ${
              midiStatus === 'connected' ? styles.inputPillActive : ''
            }`}
          >
            {getMidiStatusLabel(midiStatus)}
          </span>
        </div>
        <div className={styles.qwertyControls}>
          <span className={styles.qwertyLabel}>QWERTY</span>
          <button
            id="qwerty-octave-down"
            type="button"
            className={styles.octaveBtn}
            aria-label="Bajar octava QWERTY"
            title="Bajar octava QWERTY (Z)"
          >
            Z
          </button>
          <span id="qwerty-window" className={styles.qwertyWindow}>
            C4-B4
          </span>
          <button
            id="qwerty-octave-up"
            type="button"
            className={styles.octaveBtn}
            aria-label="Subir octava QWERTY"
            title="Subir octava QWERTY (X)"
          >
            X
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

      {/* Song structure */}
      <div className={styles.stagePanel}>
        <div className={styles.stageHeader}>
          <span id="stage-mode" className={styles.stageMode}>
            Cancion completa
          </span>
          <span id="stage-progress" className={styles.stageProgress}>
            1/1
          </span>
        </div>
        <div className={styles.stageCurrent}>
          <span id="stage-kind" className={styles.stageKind}>
            Principal
          </span>
          <span id="stage-name" className={styles.stageName}>
            Principal
          </span>
          <span id="stage-pattern" className={styles.stagePattern}>
            Patron: Idea central
          </span>
        </div>
        <div id="stage-track" className={styles.stageTrack} />
      </div>

      {/* Play area: sheet, progress and piano. This whole block is the
          fullscreen target, so the keyboard comes along instead of being left
          behind on the page underneath. */}
      <div
        id="play-stage"
        ref={stageRef}
        className={`${styles.playArea} ${isFullscreen ? styles.playAreaFullscreen : ''}`}
      >
        {/* Sheet music. The viewport clips to N systems and the inner scroller
            is translated to follow the current line. */}
        <div id="sheet-wrapper" className={styles.sheetWrapper}>
          <div id="sheet-toolbar" className={styles.sheetToolbar}>
            {/* Wired by the engine, which owns the sampler and the sheet
                layout. Rendered here so it sits with the other sheet tools. */}
            <button
              aria-pressed="false"
              className={styles.sheetToolBtn}
              id="listen-btn"
              title="Escuchar la partitura"
              type="button"
            >
              <FontAwesomeIcon icon={faVolumeHigh} />
            </button>
            {isFullscreen && (
              <>
                {/* The on-state indicator. A pressed icon button alone gave no
                    hint that fullscreen was what changed the layout. */}
                <span className={styles.fullscreenBadge}>
                  <span className={styles.fullscreenDot} aria-hidden="true" />
                  Pantalla completa
                </span>
                <button
                  type="button"
                  className={`${styles.sheetToolBtn} ${showPiano ? styles.sheetToolBtnOn : ''}`}
                  onClick={() => updateSettings({ showPiano: !showPiano })}
                  aria-pressed={showPiano}
                  title={
                    showPiano
                      ? 'Ocultar el piano y usar todo el alto para la partitura'
                      : 'Mostrar el piano'
                  }
                  aria-label={
                    showPiano ? 'Ocultar el piano' : 'Mostrar el piano'
                  }
                >
                  <FontAwesomeIcon icon={faKeyboard} />
                </button>
              </>
            )}
            {/*
              Reopens the first-run "how are you going to play?" prompt.
              Clearing the setting is the whole mechanism: LearnOnboarding
              shows itself whenever inputMode is `unset`, so there is nothing
              to wire between the two components. Until this existed the choice
              was genuinely one-way — the prompt appeared once and a student
              who picked wrong had no way back.
            */}
            <button
              type="button"
              className={styles.sheetToolBtn}
              onClick={() => updateSettings({ inputMode: 'unset' })}
              title="Cambiar cómo tocás: piano acústico, teclado MIDI o el teclado de la compu"
              aria-label="Cambiar cómo tocás"
            >
              <FontAwesomeIcon icon={faSliders} />
            </button>
            <button
              type="button"
              className={`${styles.sheetToolBtn} ${isFullscreen ? styles.sheetToolBtnOn : ''}`}
              onClick={toggleFullscreen}
              aria-pressed={isFullscreen}
              title={
                isFullscreen
                  ? 'Salir de pantalla completa'
                  : 'Ver la partitura y el piano en pantalla completa'
              }
              aria-label={
                isFullscreen
                  ? 'Salir de pantalla completa'
                  : 'Pantalla completa'
              }
            >
              <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            </button>
          </div>
          <p className={styles.sheetHint}>
            Tocá una nota de la partitura para escucharla.
          </p>
          <div id="sheet-viewport" className={styles.sheetViewport}>
            <div id="sheet-scroller" className={styles.sheetScroller}>
              <div id="sheet" className={styles.sheet} />
            </div>
          </div>
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

        {/* Piano. Kept mounted when hidden — the engine binds pointer
            handlers to this node and drives it imperatively, so unmounting it
            would tear down that wiring. Hidden with CSS instead. */}
        <div
          id="piano-wrapper"
          ref={pianoWrapperRef}
          className={`${styles.pianoWrapper} ${showPiano ? '' : styles.pianoHidden}`}
          aria-hidden={!showPiano}
        >
          <span id="octave-indicator" className={styles.octaveIndicator}>
            Octava 4
          </span>
          <div ref={pianoRef} className={styles.piano} />
          {isFullscreen && settings.inputMode === 'keyboard' && (
            <p className={styles.keyboardReachNote}>
              <FontAwesomeIcon icon={faKeyboard} />
              Con el teclado de la compu tocás la octava del medio. Las otras
              dos son para leer.
            </p>
          )}
        </div>

        {/*
          Inside the stage, not after it. Only the fullscreen element's subtree
          is painted, so out here the completion overlay was invisible in
          fullscreen — you could finish a piece and never see "Siguiente
          cancion", with no way to advance. It is `position: fixed`, so it does
          not participate in the grid layout this container uses on desktop.
        */}
        <div ref={doneRef} className={styles.done}>
          <div className={styles.doneCard}>
            <span className={styles.doneIcon}>{'\u2713'}</span>
            <span id="done-text" className={styles.doneText}>
              {'\u00A1Bien hecho!'}
            </span>
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
      </div>

      {/* Hint text */}
      <p ref={hintRef} className={styles.hint} />

      {/* Keyboard reference */}
      <div className={styles.keyboardRef}>
        <span className={styles.keyboardRefTitle}>Teclas / dedos:</span>
        {WHITE_KEYS.map((k) => (
          <span key={k.midi} className={styles.kbdGroup}>
            <kbd className={styles.kbd}>{k.label}</kbd>
            <span className={styles.kbdNote}>
              {letterNameToSolfege(k.note)}
            </span>
            <span className={styles.kbdFinger}>{k.finger}</span>
          </span>
        ))}
      </div>

      <p id="piano-loading" className={styles.loading}>
        Cargando sonidos...
      </p>
    </section>
  );
}
