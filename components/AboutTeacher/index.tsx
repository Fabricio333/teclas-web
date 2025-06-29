import Image from "next/image";
import styles from "./AboutTeacher.module.scss";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInstagram, faYoutube } from "@fortawesome/free-brands-svg-icons";
import Philosophy from "@/components/Philosophy";

export default function AboutTeacher() {
    return (
        <section className={styles.about} id="about-teacher">
            <div className="container">
                <div className={styles.instructorGrid}>
                    <div className={styles.imageWrapper}>
                        <Image
                            src="/fotoDeFrente.jpg?height=800&width=600"
                            alt="Instructora de piano frente al piano"
                            fill
                            className={styles.instructorImage}
                        />
                    </div>
                    <div className={styles.instructorText}>
                        <div className={styles.textCenter}>
                            <h1 className={styles.sectionTitle}>Conocé tu instructora</h1>
                            <div className="decorativeLine"></div>
                        </div>
                        <div className={styles.instructorBio}>
                            <p>
                                Roxana Arena comenzó sus estudios musicales en el Conservatorio Beethoven de Córdoba
                                Capital a los 6
                                años, y posteriormente estudió Composición y Educación Musical en la Universidad
                                Nacional de Córdoba. Desde los 14 años se dedicó a dar clases particulares,
                                actividad
                                que continuó luego de graduarse, fundando así la academia Teclas. Desarrolló un
                                método
                                propio para aprender música de manera interactiva, divertida y efectiva, obteniendo
                                rápidos resultados.
                            </p>
                            <p>
                                Ha ejercido como maestra de música en niveles preescolar, primaria y secundaria,
                                especializándose en principiantes y niños a partir de los 4 años. Ha guiado a
                                diversos
                                estudiantes en su preparación para exámenes de conservatorio y presentaciones en
                                conciertos, acompañándolos en su desarrollo musical y artístico.
                            </p>
                        </div>
                        <div className={styles.socialLinks}>
                            <Link
                                href="https://www.instagram.com/teclas.ciudadjardin/"
                                className={styles.socialLink}
                            >
                                <FontAwesomeIcon icon={faInstagram} size="2x" className={styles.icon}/>
                            </Link>
                            <Link
                                href="https://www.youtube.com/@roxanaarena618"
                                className={styles.socialLink}
                            >
                                <FontAwesomeIcon icon={faYoutube} size="2x" className={styles.icon}/>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <Philosophy/>
        </section>
    );
}

