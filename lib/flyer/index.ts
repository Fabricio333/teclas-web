/**
 * Flyer sizes, shared by the generator (`scripts/flyer/build.mjs`) and the
 * download page (`app/download`).
 *
 * Both sides derive the filename from `flyerPath`, so a renamed size can never
 * leave the page linking at a PNG the generator does not write.
 */

export interface FlyerSize {
  /** Filename suffix and React key. */
  key: string;
  width: number;
  height: number;
  /** Shown on the download page. */
  label: string;
  /** Where the size is meant to be posted. */
  usage: string;
}

export const FLYER_SIZES: FlyerSize[] = [
  {
    key: 'stories',
    width: 1080,
    height: 1920,
    label: 'Historias · 9:16',
    usage: 'Historias de Instagram y estados de WhatsApp',
  },
  {
    key: 'post',
    width: 1080,
    height: 1350,
    label: 'Feed · 4:5',
    usage: 'Publicación en el feed de Instagram',
  },
];

/** Public URL of a generated flyer — also its path under `public/`. */
export function flyerPath(slug: string, sizeKey: string): string {
  return `/events/${slug}-flyer-${sizeKey}.png`;
}
