# TECLAS — sitio de la escuela

Sitio de la escuela de piano TECLAS Ciudad Jardín: Next.js 15, export estático.
Para las convenciones de código, ver [`CLAUDE.md`](./CLAUDE.md).

## Imágenes y videos

Los flyers, el video de historias, los QR, el cartel de reseñas y la imagen
para compartir links **no se generan acá**: se generan en el repo
[`teclas-ar/teclas-media`](https://github.com/teclas-ar/teclas-media).

Ese repo lee los datos de este (`lib/events/index.ts` para los textos,
`lib/hero-artwork/` para el dibujo, `lib/flyer/` para los nombres de archivo)
y escribe los resultados en `public/`. Por eso los archivos generados se
commitean en este repo y se publican con el sitio:

| Carpeta                | Qué hay                                  |
| ---------------------- | ---------------------------------------- |
| `public/events/`       | Flyers PNG y videos MP4 de cada evento   |
| `public/media-kit/`    | Códigos QR y cartel de reseñas de Google |
| `public/og-teclas.jpg` | Imagen para compartir links              |

Para el próximo evento: se carga en `lib/events/index.ts` (acá), se corre
`npm run flyer` y `npm run video` en teclas-media, y se commitean los archivos
nuevos de `public/` acá. Aparecen solos en `/media-kit`.

## Comandos

| Comando             | Qué hace                                       |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo del sitio (puerto 3000) |
| `npm run build`     | Build de producción (export estático a `out/`) |
| `npm run lint`      | ESLint                                         |
| `npm run typecheck` | TypeScript sin emitir                          |
| `npm run format`    | Prettier sobre todo el repo                    |
