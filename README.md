# TECLAS — material para eventos

Sitio de la escuela de piano (Next.js 15, export estático) y las herramientas
que generan el material de difusión de cada evento: los flyers, el video
vertical para historias y el QR del sitio.

Este README cubre **cómo preparar el material del próximo evento**. Para las
convenciones de código del sitio, ver [`CLAUDE.md`](./CLAUDE.md).

---

## Lo importante en una línea

Todo el material sale de **un solo lugar**: `lib/events/index.ts` para los
textos y `lib/hero-artwork/` para el dibujo. No se escribe la fecha ni el
teléfono en ningún otro archivo. Si cambia el evento en el sitio, se vuelven a
correr los scripts y el material queda al día solo.

```
lib/events/index.ts       ── fecha, lugar, título, WhatsApp
lib/hero-artwork/         ── teclado, notas, estrellas, trama verde
        │
        ├── el sitio (landing, /events)
        ├── npm run flyer          → 2 PNG
        ├── npm run video:artwork  → video vertical
        └── npm run qr             → QR del sitio
```

---

## Para el próximo evento

### 1. Cargar el evento

Editar `lib/events/index.ts` y agregar el evento nuevo **arriba** del array,
con `status: 'upcoming'`. Al anterior, cambiarle `status` a `'past'`.

Los campos que usa el material son `title`, `subtitle`, `date`, `location` y la
lista `facts` (de ahí salen el horario y la entrada). El título se escribe como
`"<tipo>: <gancho>"` — por ejemplo `"Clase abierta de piano: series, pelis y
juegos"` — porque el flyer parte por los dos puntos: lo de la izquierda va en
la pastilla amarilla y lo de la derecha en el título grande.

### 2. Generar los flyers

```bash
npm run flyer
```

Escribe en `public/events/`:

| Archivo                    | Tamaño      | Para                                      |
| -------------------------- | ----------- | ----------------------------------------- |
| `<slug>-flyer-stories.png` | 1080 × 1920 | Historias de Instagram y estados WhatsApp |
| `<slug>-flyer-post.png`    | 1080 × 1350 | Publicación en el feed                    |

Genera un flyer por cada evento con `status: 'upcoming'`, así que si hay dos
próximos salen cuatro archivos.

### 3. Generar el video de historias

```bash
npm run video:artwork      # actualiza el dibujo dentro de la composición
npm run video:check        # verifica que el dibujo no pise el texto
cd videos/event-story && npm run render -- --output out/story.mp4
```

15 segundos, 1080 × 1920, sin audio. El texto entra línea por línea, el teclado
se arma tecla por tecla y las notas y estrellas flotan hasta el final.

> Los textos del video están escritos a mano en
> `videos/event-story/index.html` — es lo único que **no** se toma de
> `lib/events`. Al cambiar de evento hay que actualizar ahí el título, el
> subtítulo y las cuatro filas de datos.

### 4. Publicar

Los PNG quedan servidos por el sitio apenas se hace deploy y aparecen solos en
`/media-kit`. El MP4 no: se sube a mano a Instagram.

---

## Dónde se descarga todo

**`https://teclasciudadjardin.com.ar/media-kit`**

Una sola página para todo el material descargable: logo, colores, tipografías,
fotos, textos, el QR del sitio y **los flyers del evento próximo**, cada uno con
vista previa y botón de descarga.

Antes esto vivía en una página aparte, `/download`, oculta a propósito. Se
eliminó: dos páginas para lo mismo era una de más, y la que estaba oculta era
justamente la que nadie encontraba.

Los flyers también se pueden bajar directo, sin pasar por la página:

```
https://teclasciudadjardin.com.ar/events/<slug>-flyer-stories.png
https://teclasciudadjardin.com.ar/events/<slug>-flyer-post.png
```

> `/media-kit` es pública e indexable, al revés que la vieja `/download`. Los
> flyers ahora son material público — que es lo que son de todos modos, porque
> se publican en redes.

## El QR del sitio

```bash
npm run qr
```

Genera el QR que lleva a `teclasciudadjardin.com.ar` con el piano de la escuela
en el centro, en `public/media-kit/`:

- `qr-teclasciudadjardin.png` — 1200 × 1200, para redes y pantallas
- `qr-teclasciudadjardin.svg` — vectorial, para imprimir a cualquier tamaño

Se descargan desde **`/media-kit`**, en la sección «Código QR» — esa página sí
es pública e indexable.

El script usa corrección de errores alta (nivel H, tolera ~30% del código
tapado) porque el piano ocupa el centro. Antes de escribir el archivo lo vuelve
a leer con un decodificador y verifica que siga apuntando al sitio: un QR que
se ve bien pero no escanea es el error típico acá y no se nota a simple vista.
Si alguna vez falla, el mensaje dice qué achicar.

---

## Cómo está armado

### El dibujo se comparte, no se copia

El teclado curvo, las notas, las estrellas y la trama verde de puntos son los
mismos del hero animado de la portada. Viven en:

| Archivo                           | Qué tiene                                       |
| --------------------------------- | ----------------------------------------------- |
| `lib/hero-artwork/keyboard.ts`    | La curva del teclado y los trazos de cada tecla |
| `lib/hero-artwork/decorations.ts` | Dónde va cada nota y cada estrella, y su forma  |
| `lib/hero-artwork/particles.ts`   | La trama verde de puntos                        |

`components/AnimatedTeclasHero` los dibuja animados e interactivos; los flyers y
el video los dibujan quietos. Mover una nota ahí la mueve en todos lados.

Los colores **no** se comparten: la portada tiene fondo claro y el flyer fondo
azul noche, así que cada uno define su propio contraste. Solo se comparten las
formas.

### Las fuentes viajan con los scripts

`scripts/flyer/fonts/` tiene los subconjuntos latinos de Lobster, Delius y
Comic Neue, copiados de los que sirve el sitio. Están ahí porque `.next/` no se
versiona y sus nombres cambian en cada build. Gracias a eso los renders no
tocan la red.

### Guarda de desborde

El flyer tiene el alto de cada bloque calculado a mano. Si el piano crece o un
texto queda más largo, la barra de contacto se sale del área segura y el
teléfono se corta — y una captura de eso parece correcta hasta que uno mira
bien. Por eso `npm run flyer` mide la página antes de sacar la foto y falla con
un mensaje concreto:

```
Error: stories: content runs 59px past the safe area — the contact bar
would be clipped. Reduce --hero or the gaps around it in template.mjs.
```

Los dos valores para ajustar están en `scripts/flyer/template.mjs`: `--hero`
(alto del dibujo) y los márgenes alrededor.

El video tiene su propia guarda, `npm run video:check`. Ahí el problema es
distinto: el dibujo se dibuja con `overflow: visible`, así que las estrellas y
las notas salen de su caja. La estrella naranja de abajo terminó apoyada sobre
la fecha y el render se veía terminado igual. El script abre la composición en
Chromium, la adelanta a cinco momentos distintos y mide cada estrella y cada
nota contra el texto de arriba y el de abajo:

```
t=   5s  above type:    49px   below type:    25px
t=   9s  above type:    41px   below type:    47px
```

Menos de 24 px falla. Para arreglarlo se toca `SCENE_SHIFT_X` / `FIELD_SCALE`
en `scripts/story-video/sync-artwork.mjs`, o el alto y los márgenes de
`#artwork` en la composición.

### GSAP viaja con el proyecto

La composición carga `assets/gsap.min.js` desde el disco, no desde un CDN. Un
render no debe depender de la red: si el CDN tarda o no responde, el video sale
sin animación y no hay error que lo diga.

---

## Comandos

| Comando                 | Qué hace                                               |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Servidor de desarrollo del sitio (puerto 3000)         |
| `npm run build`         | Build de producción (export estático a `out/`)         |
| `npm run lint`          | ESLint                                                 |
| `npm run typecheck`     | TypeScript sin emitir                                  |
| `npm run format`        | Prettier sobre todo el repo                            |
| `npm run flyer`         | Genera los flyers PNG del evento próximo               |
| `npm run video:artwork` | Actualiza el dibujo dentro de la composición del video |
| `npm run video:check`   | Verifica que el dibujo del video no pise el texto      |
| `npm run qr`            | Genera el QR del sitio                                 |

Dentro de `videos/event-story/`:

| Comando          | Qué hace                                    |
| ---------------- | ------------------------------------------- |
| `npm run dev`    | Preview del video en el navegador           |
| `npm run check`  | Valida la composición (lint, layout, color) |
| `npm run render` | Renderiza el MP4                            |

---

## Requisitos

Los scripts de flyer y video necesitan un **Chromium que corra de verdad**. En
Ubuntu el `chromium` del sistema es un envoltorio de snap que no funciona
dentro de un contenedor: sale con código 0 y no dibuja nada. Los scripts
prueban cada candidato antes de usarlo y, si no encuentran ninguno, dicen:

```bash
npx playwright install chromium
```

También se puede apuntar a uno existente con `CHROME_PATH`. Para el render del
video la variable es `HYPERFRAMES_BROWSER_PATH`.
