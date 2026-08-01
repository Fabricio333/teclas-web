import {
  CALIBRATION_KEY,
  CALIBRATION_SCHEMA_VERSION,
  type CalibrationProfile,
  type NoteCalibration,
  type SourceKind,
} from './types';

/**
 * Calibration profiles live alongside progress but in their own key: they are
 * device-specific (this microphone, this room, this instrument) and should NOT
 * travel with a progress export to another machine.
 */

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function normalizeNote(raw: unknown): NoteCalibration | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const midi = num(o.midi, -1);
  if (midi < 21 || midi > 108) return null;
  return {
    midi: Math.round(midi),
    f0Hz: num(o.f0Hz, 0),
    centsFromEqual: num(o.centsFromEqual, 0),
    peakRms: num(o.peakRms, 0),
    clarity: num(o.clarity, 0),
    capturedAt: num(o.capturedAt, 0),
  };
}

export function normalizeProfile(raw: unknown): CalibrationProfile | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (num(o.schemaVersion, 0) > CALIBRATION_SCHEMA_VERSION) return null;

  const notes = Array.isArray(o.notes)
    ? o.notes.map(normalizeNote).filter((n): n is NoteCalibration => n !== null)
    : [];

  const noiseRaw = (o.noise ?? {}) as Record<string, unknown>;
  const flagsRaw = (o.captureFlags ?? {}) as Record<string, unknown>;
  const flag = (v: unknown) => (typeof v === 'boolean' ? v : null);

  return {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    id: typeof o.id === 'string' ? o.id : 'prf_unknown',
    name: typeof o.name === 'string' ? o.name : 'Mi instrumento',
    sourceKind: (typeof o.sourceKind === 'string'
      ? o.sourceKind
      : 'other') as SourceKind,
    createdAt: num(o.createdAt, Date.now()),
    updatedAt: num(o.updatedAt, Date.now()),
    sampleRate: num(o.sampleRate, 48000),
    tuningA4Hz: num(o.tuningA4Hz, 440),
    globalCentsOffset: num(o.globalCentsOffset, 0),
    notes,
    noise: {
      rmsMedian: num(noiseRaw.rmsMedian, 0),
      rmsP95: num(noiseRaw.rmsP95, 0),
      measuredAt: num(noiseRaw.measuredAt, 0),
    },
    captureFlags: {
      autoGainControl: flag(flagsRaw.autoGainControl),
      echoCancellation: flag(flagsRaw.echoCancellation),
      noiseSuppression: flag(flagsRaw.noiseSuppression),
    },
  };
}

export function loadProfile(): CalibrationProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CALIBRATION_KEY);
    if (!raw) return null;
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveProfile(profile: CalibrationProfile): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(CALIBRATION_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CALIBRATION_KEY);
  } catch {
    /* nothing we can do */
  }
}

export function exportProfileToFile(profile: CalibrationProfile): void {
  const blob = new Blob([JSON.stringify(profile, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `teclas-calibracion-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
