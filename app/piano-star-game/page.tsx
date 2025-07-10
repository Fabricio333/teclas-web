import PianoStarGame from '@/components/PianoStarGame';

export const metadata = {
  title: 'Juega a Estrellita',
  description: 'Mini juego de piano para practicar la canción Estrellita.',
};

export default function PianoStarGamePage() {
  return (
    <div className="container">
      <PianoStarGame />
    </div>
  );
}
