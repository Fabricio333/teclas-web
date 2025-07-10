import PianoStarGame from '@/components/PianoStarGame';
import { pianoStarGameMetadata } from '@/lib/metadata';
import pianoStarGameJsonLd from '@/lib/seo/pianoStarGame';

export { pianoStarGameMetadata as metadata };

export default function PianoStarGamePage() {
  return (
    <div className="container">
      <PianoStarGame />
    </div>
  );
}

export function Head() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(pianoStarGameJsonLd) }}
    />
  );
}
