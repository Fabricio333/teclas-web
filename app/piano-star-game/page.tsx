import PianoStarGame from '@/components/PianoStarGame';
import { pianoStarGameMetadata } from '@/lib/metadata';

export { pianoStarGameMetadata as metadata };

export default function PianoStarGamePage() {
  return (
    <div className="container">
      <PianoStarGame />
    </div>
  );
}
