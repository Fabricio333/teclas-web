'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheck,
  faDownload,
  faForward,
  faRotateRight,
  faTrash,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';
import styles from './CalibrationWizard.module.scss';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
import { MIDI_TO_SOLFEGE } from '@/lib/ear-training/levels';
import {
  captureNote,
  fitTuning,
  measureNoise,
  openCapture,
  readFrame,
  type CaptureHandle,
} from '@/lib/calibration/capture';
import {
  clearProfile,
  exportProfileToFile,
  loadProfile,
  saveProfile,
} from '@/lib/calibration/storage';
import {
  SOURCE_LABELS,
  CALIBRATION_SCHEMA_VERSION,
  type CalibrationProfile,
  type NoiseProfile,
  type NoteCalibration,
  type SourceKind,
} from '@/lib/calibration/types';

type Step = 'intro' | 'mic' | 'silence' | 'notes' | 'review';

/** Anchor notes. Spread across the range so tuning drift can be interpolated. */
const PLANS: Record<'quick' | 'full', number[]> = {
  quick: [48, 60, 67, 72],
  full: [36, 48, 55, 60, 64, 67, 72, 79, 84],
};

/** Voice and whistle can't reach the extremes; keep it comfortable. */
const VOCAL_PLANS: Record<'quick' | 'full', number[]> = {
  quick: [55, 60, 64],
  full: [53, 57, 60, 64, 67, 72],
};

function noteLabel(midi: number): string {
  const solfege = MIDI_TO_SOLFEGE[midi];
  const letter = midiNumberToNote(midi, undefined, true);
  return solfege ? `${solfege} (${letter})` : letter;
}

export default function CalibrationWizard() {
  const [step, setStep] = useState<Step>('intro');
  const [sourceKind, setSourceKind] = useState<SourceKind>('acoustic-piano');
  const [plan, setPlan] = useState<'quick' | 'full'>('quick');
  const [error, setError] = useState<string | null>(null);

  const [level, setLevel] = useState(0);
  const [noise, setNoise] = useState<NoiseProfile | null>(null);
  const [silenceProgress, setSilenceProgress] = useState(0);

  const [noteIndex, setNoteIndex] = useState(0);
  const [captured, setCaptured] = useState<NoteCalibration[]>([]);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);

  const [existing, setExisting] = useState<CalibrationProfile | null>(null);
  const [saved, setSaved] = useState<CalibrationProfile | null>(null);

  const handleRef = useRef<CaptureHandle | null>(null);
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });
  const rafRef = useRef<number | null>(null);

  const isVocal = sourceKind === 'voice' || sourceKind === 'whistle';
  const targets = (isVocal ? VOCAL_PLANS : PLANS)[plan];

  useEffect(() => {
    setExisting(loadProfile());
  }, []);

  const stopCapture = useCallback(() => {
    abortRef.current.aborted = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    handleRef.current?.close();
    handleRef.current = null;
  }, []);

  // Never leave the microphone open. The browser keeps its recording
  // indicator lit otherwise, which is alarming on a page you thought you left.
  useEffect(() => stopCapture, [stopCapture]);

  const beginMicCheck = useCallback(async () => {
    setError(null);
    try {
      abortRef.current = { aborted: false };
      handleRef.current = await openCapture();
      setStep('mic');

      const tick = () => {
        if (!handleRef.current || abortRef.current.aborted) return;
        setLevel(readFrame(handleRef.current).rms);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'No nos diste permiso para usar el micrófono. Habilitalo desde el candado en la barra de direcciones.'
          : name === 'NotFoundError'
            ? 'No encontramos ningún micrófono conectado.'
            : 'No pudimos abrir el micrófono en este navegador.',
      );
    }
  }, []);

  const runSilence = useCallback(async () => {
    if (!handleRef.current) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setStep('silence');
    setSilenceProgress(0);
    const profile = await measureNoise(handleRef.current, 3000, (p, rms) => {
      setSilenceProgress(p);
      setLevel(rms);
    });
    setNoise(profile);
    setStep('notes');
    setNoteIndex(0);
    setCaptured([]);
  }, []);

  // Drive the note-capture loop. Re-runs whenever we advance to a new target.
  useEffect(() => {
    if (step !== 'notes' || !handleRef.current || !noise) return;
    if (noteIndex >= targets.length) return;

    let cancelled = false;
    const localAbort = { aborted: false };
    abortRef.current = localAbort;
    setNoteMessage(null);

    const gate = Math.max(0.008, noise.rmsP95 * 2.2);

    void captureNote(handleRef.current, {
      targetMidi: targets[noteIndex],
      gate,
      onLevel: (rms) => setLevel(rms),
      signal: localAbort,
    }).then((result) => {
      if (cancelled) return;
      if (result.ok && result.note) {
        setCaptured((prev) => [...prev, result.note!]);
        setNoteMessage('Listo');
        setTimeout(() => {
          if (!cancelled) setNoteIndex((i) => i + 1);
        }, 450);
      } else {
        setNoteMessage(
          result.detectedMidi !== undefined
            ? `${result.message} (escuchamos ${noteLabel(result.detectedMidi)})`
            : result.message,
        );
      }
    });

    return () => {
      cancelled = true;
      localAbort.aborted = true;
    };
  }, [step, noteIndex, noise, targets]);

  // All anchors captured.
  useEffect(() => {
    if (step === 'notes' && noteIndex >= targets.length && captured.length > 0) {
      setStep('review');
      stopCapture();
    }
  }, [step, noteIndex, targets.length, captured.length, stopCapture]);

  const retryNote = () => setNoteIndex((i) => i);
  const skipNote = () => setNoteIndex((i) => i + 1);

  const playReference = (midi: number) => {
    const name = midiNumberToNote(midi, undefined, true);
    const audio = new Audio(`/samples/mp3/${name}.mp3`);
    audio.volume = 0.9;
    void audio.play().catch(() => {
      /* autoplay refused; the student can still play the note themselves */
    });
  };

  const buildProfile = (): CalibrationProfile => {
    const { tuningA4Hz, globalCentsOffset } = fitTuning(captured);
    return {
      schemaVersion: CALIBRATION_SCHEMA_VERSION,
      id: `prf_${Date.now().toString(36)}`,
      name: SOURCE_LABELS[sourceKind],
      sourceKind,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sampleRate: handleRef.current?.context.sampleRate ?? 48000,
      tuningA4Hz,
      globalCentsOffset,
      notes: captured,
      noise: noise ?? { rmsMedian: 0, rmsP95: 0, measuredAt: Date.now() },
      captureFlags: handleRef.current?.flags ?? {
        autoGainControl: null,
        echoCancellation: null,
        noiseSuppression: null,
      },
    };
  };

  const handleSave = () => {
    const profile = buildProfile();
    if (saveProfile(profile)) {
      setSaved(profile);
      setExisting(profile);
    } else {
      setError('No pudimos guardar el perfil en este navegador.');
    }
  };

  const restart = () => {
    stopCapture();
    setCaptured([]);
    setNoteIndex(0);
    setNoise(null);
    setSaved(null);
    setStep('intro');
  };

  // ---------- render ----------

  const levelPct = Math.min(100, Math.round(level * 900));
  const clipping = level > 0.6;
  const tooQuiet = level > 0 && level < 0.01;

  return (
    <div className={styles.wizard}>
      {error && <p className={styles.error}>{error}</p>}

      {step === 'intro' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Calibrá tu instrumento</h2>
          <p className={styles.panelText}>
            Vamos a escuchar tu piano un ratito para reconocer mejor las notas
            que tocás. Te lleva un par de minutos y se guarda en este navegador.
          </p>

          {existing && (
            <p className={styles.existing}>
              Ya tenés un perfil guardado ({SOURCE_LABELS[existing.sourceKind]},{' '}
              {existing.notes.length} notas, La ={' '}
              {existing.tuningA4Hz.toFixed(1)} Hz).{' '}
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => {
                  clearProfile();
                  setExisting(null);
                }}
              >
                <FontAwesomeIcon icon={faTrash} /> Borrarlo
              </button>
            </p>
          )}

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>¿Con qué vas a tocar?</legend>
            <div className={styles.optionGrid}>
              {(Object.keys(SOURCE_LABELS) as SourceKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`${styles.option} ${sourceKind === k ? styles.optionActive : ''}`}
                  onClick={() => setSourceKind(k)}
                  aria-pressed={sourceKind === k}
                >
                  {SOURCE_LABELS[k]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>¿Cuántas notas?</legend>
            <div className={styles.optionGrid}>
              <button
                type="button"
                className={`${styles.option} ${plan === 'quick' ? styles.optionActive : ''}`}
                onClick={() => setPlan('quick')}
                aria-pressed={plan === 'quick'}
              >
                Rápida · {(isVocal ? VOCAL_PLANS : PLANS).quick.length} notas
              </button>
              <button
                type="button"
                className={`${styles.option} ${plan === 'full' ? styles.optionActive : ''}`}
                onClick={() => setPlan('full')}
                aria-pressed={plan === 'full'}
              >
                Completa · {(isVocal ? VOCAL_PLANS : PLANS).full.length} notas
              </button>
            </div>
          </fieldset>

          {sourceKind === 'whistle' && (
            <p className={styles.hint}>
              Con silbido usamos el detector simple, que anda mejor: un silbido
              es casi una onda pura y no tiene armónicos para comparar.
            </p>
          )}

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={beginMicCheck}
          >
            Empezar
          </button>
        </div>
      )}

      {step === 'mic' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Probá el micrófono</h2>
          <p className={styles.panelText}>Tocá algo, cualquier cosa.</p>

          <div className={styles.meter} aria-hidden="true">
            <div className={styles.meterFill} style={{ width: `${levelPct}%` }} />
          </div>

          <p className={styles.verdict} role="status">
            {clipping
              ? 'Se está saturando. Alejate un poco o bajá el volumen.'
              : tooQuiet
                ? 'Está muy bajo. Acercate al micrófono.'
                : levelPct > 5
                  ? 'Perfecto, se escucha bien.'
                  : 'Esperando que toques…'}
          </p>

          {handleRef.current?.flags.autoGainControl === true && (
            <p className={styles.hint}>
              Tu navegador está ajustando el volumen solo. Vamos a reconocer las
              notas igual, pero la fuerza del golpe va a ser menos precisa.
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={restart}
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Atrás
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={runSilence}
            >
              Seguir
            </button>
          </div>
        </div>
      )}

      {step === 'silence' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Ahora quedate en silencio</h2>
          <p className={styles.panelText}>
            Estamos midiendo el ruido de la sala.
          </p>
          <div className={styles.meter} aria-hidden="true">
            <div
              className={styles.meterFillCalm}
              style={{ width: `${Math.round(silenceProgress * 100)}%` }}
            />
          </div>
          <p className={styles.verdict} role="status">
            {Math.ceil(3 - silenceProgress * 3)}…
          </p>
        </div>
      )}

      {step === 'notes' && noteIndex < targets.length && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Tocá {noteLabel(targets[noteIndex])}
          </h2>
          <p className={styles.panelText}>
            Nota {noteIndex + 1} de {targets.length}
          </p>

          <div className={styles.bigNote}>{noteLabel(targets[noteIndex])}</div>

          <div className={styles.meter} aria-hidden="true">
            <div className={styles.meterFill} style={{ width: `${levelPct}%` }} />
          </div>

          <div className={styles.coverage} aria-hidden="true">
            {targets.map((m, i) => (
              <span
                key={m}
                className={`${styles.coverageDot} ${
                  i < noteIndex
                    ? styles.coverageDone
                    : i === noteIndex
                      ? styles.coverageCurrent
                      : ''
                }`}
              />
            ))}
          </div>

          {noteMessage && (
            <p className={styles.verdict} role="status">
              {noteMessage}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => playReference(targets[noteIndex])}
            >
              <FontAwesomeIcon icon={faVolumeHigh} /> Escuchar
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={retryNote}
            >
              <FontAwesomeIcon icon={faRotateRight} /> Repetir
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={skipNote}
            >
              <FontAwesomeIcon icon={faForward} /> Saltear
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Así quedó tu perfil</h2>

          {captured.length === 0 ? (
            <p className={styles.panelText}>
              No pudimos capturar ninguna nota. Probá de nuevo con el micrófono
              más cerca.
            </p>
          ) : (
            <>
              <p className={styles.panelText}>
                Capturamos {captured.length} nota
                {captured.length === 1 ? '' : 's'}.{' '}
                {(() => {
                  const { tuningA4Hz, globalCentsOffset } = fitTuning(captured);
                  const cents = Math.round(globalCentsOffset);
                  if (Math.abs(cents) < 6) {
                    return `Tu instrumento está afinado en La ${tuningA4Hz.toFixed(1)} Hz.`;
                  }
                  return `Tu instrumento está ${Math.abs(cents)} cents ${
                    cents < 0 ? 'por debajo' : 'por encima'
                  } de La 440 (La = ${tuningA4Hz.toFixed(1)} Hz).`;
                })()}
              </p>

              <ul className={styles.noteList}>
                {captured.map((n) => (
                  <li key={n.midi} className={styles.noteRow}>
                    <span className={styles.noteName}>{noteLabel(n.midi)}</span>
                    <span className={styles.noteDetail}>
                      {n.f0Hz.toFixed(1)} Hz
                    </span>
                    <span className={styles.noteDetail}>
                      {n.centsFromEqual >= 0 ? '+' : ''}
                      {n.centsFromEqual.toFixed(0)} cents
                    </span>
                  </li>
                ))}
              </ul>

              {noise && (
                <p className={styles.hint}>
                  {noise.rmsP95 > 0.02
                    ? 'Hay bastante ruido de fondo. Si podés, apagá el ventilador o cerrá la ventana.'
                    : 'Sala tranquila.'}
                </p>
              )}
            </>
          )}

          {saved && (
            <p className={styles.savedNote}>
              <FontAwesomeIcon icon={faCheck} /> Guardado. Ya lo estamos usando
              en los ejercicios.
            </p>
          )}

          <div className={styles.actions}>
            {captured.length > 0 && !saved && (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleSave}
              >
                Guardar
              </button>
            )}
            {saved && (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => exportProfileToFile(saved)}
              >
                <FontAwesomeIcon icon={faDownload} /> Descargar
              </button>
            )}
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={restart}
            >
              <FontAwesomeIcon icon={faRotateRight} /> Empezar de nuevo
            </button>
            <Link href="/piano-player" className={styles.secondaryBtn}>
              Ir a practicar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
