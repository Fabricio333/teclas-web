import { isGrandStaff, type Level } from './songs';

/**
 * What each song's own page says above the player.
 *
 * /piano-player stays the hub: a student lands there and plays, and the picker
 * still switches songs without leaving the page. These entries give every song
 * a URL of its own, so a link to "Para Elisa" opens on Para Elisa — which is
 * what a teacher sending homework, or a student sharing what they are working
 * on, actually means to link to.
 *
 * The prose lives here rather than in the route so that the heading, the meta
 * description and the structured data all read from one place and cannot end
 * up describing the piece three different ways. Everything countable —
 * difficulty, how many notes, which sections — is derived from the `Level`
 * itself in `songPageDescription`, so it can never drift from the notes the
 * game actually asks for.
 */
export interface SongPage {
  /** Heading of the song's page. Says more than the name in the picker. */
  heading: string;
  /** Line under the heading. */
  tagline: string;
  /** What the piece is and what it trains. */
  body: string[];
}

const SONG_PAGES: Record<string, SongPage> = {
  estrellita: {
    heading: 'Estrellita en piano, nota por nota',
    tagline: 'La primera canción de casi todo el mundo.',
    body: [
      'Catorce notas, todas blancas y todas dentro de una misma octava: la mano se queda quieta y lo único nuevo es leer. Por eso es la canción con la que empezamos casi siempre.',
      'La melodía sube de Do a Sol de un salto y después baja de a un escalón hasta volver al Do. Ese par —salto y descenso— es el que se repite en media docena de canciones más de esta lista.',
    ],
  },
  'estrellita-dos-manos': {
    heading: 'Estrellita a dos manos',
    tagline: 'La misma melodía, ahora con acompañamiento en clave de fa.',
    body: [
      'Es Estrellita otra vez, pero escrita en sistema de dos pentagramas: arriba la melodía de siempre, abajo un acompañamiento de blancas. Sirve para empezar a leer clave de fa sin tener que aprender una canción nueva al mismo tiempo.',
      'Se practica una mano por vez —se elige en Ajustes → Mano—. Tocar las dos juntas todavía no está: el juego sigue una nota a la vez, y preferimos decirlo antes que fingir que las escucha juntas.',
    ],
  },
  'maria-corderito': {
    heading: 'María tenía un corderito',
    tagline: 'Tres notas vecinas, sin saltos.',
    body: [
      'Casi toda la canción vive entre Do, Re y Mi, pegadas una al lado de la otra. Es la mejor primera lectura para quien todavía busca las teclas mirándose las manos: si no hay saltos, no hace falta mirar.',
      'Aparece un solo Sol, sobre el final de la segunda frase, y llega justo cuando el oído ya lo está pidiendo.',
    ],
  },
  martinillo: {
    heading: 'Martinillo (Frère Jacques)',
    tagline: 'Cuatro frases que se repiten de a dos.',
    body: [
      'Cada frase de Martinillo se dice dos veces seguidas. Eso quiere decir que la canción entera tiene la mitad de material del que parece, y que la segunda vez ya se toca de memoria.',
      'Se queda entre Do y La, sin salir de las teclas blancas, y termina con el Do-Sol-Do que en el juego aparece marcado como el cierre.',
    ],
  },
  'london-bridge': {
    heading: 'London Bridge en piano',
    tagline: 'Baja, contesta y vuelve a empezar.',
    body: [
      'La melodía arranca arriba y se deja caer por grados hasta Mi, y esa bajada es todo el tema: vuelve tres veces con finales distintos.',
      'Se toca entera con cinco dedos sobre teclas blancas, así que es buena para soltar la mano derecha antes de meterse con canciones que obliguen a moverla.',
    ],
  },
  'au-clair-lune': {
    heading: 'Au Clair de la Lune',
    tagline: 'Notas repetidas: el ejercicio de pulso más viejo que hay.',
    body: [
      'Empieza con tres Do seguidos, y más adelante con cuatro Re seguidos. Repetir una nota parece lo más fácil de la partitura hasta que hay que hacerlo parejo — es exactamente para eso que sirve.',
      'La segunda mitad sube hasta La y baja caminando hasta el Do del principio, sin un solo salto grande en el medio.',
    ],
  },
  'rema-rema': {
    heading: 'Rema rema tu bote',
    tagline: 'Una subida larga hasta el Do agudo.',
    body: [
      'La primera mitad casi no se mueve; la segunda sube por grados hasta el Do de arriba y se queda ahí repitiéndolo. Es la primera canción de la lista donde la mano derecha tiene que salir de su posición inicial.',
      'Ese Do agudo es también una buena excusa para usar los botones de octava del juego y ver la misma melodía escrita más arriba.',
    ],
  },
  'oda-alegria': {
    heading: 'Oda a la Alegría en piano',
    tagline: 'Beethoven con cinco dedos.',
    body: [
      'El tema del cuarto movimiento de la Novena, reducido a lo que entra en una posición de cinco dedos. No hay saltos: todo el tema se mueve de a un escalón, que es justamente por qué se canta solo.',
      'Las dos frases son casi iguales y cambian nada más en el final —una queda abierta, la otra cierra en Do—. En el juego se ven como dos bloques con el mismo patrón.',
    ],
  },
  'aura-lee': {
    heading: 'Aura Lee',
    tagline: 'La melodía que después fue Love Me Tender.',
    body: [
      'Una canción de la guerra civil norteamericana que un siglo después Elvis convirtió en Love Me Tender. La melodía es la misma y se lee sin accidentales.',
      'Tiene un arco muy claro: sube hasta La, baja hasta Re y vuelve. Ese arco se toca dos veces, con final distinto.',
    ],
  },
  'when-saints': {
    heading: 'When the Saints Go Marching In',
    tagline: 'Llamado y respuesta, como se toca en Nueva Orleans.',
    body: [
      'Las primeras tres frases son idénticas: Do-Mi-Fa-Sol, tres veces. Es una canción hecha de una sola célula, y en cuanto sale la primera ya salieron todas.',
      'La segunda parte contesta con la misma idea pero volviendo hacia abajo. En el juego aparecen como "Llamado" y "Respuesta".',
    ],
  },
  cumpleanos: {
    heading: 'Cumpleaños feliz en piano',
    tagline: 'En 3/4, que es donde está la gracia.',
    body: [
      'La única canción de la lista en compás de tres tiempos, y probablemente la que más veces vas a necesitar tocar de memoria. Vale la pena aprenderla bien una vez.',
      'La tercera frase salta a La y es el punto más alto de la canción: es el "feliz cumpleaños querido…" y es donde se nota si la mano está preparada o llega tarde.',
    ],
  },
  campanitas: {
    heading: 'Navidad, Navidad (Jingle Bells)',
    tagline: 'Mi repetido, y después toda la escala.',
    body: [
      'Arranca con Mi repetido tres veces, dos veces seguidas — se reconoce desde la primera nota. Después viene la parte del medio, que es donde realmente se estudia: baja y sube por grados sin repetir nada.',
      'La tercera sección vuelve al Mi del principio, así que la canción termina donde empezó y se puede encadenar sin parar.',
    ],
  },
  'amazing-grace': {
    heading: 'Amazing Grace en piano',
    tagline: 'Primera canción con armadura de clave: un Fa sostenido.',
    body: [
      'Está en Sol mayor, así que todos los Fa van sostenidos. En esta melodía no aparece ninguno, pero la armadura está en la partitura y conviene empezar a leerla antes de necesitarla.',
      'La melodía se mueve en saltos amplios —Re a Sol, Sol a Si— y llega hasta el Re agudo en la tercera frase. Es la primera de la lista que pide abrir la mano de verdad.',
    ],
  },
  'allegro-suzuki': {
    heading: 'Allegro de Suzuki',
    tagline: 'Staccato: notas cortas, sueltas, sin pegarse.',
    body: [
      'Del primer libro de Suzuki. Suzuki lo escribe en La mayor; este arreglo está en Do, que lo deja entero sobre teclas blancas sin cambiarle nada a la melodía.',
      'Los puntitos sobre las notas son el carácter de la pieza y están solo en las secciones A. El puente de los compases 9 a 12 va ligado, sin puntos: son las mismas notas tocadas de otra manera, y ese contraste es la pieza.',
    ],
  },
  greensleeves: {
    heading: 'Greensleeves en piano',
    tagline: 'La primera en tonalidad menor.',
    body: [
      'Está en La menor, y se nota: la misma escala de teclas blancas suena completamente distinta según dónde empiece y dónde descanse. Es la mejor manera de escuchar qué significa "menor" sin explicarlo.',
      'La melodía cubre más de una octava, de Sol a Fa agudo, así que la mano se mueve. Conviene mirar dónde empieza cada frase antes de tocarla.',
    ],
  },
  'minuet-g': {
    heading: 'Minueto en Sol',
    tagline: 'Bach, del cuaderno de Anna Magdalena.',
    body: [
      'Del cuaderno que Bach armó para su mujer — hoy se le atribuye a Christian Petzold, pero el nombre le quedó pegado. Es una de las primeras piezas de repertorio real que puede tocar alguien que recién empieza.',
      'Está en Sol mayor y sí usa el Fa sostenido de la armadura: es la primera de la lista donde hay que tocar una tecla negra leyéndola de la armadura y no de un accidental escrito al lado.',
    ],
  },
  'para-elisa': {
    heading: 'Para Elisa (Für Elise)',
    tagline: 'Mi y Re sostenido, alternando.',
    body: [
      'Las primeras notas alternan Mi y Re sostenido, blanca y negra, todo el tiempo. Es un movimiento de dos dedos que hay que dejar cómodo antes de seguir, porque vuelve al final.',
      'Es también la primera de la lista escrita en corcheas, con la subdivisión más rápida de todas. Como el juego no juzga el tiempo, se puede estudiar tan lento como haga falta y todas las notas cuentan igual.',
    ],
  },
  'himno-alegria-completo': {
    heading: 'Himno a la Alegría, versión completa',
    tagline: 'El tema entero, recorriendo tres octavas.',
    body: [
      'La versión larga de la Oda: el tema aparece seis veces, baja a la octava tres en el puente y vuelve una octava más arriba antes del final. Noventa y dos notas de una punta a la otra del teclado.',
      'Sirve sobre todo para practicar los cambios de registro. Los botones de octava del juego y el modo pantalla completa —que muestra tres octavas en vez de una— son de mucha ayuda acá.',
    ],
  },
  'la-cuarta-estrella': {
    heading: 'La cuarta estrella en piano',
    tagline: 'La canción de cancha, con la partitura entera.',
    body: [
      'La versión completa: treinta y dos compases, estrofa y estribillo, cada uno dicho dos veces. Es la pieza más larga de la aplicación y la única en la que hay que aprender a entrar después de un silencio, porque casi todas las frases arrancan a contratiempo.',
      'La melodía va de La a Sol agudo sin ninguna alteración, así que se toca entera sobre teclas blancas. Lo difícil no son las notas, es el arranque de cada frase: conviene contar el compás en voz alta las primeras veces.',
    ],
  },
};

/**
 * Page copy for a level, with a fallback so a newly added song always has a
 * working page even before anyone writes its two paragraphs.
 */
export function getSongPage(level: Level): SongPage {
  return (
    SONG_PAGES[level.id] ?? {
      heading: `${level.name} en piano`,
      tagline: 'Seguí la partitura y tocá la melodía nota por nota.',
      body: [
        `Practicá ${level.name} en el piano leyendo la partitura en pantalla. Cada nota se ilumina cuando llega su turno y el juego espera a que la toques, sin apurarte.`,
      ],
    }
  );
}

const DIFFICULTY_LABELS: Record<Level['difficulty'], string> = {
  1: 'Principiante',
  2: 'Intermedio',
  3: 'Avanzado',
};

/** "Principiante" / "Intermedio" / "Avanzado". */
export function difficultyLabel(level: Level): string {
  return DIFFICULTY_LABELS[level.difficulty];
}

/**
 * The song's meta description, counted off the level itself.
 *
 * Built rather than written so that it cannot contradict the piece: the note
 * count and the hands come straight from the arrays the game plays.
 */
export function songPageDescription(level: Level): string {
  // Counted per hand rather than as one total: the game follows one voice at a
  // time, so "22 notas" on a grand staff would be a number the student never
  // plays in one go.
  const notes = isGrandStaff(level)
    ? `${level.notes.length} notas en la mano derecha y ${level.leftNotes!.length} en la izquierda, en clave de sol y de fa`
    : `${level.notes.length} notas con la mano derecha`;

  return (
    `Tocá ${level.name} en piano online: ${notes}, ` +
    `nivel ${DIFFICULTY_LABELS[level.difficulty].toLowerCase()}. ` +
    'Seguí la partitura en pantalla y tocá con el teclado, un MIDI o tu propio piano. Gratis, sin registro.'
  );
}
