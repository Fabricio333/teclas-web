import AmbientNotes from '@/components/AmbientNotes';
import Reveal from '@/components/Reveal';
import faqJsonLd, { faqItems } from '@/lib/seo/faq';
import { faqMetadata } from '@/lib/metadata';
import FAQItem from './FAQItem';
import styles from './Faq.module.scss';

export { faqMetadata as metadata };

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className={styles.faqSection}>
        <AmbientNotes density="sparse" tone="brand" />
        <div className={`container ${styles.inner}`}>
          <div className={styles.faqContent}>
            <Reveal className={styles.faqHeader}>
              <h1 className={styles.faqTitle}>Preguntas frecuentes</h1>
              <div className="decorativeLine"></div>
              <p className={styles.faqIntro}>
                Respuestas claras sobre las clases de piano en TECLAS Ciudad
                Jardín.
              </p>
            </Reveal>
            <ul className={styles.faqList}>
              {faqItems.map((item, index) => (
                <Reveal
                  as="li"
                  // Caps at 6 so a long FAQ list does not leave the last few
                  // items waiting a second after they are already on screen.
                  delay={Math.min(index, 6) * 70}
                  key={item.title}
                >
                  <FAQItem content={item} defaultOpen={index === 0} />
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
