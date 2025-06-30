import Link from "next/link";
import Image from "next/image";
import styles from "./Hero.module.scss";

export default function HeroSection() {
    return (
        <section className="sectionPadding">
            <div className="container">
                <div className={styles.heroGrid}>
                    <div className={styles.heroImageWrapper}>
                        <Image
                            src="/teclas.jpg?height=1080&width=1920"
                            alt="Piano de cola en una sala de conciertos"
                            fill
                            priority
                            className={styles.heroImage}
                        />
                    </div>
                    <div className={styles.heroContent}>
                        <h1 className={styles.heroTitle}>
                            Clases de piano en Ciudad Jardín, Buenos Aires
                        </h1>
                        <p className={styles.heroSubtitle}>
                            Domina el arte del piano con clases presenciales diseñadas para sacar al pianista que llevas dentro.
                        </p>
                        <Link href="https://docs.google.com/forms/d/e/1FAIpQLSenT_EzJoCuNDeRN6dQN38OdeJ8RBybZvxOkESqKQBYAObf8w/viewform?usp=dialog" className="btnPrimary">
                            Comienza hoy mismo
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
