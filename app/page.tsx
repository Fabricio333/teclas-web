import AboutTeacher from "@/components/AboutTeacher";
import Inscription from "@/components/Inscription";
import HeroSection from "@/components/Hero";
import AboutAcademy from "@/components/AboutAcademy";
import localBusinessJsonLd from "@/lib/seo/localBusiness";
import { homeMetadata } from "@/lib/metadata";

export { homeMetadata as metadata };

export default function Home() {
  return (
    <>
      <HeroSection />
      <AboutAcademy />
      <AboutTeacher />
      <Inscription />
    </>
  );
}

export function Head() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
    </>
  );
}
