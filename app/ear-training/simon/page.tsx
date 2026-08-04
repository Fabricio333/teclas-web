import LearnOnboarding from '@/components/LearnOnboarding';
import SimonGame from '@/components/SimonGame';
import ModeIntro from '../ModeIntro';
import { SIMON_MUSICAL } from '@/lib/ear-training/modes';
import { earTrainingSimonMetadata } from '@/lib/metadata';
import { earTrainingSimonJsonLd } from '@/lib/seo/earTrainingSimon';

export const metadata = earTrainingSimonMetadata;

export default function SimonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(earTrainingSimonJsonLd),
        }}
      />
      <LearnOnboarding />
      <ModeIntro mode={SIMON_MUSICAL} />
      <SimonGame />
    </>
  );
}
