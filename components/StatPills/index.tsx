'use client';

import styles from './StatPills.module.scss';

/**
 * Puntos / Racha / Precisión, on one line.
 *
 * Three surfaces had their own copy of this — the piano player, the ear
 * training game and Simon — each as a row of large coloured cards with its own
 * near-identical stylesheet. Cards that size suit a results screen; during
 * practice these are numbers you glance at between phrases, and they were
 * costing about as much height as the staff.
 *
 * The values are written imperatively by each game's engine through the `id`
 * given here, so this renders the starting value and then stays out of the way.
 */
export type Stat = {
  /**
   * Where an engine writes the value by `getElementById`. Simon keeps its score
   * in React state and passes it straight through, so it has no id.
   */
  id?: string;
  label: string;
  value: string | number;
  tone?: 'blue' | 'amber' | 'green';
};

export default function StatPills({
  stats,
  className,
}: {
  stats: Stat[];
  className?: string;
}) {
  return (
    <div className={[styles.stats, className].filter(Boolean).join(' ')}>
      {stats.map((stat) => (
        <span
          className={`${styles.stat} ${stat.tone ? styles[stat.tone] : ''}`}
          key={stat.id ?? stat.label}
        >
          <span className={styles.label}>{stat.label}</span>
          <span className={styles.value} id={stat.id}>
            {stat.value}
          </span>
        </span>
      ))}
    </div>
  );
}
