import AboutTeacher from "../components/AboutTeacher"
import Inscription from "@/components/Inscription"
import HeroSection from "@/components/Hero";
import AboutAcademy from "@/components/AboutAcademy";

export default function Home() {
  return (
      <>
        <HeroSection/>
        <AboutAcademy/>
        <AboutTeacher />
        <Inscription />
      </>
  );
}