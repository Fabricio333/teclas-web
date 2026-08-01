'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { PitchDetector } from 'pitchy';

export type MicStatus = 'idle' | 'listening' | 'error';

/** pitchy does not export its detector type, so name it off the factory. */
type Float32Detector = ReturnType<typeof PitchDetector.forFloat32Array>;

export type MicrophoneNoteHandler = (
  midi: number,
  source?: 'microphone',
  velocity?: number,
) => void;

export type MicDebugReason =
  | 'muted'
  | 'below_gate'
  | 'candidate'
  | 'accepted'
  | 'holding'
  | 'debounce'
  | 'low_confidence'
  | 'out_of_range'
  | 'released';

export interface MicDetectorSettings {
  minRmsGate: number;
  noiseGateMultiplier: number;
  releaseGateRatio: number;
  clarityThreshold: number;
  stableFrames: number;
  changeDebounceMs: number;
  releaseAfterMs: number;
  repeatAfterMs: number;
  onsetRmsRatio: number;
  onsetRmsDelta: number;
  expectedNoteToleranceCents: number;
  /**
   * The instrument's actual concert pitch, in Hz.
   *
   * This is the single most important calibration output and it was being
   * measured and then discarded: every frequency was mapped to a note against
   * a hard-coded A440. A piano tuned 60 cents flat therefore rounded every
   * note to the semitone *below* the one that was played.
   */
  tuningA4Hz: number;
}

export interface MicDebugFrame {
  timestamp: number;
  rms: number;
  gate: number;
  releaseGate: number;
  noiseFloor: number;
  frequency: number | null;
  clarity: number;
  rawMidi: number | null;
  midi: number | null;
  expectedMidi: number | null;
  currentMidi: number | null;
  candidateMidi: number | null;
  candidateFrames: number;
  accepted: boolean;
  muted: boolean;
  reason: MicDebugReason;
}

interface UseMicrophonePitchOptions {
  onNotePressRef: RefObject<MicrophoneNoteHandler | null>;
  onNoteReleaseRef: RefObject<MicrophoneNoteHandler | null>;
  getExpectedMidiRef?: RefObject<(() => number | null) | null>;
  onDebugFrameRef?: RefObject<((frame: MicDebugFrame) => void) | null>;
  settings?: Partial<MicDetectorSettings>;
}

interface UseMicrophonePitchReturn {
  status: MicStatus;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  error: string | null;
  currentMidi: number | null;
  muteDetection: () => void;
  unmuteDetection: () => void;
}

/**
 * 4096 samples ≈ 85ms at 48kHz.
 *
 * Was 8192 ≈ 170ms, which put a hard floor under how fast repeated notes could
 * be told apart: two strikes 150ms apart landed inside a single analysis
 * window and read as one. 4096 still contains two full periods of 24Hz, below
 * the lowest note on a piano, so nothing in range loses accuracy.
 */
const FFT_SIZE = 4096;
const MIN_FREQUENCY = 27.5;
const MAX_FREQUENCY = 4186;
const MIN_MIDI = 21;
const MAX_MIDI = 108;

/**
 * Loudness is measured over the newest ~43ms, NOT over the whole pitch window.
 *
 * This is the fix for "it won't let me play fast". Measuring RMS across all
 * 4096 samples averages the attack over 85ms, so a key struck while the
 * previous note is still ringing raises the average by roughly 20% — under the
 * 30% that `onsetRmsRatio` needs — and the repeat is dropped. Over 2048 the
 * same strike clears it, because the new energy occupies the whole window
 * instead of half of it.
 *
 * Not shorter than this. RMS over a window holding less than ~2 periods swings
 * with the waveform's phase, and 1024 samples is under 2 periods below 94Hz —
 * every note beneath F#2 would then produce phantom attacks and retrigger
 * itself. 2048 stays stable down to G1 and still doubles the responsiveness.
 *
 * The gate uses it too: RMS is a mean, so a quiet room measures the same here
 * as it did over 4096, and note boundaries stop being mushy.
 */
const ONSET_WINDOW = 2048;

/**
 * Pitch is tried on the newest ~43ms first, and only falls back to the full
 * 85ms window when that is too short to trust.
 *
 * Two notes inside one window read as one blended pitch, which is why fast
 * runs came back as wrong notes. Halving the window halves that overlap. It is
 * only safe above ~130Hz: 2048 samples is 5+ periods of C3 but barely one
 * period of A0, so the bottom octave still needs the long window.
 */
const FAST_PITCH_WINDOW = 2048;
const FAST_PITCH_MIN_HZ = 130;

/**
 * Timing defaults are deliberately permissive.
 *
 * The student should be able to play as fast as they like and have every note
 * register. These values exist only to stop a *single* hammer strike being
 * reported twice — they are not a rhythm judgement, and nothing here should be
 * used to decide whether a note was played "in time". That belongs to a
 * metronome or backing track, which a level opts into via `Level.tempo`.
 *
 * Previous values, and what they cost: repeatAfterMs 280 capped repeated notes
 * at 3.5 per second (a semiquaver run at 100bpm needs 6.7); changeDebounceMs
 * 120 swallowed fast melodic movement; stableFrames 3 added ~50ms on top of
 * the analysis window.
 */
export const DEFAULT_MIC_DETECTOR_SETTINGS: MicDetectorSettings = {
  minRmsGate: 0.009,
  noiseGateMultiplier: 4.5,
  releaseGateRatio: 0.7,
  clarityThreshold: 0.84,
  stableFrames: 2,
  changeDebounceMs: 35,
  releaseAfterMs: 150,
  // ~11 repeats/second: past what a student can play on one key, and short
  // enough that it never gates real playing.
  repeatAfterMs: 90,
  onsetRmsRatio: 1.3,
  onsetRmsDelta: 0.008,
  expectedNoteToleranceCents: 50,
  tuningA4Hz: 440,
};

function getInitialNoiseFloor(settings: MicDetectorSettings): number {
  return settings.minRmsGate / settings.noiseGateMultiplier;
}

function resolveSettings(
  settings?: Partial<MicDetectorSettings>,
): MicDetectorSettings {
  const merged = { ...DEFAULT_MIC_DETECTOR_SETTINGS, ...settings };

  return {
    minRmsGate: Math.max(0.001, merged.minRmsGate),
    noiseGateMultiplier: Math.max(1, merged.noiseGateMultiplier),
    releaseGateRatio: Math.min(0.95, Math.max(0.2, merged.releaseGateRatio)),
    clarityThreshold: Math.min(0.98, Math.max(0.4, merged.clarityThreshold)),
    stableFrames: Math.max(1, Math.round(merged.stableFrames)),
    changeDebounceMs: Math.max(0, merged.changeDebounceMs),
    releaseAfterMs: Math.max(40, merged.releaseAfterMs),
    repeatAfterMs: Math.max(80, merged.repeatAfterMs),
    onsetRmsRatio: Math.max(1.05, merged.onsetRmsRatio),
    onsetRmsDelta: Math.max(0.001, merged.onsetRmsDelta),
    // Capped at 50: half a semitone. Anything wider lets a genuinely wrong
    // note snap onto the expected one, which is a false "correct" — the fix
    // for a mistuned instrument is the reference pitch below, not a wider net.
    expectedNoteToleranceCents: Math.min(
      50,
      Math.max(5, merged.expectedNoteToleranceCents),
    ),
    // Anything outside this is a bad fit rather than a real instrument.
    tuningA4Hz: Math.min(466, Math.max(415, merged.tuningA4Hz)),
  };
}

function frequencyToMidi(freq: number, a4 = 440): number {
  return Math.round(12 * Math.log2(freq / a4) + 69);
}

function midiToFrequency(midi: number, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

function centsBetween(a: number, b: number): number {
  return 1200 * Math.log2(a / b);
}

function rmsToVelocity(rms: number): number {
  return Math.min(1, Math.max(0.35, rms * 18));
}

function getAudioContextConstructor() {
  return (
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext
  );
}

function buildMusicFriendlyConstraints(): MediaStreamConstraints {
  const supported = navigator.mediaDevices?.getSupportedConstraints?.() ?? {};
  const audio: MediaTrackConstraints & Record<string, unknown> = {};

  if (supported.channelCount) audio.channelCount = { ideal: 1 };
  if (supported.sampleRate) audio.sampleRate = { ideal: 48000 };
  if (supported.echoCancellation) audio.echoCancellation = false;
  if (supported.noiseSuppression) audio.noiseSuppression = false;
  if (supported.autoGainControl) audio.autoGainControl = false;

  return { audio };
}

async function requestMicrophoneStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(
      buildMusicFriendlyConstraints(),
    );
  } catch (err) {
    const canRetryWithoutConstraints =
      err instanceof TypeError ||
      (err instanceof DOMException &&
        (err.name === 'OverconstrainedError' ||
          err.name === 'ConstraintNotSatisfiedError'));

    if (!canRetryWithoutConstraints) throw err;
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

function getMicrophoneErrorMessage(err: unknown): string {
  if (!(err instanceof DOMException)) {
    return err instanceof Error && err.message === 'Microphone not supported'
      ? 'El navegador no soporta microfono'
      : 'Error al acceder al microfono';
  }

  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Permiso de microfono denegado';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No se encontro un microfono';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'El microfono no se pudo iniciar';
    default:
      return 'Error al acceder al microfono';
  }
}

/**
 * Maps a frequency to a note, correcting for the one error a pitch detector
 * actually makes: reporting the octave below (or above) the played note.
 *
 * It deliberately does NOT snap a different pitch class onto the expected
 * note. That is what the old ±85-cent window did once calibration widened it,
 * and it meant a student playing the wrong key could be told they were right.
 * Mistuning is corrected at the source now — via `tuningA4Hz` — so the window
 * here can stay inside half a semitone, where it cannot reach a neighbour.
 */
function normalizeDetectedMidi(
  frequency: number,
  expectedMidi: number | null | undefined,
  toleranceCents: number,
  a4: number,
): number {
  const detected = frequencyToMidi(frequency, a4);
  if (expectedMidi === null || expectedMidi === undefined) return detected;
  if (detected === expectedMidi) return detected;

  const samePitchClass = (((detected - expectedMidi) % 12) + 12) % 12 === 0;
  if (!samePitchClass || Math.abs(detected - expectedMidi) > 24) {
    return detected;
  }

  // Same note name, wrong octave — accept it as the expected note only if the
  // frequency really does sit on one of those octaves.
  const expectedFrequency = midiToFrequency(expectedMidi, a4);
  for (const octave of [1, 2, 0.5, 4, 0.25]) {
    if (
      Math.abs(centsBetween(frequency, expectedFrequency * octave)) <=
      toleranceCents
    ) {
      return expectedMidi;
    }
  }

  return detected;
}

export function useMicrophonePitch({
  onNotePressRef,
  onNoteReleaseRef,
  getExpectedMidiRef,
  onDebugFrameRef,
  settings,
}: UseMicrophonePitchOptions): UseMicrophonePitchReturn {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentMidi, setCurrentMidi] = useState<number | null>(null);

  const resolvedSettings = resolveSettings(settings);
  const settingsRef = useRef<MicDetectorSettings>(resolvedSettings);
  settingsRef.current = resolvedSettings;

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const currentNoteRef = useRef<number | null>(null);
  const candidateNoteRef = useRef<number | null>(null);
  const candidateFramesRef = useRef(0);
  const candidateSinceRef = useRef(0);
  const lastNoteChangeRef = useRef(0);
  const lastSignalTimeRef = useRef(0);
  const belowGateSinceRef = useRef(0);
  const noiseFloorRef = useRef(getInitialNoiseFloor(resolvedSettings));
  const rmsEnvelopeRef = useRef(0);
  const mutedRef = useRef(false);
  const bufferRef = useRef<Float32Array | null>(null);
  const detectorRef = useRef<Float32Detector | null>(null);
  const fastDetectorRef = useRef<Float32Detector | null>(null);

  const resetDetectionState = useCallback((now = 0) => {
    candidateNoteRef.current = null;
    candidateFramesRef.current = 0;
    candidateSinceRef.current = now;
    lastSignalTimeRef.current = 0;
    belowGateSinceRef.current = 0;
    rmsEnvelopeRef.current = 0;
  }, []);

  const releaseCurrentNote = useCallback(
    (now: number) => {
      if (currentNoteRef.current === null) return;
      onNoteReleaseRef.current?.(currentNoteRef.current, 'microphone');
      currentNoteRef.current = null;
      lastNoteChangeRef.current = now;
      setCurrentMidi(null);
    },
    [onNoteReleaseRef],
  );

  const pressDetectedNote = useCallback(
    (midi: number, now: number, rms: number, repeat = false) => {
      if (currentNoteRef.current === midi && !repeat) return;

      if (currentNoteRef.current !== null) {
        onNoteReleaseRef.current?.(currentNoteRef.current, 'microphone');
      }

      currentNoteRef.current = midi;
      lastNoteChangeRef.current = now;
      belowGateSinceRef.current = 0;
      setCurrentMidi(midi);
      onNotePressRef.current?.(midi, 'microphone', rmsToVelocity(rms));
    },
    [onNotePressRef, onNoteReleaseRef],
  );

  const detect = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!bufferRef.current || bufferRef.current.length !== analyser.fftSize) {
      bufferRef.current = new Float32Array(analyser.fftSize);
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
      fastDetectorRef.current =
        PitchDetector.forFloat32Array(FAST_PITCH_WINDOW);
    }

    const buffer = bufferRef.current;
    const detector = detectorRef.current;
    const fastDetector = fastDetectorRef.current;
    if (!buffer || !detector || !fastDetector) return;

    const updateNoiseFloor = (rms: number) => {
      const detectorSettings = settingsRef.current;
      // Clamp against the noise FLOOR's own starting point, not against the
      // gate. `minRmsGate * 2.2` let the floor drift up to the gate level
      // itself, and since the gate is `floor * noiseGateMultiplier` it could
      // then climb to ~10x the calibrated value — so calibrating in a room
      // with any real noise raised the bar until soft notes stopped
      // registering at all. Capped here, the gate stays within 2.2x.
      noiseFloorRef.current = Math.min(
        getInitialNoiseFloor(detectorSettings) * 2.2,
        noiseFloorRef.current * 0.98 + rms * 0.02,
      );
    };

    const emitDebugFrame = (
      now: number,
      frame: Omit<MicDebugFrame, 'timestamp'>,
    ) => {
      onDebugFrameRef?.current?.({
        timestamp: now,
        ...frame,
      });
    };

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      const now = performance.now();
      const detectorSettings = settingsRef.current;
      const gate = Math.max(
        detectorSettings.minRmsGate,
        noiseFloorRef.current * detectorSettings.noiseGateMultiplier,
      );
      const releaseGate = gate * detectorSettings.releaseGateRatio;

      if (mutedRef.current) {
        resetDetectionState(now);
        emitDebugFrame(now, {
          rms: 0,
          gate,
          releaseGate,
          noiseFloor: noiseFloorRef.current,
          frequency: null,
          clarity: 0,
          rawMidi: null,
          midi: null,
          expectedMidi: null,
          currentMidi: currentNoteRef.current,
          candidateMidi: candidateNoteRef.current,
          candidateFrames: candidateFramesRef.current,
          accepted: false,
          muted: true,
          reason: 'muted',
        });
        return;
      }

      analyser.getFloatTimeDomainData(buffer);

      // Newest samples only — see ONSET_WINDOW. The transient has to be
      // visible while it is still a transient.
      const onsetStart = Math.max(0, buffer.length - ONSET_WINDOW);
      let sumSq = 0;
      for (let i = onsetStart; i < buffer.length; i += 1) {
        sumSq += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sumSq / (buffer.length - onsetStart));

      const previousEnvelope = rmsEnvelopeRef.current;
      const freshAttack =
        previousEnvelope > 0 &&
        rms > previousEnvelope * detectorSettings.onsetRmsRatio &&
        rms - previousEnvelope > detectorSettings.onsetRmsDelta;
      rmsEnvelopeRef.current =
        previousEnvelope === 0 ? rms : previousEnvelope * 0.85 + rms * 0.15;

      const expectedMidi = getExpectedMidiRef?.current?.() ?? null;

      if (rms < gate) {
        candidateNoteRef.current = null;
        candidateFramesRef.current = 0;

        if (currentNoteRef.current === null) {
          updateNoiseFloor(rms);
          emitDebugFrame(now, {
            rms,
            gate,
            releaseGate,
            noiseFloor: noiseFloorRef.current,
            frequency: null,
            clarity: 0,
            rawMidi: null,
            midi: null,
            expectedMidi,
            currentMidi: currentNoteRef.current,
            candidateMidi: candidateNoteRef.current,
            candidateFrames: candidateFramesRef.current,
            accepted: false,
            muted: false,
            reason: 'below_gate',
          });
          return;
        }

        if (belowGateSinceRef.current === 0) belowGateSinceRef.current = now;
        if (
          now - belowGateSinceRef.current >=
          detectorSettings.releaseAfterMs
        ) {
          releaseCurrentNote(now);
          resetDetectionState(now);
          emitDebugFrame(now, {
            rms,
            gate,
            releaseGate,
            noiseFloor: noiseFloorRef.current,
            frequency: null,
            clarity: 0,
            rawMidi: null,
            midi: null,
            expectedMidi,
            currentMidi: currentNoteRef.current,
            candidateMidi: candidateNoteRef.current,
            candidateFrames: candidateFramesRef.current,
            accepted: false,
            muted: false,
            reason: 'released',
          });
          return;
        }

        emitDebugFrame(now, {
          rms,
          gate,
          releaseGate,
          noiseFloor: noiseFloorRef.current,
          frequency: null,
          clarity: 0,
          rawMidi: null,
          midi: null,
          expectedMidi,
          currentMidi: currentNoteRef.current,
          candidateMidi: candidateNoteRef.current,
          candidateFrames: candidateFramesRef.current,
          accepted: false,
          muted: false,
          reason: 'below_gate',
        });
        return;
      }

      // Short window first so two fast notes don't average into one pitch;
      // fall back to the full window when the result is weak or low enough
      // that 2048 samples cannot hold enough periods to be trusted.
      const sampleRate = analyser.context.sampleRate;
      let [frequency, clarity] = fastDetector.findPitch(
        buffer.subarray(buffer.length - FAST_PITCH_WINDOW),
        sampleRate,
      );

      if (
        clarity < detectorSettings.clarityThreshold ||
        !Number.isFinite(frequency) ||
        frequency < FAST_PITCH_MIN_HZ
      ) {
        [frequency, clarity] = detector.findPitch(buffer, sampleRate);
      }

      const frequencyIsUsable =
        Number.isFinite(frequency) &&
        frequency >= MIN_FREQUENCY &&
        frequency <= MAX_FREQUENCY;
      const rawMidi = frequencyIsUsable
        ? frequencyToMidi(frequency, detectorSettings.tuningA4Hz)
        : null;

      if (!frequencyIsUsable || clarity < detectorSettings.clarityThreshold) {
        if (currentNoteRef.current === null) {
          updateNoiseFloor(rms);
        } else if (
          now - lastSignalTimeRef.current >=
          detectorSettings.releaseAfterMs
        ) {
          releaseCurrentNote(now);
          resetDetectionState(now);
        }

        emitDebugFrame(now, {
          rms,
          gate,
          releaseGate,
          noiseFloor: noiseFloorRef.current,
          frequency: frequencyIsUsable ? frequency : null,
          clarity,
          rawMidi,
          midi: null,
          expectedMidi,
          currentMidi: currentNoteRef.current,
          candidateMidi: candidateNoteRef.current,
          candidateFrames: candidateFramesRef.current,
          accepted: false,
          muted: false,
          reason: 'low_confidence',
        });
        return;
      }

      const midi = normalizeDetectedMidi(
        frequency,
        expectedMidi,
        detectorSettings.expectedNoteToleranceCents,
        detectorSettings.tuningA4Hz,
      );

      if (midi < MIN_MIDI || midi > MAX_MIDI) {
        emitDebugFrame(now, {
          rms,
          gate,
          releaseGate,
          noiseFloor: noiseFloorRef.current,
          frequency,
          clarity,
          rawMidi,
          midi,
          expectedMidi,
          currentMidi: currentNoteRef.current,
          candidateMidi: candidateNoteRef.current,
          candidateFrames: candidateFramesRef.current,
          accepted: false,
          muted: false,
          reason: 'out_of_range',
        });
        return;
      }

      lastSignalTimeRef.current = now;
      belowGateSinceRef.current = 0;

      if (candidateNoteRef.current !== midi) {
        candidateNoteRef.current = midi;
        candidateFramesRef.current = 1;
        candidateSinceRef.current = now;
        emitDebugFrame(now, {
          rms,
          gate,
          releaseGate,
          noiseFloor: noiseFloorRef.current,
          frequency,
          clarity,
          rawMidi,
          midi,
          expectedMidi,
          currentMidi: currentNoteRef.current,
          candidateMidi: candidateNoteRef.current,
          candidateFrames: candidateFramesRef.current,
          accepted: false,
          muted: false,
          reason: 'candidate',
        });
        return;
      }

      candidateFramesRef.current += 1;
      if (candidateFramesRef.current < detectorSettings.stableFrames) {
        emitDebugFrame(now, {
          rms,
          gate,
          releaseGate,
          noiseFloor: noiseFloorRef.current,
          frequency,
          clarity,
          rawMidi,
          midi,
          expectedMidi,
          currentMidi: currentNoteRef.current,
          candidateMidi: candidateNoteRef.current,
          candidateFrames: candidateFramesRef.current,
          accepted: false,
          muted: false,
          reason: 'candidate',
        });
        return;
      }

      const isRepeatingCurrentNote =
        currentNoteRef.current === midi &&
        freshAttack &&
        now - lastNoteChangeRef.current >= detectorSettings.repeatAfterMs;

      if (isRepeatingCurrentNote) {
        pressDetectedNote(midi, now, rms, true);
        emitDebugFrame(now, {
          rms,
          gate,
          releaseGate,
          noiseFloor: noiseFloorRef.current,
          frequency,
          clarity,
          rawMidi,
          midi,
          expectedMidi,
          currentMidi: currentNoteRef.current,
          candidateMidi: candidateNoteRef.current,
          candidateFrames: candidateFramesRef.current,
          accepted: true,
          muted: false,
          reason: 'accepted',
        });
        return;
      }

      if (midi === currentNoteRef.current) {
        emitDebugFrame(now, {
          rms,
          gate,
          releaseGate,
          noiseFloor: noiseFloorRef.current,
          frequency,
          clarity,
          rawMidi,
          midi,
          expectedMidi,
          currentMidi: currentNoteRef.current,
          candidateMidi: candidateNoteRef.current,
          candidateFrames: candidateFramesRef.current,
          accepted: false,
          muted: false,
          reason: 'holding',
        });
        return;
      }

      if (
        currentNoteRef.current !== null &&
        now - lastNoteChangeRef.current < detectorSettings.changeDebounceMs
      ) {
        emitDebugFrame(now, {
          rms,
          gate,
          releaseGate,
          noiseFloor: noiseFloorRef.current,
          frequency,
          clarity,
          rawMidi,
          midi,
          expectedMidi,
          currentMidi: currentNoteRef.current,
          candidateMidi: candidateNoteRef.current,
          candidateFrames: candidateFramesRef.current,
          accepted: false,
          muted: false,
          reason: 'debounce',
        });
        return;
      }

      pressDetectedNote(midi, now, rms);
      emitDebugFrame(now, {
        rms,
        gate,
        releaseGate,
        noiseFloor: noiseFloorRef.current,
        frequency,
        clarity,
        rawMidi,
        midi,
        expectedMidi,
        currentMidi: currentNoteRef.current,
        candidateMidi: candidateNoteRef.current,
        candidateFrames: candidateFramesRef.current,
        accepted: true,
        muted: false,
        reason: 'accepted',
      });
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [
    getExpectedMidiRef,
    onDebugFrameRef,
    pressDetectedNote,
    releaseCurrentNote,
    resetDetectionState,
  ]);

  const stopListening = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    releaseCurrentNote(performance.now());
    resetDetectionState();
    mutedRef.current = false;
    detectorRef.current = null;
    fastDetectorRef.current = null;
    bufferRef.current = null;

    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setStatus('idle');
  }, [releaseCurrentNote, resetDetectionState]);

  const startListening = useCallback(async () => {
    try {
      if (status === 'listening') return true;

      stopListening();
      setError(null);
      mutedRef.current = false;

      const AudioContextConstructor = getAudioContextConstructor();

      if (!navigator.mediaDevices?.getUserMedia || !AudioContextConstructor) {
        throw new Error('Microphone not supported');
      }

      const stream = await requestMicrophoneStream();
      const audioCtx = new AudioContextConstructor();
      await audioCtx.resume();

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0;

      source.connect(analyser);

      audioContextRef.current = audioCtx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      streamRef.current = stream;
      noiseFloorRef.current = getInitialNoiseFloor(settingsRef.current);
      resetDetectionState(performance.now());

      setStatus('listening');
      detect();
      return true;
    } catch (err) {
      setError(getMicrophoneErrorMessage(err));
      setStatus('error');
      return false;
    }
  }, [detect, resetDetectionState, status, stopListening]);

  const muteDetection = useCallback(() => {
    mutedRef.current = true;
    releaseCurrentNote(performance.now());
    resetDetectionState(performance.now());
  }, [releaseCurrentNote, resetDetectionState]);

  const unmuteDetection = useCallback(() => {
    mutedRef.current = false;
    resetDetectionState(performance.now());
  }, [resetDetectionState]);

  useEffect(() => stopListening, [stopListening]);

  return {
    status,
    startListening,
    stopListening,
    error,
    currentMidi,
    muteDetection,
    unmuteDetection,
  };
}
