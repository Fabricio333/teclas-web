import type React from "react";
import type { Metadata } from "next";
import { Delius, Comic_Neue } from "next/font/google";
import "../styles/globals.scss";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Script from "next/script";


const delius = Delius({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-delius",
    display: "swap",
});

const comicNeue = Comic_Neue({
    subsets: ["latin"],
    weight: ["400"],
    variable: "--font-comic-neue",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Teclas Ciudad Jardín",
    description: "Domina el arte del piano con clases presenciales personalizadas",
    generator: "v0.dev",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <head>
            <link rel="icon" href="/icon.png"/>

            {/* Google Analytics */}
            <Script
                strategy="afterInteractive"
                src="https://www.googletagmanager.com/gtag/js?id=G-9RY7EFTDK8"
            />
            <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-9RY7EFTDK8');
            `,
                }}
            />
        </head>
        <body className={`${delius.variable} ${comicNeue.variable} font-serif bg-white text-gray-900`}>
        <NavBar />
        <main>{children}</main>
        <WhatsAppButton />
        <Footer />
        </body>
        </html>
    );
}
