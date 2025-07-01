import faqJsonLd from "@/lib/seo/faq";
import {faqMetadata} from "@/lib/metadata";
import styles from "./Faq.module.scss";
export {faqMetadata as metadata};


export function Head() {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{__html: JSON.stringify(faqJsonLd)}}
        />
    );
}

export default function FAQPage() {
    return (
        <section className="sectionPadding">
            <div className="container">
                <h1 className={styles.faqTitle}>Preguntas Frecuentes</h1>
                <div className="space-y-6">
                    <div>
                        <h2 className="font-semibold">¿Necesito experiencia previa para tomar clases?</h2>
                        <p>No es necesario contar con experiencia previa, nos adaptamos a tu nivel.</p>
                    </div>
                    <div>
                        <h2 className="font-semibold">¿Cuántas clases por semana se dictan?</h2>
                        <p>Por lo general ofrecemos una clase semanal de una hora.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
