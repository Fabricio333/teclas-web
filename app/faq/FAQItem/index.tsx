'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useRef, useState } from 'react';
import { useOnClickOutside } from '@/hooks/use-on-click-outside';
import styles from './FAQItem.module.scss';

export interface TypeFaq {
  title: string;
  description: string;
}

interface Props {
  content: TypeFaq;
}

export default function FAQItem({ content }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLLIElement>(null);

  useOnClickOutside(itemRef, () => setIsOpen(false));

  const toggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <li className={styles.faqItem} ref={itemRef}>
      <button
        className={styles.faqHeader}
        onClick={toggle}
        data-open={isOpen}
        aria-expanded={isOpen}
      >
        <FontAwesomeIcon icon={faChevronRight} className={styles.icon} />
        <h3 className={styles.title} data-open={isOpen}>
          {content.title}
        </h3>
      </button>
      <div
        className={styles.description}
        data-open={isOpen}
        ref={contentRef}
        style={{
          maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : '0',
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: content.description }} />
      </div>
    </li>
  );
}
