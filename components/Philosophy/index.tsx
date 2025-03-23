import styles from "./Philosophy.module.scss";

export default function Philosophy() {
    return (
        <div className={styles.philosophy} id="philosophy">
            <div className="container">
                <div className={styles.textCenter}>
                    <h2 className={styles.sectionTitle}>Nuestra filosofía de enseñanza</h2>
                    <div className="decorativeLine"></div>
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
        </div>
    );
}

