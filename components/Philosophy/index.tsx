import AmbientNotes from '@/components/AmbientNotes';
import Reveal from '@/components/Reveal';
import ScrollCue from '@/components/ScrollCue';
import styles from './Philosophy.module.scss';

export default function Philosophy() {
  return (
    <section className={styles.philosophy} id="philosophy">
      <AmbientNotes density="dense" tone="plum" />
      <div className={`container ${styles.inner}`}>
        <Reveal className={styles.textCenter}>
          <h2 className={styles.sectionTitle}>
            Nuestra filosofía de enseñanza
          </h2>
          <div className="decorativeLine"></div>
        </Reveal>

        <div className={styles.philosophyContent}>
          <div className={styles.philosophyText}>
            <Reveal as="p" delay={0}>
              Creemos firmemente que cada estudiante es único, por lo que
              ofrecemos una atención completamente personalizada. Nuestro método
              se basa en el entrenamiento constante, la motivación positiva y
              una amplia variedad de recursos didácticos especialmente pensados
              para niños, quienes aprenden y se divierten al mismo tiempo.
            </Reveal>
            <Reveal as="p" delay={90}>
              El objetivo principal de nuestras clases es inspirar tanto a niños
              como a adultos a descubrir y alcanzar su máximo potencial musical,
              disfrutando cada paso del aprendizaje.
            </Reveal>
            <Reveal as="p" delay={180}>
              Aprender a tocar un instrumento musical va más allá de adquirir
              una habilidad técnica; también es una oportunidad para descubrir
              una pasión, experimentar algo nuevo y enriquecedor, y mejorar
              significativamente otros aspectos de la vida diaria.
            </Reveal>
            <Reveal as="p" className={styles.closingLine} delay={270}>
              Sigue tu pasión y comienza a tocar la música que siempre soñaste
              interpretar.
            </Reveal>
          </div>
        </div>

        <ScrollCue href="#inscription" />
      </div>
    </section>
  );
}
