import PianoPlayer from '@/components/PianoPlayer';
import { pianoPlayerMetadata } from '@/lib/metadata';
import { pianoPlayerJsonLd } from '@/lib/seo/pianoPlayer';

export const metadata = pianoPlayerMetadata;

export default function PianoPlayerPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pianoPlayerJsonLd) }}
      />
      <PianoPlayer />
    </main>
  );
}
