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
                    <div className={styles.mapWrapper}>
                        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3284.1932270987486!2d-58.5877735!3d-34.59927509999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcb92b272dead5%3A0xd423ce89aadcbad6!2sTECLAS!5e0!3m2!1sen!2sar!4v1751302593673!5m2!1sen!2sar" width="600" height="450" style={{border:0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                    </div>
                </div>
        </section>
    );
}

