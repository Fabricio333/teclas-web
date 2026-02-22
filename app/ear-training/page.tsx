import EarTraining from '@/components/EarTraining';
import { earTrainingMetadata } from '@/lib/metadata';
import { earTrainingJsonLd } from '@/lib/seo/earTraining';

export const metadata = earTrainingMetadata;

export default function EarTrainingPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(earTrainingJsonLd) }}
      />
      <EarTraining />
    </main>
  );
}
