"use client"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import styles from "./WhatsAppButton.module.scss";

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/5491134162288"
      target="_blank"
      rel="noopener noreferrer"
      className={styles.whatsappButton}
      aria-label="Contactar por WhatsApp"
    >
      <FontAwesomeIcon icon={faWhatsapp} size="xl" />
    </a>
  );
}
