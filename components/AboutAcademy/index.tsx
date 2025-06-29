import styles from "./AboutAcademy.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMusic,
  faAward,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

export default function AboutAcademy() {
    return (
            <section className={styles.featuresSection} id="about-academy">
                <div className="container">
                    <div className={styles.sectionHeader}>
                        <h1 className={styles.sectionTitle}>¿Por qué elegir nuestra academia?</h1>
                        <div className="decorativeLine"></div>
                    </div>

                    <div className={styles.featuresGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.iconWrapper}>
                                <FontAwesomeIcon icon={faMusic} className={styles.icon} size="2x"/>
                            </div>
                            <h3 className={styles.cardTitle}>Enfoque personalizado</h3>
                            <p className={styles.cardDescription}>
                                Clases adaptadas a tu nivel, objetivos y estilo de aprendizaje para un progreso óptimo.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.iconWrapper}>
                                <FontAwesomeIcon icon={faAward} className={styles.icon} size="2x"/>
                            </div>
                            <h3 className={styles.cardTitle}>Instrucción experta</h3>
                            <p className={styles.cardDescription}>
                                Aprende de instructores experimentados con formación académica y experiencia escénica.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.iconWrapper}>
                                <FontAwesomeIcon icon={faUsers} className={styles.icon} size="2x"/>
                            </div>
                            <h3 className={styles.cardTitle}>Comunidad de apoyo</h3>
                            <p className={styles.cardDescription}>
                                Únete a una comunidad de pianistas con recitales regulares y oportunidades de actuación.
                            </p>
                        </div>
                    </div>
                </div>
        </section>
    );
}

