import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faInstagram, faYoutube } from '@fortawesome/free-brands-svg-icons';

// Brand marks drawn as real SVG rather than as a monochrome font glyph: the
// colour is part of these logos, so a single-ink version is not the mark. The
// outlines come from the FontAwesome brand definitions already installed, which
// keeps the geometry the vector original at any size.
//
// Both marks rely on their negative space — Instagram's lens and viewfinder,
// YouTube's play triangle — so they must sit on a light surface for the
// knockouts to read as white. `.socialLink` provides that.

export type Brand = 'instagram' | 'youtube';

// YouTube's brand red. Instagram is a gradient and is defined per instance.
const YOUTUBE_RED = '#FF0000';

// Instagram's identity gradient: a warm focal point at the lower left running
// through magenta into blue, the published approximation of the mesh original.
const INSTAGRAM_STOPS = [
  { offset: '0', color: '#FDF497' },
  { offset: '0.05', color: '#FDF497' },
  { offset: '0.45', color: '#FD5949' },
  { offset: '0.6', color: '#D6249F' },
  { offset: '0.9', color: '#285AEB' },
];

const MARKS: Record<Brand, IconDefinition> = {
  instagram: faInstagram,
  youtube: faYoutube,
};

type BrandIconProps = {
  brand: Brand;
  className?: string;
  // Instagram paints with a gradient, and a gradient needs an id to reference.
  // Passed in rather than generated so the markup stays server-rendered and two
  // Instagram marks on one page cannot end up sharing an id.
  gradientId?: string;
};

export default function BrandIcon({
  brand,
  className,
  gradientId,
}: BrandIconProps) {
  const [width, height, , , path] = MARKS[brand].icon;
  const d = Array.isArray(path) ? path.join(' ') : path;
  const id = gradientId ?? `teclas-${brand}-gradient`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {brand === 'instagram' && (
        <defs>
          <radialGradient id={id} cx="0.3" cy="1.07" r="1.5">
            {INSTAGRAM_STOPS.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
              />
            ))}
          </radialGradient>
        </defs>
      )}
      <path d={d} fill={brand === 'instagram' ? `url(#${id})` : YOUTUBE_RED} />
    </svg>
  );
}
