/**
 * ESM resolve hook that lets a plain Node script import the site's TypeScript
 * modules, so the flyer is generated from the same `lib/events/index.ts` the
 * pages render — never from a second copy that could drift.
 *
 * Node 22 strips type annotations from `.ts` files on its own. The two things
 * it will not do are resolve the `@/*` path alias from tsconfig.json and guess
 * the missing file extension, which is all this hook adds.
 *
 * Registered by `build.mjs` via `module.register()`; not meant to be run.
 */

import { existsSync } from 'node:fs';

const PROJECT_ROOT = new URL('../../', import.meta.url);

/** Candidate files for an extensionless specifier, in tsconfig's order. */
function withExtension(url) {
  if (/\.[a-z]+$/i.test(url.pathname)) return url;
  for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = new URL(url.href + suffix);
    if (existsSync(candidate)) return candidate;
  }
  return url;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const resolved = withExtension(new URL(specifier.slice(2), PROJECT_ROOT));
    return { url: resolved.href, shortCircuit: true };
  }

  // Relative imports between the site's own modules need the same treatment:
  // `./foo` inside a .ts file is `./foo.ts` on disk.
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts')) {
    const resolved = withExtension(new URL(specifier, context.parentURL));
    return { url: resolved.href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
