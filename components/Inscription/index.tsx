"use client"

import Link from "next/link";
import styles from "./Inscription.module.scss";


export default function Inscription() {

    return (
        <section id="inscription" className={styles.inscriptionSection}>
            <div className="container">
                <h2 className={styles.sectionTitle}>¿Listo para comenzar tu viaje en el piano?</h2>
                <p className={styles.sectionSubtitle}>
                    Únete a nuestra academia hoy y descubre la alegría de tocar el piano con la guía de expertos.
                </p>
                <Link href="#" className="btnPrimary">
                    Inscribirme ahora
                </Link>
            </div>
        </section>
    )
}

