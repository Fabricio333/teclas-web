"use client"
import Link from "next/link";
import React, { useEffect, useState, useRef } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import styles from "./NavBar.module.scss";

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const lastScrollY = useRef(0);

    const controlNavbar = () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
            setShowNavbar(false);
        } else {
            setShowNavbar(true);
        }
        lastScrollY.current = currentScrollY;
    };

    useEffect(() => {
        window.addEventListener('scroll', controlNavbar);
        return () => {
            window.removeEventListener('scroll', controlNavbar);
        };
    }, []);

    const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        document.querySelector(targetId)?.scrollIntoView({
            behavior: 'smooth',
        });
        setIsMenuOpen(false);
    };

    return (
        <header className={`${styles.header} ${showNavbar ? styles.visible : styles.hidden}`}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    <div className={styles.logoText}>
                        <span className={styles.logoMain}>TECLAS</span>
                        <span className={styles.logoSub}>Ciudad Jardín</span>
                    </div>
                    <span className={styles.logoRight}>Escuela de Piano</span>
                </Link>

                <button
                    className={styles.mobileMenuButton}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
                >
                    {isMenuOpen ? (
                        <FontAwesomeIcon icon={faXmark} size="lg" />
                    ) : (
                        <FontAwesomeIcon icon={faBars} size="lg" />
                    )}
                </button>

                <nav className={styles.desktopNav}>
                    <NavLinks handleSmoothScroll={handleSmoothScroll} />
                </nav>

                {isMenuOpen && (
                    <div className={styles.mobileNavContainer}>
                        <nav className={styles.mobileNav}>
                            <NavLinks handleSmoothScroll={handleSmoothScroll} />
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}

interface NavLinksProps {
    handleSmoothScroll: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
}

function NavLinks({ handleSmoothScroll }: NavLinksProps) {
    return (
        <>
            <a href="#about-academy" className={styles.navLink} onClick={(e) => handleSmoothScroll(e, '#about-academy')}>
                La Academia
            </a>
            <a href="#about-teacher" className={styles.navLink} onClick={(e) => handleSmoothScroll(e, '#about-teacher')}>
                La Profesora
            </a>
            <a href="#inscription" className={styles.navLink} onClick={(e) => handleSmoothScroll(e, '#inscription')}>
                Inscripción
            </a>
           {/* <Link href="/resources" className={styles.navLink}>
                Recursos
            </Link>*/}
        </>
    );
}

