import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { FaqItem } from '@/lib/seo/faq';
import styles from './FAQItem.module.scss';

interface Props {
  content: FaqItem;
  defaultOpen?: boolean;
}

// Renders the <details> only. The <li> this used to wrap itself in now comes
// from the <Reveal as="li"> in the page — a <li> inside a <li> is invalid.
export default function FAQItem({ content, defaultOpen = false }: Props) {
  return (
    <details className={styles.faqDisclosure} open={defaultOpen}>
      <summary className={styles.faqHeader}>
        <span className={styles.iconWrapper}>
          <FontAwesomeIcon icon={faChevronRight} className={styles.icon} />
        </span>
        <h2 className={styles.title}>{content.title}</h2>
      </summary>
      <div className={styles.description}>
        <p>{content.description}</p>
      </div>
    </details>
  );
}
