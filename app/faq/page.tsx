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
        <div className="container">
          <div className={styles.faqContent}>
            <h1 className={styles.faqTitle}>Preguntas frecuentes</h1>
            <p className={styles.faqIntro}>
              Respuestas claras sobre las clases de piano en TECLAS Ciudad
              Jardín.
            </p>
            <ul className={styles.faqList}>
              {faqItems.map((item, index) => (
                <FAQItem
                  key={item.title}
                  content={item}
                  defaultOpen={index === 0}
                />
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
