'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';

export type MicStatus = 'idle' | 'listening' | 'error';

interface UseMicrophonePitchOptions {
  onNotePressRef: React.RefObject<((midi: number) => void) | null>;
  onNoteReleaseRef: React.RefObject<((midi: number) => void) | null>;
}

interface UseMicrophonePitchReturn {
  status: MicStatus;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
  currentMidi: number | null;
  muteDetection: () => void;
  unmuteDetection: () => void;
}

const CONFIDENCE_THRESHOLD = 0.9;
const RMS_THRESHOLD = 0.02;
const DEBOUNCE_MS = 60;

function frequencyToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

export function useMicrophonePitch({
  onNotePressRef,
  onNoteReleaseRef,
}: UseMicrophonePitchOptions): UseMicrophonePitchReturn {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentMidi, setCurrentMidi] = useState<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const currentNoteRef = useRef<number | null>(null);
  const lastChangeTimeRef = useRef<number>(0);
  const mutedRef = useRef<boolean>(false);

  const detect = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buffer = new Float32Array(analyser.fftSize);
    const detector = PitchDetector.forFloat32Array(analyser.fftSize);

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      if (mutedRef.current) return;

      analyser.getFloatTimeDomainData(buffer);

      // RMS volume gate
      let sumSq = 0;
      for (let i = 0; i < buffer.length; i++) {
        sumSq += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sumSq / buffer.length);

      if (rms < RMS_THRESHOLD) {
        // Silence — release any held note
        if (currentNoteRef.current !== null) {
          const now = performance.now();
          if (now - lastChangeTimeRef.current >= DEBOUNCE_MS) {
            onNoteReleaseRef.current?.(currentNoteRef.current);
            currentNoteRef.current = null;
            setCurrentMidi(null);
            lastChangeTimeRef.current = now;
          }
        }
        return;
      }

      const [frequency, clarity] = detector.findPitch(
        buffer,
        analyser.context.sampleRate,
      );

      if (
        clarity < CONFIDENCE_THRESHOLD ||
        frequency < 27.5 ||
        frequency > 4186
      ) {
        return;
      }

      const midi = frequencyToMidi(frequency);
      const now = performance.now();

      if (midi !== currentNoteRef.current) {
        if (now - lastChangeTimeRef.current < DEBOUNCE_MS) return;

        // Release previous note
        if (currentNoteRef.current !== null) {
          onNoteReleaseRef.current?.(currentNoteRef.current);
        }

        // Press new note
        currentNoteRef.current = midi;
        setCurrentMidi(midi);
        lastChangeTimeRef.current = now;
        onNotePressRef.current?.(midi);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [onNotePressRef, onNoteReleaseRef]);

  const stopListening = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Release any held note
    if (currentNoteRef.current !== null) {
      onNoteReleaseRef.current?.(currentNoteRef.current);
      currentNoteRef.current = null;
      setCurrentMidi(null);
    }

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
  }, [onNoteReleaseRef]);

  const startListening = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;

      source.connect(analyser);

      audioContextRef.current = audioCtx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      streamRef.current = stream;

      setStatus('listening');
      detect();
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Permiso de microfono denegado'
          : 'Error al acceder al microfono';
      setError(message);
      setStatus('error');
    }
  }, [detect]);

  const muteDetection = useCallback(() => {
    mutedRef.current = true;
  }, []);

  const unmuteDetection = useCallback(() => {
    mutedRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

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
