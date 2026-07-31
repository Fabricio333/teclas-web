import AboutTeacher from '@/components/AboutTeacher';
import Inscription from '@/components/Inscription';
import HeroSection from '@/components/Hero';
import AboutAcademy from '@/components/AboutAcademy';
import Philosophy from '@/components/Philosophy';
import localBusinessJsonLd from '@/lib/seo/localBusiness';
import { homeMetadata } from '@/lib/metadata';

export { homeMetadata as metadata };

export default function Home() {
  return (
    <>
      {/*
        Was returned from `export function Head()`, which the App Router
        ignores — the LocalBusiness schema never actually rendered. Content
        unchanged; only the emission point moved.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessJsonLd),
        }}
      />
      <HeroSection />
      <AboutTeacher />
      <AboutAcademy />
      <Philosophy />
      <Inscription />
    </>
  );
}
