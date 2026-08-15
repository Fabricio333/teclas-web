'use client';
import Link from 'next/link';
import React, { useEffect, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons';
import styles from './NavBar.module.scss';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    // Previously this ran setShowNavbar on *every* scroll event with a
    // non-passive listener, re-rendering the header continuously while
    // scrolling. Now it's passive, rAF-throttled, and only sets state when the
    // visibility actually flips.
    let ticking = false;

    const update = () => {
      ticking = false;
      const currentScrollY = window.scrollY;
      const next = !(
        currentScrollY > lastScrollY.current && currentScrollY > 80
      );
      lastScrollY.current = currentScrollY;
      setShowNavbar((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header
      className={`${styles.header} ${showNavbar ? styles.visible : styles.hidden}`}
    >
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoText}>
            <span className={styles.logoMain}>TECLAS</span>
            <span className={styles.logoSub}>Ciudad Jardín</span>
          </div>
          <span className={styles.logoRight}>Escuela de Piano</span>
        </Link>

        <button
          className={`${styles.mobileMenuButton} ${isMenuOpen ? styles.mobileMenuButtonOpen : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <FontAwesomeIcon icon={faXmark} size="lg" />
          ) : (
            <FontAwesomeIcon icon={faBars} size="lg" />
          )}
        </button>

        <nav className={styles.desktopNav}>
          <NavLinks onNavigate={closeMenu} />
        </nav>

        {isMenuOpen && (
          <div className={styles.mobileNavContainer}>
            <nav className={styles.mobileNav}>
              <NavLinks onNavigate={closeMenu} />
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

interface NavLinksProps {
  onNavigate: () => void;
}

function NavLinks({ onNavigate }: NavLinksProps) {
  const inscriptionFormUrl =
    'https://docs.google.com/forms/d/e/1FAIpQLSenT_EzJoCuNDeRN6dQN38OdeJ8RBybZvxOkESqKQBYAObf8w/viewform?usp=dialog';

  // The hand-rolled smooth-scroll handler these used to carry is gone:
  // `scroll-behavior: smooth` + `scroll-padding-top` in globals.scss now do the
  // job for same-page hashes AND cross-page ones, and they compensate for the
  // fixed header (which the old scrollIntoView never did — targets landed 88px
  // underneath it). Using Link also satisfies next/no-html-link-for-pages.
  return (
    <>
      <Link
        href="/#about-academy"
        className={styles.navLink}
        onClick={onNavigate}
      >
        La Academia
      </Link>
      <Link
        href="/#about-teacher"
        className={styles.navLink}
        onClick={onNavigate}
      >
        La Profesora
      </Link>
      {/*
            <Link href="/events" className={styles.navLink}>
                Eventos
            </Link>*/}
      <Link href="/resources" className={styles.navLink} onClick={onNavigate}>
        Aprender
      </Link>
      <Link href="/#faq" className={styles.navLink} onClick={onNavigate}>
        Preguntas Frecuentes
      </Link>
      <Link
        href={inscriptionFormUrl}
        className={`${styles.navLink} ${styles.navCta}`}
        onClick={onNavigate}
      >
        Inscripción
      </Link>
    </>
  );
}
