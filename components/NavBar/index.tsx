"use client"
import Link from "next/link";
import React, { useEffect, useState, useRef } from 'react';
import { X, Menu } from "lucide-react";
import styles from "./NavBar.module.scss";

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const lastScrollY = useRef(0);

    const controlNavbar = () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
            setShowNavbar(false); // hide navbar on scroll down
        } else {
            setShowNavbar(true); // show navbar on scroll up
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
                    Teclas Ciudad Jardín
                </Link>

                <button
                    className={styles.mobileMenuButton}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
            <Link href="/resources" className={styles.navLink}>
                Recursos
            </Link>
        </>
    );
}

