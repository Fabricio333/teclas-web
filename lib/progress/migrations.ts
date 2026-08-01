import {
  PROGRESS_SCHEMA_VERSION,
  createEmptyProgress,
  type ProgressDoc,
} from './schema';
import { normalizeProgress } from './normalize';

/**
 * Migrations run BEFORE normalization; normalization is the gate.
 *
 * Each entry takes a doc at version N and returns one at N+1. They must be
 * pure and total — a migration that throws sends the document down the
 * quarantine path in `storage.ts` rather than crashing the app.
 */
export const migrations: Record<number, (doc: unknown) => unknown> = {
  // 1 -> 2 goes here when the schema next changes.
};

export class MigrationError extends Error {}

/**
 * Bring a raw parsed value up to the current schema version.
 * Throws only when the input cannot be interpreted at all; callers quarantine
 * rather than delete.
 */
export function migrate(raw: unknown): ProgressDoc {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new MigrationError('progress document is not an object');
  }

  let doc = raw as { schemaVersion?: number };
  const startVersion =
    typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 0;

  if (startVersion > PROGRESS_SCHEMA_VERSION) {
    // Written by a newer build (the student opened an older deploy). Refusing
    // is safer than silently downgrading and dropping fields we can't see.
    throw new MigrationError(
      `progress is from a newer version (${startVersion} > ${PROGRESS_SCHEMA_VERSION})`,
    );
  }

  for (let v = startVersion; v < PROGRESS_SCHEMA_VERSION; v++) {
    const step = migrations[v];
    if (!step) {
      // No path from this version (v0 == pre-versioning, i.e. never written by
      // a released build). Start fresh rather than guessing at the shape.
      return createEmptyProgress();
    }
    doc = step(doc) as { schemaVersion?: number };
    doc.schemaVersion = v + 1;
  }

  return normalizeProgress(doc);
}
