import AboutTeacher from "@/components/AboutTeacher";
import Inscription from "@/components/Inscription";
import HeroSection from "@/components/Hero";
import AboutAcademy from "@/components/AboutAcademy";
import type { Metadata } from "next";
import localBusinessJsonLd from "@/lib/seo/localBusiness";

export default function Home() {
    return (
        <>
            <HeroSection/>
            <AboutAcademy/>
            <AboutTeacher/>
            <Inscription/>
        </>
    );
}

export const metadata: Metadata = {
    title: "TECLAS - Clases de Piano en Ciudad Jardín, Buenos Aires",
    description:
        "Clases de piano personalizadas en Ciudad Jardín, Buenos Aires. Domina el arte del piano con clases presenciales adaptadas a vos.",
};

export function Head() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(localBusinessJsonLd),
                }}
            />
        </>
    );
}
