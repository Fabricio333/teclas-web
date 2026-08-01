import { PitchDetector } from 'pitchy';
import type { NoiseProfile, NoteCalibration } from './types';

/**
 * Microphone capture and per-note analysis for the calibration wizard.
 *
 * Framework-free and self-contained: it owns its own AudioContext so it can't
 * interfere with the practice engines' Tone.js graph, and it tears everything
 * down explicitly (a live getUserMedia stream keeps the browser's recording
 * indicator lit, which is alarming on a page the student thinks they left).
 */

const FFT_SIZE = 8192;
const MIN_FREQUENCY = 27.5;
const MAX_FREQUENCY = 4186;

export function midiToFrequency(midi: number, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

export function frequencyToMidi(freq: number, a4 = 440): number {
  return Math.round(12 * Math.log2(freq / a4) + 69);
}

export function centsBetween(a: number, b: number): number {
  return 1200 * Math.log2(a / b);
}

export interface CaptureHandle {
  stream: MediaStream;
  context: AudioContext;
  analyser: AnalyserNode;
  detector: ReturnType<typeof PitchDetector.forFloat32Array>;
  buffer: Float32Array;
  flags: {
    autoGainControl: boolean | null;
    echoCancellation: boolean | null;
    noiseSuppression: boolean | null;
  };
  close: () => void;
}

/**
 * Music-friendly constraints: the browser's voice-call processing is actively
 * harmful here — echo cancellation and noise suppression carve holes in a
 * sustained piano tone, and AGC destroys any amplitude measurement.
 */
function constraints(): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      sampleRate: 48000,
    },
    video: false,
  };
}

export async function openCapture(): Promise<CaptureHandle> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints());
  } catch (err) {
    // Some devices refuse the exact constraint set; retry with plain audio
    // rather than failing outright.
    if (err instanceof DOMException && err.name === 'OverconstrainedError') {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else {
      throw err;
    }
  }

  const context = new AudioContext();
  if (context.state === 'suspended') await context.resume();

  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);

  const track = stream.getAudioTracks()[0];
  const settings = track?.getSettings?.() ?? {};
  const flagOf = (v: unknown) => (typeof v === 'boolean' ? v : null);

  const detector = PitchDetector.forFloat32Array(analyser.fftSize);
  const buffer = new Float32Array(analyser.fftSize);

  return {
    stream,
    context,
    analyser,
    detector,
    buffer,
    flags: {
      autoGainControl: flagOf(
        (settings as Record<string, unknown>).autoGainControl,
      ),
      echoCancellation: flagOf(
        (settings as Record<string, unknown>).echoCancellation,
      ),
      noiseSuppression: flagOf(
        (settings as Record<string, unknown>).noiseSuppression,
      ),
    },
    close: () => {
      try {
        source.disconnect();
      } catch {
        /* already gone */
      }
      stream.getTracks().forEach((t) => t.stop());
      void context.close();
    },
  };
}

export interface Frame {
  rms: number;
  frequency: number;
  clarity: number;
}

export function readFrame(handle: CaptureHandle): Frame {
  const { analyser, buffer, detector } = handle;
  analyser.getFloatTimeDomainData(buffer);

  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / buffer.length);

  const [frequency, clarity] = detector.findPitch(
    buffer,
    analyser.context.sampleRate,
  );

  return { rms, frequency, clarity };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * p)),
  );
  return sorted[idx];
}

/** Sample the room with nothing playing to establish a real noise floor. */
export async function measureNoise(
  handle: CaptureHandle,
  durationMs = 3000,
  onTick?: (progress: number, rms: number) => void,
): Promise<NoiseProfile> {
  const samples: number[] = [];
  const started = performance.now();

  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - started;
      const { rms } = readFrame(handle);
      samples.push(rms);
      onTick?.(Math.min(1, elapsed / durationMs), rms);

      if (elapsed >= durationMs) {
        resolve({
          rmsMedian: percentile(samples, 0.5),
          rmsP95: percentile(samples, 0.95),
          measuredAt: Date.now(),
        });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export interface NoteCaptureResult {
  ok: boolean;
  /** Present when ok. */
  note?: NoteCalibration;
  /** Spanish, user-facing. */
  message: string;
  /** What we actually heard, when it wasn't the requested note. */
  detectedMidi?: number;
}

export interface NoteCaptureOptions {
  targetMidi: number;
  gate: number;
  /** Give up if the student doesn't play, ms. */
  timeoutMs?: number;
  /** How long to record once an onset is detected, ms. */
  captureMs?: number;
  onLevel?: (rms: number, armed: boolean) => void;
  signal?: { aborted: boolean };
}

/**
 * Wait for the student to play, then analyse the note.
 *
 * Hands-free by design: they have both hands on the instrument, so the flow
 * arms itself, waits for an onset, captures, and moves on. Nothing to click
 * between notes.
 */
export async function captureNote(
  handle: CaptureHandle,
  opts: NoteCaptureOptions,
): Promise<NoteCaptureResult> {
  const {
    targetMidi,
    gate,
    timeoutMs = 15000,
    captureMs = 1200,
    onLevel,
    signal,
  } = opts;

  const started = performance.now();
  let onsetAt: number | null = null;
  const freqs: number[] = [];
  const clarities: number[] = [];
  let peakRms = 0;

  return new Promise((resolve) => {
    const tick = () => {
      if (signal?.aborted) {
        resolve({ ok: false, message: 'Cancelado' });
        return;
      }

      const { rms, frequency, clarity } = readFrame(handle);
      const now = performance.now();
      onLevel?.(rms, onsetAt !== null);

      if (onsetAt === null) {
        if (rms > gate) {
          onsetAt = now;
        } else if (now - started > timeoutMs) {
          resolve({
            ok: false,
            message: 'No escuchamos nada. ¿Está prendido el micrófono?',
          });
          return;
        }
        requestAnimationFrame(tick);
        return;
      }

      peakRms = Math.max(peakRms, rms);
      // Ignore the first 60 ms: the attack transient is inharmonic and throws
      // the pitch estimate off.
      if (
        now - onsetAt > 60 &&
        clarity > 0.8 &&
        frequency >= MIN_FREQUENCY &&
        frequency <= MAX_FREQUENCY
      ) {
        freqs.push(frequency);
        clarities.push(clarity);
      }

      if (now - onsetAt < captureMs) {
        requestAnimationFrame(tick);
        return;
      }

      if (freqs.length < 4) {
        resolve({
          ok: false,
          message: 'No encontramos un tono claro. Probá de nuevo, más fuerte.',
        });
        return;
      }

      // Median is robust against the octave errors that a couple of bad
      // frames would otherwise drag the mean towards.
      const f0 = percentile(freqs, 0.5);
      const meanClarity =
        clarities.reduce((a, b) => a + b, 0) / clarities.length;
      const detectedMidi = frequencyToMidi(f0);
      const expected = midiToFrequency(targetMidi);
      const cents = centsBetween(f0, expected);

      if (detectedMidi !== targetMidi) {
        resolve({
          ok: false,
          detectedMidi,
          message: 'Escuchamos otra nota. ¿Tocaste la que pedimos?',
        });
        return;
      }

      resolve({
        ok: true,
        message: 'Listo',
        note: {
          midi: targetMidi,
          f0Hz: f0,
          centsFromEqual: cents,
          peakRms,
          clarity: meanClarity,
          capturedAt: Date.now(),
        },
      });
    };

    requestAnimationFrame(tick);
  });
}

/** Fit concert pitch from the captured notes. */
export function fitTuning(notes: NoteCalibration[]): {
  tuningA4Hz: number;
  globalCentsOffset: number;
} {
  if (notes.length === 0) return { tuningA4Hz: 440, globalCentsOffset: 0 };
  const offsets = notes.map((n) => n.centsFromEqual);
  const median = percentile(offsets, 0.5);
  return {
    tuningA4Hz: 440 * 2 ** (median / 1200),
    globalCentsOffset: median,
  };
}
