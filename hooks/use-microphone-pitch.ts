'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { PitchDetector } from 'pitchy';

export type MicStatus = 'idle' | 'listening' | 'error';

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

const FFT_SIZE = 8192;
const MIN_FREQUENCY = 27.5;
const MAX_FREQUENCY = 4186;
const MIN_MIDI = 21;
const MAX_MIDI = 108;

export const DEFAULT_MIC_DETECTOR_SETTINGS: MicDetectorSettings = {
  minRmsGate: 0.009,
  noiseGateMultiplier: 4.5,
  releaseGateRatio: 0.7,
  clarityThreshold: 0.84,
  stableFrames: 3,
  changeDebounceMs: 120,
  releaseAfterMs: 240,
  repeatAfterMs: 280,
  onsetRmsRatio: 1.45,
  onsetRmsDelta: 0.012,
  expectedNoteToleranceCents: 50,
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
    expectedNoteToleranceCents: Math.max(5, merged.expectedNoteToleranceCents),
  };
}

function frequencyToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
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

function normalizeDetectedMidi(
  frequency: number,
  expectedMidi: number | null | undefined,
  toleranceCents: number,
): number {
  if (expectedMidi === null || expectedMidi === undefined) {
    return frequencyToMidi(frequency);
  }

  const expectedFrequency = midiToFrequency(expectedMidi);
  const likelyFrequencies = [
    expectedFrequency,
    expectedFrequency * 2,
    expectedFrequency / 2,
  ];

  for (const targetFrequency of likelyFrequencies) {
    if (Math.abs(centsBetween(frequency, targetFrequency)) <= toleranceCents) {
      return expectedMidi;
    }
  }

  return frequencyToMidi(frequency);
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
  const detectorRef = useRef<any>(null);

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
    }

    const buffer = bufferRef.current;
    const detector = detectorRef.current;

    const updateNoiseFloor = (rms: number) => {
      const detectorSettings = settingsRef.current;
      noiseFloorRef.current = Math.min(
        detectorSettings.minRmsGate * 2.2,
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

      let sumSq = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        sumSq += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sumSq / buffer.length);

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

      const [frequency, clarity] = detector.findPitch(
        buffer,
        analyser.context.sampleRate,
      );

      const frequencyIsUsable =
        Number.isFinite(frequency) &&
        frequency >= MIN_FREQUENCY &&
        frequency <= MAX_FREQUENCY;
      const rawMidi = frequencyIsUsable ? frequencyToMidi(frequency) : null;

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
