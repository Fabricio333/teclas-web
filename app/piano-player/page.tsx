import LearnOnboarding from '@/components/LearnOnboarding';
import PianoPlayer from '@/components/PianoPlayer';
import { pianoPlayerMetadata } from '@/lib/metadata';
import { pianoPlayerJsonLd } from '@/lib/seo/pianoPlayer';
import SongLinks from './SongLinks';

export const metadata = pianoPlayerMetadata;

export default function PianoPlayerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pianoPlayerJsonLd) }}
      />
      <LearnOnboarding />
      <PianoPlayer />
      {/*
        The picker inside the player is a <select>, so without these links no
        song page would be reachable by a crawler that only reads the
        prerendered HTML — the same reason the listening games have permalinks
        under their tabs.
      */}
      <SongLinks />
    </>
  );
}
