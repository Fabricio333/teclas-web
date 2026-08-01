import type { MicDetectorSettings } from '@/hooks/use-microphone-pitch';

export const CALIBRATION_SCHEMA_VERSION = 1;
export const CALIBRATION_KEY = 'teclas.calibration.v1';

export type SourceKind =
  'acoustic-piano' | 'digital-piano' | 'voice' | 'whistle' | 'other';

export const SOURCE_LABELS: Record<SourceKind, string> = {
  'acoustic-piano': 'Piano acústico',
  'digital-piano': 'Piano o teclado digital',
  voice: 'Tu voz',
  whistle: 'Silbido',
  other: 'Otro instrumento',
};

/** One captured reference note. */
export interface NoteCalibration {
  midi: number;
  /** Measured fundamental, Hz. */
  f0Hz: number;
  /** Deviation from equal temperament at A440, in cents. */
  centsFromEqual: number;
  /** Peak RMS of the take — the loudness this note actually produces. */
  peakRms: number;
  /** Mean pitch confidence over the take, 0..1. */
  clarity: number;
  capturedAt: number;
}

export interface NoiseProfile {
  /** Median broadband RMS of the room with nothing playing. */
  rmsMedian: number;
  /** 95th percentile — the level a gate has to clear to ignore the room. */
  rmsP95: number;
  measuredAt: number;
}

export interface CalibrationProfile {
  schemaVersion: number;
  id: string;
  name: string;
  sourceKind: SourceKind;
  createdAt: number;
  updatedAt: number;
  sampleRate: number;
  /**
   * Fitted concert pitch. An acoustic piano is rarely at exactly 440, and
   * knowing the real value is what stops a flat instrument reading as a
   * different note.
   */
  tuningA4Hz: number;
  /** Median cents offset across all captured notes. */
  globalCentsOffset: number;
  notes: NoteCalibration[];
  noise: NoiseProfile;
  /**
   * What the browser actually gave us. Auto gain control defeats amplitude
   * calibration, so we record whether it was applied rather than pretending.
   */
  captureFlags: {
    autoGainControl: boolean | null;
    echoCancellation: boolean | null;
    noiseSuppression: boolean | null;
  };
}

/**
 * Detector overrides derived from a profile.
 *
 * This is the payload that actually changes behaviour today: the gate is set
 * from the room the student is really in rather than from a constant, and the
 * tolerance widens to cover how far off their instrument is tuned.
 */
export function settingsFromProfile(
  profile: CalibrationProfile | null,
): Partial<MicDetectorSettings> {
  if (!profile) return {};

  const overrides: Partial<MicDetectorSettings> = {};

  // Sit above the room's own noise with headroom, but never below the floor
  // that keeps pure silence from triggering.
  if (profile.noise.rmsP95 > 0) {
    overrides.minRmsGate = Math.max(0.004, profile.noise.rmsP95 * 1.6);
  }

  // A piano 30 cents flat needs a wider window than the 50-cent default, or
  // every note reads as ambiguous between two semitones.
  const drift = Math.abs(profile.globalCentsOffset);
  if (drift > 15) {
    overrides.expectedNoteToleranceCents = Math.min(85, 50 + drift * 0.8);
  }

  // Voice and whistle have soft onsets compared with a hammer strike.
  if (profile.sourceKind === 'voice' || profile.sourceKind === 'whistle') {
    overrides.onsetRmsRatio = 1.2;
    overrides.stableFrames = 5;
  }

  return overrides;
}

export function isProfileUsable(
  p: CalibrationProfile | null,
): p is CalibrationProfile {
  return p !== null && p.notes.length > 0;
}
