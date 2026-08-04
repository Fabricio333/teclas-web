import EarTraining from '@/components/EarTraining';
import LearnOnboarding from '@/components/LearnOnboarding';
import ModeIntro from '../ModeIntro';
import { ENCONTRA_LA_NOTA } from '@/lib/ear-training/modes';
import { earTrainingEncontraLaNotaMetadata } from '@/lib/metadata';
import { earTrainingEncontraLaNotaJsonLd } from '@/lib/seo/earTrainingEncontraLaNota';

export const metadata = earTrainingEncontraLaNotaMetadata;

export default function EncontraLaNotaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(earTrainingEncontraLaNotaJsonLd),
        }}
      />
      <LearnOnboarding />
      <ModeIntro mode={ENCONTRA_LA_NOTA} />
      <EarTraining />
    </>
  );
}
