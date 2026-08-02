import LearnOnboarding from '@/components/LearnOnboarding';
import GameModes from './GameModes';
import { earTrainingMetadata } from '@/lib/metadata';
import { earTrainingJsonLd } from '@/lib/seo/earTraining';

export const metadata = earTrainingMetadata;

export default function EarTrainingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(earTrainingJsonLd) }}
      />
      <LearnOnboarding />
      <GameModes />
    </>
  );
}
