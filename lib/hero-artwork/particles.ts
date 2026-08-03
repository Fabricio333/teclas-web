/**
 * The green halftone field behind the hero keyboard.
 *
 * A deterministic dot grid — `seededWave` is a hash, not a random source — so
 * the landing page's animated canvas and the flyer's static SVG can draw the
 * same field from the same numbers. Only the animation differs: the hero
 * drifts each dot by its `phase`, a still render uses the base position.
 *
 * Coordinates are in the keyboard's 1000 x 710 viewBox, see `./keyboard`. The
 * grid deliberately overruns it on every side; whatever draws it clips.
 */

export const TAU = Math.PI * 2;

/** Brand green, the one colour the field is drawn in. */
export const PARTICLE_COLOR = '#a5ce39';

export type Particle = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  drift: number;
  alpha: number;
};

function seededWave(x: number, y: number) {
  return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
}

/**
 * Where the field sits and how far it reaches. Exported because a still render
 * may want to scale or shift the whole field, which it cannot do without
 * knowing the point to scale about.
 */
export const PARTICLE_FIELD = {
  centerX: 560,
  centerY: 360,
  radius: 460,
};

export function buildParticles() {
  const particles: Particle[] = [];
  const step = 16;
  const { centerX, centerY, radius } = PARTICLE_FIELD;

  for (let y = -55; y <= 775; y += step) {
    for (let x = 5; x <= 1065; x += step) {
      const distance = Math.hypot(x - centerX, y - centerY);
      const field = 1 - distance / radius;

      if (field <= 0.015) continue;

      const wobble = seededWave(x, y) % 1;
      const softenedField = field ** 1.35;

      particles.push({
        x,
        y,
        radius: Math.max(0.7, 0.8 + softenedField * 7 + wobble * 0.9),
        phase: (x * 0.018 + y * 0.027) % TAU,
        drift: 0.8 + Math.abs(wobble) * 1.8,
        alpha: 0.18 + Math.min(0.64, softenedField * 0.7),
      });
    }
  }

  return particles;
}
