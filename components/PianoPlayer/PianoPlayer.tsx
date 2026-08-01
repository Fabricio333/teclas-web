'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './PianoPlayer.module.scss';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
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
      ? midiNumberToNote(currentMicMidi, undefined, true)
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

        const windowEl = document.getElementById('qwerty-window');
        if (windowEl) {
          const low = midiNumberToNote(60 + midiOffset, undefined, true);
          const high = midiNumberToNote(71 + midiOffset, undefined, true);
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

        const letterEl = document.createElement('span');
        letterEl.className = styles.keyLetter;
        letterEl.textContent = white.label;
        labelEl.appendChild(letterEl);

        const fingerEl = document.createElement('span');
        fingerEl.className = styles.keyFinger;
        fingerEl.textContent = String(white.finger);
        labelEl.appendChild(fingerEl);

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

        const bLetter = document.createElement('span');
        bLetter.className = styles.keyLetter;
        bLetter.textContent = black.label;
        bLabel.appendChild(bLetter);

        const bFinger = document.createElement('span');
        bFinger.className = styles.keyFinger;
        bFinger.textContent = String(black.finger);
        bLabel.appendChild(bFinger);

        bEl.appendChild(bLabel);

        pianoDiv.appendChild(bEl);
      });

      // ---------- Sheet music ----------
      const renderSheet = (lev: typeof level) => {
        const sheetEl = document.getElementById('sheet');
        if (sheetEl) sheetEl.innerHTML = '';
        abcjs.renderAbc('sheet', lev.abc, {
          add_classes: true,
          paddingbottom: 14,
          paddingleft: 12,
          paddingright: 12,
          paddingtop: 10,
          responsive: 'resize',
          scale: 1.08,
          staffwidth: 700,
        });
      };

      // ---------- Sheet viewport: show N systems and follow the current one ----------
      let sheetLayout: SheetLayout | null = null;

      const sheetViewport = () => document.getElementById('sheet-viewport');
      const sheetScroller = () => document.getElementById('sheet-scroller');

      /**
       * Re-measure the rendered score and resize the viewport. Must run after
       * any render, resize or fullscreen change, because abcjs is responsive
       * and every system moves when the box width changes.
       */
      /**
       * How many systems fit in fullscreen.
       *
       * Previously this was `max(configuredLines, systems.length)` — i.e. "show
       * the whole score" — which assumed the sheet owned the entire display.
       * Now that the piano is inside the fullscreen element too, the sheet only
       * gets the height the keyboard leaves, otherwise it pushes the piano off
       * the bottom of the screen.
       */
      const fullscreenLines = (layout: SheetLayout): number => {
        const stage = document.getElementById('play-stage');
        if (!stage || layout.pitch <= 0) return layout.systems.length;

        const pianoBox = document
          .getElementById('piano-wrapper')
          ?.getBoundingClientRect();
        const toolbarBox = document
          .getElementById('sheet-toolbar')
          ?.getBoundingClientRect();

        // 64px covers the stage's own padding plus the progress bar.
        const reserved =
          (pianoBox?.height ?? 0) + (toolbarBox?.height ?? 0) + 64;
        const available = stage.getBoundingClientRect().height - reserved;

        const fits = Math.floor(
          (available - layout.tallestSystem) / layout.pitch + 1,
        );
        return Math.max(1, Math.min(layout.systems.length, fits));
      };

      const visibleLines = (layout: SheetLayout): number =>
        document.fullscreenElement !== null
          ? fullscreenLines(layout)
          : sheetLinesRef.current;

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

        const lines = visibleLines(sheetLayout);

        viewport.style.height = `${Math.ceil(viewportHeightFor(sheetLayout, lines))}px`;
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
        const offset = scrollOffsetFor(sheetLayout, system, lines);

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
      cleanupFns.push(() => {
        window.removeEventListener('teclas:relayout-sheet', onRelayout);
        window.removeEventListener('resize', onRelayout);
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
        const baseMidi = Number(target.dataset.midi);
        if (isNaN(baseMidi)) return;
        e.preventDefault();
        pianoDiv.setPointerCapture(e.pointerId);
        const midi = baseMidi + midiOffset;
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
        </div>
      </div>

      {/* Hint text */}
      <p ref={hintRef} className={styles.hint} />

      {/* Done overlay */}
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

      {/* Keyboard reference */}
      <div className={styles.keyboardRef}>
        <span className={styles.keyboardRefTitle}>Teclas / dedos:</span>
        {WHITE_KEYS.map((k) => (
          <span key={k.midi} className={styles.kbdGroup}>
            <kbd className={styles.kbd}>{k.label}</kbd>
            <span className={styles.kbdNote}>{k.note}</span>
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
