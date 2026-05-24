import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { FaqItem } from '@/lib/seo/faq';
import styles from './FAQItem.module.scss';

interface Props {
  content: FaqItem;
  defaultOpen?: boolean;
}

export default function FAQItem({ content, defaultOpen = false }: Props) {
  return (
    <li className={styles.faqItem}>
      <details className={styles.faqDisclosure} open={defaultOpen}>
        <summary className={styles.faqHeader}>
          <FontAwesomeIcon icon={faChevronRight} className={styles.icon} />
          <h2 className={styles.title}>{content.title}</h2>
        </summary>
        <div className={styles.description}>
          <p>{content.description}</p>
        </div>
      </details>
    </li>
  );
}
