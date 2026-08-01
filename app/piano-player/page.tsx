import LearnOnboarding from '@/components/LearnOnboarding';
import PianoPlayer from '@/components/PianoPlayer';
import { pianoPlayerMetadata } from '@/lib/metadata';
import { pianoPlayerJsonLd } from '@/lib/seo/pianoPlayer';

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
    </>
  );
}
