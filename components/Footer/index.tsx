import Link from "next/link";
import {Instagram, MapPin, Phone} from "lucide-react";
import styles from "./Footer.module.scss";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className="container">
                <div className={styles.footerWrapper}>
                    <div className={styles.footerAbout}>
                        <h3 className={styles.footerTitle}>Teclas Ciudad Jardín</h3>
                        <p className={styles.footerText}>
                            Clases de piano personalizadas, diseñadas para dejar salir el
                            pianista que hay en vos.
                        </p>
                        <div className={styles.footerLocation}>
                            <MapPin size={20} className={styles.icon}/>
                            <p>
                                Ciudad Jardín Lomas del Palomar, Buenos Aires
                            </p>
                        </div>
                    </div>

                    <div className={styles.footerContact}>
                        <h3 className={styles.footerTitle}>Contacto</h3>
                        <div className={styles.contactContent}>
                            <p>
                                <Phone size={20} className={styles.icon}/>
                                <span>(+54) 9 11 3416-2288</span>
                            </p>
                            <Link
                                href="https://www.instagram.com/teclas.ciudadjardin/"
                                className={styles.socialLink}
                            >
                                <Instagram size={20} className={styles.icon}/>
                                <span>teclas.ciudadjardin</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className={styles.footerBottom}>
                    <p>
                        &copy; {new Date().getFullYear()} Teclas Ciudad Jardín. Todos los
                        derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}
