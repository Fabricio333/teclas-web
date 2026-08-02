import type React from 'react';
import type { Metadata } from 'next';
import { Delius, Comic_Neue, Lobster } from 'next/font/google';
import '../styles/globals.scss';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import ProgressProvider from '@/components/ProgressProvider';
import Script from 'next/script';

const delius = Delius({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-delius',
  display: 'swap',
});

const comicNeue = Comic_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-comic-neue',
  display: 'swap',
});

const lobster = Lobster({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lobster',
  display: 'swap',
});

export const metadata: Metadata = {
  /**
   * Without this, Next resolves every relative image in `openGraph` and
   * `twitter` against the *build* host — so every page in production shipped
   * `og:image="http://localhost:3000/teclas.jpg"`, and no link to this site
   * has ever rendered a preview image on WhatsApp, Facebook or X.
   *
   * Adding the base is what makes those absolute; no image or text changed.
   */
  metadataBase: new URL('https://teclasciudadjardin.com.ar'),
  title: 'TECLAS - Clases de Piano en Ciudad Jardín, Buenos Aires',
  description:
    'Clases de piano personalizadas en Ciudad Jardín, Buenos Aires. Domina el arte del piano con clases presenciales adaptadas a vos.',
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
  },
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/',
    title: 'TECLAS - Clases de Piano en Ciudad Jardín, Buenos Aires',
    description:
      'Clases de piano personalizadas en Ciudad Jardín, Buenos Aires. Domina el arte del piano con clases presenciales adaptadas a vos.',
    siteName: 'TECLAS',
    images: [
      {
        url: '/teclas.jpg',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/*
          The hard-coded `<meta name="robots" content="index, follow">` that
          used to sit here is gone. Every page already emits its own robots tag
          through the Metadata API, so this produced a duplicate on all nine
          pages — and on /calibracion and /progreso it produced a direct
          contradiction: "index, follow" next to "noindex, follow". Crawlers
          take the most restrictive of a conflicting pair, so the intent held,
          but only by luck.
        */}
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

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
      {/*
        `font-serif bg-white text-gray-900` were Tailwind utilities. Tailwind
        emits no CSS in this project (no config, no @tailwind directive), so
        they were inert. Styling lives in styles/globals.scss.
      */}
      <body
        className={`${delius.variable} ${comicNeue.variable} ${lobster.variable}`}
      >
        <ProgressProvider />
        <NavBar />
        <main>{children}</main>
        <WhatsAppButton />
        <Footer />
      </body>
    </html>
  );
}
