'use client';

import { useRef, useState } from 'react';
import styles from '../Progreso.module.scss';
import {
  ACHIEVEMENTS,
  applyImport,
  exportToFile,
  getSnapshot,
  isDegraded,
  isStreakActive,
  dayKey,
  levelInfo,
  levelTitle,
  parseBackup,
  resetAll,
  useHydrated,
  useProgress,
} from '@/lib/progress';

function formatMinutes(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

export default function ProgresoDashboard() {
  const hydrated = useHydrated();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(
    null,
  );

  const xp = useProgress((d) => d.rewards.xp);
  const streak = useProgress((d) => d.streak);
  const stats = useProgress((d) => d.stats);
  const achievements = useProgress((d) => d.rewards.achievements);
  const songs = useProgress((d) => d.songs);
  const timeZone = useProgress((d) => d.profile.timeZone);

  // The prerendered HTML has no access to localStorage, so the first client
  // render must match it exactly. Render a placeholder until hydration lands.
  if (!hydrated) {
    return (
      <div className={styles.skeleton} aria-hidden="true" />
    );
  }

  const info = levelInfo(xp);
  const today = dayKey(new Date(), timeZone);
  const streakLive = isStreakActive(streak, today);
  const accuracy =
    stats.totalNotes > 0 ? Math.round((stats.totalCorrect / stats.totalNotes) * 100) : 0;
  const totalStars = Object.values(songs).reduce((sum, s) => sum + s.stars, 0);

  const handleExport = () => {
    exportToFile(getSnapshot());
    setStatus({ tone: 'ok', text: 'Descargamos tu copia de seguridad.' });
  };

  const handleImportFile = async (file: File, mode: 'replace' | 'merge') => {
    const text = await file.text();
    const result = parseBackup(text);
    if (!result.ok) {
      setStatus({ tone: 'error', text: `No pudimos leer el archivo: ${result.detail}` });
      return;
    }
    applyImport(result.doc, getSnapshot(), mode);
    setStatus({
      tone: 'ok',
      text: mode === 'merge' ? 'Combinamos tu progreso.' : 'Restauramos tu progreso.',
    });
  };

  return (
    <>
      {isDegraded() && (
        <p className={styles.warning}>
          No podemos guardar tu progreso en este navegador (puede estar en modo
          privado o sin espacio). Descargá una copia para no perderlo.
        </p>
      )}

      <div className={styles.grid}>
        <div className={`${styles.tile} ${styles.tileXp}`}>
          <span className={styles.tileLabel}>Nivel</span>
          <span className={styles.tileValue}>{info.level}</span>
          <span className={styles.tileMeta}>{levelTitle(info.level)}</span>
          <div className={styles.xpBarOuter}>
            <div
              className={styles.xpBarInner}
              style={{ width: `${Math.round(info.ratio * 100)}%` }}
              role="progressbar"
              aria-valuenow={Math.round(info.ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso al siguiente nivel"
            />
          </div>
          <span className={styles.tileMeta}>
            {info.isMaxLevel
              ? `${xp} puntos`
              : `Te faltan ${info.xpForNextLevel} para el nivel ${info.level + 1}`}
          </span>
        </div>

        <div className={`${styles.tile} ${styles.tileStreak}`}>
          <span className={styles.tileLabel}>Racha</span>
          <span className={styles.tileValue}>{streak.current}</span>
          <span className={styles.tileMeta}>
            {streak.current === 0
              ? 'Empezá hoy'
              : streakLive
                ? `${streak.current === 1 ? 'día' : 'días'} seguidos`
                : 'Volvé para retomarla'}
          </span>
        </div>

        <div className={`${styles.tile} ${styles.tileMastery}`}>
          <span className={styles.tileLabel}>Estrellas</span>
          <span className={styles.tileValue}>{totalStars}</span>
          <span className={styles.tileMeta}>
            en {Object.keys(songs).length} pieza
            {Object.keys(songs).length === 1 ? '' : 's'}
          </span>
        </div>

        <div className={styles.tile}>
          <span className={styles.tileLabel}>Notas tocadas</span>
          <span className={styles.tileValue}>{stats.totalNotes}</span>
          <span className={styles.tileMeta}>{accuracy}% de precisión</span>
        </div>

        <div className={styles.tile}>
          <span className={styles.tileLabel}>Tiempo practicado</span>
          <span className={styles.tileValue}>
            {formatMinutes(stats.totalPracticeMs)}
          </span>
          <span className={styles.tileMeta}>Récord: {streak.longest} días</span>
        </div>
      </div>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Logros</h2>
        <p className={styles.panelText}>
          Conseguiste {Object.keys(achievements).length} de {ACHIEVEMENTS.length}.
        </p>
        <div className={styles.badgeGrid}>
          {ACHIEVEMENTS.map((a) => {
            const earned = Boolean(achievements[a.id]);
            const tierClass =
              a.tier === 'oro'
                ? styles.badgeTierOro
                : a.tier === 'plata'
                  ? styles.badgeTierPlata
                  : styles.badgeTierBronce;
            return (
              <div
                key={a.id}
                className={`${styles.badge} ${tierClass} ${earned ? '' : styles.badgeLocked}`}
              >
                <span className={styles.badgeName}>{a.name}</span>
                <span className={styles.badgeDesc}>
                  {earned ? a.description : `Bloqueado · ${a.description}`}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Copia de seguridad</h2>
        <p className={styles.panelText}>
          Tu progreso se guarda solamente en este navegador. Si borrás los datos
          del navegador o cambiás de dispositivo, se pierde. Descargá una copia
          de vez en cuando.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleExport}
          >
            Descargar mi progreso
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              fileRef.current?.setAttribute('data-mode', 'merge');
              fileRef.current?.click();
            }}
          >
            Combinar desde un archivo
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              fileRef.current?.setAttribute('data-mode', 'replace');
              fileRef.current?.click();
            }}
          >
            Reemplazar desde un archivo
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={() => {
              if (
                window.confirm(
                  '¿Seguro que querés borrar todo tu progreso? Esto no se puede deshacer.',
                )
              ) {
                resetAll();
                setStatus({ tone: 'ok', text: 'Empezamos de cero.' });
              }
            }}
          >
            Borrar todo
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className={styles.hiddenInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            const mode =
              (e.target.getAttribute('data-mode') as 'replace' | 'merge') ?? 'merge';
            if (file) void handleImportFile(file, mode);
            e.target.value = '';
          }}
        />

        {status && (
          <p
            className={`${styles.status} ${
              status.tone === 'error' ? styles.statusError : styles.statusOk
            }`}
            role="status"
          >
            {status.text}
          </p>
        )}
      </section>
    </>
  );
}
