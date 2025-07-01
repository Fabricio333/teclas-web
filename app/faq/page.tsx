import faqJsonLd from '@/lib/seo/faq';
import { faqMetadata } from '@/lib/metadata';
import FAQItem, { TypeFaq } from './FAQItem';
import styles from './Faq.module.scss';

export { faqMetadata as metadata };

export function Head() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
    />
  );
}

const faqItems: TypeFaq[] = [
  {
    title: '¿Necesito experiencia previa para tomar clases?',
    description:
      'No es necesario tener conocimientos previos, enseñamos desde nivel inicial hasta avanzado.',
  },
  {
    title: '¿Cuántas clases por semana se dictan?',
    description:
      'Generalmente ofrecemos una clase semanal de una hora, aunque podemos adaptarnos a otras necesidades.',
  },
];

export default function FAQPage() {
  return (
    <section className={styles.faqSection}>
      <div className="container">
        <h1 className={styles.faqTitle}>Preguntas Frecuentes</h1>
        <ul className={styles.faqList}>
          {faqItems.map((item) => (
            <FAQItem key={item.title} content={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}
