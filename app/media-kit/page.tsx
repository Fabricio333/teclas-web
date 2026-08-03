import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faDownload,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import AmbientNotes from '@/components/AmbientNotes';
import Reveal from '@/components/Reveal';
import { upcomingEvents } from '@/lib/events';
import { FLYER_SIZES, flyerPath } from '@/lib/flyer';
import { mediaKitMetadata } from '@/lib/metadata';
import { mediaKitJsonLd } from '@/lib/seo/mediaKit';
import CopyButton from './CopyButton';
import {
  BOILERPLATE,
  FACTS,
  FONTS,
  LOGO_ASSETS,
  QR_ASSETS,
  MISSING,
  PALETTE,
  PHOTO_ASSETS,
  USAGE_DONT,
  USAGE_DO,
} from './data';
import styles from './MediaKit.module.scss';

export const metadata = mediaKitMetadata;

export default function MediaKitPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mediaKitJsonLd) }}
      />
      <section className={styles.section}>
        <AmbientNotes density="sparse" tone="brand" />
        <div className={`container ${styles.inner}`}>
          <Reveal className={styles.header}>
            <h1 className={styles.title}>Media kit</h1>
            <div className="decorativeLine"></div>
            <p className={styles.subtitle}>
              Todo lo que necesitás para hablar de TECLAS: logo, colores,
              tipografías, fotos y textos listos para copiar. Podés usar este
              material libremente en notas, redes y materiales sobre la escuela.
            </p>
          </Reveal>

          {/* ---------- Logo ---------- */}
          <Reveal as="section" className={styles.block}>
            <h2 className={styles.blockTitle}>Marca</h2>
            <p className={styles.blockText}>
              Hoy conviven dos marcas: el isotipo verde con la clave de sol, que
              es el que usa el sitio, y una marca piano en negro. El nombre se
              escribe siempre en mayúsculas, en Lobster.
            </p>

            <div className={styles.assetGrid}>
              {LOGO_ASSETS.map((asset) => (
                <div className={styles.asset} key={asset.file}>
                  <div className={styles.assetPreview}>
                    {/* `unoptimized` because next/image's optimiser is off for
                        this static export, and an .ico has no sensible
                        intrinsic size for the layout engine. */}
                    <Image
                      alt={`${asset.name} de TECLAS`}
                      className={styles.assetImage}
                      height={96}
                      src={asset.file}
                      unoptimized
                      width={96}
                    />
                  </div>
                  <div className={styles.assetMeta}>
                    <span className={styles.assetName}>
                      {asset.name} <small>{asset.format}</small>
                    </span>
                    <span className={styles.assetDetail}>{asset.detail}</span>
                  </div>
                  <a className={styles.download} download href={asset.file}>
                    <FontAwesomeIcon icon={faDownload} /> Descargar
                  </a>
                </div>
              ))}
            </div>

            <div className={styles.rules}>
              <div className={styles.ruleCol}>
                <h3 className={`${styles.ruleTitle} ${styles.ruleDo}`}>
                  <FontAwesomeIcon icon={faCheck} /> Sí
                </h3>
                <ul className={styles.ruleList}>
                  {USAGE_DO.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.ruleCol}>
                <h3 className={`${styles.ruleTitle} ${styles.ruleDont}`}>
                  <FontAwesomeIcon icon={faXmark} /> No
                </h3>
                <ul className={styles.ruleList}>
                  {USAGE_DONT.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          {/* ---------- QR ---------- */}
          <Reveal as="section" className={styles.block}>
            <h2 className={styles.blockTitle}>Código QR</h2>
            <p className={styles.blockText}>
              Lleva directo a teclasciudadjardin.com.ar y tiene el piano de la
              escuela en el centro. Está generado con corrección de errores
              alta, así que se puede imprimir en un flyer, en un cartel o en una
              tarjeta y se sigue escaneando.
            </p>

            <div className={styles.assetGrid}>
              {QR_ASSETS.map((asset) => (
                <div className={styles.asset} key={asset.file}>
                  <div className={styles.assetPreview}>
                    <Image
                      alt="Código QR de TECLAS con el piano en el centro"
                      className={styles.assetImage}
                      height={128}
                      src="/media-kit/qr-teclasciudadjardin.png"
                      unoptimized
                      width={128}
                    />
                  </div>
                  <div className={styles.assetMeta}>
                    <span className={styles.assetName}>
                      {asset.name} <small>{asset.format}</small>
                    </span>
                    <span className={styles.assetDetail}>{asset.detail}</span>
                  </div>
                  <a className={styles.download} download href={asset.file}>
                    <FontAwesomeIcon icon={faDownload} /> Descargar
                  </a>
                </div>
              ))}
            </div>
          </Reveal>

          {/* ---------- Event flyers ---------- */}
          {upcomingEvents.length > 0 && (
            <Reveal as="section" className={styles.block}>
              <h2 className={styles.blockTitle}>Flyers del evento</h2>
              <p className={styles.blockText}>
                Listos para publicar, en los dos tamaños que usa Instagram. Se
                generan con <code>npm run flyer</code> a partir de los datos del
                evento, así que siempre dicen lo mismo que la web.
              </p>

              {upcomingEvents.map((event) => (
                <div key={event.slug} className={styles.flyerEvent}>
                  <h3 className={styles.flyerEventTitle}>
                    {event.title} <small>{event.date}</small>
                  </h3>
                  <div className={styles.assetGrid}>
                    {FLYER_SIZES.map((size) => {
                      const href = flyerPath(event.slug, size.key);
                      return (
                        <div className={styles.asset} key={size.key}>
                          <div
                            className={`${styles.assetPreview} ${styles.flyerPreview}`}
                          >
                            <Image
                              alt={`Flyer ${size.label} de ${event.title}`}
                              className={styles.flyerImage}
                              height={size.height}
                              src={href}
                              /*
                                Inline, not only in the module: a 9:16 poster
                                given a class alone rendered at its natural
                                ratio across the full card width and buried the
                                label and the download button underneath it.
                                An inline style outranks whatever was winning.
                              */
                              style={{
                                maxHeight: '100%',
                                maxWidth: '100%',
                                height: 'auto',
                                width: 'auto',
                                objectFit: 'contain',
                              }}
                              unoptimized
                              width={size.width}
                            />
                          </div>
                          <div className={styles.assetMeta}>
                            <span className={styles.assetName}>
                              {size.label} <small>PNG</small>
                            </span>
                            <span className={styles.assetDetail}>
                              {size.width} × {size.height} px · {size.usage}
                            </span>
                          </div>
                          <a className={styles.download} download href={href}>
                            <FontAwesomeIcon icon={faDownload} /> Descargar
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Reveal>
          )}

          {/* ---------- Colours ---------- */}
          <Reveal as="section" className={styles.block}>
            <h2 className={styles.blockTitle}>Colores</h2>
            <p className={styles.blockText}>
              Tocá cualquier color para copiar su código.
            </p>

            <div className={styles.palette}>
              {PALETTE.map((swatch) => (
                <div className={styles.swatch} key={swatch.hex}>
                  <div
                    className={styles.swatchChip}
                    style={{
                      backgroundColor: swatch.hex,
                      color: swatch.ink ?? '#fff',
                    }}
                  >
                    {swatch.hex}
                  </div>
                  <div className={styles.swatchMeta}>
                    <span className={styles.swatchName}>{swatch.name}</span>
                    <span className={styles.swatchUsage}>{swatch.usage}</span>
                    <CopyButton
                      label={swatch.hex}
                      doneLabel="Copiado"
                      value={swatch.hex}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* ---------- Typography ---------- */}
          <Reveal as="section" className={styles.block}>
            <h2 className={styles.blockTitle}>Tipografías</h2>
            <p className={styles.blockText}>
              Las tres son gratuitas y están en Google Fonts.
            </p>

            <div className={styles.fontList}>
              {FONTS.map((font) => (
                <div className={styles.font} key={font.name}>
                  <p
                    className={styles.fontSample}
                    style={{ fontFamily: `var(${font.cssVar})` }}
                  >
                    TECLAS Do Re Mi 123
                  </p>
                  <div className={styles.fontMeta}>
                    <span className={styles.fontName}>{font.name}</span>
                    <span className={styles.fontRole}>{font.role}</span>
                  </div>
                  <a
                    className={styles.download}
                    href={font.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Google Fonts
                  </a>
                </div>
              ))}
            </div>
          </Reveal>

          {/* ---------- Photos ---------- */}
          <Reveal as="section" className={styles.block}>
            <h2 className={styles.blockTitle}>Fotos</h2>
            <p className={styles.blockText}>
              Libres para usar en notas sobre la escuela, con crédito a TECLAS
              Ciudad Jardín.
            </p>

            <div className={styles.photoGrid}>
              {PHOTO_ASSETS.map((photo) => (
                <div className={styles.photo} key={photo.file}>
                  <div className={styles.photoFrame}>
                    <Image
                      alt={photo.name}
                      className={styles.photoImage}
                      height={400}
                      src={photo.file}
                      unoptimized
                      width={400}
                    />
                  </div>
                  <div className={styles.assetMeta}>
                    <span className={styles.assetName}>
                      {photo.name} <small>{photo.format}</small>
                    </span>
                    <span className={styles.assetDetail}>{photo.detail}</span>
                  </div>
                  <a className={styles.download} download href={photo.file}>
                    <FontAwesomeIcon icon={faDownload} /> Descargar
                  </a>
                </div>
              ))}
            </div>
          </Reveal>

          {/* ---------- Boilerplate ---------- */}
          <Reveal as="section" className={styles.block}>
            <h2 className={styles.blockTitle}>Textos</h2>
            <p className={styles.blockText}>
              Tres versiones según el espacio que tengas.
            </p>

            {(
              [
                ['Breve', BOILERPLATE.short],
                ['Media', BOILERPLATE.medium],
                ['Completa', BOILERPLATE.long],
              ] as const
            ).map(([label, text]) => (
              <div className={styles.textBlock} key={label}>
                <div className={styles.textHead}>
                  <span className={styles.textLabel}>
                    {label} · {text.split(/\s+/).length} palabras
                  </span>
                  <CopyButton value={text} />
                </div>
                <p className={styles.textBody}>{text}</p>
              </div>
            ))}
          </Reveal>

          {/* ---------- Facts ---------- */}
          <Reveal as="section" className={styles.block}>
            <h2 className={styles.blockTitle}>Datos</h2>
            <dl className={styles.facts}>
              {FACTS.map((fact) => (
                <div className={styles.fact} key={fact.label}>
                  <dt className={styles.factLabel}>{fact.label}</dt>
                  <dd className={styles.factValue}>
                    {fact.href ? (
                      <a
                        href={fact.href}
                        rel={
                          fact.href.startsWith('http')
                            ? 'noopener noreferrer'
                            : undefined
                        }
                        target={
                          fact.href.startsWith('http') ? '_blank' : undefined
                        }
                      >
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                    <CopyButton label="Copiar" value={fact.value} />
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* ---------- What's missing ---------- */}
          <Reveal as="section" className={`${styles.block} ${styles.missing}`}>
            <h2 className={styles.blockTitle}>Todavía no tenemos</h2>
            <p className={styles.blockText}>
              Si necesitás alguna de estas piezas, escribinos y la preparamos.
            </p>
            <ul className={styles.ruleList}>
              {MISSING.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link
              className={`btnPrimary ${styles.contact}`}
              href="https://wa.me/5491134162288"
              rel="noopener noreferrer"
              target="_blank"
            >
              Escribinos por WhatsApp
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
