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
// `midiNumberToNote` stays for the sample filename; everything the student
// reads goes through `midiToSolfege`.
import { midiNumberToNote } from '@/lib/piano-player/Midi';
import { midiToSolfege } from '@/lib/piano-player/noteNames';
import PianoKeyboard from '@/components/PianoKeyboard';
import {
  captureNote,
  fitTuning,
  frameToMidi,
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

/**
 * The steps in order, for the progress bar. `silence` is folded into the
 * microphone stage rather than given its own dot: it is three seconds long,
 * and a step you cannot fail is not a step the student needs to count.
 */
const STEP_ORDER: { key: Step; label: string }[] = [
  { key: 'intro', label: 'Tu instrumento' },
  { key: 'mic', label: 'Micrófono' },
  { key: 'notes', label: 'Notas' },
  { key: 'review', label: 'Listo' },
];

const STEP_INDEX: Record<Step, number> = {
  intro: 0,
  mic: 1,
  silence: 1,
  notes: 2,
  review: 3,
};

/**
 * Was `Do4 (C4)` — and only for the 48-71 range, since it came from the ear
 * training map; anything outside it fell back to the bare English name. Now
 * fixed-do across the whole keyboard, with no English in parentheses.
 */
function noteLabel(midi: number): string {
  return midiToSolfege(midi, { octave: true });
}

export default function CalibrationWizard() {
  const [step, setStep] = useState<Step>('intro');
  const [sourceKind, setSourceKind] = useState<SourceKind>('acoustic-piano');
  const [plan, setPlan] = useState<'quick' | 'full'>('quick');
  const [error, setError] = useState<string | null>(null);

  const [level, setLevel] = useState(0);
  /** What the microphone is hearing this instant, or null if nothing clear. */
  const [liveMidi, setLiveMidi] = useState<number | null>(null);
  const [noise, setNoise] = useState<NoiseProfile | null>(null);
  const [silenceProgress, setSilenceProgress] = useState(0);

  const [noteIndex, setNoteIndex] = useState(0);
  /**
   * Bumped to re-arm the listener for the same note. `setNoteIndex(i => i)`
   * would set an identical value, React would bail out of the re-render, and
   * the capture effect would never run again — which left the wizard frozen
   * after any failed take.
   */
  const [attempt, setAttempt] = useState(0);
  const [captured, setCaptured] = useState<NoteCalibration[]>([]);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<'waiting' | 'recording'>(
    'waiting',
  );
  /** A take we heard clearly but which wasn't the note we asked for. */
  const [mismatch, setMismatch] = useState<NoteCalibration | null>(null);

  const [existing, setExisting] = useState<CalibrationProfile | null>(null);
  const [saved, setSaved] = useState<CalibrationProfile | null>(null);

  /**
   * What the microphone reported, kept in state rather than read back off the
   * handle when the profile is built.
   *
   * `stopCapture` nulls the handle on the way into the review step, and the
   * Save button runs there — so every profile was being written with the
   * fallback 48 kHz and all-null capture flags regardless of the device it
   * had just measured. Reading it during render was also what the "cannot
   * access refs during render" warning was pointing at.
   */
  const [device, setDevice] = useState<{
    sampleRate: number;
    flags: CaptureHandle['flags'];
  } | null>(null);

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
      const handle = await openCapture();
      handleRef.current = handle;
      setDevice({ sampleRate: handle.context.sampleRate, flags: handle.flags });
      setStep('mic');

      const tick = () => {
        if (!handleRef.current || abortRef.current.aborted) return;
        const frame = readFrame(handleRef.current);
        setLevel(frame.rms);
        // Naming the note during the mic check doubles as proof the microphone
        // works: a moving bar says "something arrived", a note name says "we
        // understood it".
        setLiveMidi(frameToMidi(frame));
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
    setLiveMidi(null);
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
    let rearmTimer: ReturnType<typeof setTimeout> | null = null;
    const localAbort = { aborted: false };
    abortRef.current = localAbort;
    setCaptureState('waiting');
    setMismatch(null);
    setLiveMidi(null);

    // Floor the gate at the room's measured p95 so a noisy room doesn't
    // self-trigger; `captureNote` additionally requires a rise above its own
    // rolling baseline before it starts recording.
    const gate = Math.max(0.008, noise.rmsP95 * 2.2);

    void captureNote(handleRef.current, {
      targetMidi: targets[noteIndex],
      gate,
      onLevel: (rms, state, detected) => {
        setLevel(rms);
        setCaptureState(state);
        setLiveMidi(detected);
      },
      signal: localAbort,
    }).then((result) => {
      if (cancelled) return;

      if (result.ok && result.note) {
        setCaptured((prev) => [...prev, result.note!]);
        setNoteMessage('¡Listo!');
        rearmTimer = setTimeout(() => {
          if (!cancelled) setNoteIndex((i) => i + 1);
        }, 450);
        return;
      }

      if (result.detectedMidi !== undefined && result.note) {
        // Heard something clear, just not the requested note. Let them decide
        // rather than silently discarding a good take.
        setMismatch(result.note);
        setNoteMessage(
          `Escuchamos ${noteLabel(result.detectedMidi)} en vez de ${noteLabel(targets[noteIndex])}.`,
        );
        return;
      }

      // Anything else: say what happened and listen again automatically. The
      // student has both hands on the instrument; making them click to retry
      // is exactly the wrong ask.
      setNoteMessage(result.message);
      rearmTimer = setTimeout(() => {
        if (!cancelled) setAttempt((a) => a + 1);
      }, 900);
    });

    return () => {
      cancelled = true;
      localAbort.aborted = true;
      if (rearmTimer) clearTimeout(rearmTimer);
    };
  }, [step, noteIndex, attempt, noise, targets]);

  // All anchors captured.
  useEffect(() => {
    if (
      step === 'notes' &&
      noteIndex >= targets.length &&
      captured.length > 0
    ) {
      setStep('review');
      stopCapture();
    }
  }, [step, noteIndex, targets.length, captured.length, stopCapture]);

  const retryNote = () => {
    setNoteMessage(null);
    setAttempt((a) => a + 1);
  };

  const skipNote = () => {
    setNoteMessage(null);
    setNoteIndex((i) => i + 1);
  };

  /** Keep a take that was clear but landed on a different note than asked. */
  const acceptMismatch = () => {
    if (!mismatch) return;
    setCaptured((prev) => [...prev, mismatch]);
    setMismatch(null);
    setNoteMessage(null);
    setNoteIndex((i) => i + 1);
  };

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
      sampleRate: device?.sampleRate ?? 48000,
      tuningA4Hz,
      globalCentsOffset,
      notes: captured,
      noise: noise ?? { rmsMedian: 0, rmsP95: 0, measuredAt: Date.now() },
      captureFlags: device?.flags ?? {
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
    setLiveMidi(null);
    setDevice(null);
    setError(null);
    setStep('intro');
  };

  // ---------- render ----------

  const levelPct = Math.min(100, Math.round(level * 900));
  const clipping = level > 0.6;
  const tooQuiet = level > 0 && level < 0.01;

  const target = targets[noteIndex];
  // Only worth drawing the heard note when it is *not* the one being asked
  // for; on the target key the green highlight already says everything.
  const heardWrong = liveMidi !== null && liveMidi !== target ? liveMidi : null;
  const doneNotes = new Set(targets.slice(0, noteIndex));

  return (
    <div className={styles.wizard}>
      <ol className={styles.steps} aria-label="Progreso">
        {STEP_ORDER.map((s, i) => {
          const current = STEP_INDEX[step] === i;
          return (
            <li
              aria-current={current ? 'step' : undefined}
              className={[
                styles.stepItem,
                i < STEP_INDEX[step] ? styles.stepDone : '',
                current ? styles.stepCurrent : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={s.key}
            >
              <span className={styles.stepDot}>
                {i < STEP_INDEX[step] ? (
                  <FontAwesomeIcon icon={faCheck} />
                ) : (
                  i + 1
                )}
              </span>
              <span className={styles.stepLabel}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

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

          {/* Which keys are coming, before the microphone is ever opened. */}
          <p className={styles.legend}>Vas a tocar estas notas</p>
          <PianoKeyboard
            className={styles.keyboard}
            markedMidi={new Set(targets)}
            fromMidi={Math.min(...targets)}
            labels="solfege"
            toMidi={Math.max(...targets)}
          />

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
          <p className={styles.panelText}>
            Tocá algo, cualquier cosa. Te vamos a decir qué escuchamos.
          </p>

          <div className={styles.meter} aria-hidden="true">
            <div
              className={styles.meterFill}
              style={{ width: `${levelPct}%` }}
            />
          </div>

          <p className={styles.verdict} role="status">
            {clipping
              ? 'Se está saturando. Alejate un poco o bajá el volumen.'
              : tooQuiet
                ? 'Está muy bajo. Acercate al micrófono.'
                : liveMidi !== null
                  ? `Te escuchamos: ${noteLabel(liveMidi)}`
                  : levelPct > 5
                    ? 'Perfecto, se escucha bien.'
                    : 'Esperando que toques…'}
          </p>

          {device?.flags.autoGainControl === true && (
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
          <p className={styles.countdown} role="status">
            {Math.ceil(3 - silenceProgress * 3)}
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={restart}
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {step === 'notes' && noteIndex < targets.length && (
        <div className={styles.panel}>
          {/* The note used to be named three times over — heading, a huge
              display line, and again under the keyboard. The keyboard is the
              instruction now; the heading just says where you are. */}
          <h2 className={styles.panelTitle}>
            Nota {noteIndex + 1} de {targets.length}
          </h2>
          <p className={styles.panelText}>
            Tocá la tecla verde:{' '}
            <strong className={styles.targetName}>{noteLabel(target)}</strong>
          </p>

          <PianoKeyboard
            className={styles.keyboard}
            markedMidi={doneNotes}
            fromMidi={Math.min(...targets)}
            labels="solfege"
            scrollToMidi={target}
            targetMidi={target}
            toMidi={Math.max(...targets)}
            wrongMidi={heardWrong}
          />

          <div
            className={`${styles.meter} ${captureState === 'recording' ? styles.meterRecording : ''}`}
            aria-hidden="true"
          >
            <div
              className={styles.meterFill}
              style={{ width: `${levelPct}%` }}
            />
          </div>

          <p className={styles.captureState} role="status">
            {captureState === 'recording'
              ? 'Grabando…'
              : heardWrong !== null
                ? `Estás tocando ${noteLabel(heardWrong)} — buscá ${noteLabel(target)}`
                : 'Escuchando… tocá la nota cuando quieras'}
          </p>

          {noteMessage && (
            <p className={styles.verdict} role="status">
              {noteMessage}
            </p>
          )}

          <div className={styles.actions}>
            {mismatch && (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={acceptMismatch}
              >
                <FontAwesomeIcon icon={faCheck} /> Usar igual
              </button>
            )}
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => playReference(target)}
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
            {/* There was no way out of this step but forward, one note at a
                time. */}
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={restart}
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Cancelar
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

              <PianoKeyboard
                className={styles.keyboard}
                markedMidi={new Set(captured.map((n) => n.midi))}
                fromMidi={Math.min(...captured.map((n) => n.midi))}
                labels="solfege"
                toMidi={Math.max(...captured.map((n) => n.midi))}
              />

              <ul className={styles.noteList}>
                {captured.map((n) => (
                  <li key={n.midi} className={styles.noteRow}>
                    <span className={styles.noteName}>{noteLabel(n.midi)}</span>
                    {/* A number tells you the deviation; the bar tells you
                        whether it matters. Centre line is equal temperament,
                        full width is a quarter tone either way. */}
                    <span className={styles.centsTrack} aria-hidden="true">
                      <span
                        className={styles.centsBar}
                        style={{
                          left: `${50 + Math.max(-50, Math.min(50, (n.centsFromEqual / 50) * 50))}%`,
                        }}
                      />
                    </span>
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
            <p className={styles.savedNote} role="status">
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
