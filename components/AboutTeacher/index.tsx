import Image from "next/image";
import styles from "./AboutTeacher.module.scss";
import Link from "next/link";
import {Instagram, Youtube} from "lucide-react";

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
                            <div className={styles.decorativeLine}></div>
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
                                <Instagram size={40} className={styles.icon}/>
                            </Link>
                            <Link
                                href="https://www.youtube.com/@roxanaarena618"
                                className={styles.socialLink}
                            >
                                <Youtube size={40} className={styles.icon}/>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container">
                <div className={styles.textCenter}>
                    <h2 className={styles.sectionTitle}>Nuestra filosofía de enseñanza</h2>
                    <div className={styles.decorativeLine}></div>
                </div>

                <div className={styles.philosophyContent}>
                    <div className={styles.philosophyText}>
                        <p>
                            Creemos firmemente que cada estudiante es único, por lo que ofrecemos una atención
                            completamente personalizada. Nuestro método se basa en el entrenamiento constante, la
                            motivación positiva y una amplia variedad de recursos didácticos especialmente pensados
                            para niños, quienes aprenden y se divierten al mismo tiempo.
                        </p>
                        <p>
                            El objetivo principal de nuestras clases es inspirar tanto a niños como a adultos a
                            descubrir y alcanzar su máximo potencial musical, disfrutando cada paso del aprendizaje.
                        </p>
                        <p>
                            Aprender a tocar un instrumento musical va más allá de adquirir una habilidad técnica;
                            también es una oportunidad para descubrir una pasión, experimentar algo nuevo y
                            enriquecedor, y mejorar significativamente otros aspectos de la vida diaria.
                        </p>
                        <p>
                            Sigue tu pasión y comienza a tocar la música que siempre soñaste interpretar.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

