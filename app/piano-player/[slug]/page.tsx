import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LearnOnboarding from '@/components/LearnOnboarding';
import PianoPlayer from '@/components/PianoPlayer';
import { LEVELS, getLevelById, songPath } from '@/lib/piano-player/songs';
import {
  songPageDescription,
  songPageTitle,
} from '@/lib/piano-player/songPages';
import { pianoSongJsonLd } from '@/lib/seo/pianoSong';
import SongIntro from '../SongIntro';
import SongLinks from '../SongLinks';

type SongPageProps = { params: Promise<{ slug: string }> };

/**
 * One page per song. `LEVELS` and not `ALL_LEVELS`: the debug level is
 * development-only, so it gets no page and no entry in the sitemap.
 */
export function generateStaticParams() {
  return LEVELS.map((level) => ({ slug: level.id }));
}

/**
 * New pages — metadata added, never altering existing entries (see CLAUDE.md).
 *
 * Written here rather than in `lib/metadata` because there is one per song and
 * every field is derived from the level: nineteen hand-copied blocks would be
 * nineteen chances for a title to disagree with the piece it describes. The
 * hub's `pianoPlayerMetadata` is untouched and stays indexable; each of these
 * is self-canonical, because each one is that song's own page rather than a
 * variant of the hub.
 */
export async function generateMetadata({
  params,
}: SongPageProps): Promise<Metadata> {
  const { slug } = await params;
  const level = getLevelById(slug);
  if (!level) return {};

  const url = `https://teclasciudadjardin.com.ar${songPath(level.id)}`;
  const title = songPageTitle(level);
  const description = songPageDescription(level);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'TECLAS',
      images: [{ url: '/teclas.jpg' }],
    },
  };
}

export default async function SongPage({ params }: SongPageProps) {
  const { slug } = await params;
  const level = getLevelById(slug);
  if (!level) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pianoSongJsonLd(level)),
        }}
      />
      <LearnOnboarding />
      <SongIntro level={level} />
      <PianoPlayer initialLevelId={level.id} />
      <SongLinks currentId={level.id} />
    </>
  );
}
