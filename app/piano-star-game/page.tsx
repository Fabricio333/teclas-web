import { pianoStarGameMetadata } from '@/lib/metadata';
import PianoStarGameClient from './PianoStarGameClient';

export { pianoStarGameMetadata as metadata };

export default function PianoStarGamePage() {
  return (
    <div className="container">
      <PianoStarGameClient />
    </div>
  );
}
