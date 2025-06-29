"use client"

import { Music } from "lucide-react";
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
      <Music size={28} />
    </a>
  );
}
