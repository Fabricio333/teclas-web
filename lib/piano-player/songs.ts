export type SongSectionKind =
  | 'intro'
  | 'main'
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'ending'
  | 'practice';

export interface SongSection {
  id: string;
  name: string;
  kind: SongSectionKind;
  start: number;
  end: number;
  patternId: string;
  patternName: string;
  focus?: string;
}

export interface SongPattern {
  id: string;
  name: string;
  sectionIds: string[];
  count: number;
}

interface SongSectionSpec {
  id: string;
  name: string;
  kind: SongSectionKind;
  length: number;
  patternId?: string;
  patternName?: string;
  focus?: string;
}

export interface Level {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
  abc: string;
  notes: number[]; // MIDI numbers in order
  sections?: SongSection[];
  patterns?: SongPattern[];
}

function buildSections(specs: SongSectionSpec[]): SongSection[] {
  let cursor = 0;

  return specs.map((spec) => {
    const start = cursor;
    const end = start + spec.length;
    cursor = end;

    return {
      id: spec.id,
      name: spec.name,
      kind: spec.kind,
      start,
      end,
      patternId: spec.patternId ?? spec.id,
      patternName: spec.patternName ?? spec.name,
      focus: spec.focus,
    };
  });
}

function buildPatternsFromSections(sections: SongSection[]): SongPattern[] {
  const byPattern = new Map<string, SongPattern>();

  sections.forEach((section) => {
    const existing = byPattern.get(section.patternId);
    if (existing) {
      existing.sectionIds.push(section.id);
      existing.count += 1;
      return;
    }

    byPattern.set(section.patternId, {
      id: section.patternId,
      name: section.patternName,
      sectionIds: [section.id],
      count: 1,
    });
  });

  return Array.from(byPattern.values());
}

function applySongStructure(levels: Level[]): Level[] {
  return levels.map((level) => {
    const specs = SONG_SECTION_SPECS[level.id];
    if (!specs) return level;

    const totalLength = specs.reduce((sum, spec) => sum + spec.length, 0);
    const normalizedSpecs = specs.map((spec) => ({ ...spec }));
    const lastSpec = normalizedSpecs[normalizedSpecs.length - 1];

    if (lastSpec && totalLength !== level.notes.length) {
      lastSpec.length = Math.max(
        1,
        lastSpec.length + level.notes.length - totalLength,
      );
    }

    const sections = buildSections(normalizedSpecs);

    return {
      ...level,
      sections,
      patterns: buildPatternsFromSections(sections),
    };
  });
}

function buildFallbackSections(noteCount: number): SongSection[] {
  if (noteCount <= 16) {
    return buildSections([
      {
        id: 'main',
        name: 'Principal',
        kind: 'main',
        length: Math.max(1, noteCount - 4),
        patternId: 'core',
        patternName: 'Idea central',
      },
      {
        id: 'ending',
        name: 'Final',
        kind: 'ending',
        length: Math.min(4, noteCount),
        patternId: 'cadence',
        patternName: 'Cierre',
      },
    ]);
  }

  const first = Math.floor(noteCount * 0.4);
  const second = Math.floor(noteCount * 0.35);

  return buildSections([
    {
      id: 'main',
      name: 'Principal',
      kind: 'main',
      length: first,
      patternId: 'core',
      patternName: 'Idea central',
    },
    {
      id: 'development',
      name: 'Desarrollo',
      kind: 'bridge',
      length: second,
      patternId: 'development',
      patternName: 'Variacion',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: noteCount - first - second,
      patternId: 'cadence',
      patternName: 'Cierre',
    },
  ]);
}

export function getSongSections(level: Level): SongSection[] {
  return level.sections?.length
    ? level.sections
    : buildFallbackSections(level.notes.length);
}

export function getSongPatterns(level: Level): SongPattern[] {
  if (level.patterns?.length) return level.patterns;
  return buildPatternsFromSections(getSongSections(level));
}

export function getSectionForPosition(
  level: Level,
  position: number,
): SongSection {
  const sections = getSongSections(level);
  const boundedPosition = Math.max(0, Math.min(position, level.notes.length - 1));

  return (
    sections.find(
      (section) =>
        boundedPosition >= section.start && boundedPosition < section.end,
    ) ?? sections[sections.length - 1]
  );
}

const SONG_SECTION_SPECS: Record<string, SongSectionSpec[]> = {
  estrellita: [
    {
      id: 'main-theme',
      name: 'Tema',
      kind: 'main',
      length: 7,
      patternId: 'rise-fall',
      patternName: 'Subida y respuesta',
      focus: 'Saltos C-G y cierre por grado conjunto',
    },
    {
      id: 'answer',
      name: 'Respuesta',
      kind: 'ending',
      length: 7,
      patternId: 'stepwise-close',
      patternName: 'Descenso final',
      focus: 'Notas repetidas y descenso F-E-D-C',
    },
  ],
  'maria-corderito': [
    {
      id: 'main-a',
      name: 'Motivo A',
      kind: 'main',
      length: 7,
      patternId: 'step-return',
      patternName: 'Paso y regreso',
    },
    {
      id: 'answer',
      name: 'Respuesta',
      kind: 'chorus',
      length: 6,
      patternId: 'repeated-answer',
      patternName: 'Repeticion',
    },
    {
      id: 'main-a-return',
      name: 'Motivo A reprise',
      kind: 'main',
      length: 8,
      patternId: 'step-return',
      patternName: 'Paso y regreso',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: 5,
      patternId: 'cadence',
      patternName: 'Cierre',
    },
  ],
  martinillo: [
    {
      id: 'main-call',
      name: 'Llamado',
      kind: 'main',
      length: 8,
      patternId: 'four-note-cell',
      patternName: 'Celula de cuatro notas',
    },
    {
      id: 'answer',
      name: 'Respuesta',
      kind: 'chorus',
      length: 6,
      patternId: 'three-note-climb',
      patternName: 'Subida corta',
    },
    {
      id: 'bridge',
      name: 'Puente',
      kind: 'bridge',
      length: 12,
      patternId: 'turnaround',
      patternName: 'Giro melodico',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: 6,
      patternId: 'cadence',
      patternName: 'Cierre C-G-C',
    },
  ],
  'london-bridge': [
    {
      id: 'main',
      name: 'Tema',
      kind: 'main',
      length: 7,
      patternId: 'descending-bridge',
      patternName: 'Puente descendente',
    },
    {
      id: 'middle',
      name: 'Centro',
      kind: 'bridge',
      length: 6,
      patternId: 'step-answer',
      patternName: 'Respuesta por grado',
    },
    {
      id: 'return',
      name: 'Retorno',
      kind: 'chorus',
      length: 7,
      patternId: 'descending-bridge',
      patternName: 'Puente descendente',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: 5,
      patternId: 'cadence',
      patternName: 'Cierre',
    },
  ],
  'au-clair-lune': [
    {
      id: 'main',
      name: 'Tema',
      kind: 'main',
      length: 6,
      patternId: 'repeated-tone',
      patternName: 'Notas repetidas',
    },
    {
      id: 'answer',
      name: 'Respuesta',
      kind: 'chorus',
      length: 5,
      patternId: 'small-turn',
      patternName: 'Giro corto',
    },
    {
      id: 'bridge',
      name: 'Puente',
      kind: 'bridge',
      length: 6,
      patternId: 'repeated-tone',
      patternName: 'Notas repetidas',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: 5,
      patternId: 'stepwise-close',
      patternName: 'Descenso final',
    },
  ],
  'rema-rema': [
    {
      id: 'main',
      name: 'Tema',
      kind: 'main',
      length: 6,
      patternId: 'repeated-tone',
      patternName: 'Notas repetidas',
    },
    {
      id: 'climb',
      name: 'Subida',
      kind: 'bridge',
      length: 5,
      patternId: 'step-climb',
      patternName: 'Subida por grado',
    },
    {
      id: 'chorus',
      name: 'Coro',
      kind: 'chorus',
      length: 8,
      patternId: 'high-repeat',
      patternName: 'Repeticion aguda',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: 5,
      patternId: 'cadence',
      patternName: 'Cierre',
    },
  ],
  'oda-alegria': [
    {
      id: 'main-a',
      name: 'Tema A',
      kind: 'main',
      length: 15,
      patternId: 'ode-theme',
      patternName: 'Tema principal',
    },
    {
      id: 'main-b',
      name: 'Tema B',
      kind: 'ending',
      length: 15,
      patternId: 'ode-theme',
      patternName: 'Tema principal',
    },
  ],
  'aura-lee': [
    {
      id: 'main',
      name: 'Tema',
      kind: 'main',
      length: 14,
      patternId: 'lyric-arc',
      patternName: 'Arco melodico',
    },
    {
      id: 'ending',
      name: 'Retorno y final',
      kind: 'ending',
      length: 13,
      patternId: 'lyric-arc',
      patternName: 'Arco melodico',
    },
  ],
  'when-saints': [
    {
      id: 'main',
      name: 'Tema',
      kind: 'main',
      length: 16,
      patternId: 'saints-call',
      patternName: 'Llamado',
    },
    {
      id: 'chorus',
      name: 'Coro',
      kind: 'chorus',
      length: 16,
      patternId: 'saints-response',
      patternName: 'Respuesta',
    },
  ],
  cumpleanos: [
    {
      id: 'verse-1',
      name: 'Frase 1',
      kind: 'verse',
      length: 6,
      patternId: 'birthday-call',
      patternName: 'Llamado',
    },
    {
      id: 'verse-2',
      name: 'Frase 2',
      kind: 'verse',
      length: 6,
      patternId: 'birthday-call',
      patternName: 'Llamado',
    },
    {
      id: 'bridge',
      name: 'Puente',
      kind: 'bridge',
      length: 6,
      patternId: 'birthday-peak',
      patternName: 'Punto alto',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: 6,
      patternId: 'cadence',
      patternName: 'Cierre',
    },
  ],
  campanitas: [
    {
      id: 'main',
      name: 'Tema',
      kind: 'main',
      length: 11,
      patternId: 'jingle-theme',
      patternName: 'Motivo navideno',
    },
    {
      id: 'middle',
      name: 'Centro',
      kind: 'bridge',
      length: 14,
      patternId: 'stepwise-middle',
      patternName: 'Centro por grados',
    },
    {
      id: 'return',
      name: 'Retorno',
      kind: 'chorus',
      length: 11,
      patternId: 'jingle-theme',
      patternName: 'Motivo navideno',
    },
  ],
  'amazing-grace': [
    {
      id: 'main-a',
      name: 'Tema A',
      kind: 'main',
      length: 8,
      patternId: 'grace-arc',
      patternName: 'Arco amplio',
    },
    {
      id: 'main-b',
      name: 'Tema B',
      kind: 'chorus',
      length: 7,
      patternId: 'grace-arc',
      patternName: 'Arco amplio',
    },
    {
      id: 'bridge',
      name: 'Puente',
      kind: 'bridge',
      length: 8,
      patternId: 'upper-answer',
      patternName: 'Respuesta aguda',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: 7,
      patternId: 'cadence',
      patternName: 'Cierre',
    },
  ],
  greensleeves: [
    {
      id: 'main',
      name: 'Tema',
      kind: 'main',
      length: 16,
      patternId: 'minor-arc',
      patternName: 'Arco menor',
    },
    {
      id: 'ending',
      name: 'Retorno y final',
      kind: 'ending',
      length: 13,
      patternId: 'minor-arc',
      patternName: 'Arco menor',
    },
  ],
  'minuet-g': [
    {
      id: 'main',
      name: 'Tema',
      kind: 'main',
      length: 14,
      patternId: 'minuet-cell',
      patternName: 'Celula de minueto',
    },
    {
      id: 'ending',
      name: 'Respuesta y final',
      kind: 'ending',
      length: 14,
      patternId: 'minuet-cell',
      patternName: 'Celula de minueto',
    },
  ],
  'para-elisa': [
    {
      id: 'main',
      name: 'Tema',
      kind: 'main',
      length: 8,
      patternId: 'chromatic-neighbor',
      patternName: 'Vecino cromatico',
      focus: 'Alternancia E-D#',
    },
    {
      id: 'middle',
      name: 'Centro',
      kind: 'bridge',
      length: 7,
      patternId: 'broken-chord',
      patternName: 'Acorde quebrado',
    },
    {
      id: 'return',
      name: 'Retorno',
      kind: 'chorus',
      length: 5,
      patternId: 'upper-answer',
      patternName: 'Respuesta aguda',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: 3,
      patternId: 'chromatic-neighbor',
      patternName: 'Vecino cromatico',
    },
  ],
  'himno-alegria-completo': [
    {
      id: 'theme-a',
      name: 'Tema A',
      kind: 'main',
      length: 15,
      patternId: 'ode-theme',
      patternName: 'Tema principal',
    },
    {
      id: 'theme-b',
      name: 'Tema B',
      kind: 'chorus',
      length: 15,
      patternId: 'ode-theme',
      patternName: 'Tema principal',
    },
    {
      id: 'bridge',
      name: 'Puente',
      kind: 'bridge',
      length: 17,
      patternId: 'low-bridge',
      patternName: 'Puente grave',
    },
    {
      id: 'upper-theme',
      name: 'Tema agudo',
      kind: 'chorus',
      length: 15,
      patternId: 'upper-ode',
      patternName: 'Tema en octava alta',
    },
    {
      id: 'upper-resolution',
      name: 'Resolucion aguda',
      kind: 'chorus',
      length: 15,
      patternId: 'upper-ode',
      patternName: 'Tema en octava alta',
    },
    {
      id: 'ending',
      name: 'Final',
      kind: 'ending',
      length: 15,
      patternId: 'ode-theme',
      patternName: 'Tema principal',
    },
  ],
};

// C4=60 D4=62 E4=64 F4=65 G4=67 A4=69 B4=71
export const LEVELS: Level[] = applySongStructure([
  {
    id: 'estrellita',
    name: 'Estrellita',
    difficulty: 1,
    abc: [
      'X:1',
      'T:Estrellita',
      'M:4/4',
      'L:1/4',
      'K:C',
      'C C G G | A A G2 | F F E E | D D C2 |',
    ].join('\n'),
    notes: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60],
  },
  {
    id: 'maria-corderito',
    name: 'Maria tenia un corderito',
    difficulty: 1,
    abc: [
      'X:1',
      'T:Maria tenia un corderito',
      'M:4/4',
      'L:1/4',
      'K:C',
      'E D C D | E E E2 | D D D2 | E G G2 |',
      'E D C D | E E E E | D D E D | C4 |',
    ].join('\n'),
    notes: [
      64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67, 64, 62, 60, 62, 64,
      64, 64, 64, 62, 62, 64, 62, 60,
    ],
  },
  {
    id: 'martinillo',
    name: 'Martinillo',
    difficulty: 1,
    abc: [
      'X:1',
      'T:Martinillo',
      'M:4/4',
      'L:1/4',
      'K:C',
      'C D E C | C D E C | E F G2 | E F G2 |',
      'G A G F | E C z2 | G A G F | E C z2 | C G C2 | C G C2 |',
    ].join('\n'),
    notes: [
      60, 62, 64, 60, 60, 62, 64, 60, 64, 65, 67, 64, 65, 67, 67, 69, 67, 65,
      64, 60, 67, 69, 67, 65, 64, 60, 60, 67, 60, 60, 67, 60,
    ],
  },
  {
    id: 'london-bridge',
    name: 'London Bridge',
    difficulty: 1,
    abc: [
      'X:1',
      'T:London Bridge',
      'M:4/4',
      'L:1/4',
      'K:C',
      'G A G F | E F G2 | D E F2 | E F G2 |',
      'G A G F | E F G2 | D G E C | C4 |',
    ].join('\n'),
    notes: [
      67, 69, 67, 65, 64, 65, 67, 62, 64, 65, 64, 65, 67, 67, 69, 67, 65, 64,
      65, 67, 62, 67, 64, 60, 60,
    ],
  },
  {
    id: 'au-clair-lune',
    name: 'Au Clair de la Lune',
    difficulty: 1,
    abc: [
      'X:1',
      'T:Au Clair de la Lune',
      'M:4/4',
      'L:1/4',
      'K:C',
      'C C C D | E2 D2 | C E D D | C4 |',
      'D D D D | A2 A2 | G F E D | C4 |',
    ].join('\n'),
    notes: [
      60, 60, 60, 62, 64, 62, 60, 64, 62, 62, 60, 62, 62, 62, 62, 69, 69, 67,
      65, 64, 62, 60,
    ],
  },
  {
    id: 'rema-rema',
    name: 'Rema Rema',
    difficulty: 1,
    abc: [
      'X:1',
      'T:Rema Rema',
      'M:4/4',
      'L:1/4',
      'K:C',
      'C C C D | E2 E2 | D E F G | c4 |',
      'c c c G | G G G E | E E E C | C4 |',
    ].join('\n'),
    notes: [
      60, 60, 60, 62, 64, 64, 62, 64, 65, 67, 72, 72, 72, 72, 67, 67, 67, 67,
      64, 64, 64, 64, 60, 60,
    ],
  },
  {
    id: 'oda-alegria',
    name: 'Oda a la Alegria',
    difficulty: 2,
    abc: [
      'X:1',
      'T:Oda a la Alegria',
      'M:4/4',
      'L:1/4',
      'K:C',
      'E E F G | G F E D | C C D E | E D D2 |',
      'E E F G | G F E D | C C D E | D C C2 |',
    ].join('\n'),
    notes: [
      64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62, 64, 64, 65,
      67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60,
    ],
  },
  {
    id: 'aura-lee',
    name: 'Aura Lee',
    difficulty: 2,
    abc: [
      'X:1',
      'T:Aura Lee',
      'M:4/4',
      'L:1/4',
      'K:C',
      'G E F G | A G F E | D E F G | E2 D2 |',
      'G E F G | A G F E | D E F D | C4 |',
    ].join('\n'),
    notes: [
      67, 64, 65, 67, 69, 67, 65, 64, 62, 64, 65, 67, 64, 62, 67, 64, 65, 67,
      69, 67, 65, 64, 62, 64, 65, 62, 60,
    ],
  },
  {
    id: 'when-saints',
    name: 'When the Saints',
    difficulty: 2,
    abc: [
      'X:1',
      'T:When the Saints',
      'M:4/4',
      'L:1/4',
      'K:C',
      'C E F G | C E F G | C E F G E | C E D2 |',
      'E E D C | C E G G | F E F G E | C D C2 |',
    ].join('\n'),
    notes: [
      60, 64, 65, 67, 60, 64, 65, 67, 60, 64, 65, 67, 64, 60, 64, 62, 64, 64,
      62, 60, 60, 64, 67, 67, 65, 64, 65, 67, 64, 60, 62, 60,
    ],
  },
  {
    id: 'cumpleanos',
    name: 'Cumpleanos Feliz',
    difficulty: 2,
    abc: [
      'X:1',
      'T:Cumpleanos Feliz',
      'M:3/4',
      'L:1/4',
      'K:C',
      'C C D C | F E2 | C C D C | G F2 |',
      'C C A F | E D2 | B B A F | G F2 |',
    ].join('\n'),
    notes: [
      60, 60, 62, 60, 65, 64, 60, 60, 62, 60, 67, 65, 60, 60, 69, 65, 64, 62,
      71, 71, 69, 65, 67, 65,
    ],
  },
  {
    id: 'campanitas',
    name: 'Navidad Navidad',
    difficulty: 2,
    abc: [
      'X:1',
      'T:Navidad Navidad',
      'M:4/4',
      'L:1/4',
      'K:C',
      'E E E2 | E E E2 | E G C D | E4 |',
      'F F F F | F E E E | E D D E | D2 G2 |',
      'E E E2 | E E E2 | E G C D | E4 |',
    ].join('\n'),
    notes: [
      64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64, 65, 65, 65, 65, 65, 64, 64,
      64, 64, 62, 62, 64, 62, 67, 64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64,
    ],
  },
  {
    id: 'amazing-grace',
    name: 'Amazing Grace',
    difficulty: 2,
    abc: [
      'X:1',
      'T:Amazing Grace',
      'M:4/4',
      'L:1/4',
      'K:G',
      'D G B G | B A G E | D G B G | B A B2 |',
      'A B d B | d B G E | D G B G | B A G2 |',
    ].join('\n'),
    notes: [
      62, 67, 71, 67, 71, 69, 67, 64, 62, 67, 71, 67, 71, 69, 71, 69, 71, 74,
      71, 74, 71, 67, 64, 62, 67, 71, 67, 71, 69, 67,
    ],
  },
  {
    id: 'greensleeves',
    name: 'Greensleeves',
    difficulty: 3,
    abc: [
      'X:1',
      'T:Greensleeves',
      'M:4/4',
      'L:1/4',
      'K:Am',
      'A c d e | f e d B | G B c d | e d c A |',
      'A c d e | f e d B | G B c B | A4 |',
    ].join('\n'),
    notes: [
      69, 72, 74, 76, 77, 76, 74, 71, 67, 71, 72, 74, 76, 74, 72, 69, 69, 72,
      74, 76, 77, 76, 74, 71, 67, 71, 72, 71, 69,
    ],
  },
  {
    id: 'minuet-g',
    name: 'Minuet en Sol',
    difficulty: 3,
    abc: [
      'X:1',
      'T:Minuet en Sol',
      'M:4/4',
      'L:1/4',
      'K:G',
      'D G A B | c d G2 | E C D E | F G A2 |',
      'D G A B | c d G2 | E C D E | D C B,2 |',
    ].join('\n'),
    notes: [
      62, 67, 69, 71, 72, 74, 67, 64, 60, 62, 64, 66, 67, 69, 62, 67, 69, 71,
      72, 74, 67, 64, 60, 62, 64, 62, 60, 59,
    ],
  },
  {
    id: 'para-elisa',
    name: 'Para Elisa',
    difficulty: 3,
    abc: [
      'X:1',
      'T:Para Elisa',
      'M:3/4',
      'L:1/8',
      'K:Am',
      'E ^D E ^D E B D c | A2 C E A B |',
      'c2 E ^G B c | B2 E E ^D E |',
    ].join('\n'),
    notes: [
      76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 72, 64, 68, 71, 72,
      71, 64, 76, 75, 76,
    ],
  },
  {
    id: 'himno-alegria-completo',
    name: 'Himno a la Alegria (completo)',
    difficulty: 3,
    abc: [
      'X:1',
      'T:Himno a la Alegria (completo)',
      'M:4/4',
      'L:1/4',
      'K:C',
      // Theme A — Octave 4
      'E E F G | G F E D | C C D E | E D D2 |',
      // Theme B — Octave 4
      'E E F G | G F E D | C C D E | D C C2 |',
      // Bridge — drops to Octave 3
      'D D E C | D E/F/ E C | D E/F/ E D | C D G,2 |',
      // Theme — Octave 5 (triumphant)
      'e e f g | g f e d | c c d e | e d d2 |',
      // Theme — Octave 5 resolution
      'e e f g | g f e d | c c d e | d c c2 |',
      // Finale — back to Octave 4
      'E E F G | G F E D | C C D E | D C C2 |',
    ].join('\n'),
    notes: [
      // Theme A — Octave 4 (15 notes)
      64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62,
      // Theme B — Octave 4 (15 notes)
      64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60,
      // Bridge — drops to Octave 3 (17 notes)
      62, 62, 64, 60, 62, 64, 65, 64, 60, 62, 64, 65, 64, 62, 60, 62, 55,
      // Theme — Octave 5 (15 notes)
      76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 76, 74, 74,
      // Theme — Octave 5 resolution (15 notes)
      76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 74, 72, 72,
      // Finale — back to Octave 4 (15 notes)
      64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60,
    ],
  },
]);

// Debug song: white-key scale from C3 to B5, ascending then descending.
// Only shown in development (localhost). Tests octave shift across 3 octaves.
// C3=48 D3=50 E3=52 F3=53 G3=55 A3=57 B3=59
// C4=60 D4=62 E4=64 F4=65 G4=67 A4=69 B4=71
// C5=72 D5=74 E5=76 F5=77 G5=79 A5=81 B5=83
export const DEBUG_LEVEL: Level = {
  id: 'debug-scale',
  name: 'Debug - Escala C3-B5',
  difficulty: 3,
  abc: [
    'X:1',
    'T:Debug - Escala C3 a B5',
    'M:4/4',
    'L:1/4',
    'K:C',
    'C, D, E, F, | G, A, B, C | D E F G | A B c d | e f g a | b a g f |',
    'e d c B | A G F E | D C B, A, | G, F, E, D, | C,4 |',
  ].join('\n'),
  notes: [
    // Ascending C3 → B5
    48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79,
    81, 83,
    // Descending B5 → C3
    81, 79, 77, 76, 74, 72, 71, 69, 67, 65, 64, 62, 60, 59, 57, 55, 53, 52, 50,
    48,
  ],
};

// Debug song: Canon in D (Pachelbel) — simplified single-note melody.
// Only shown in development (localhost). Tests octave shift and sharps (D major: F#, C#).
// Chord progression: D–A–Bm–F#m–G–D–G–A (repeats)
// ABC K:D means F and C are sharp by default.
// MIDI reference: D4=62 E4=64 F#4=66 G4=67 A4=69 B4=71 C#5=73 D5=74 E5=76 F#5=78
export const DEBUG_CANON: Level = {
  id: 'debug-canon',
  name: 'Debug - Canon in D',
  difficulty: 3,
  abc: [
    'X:1',
    'T:Canon in D (Pachelbel)',
    'M:4/4',
    'L:1/4',
    'K:D',
    // Var 1 — The iconic descending theme (upper octave)
    'f e d c | B A B c |',
    // Var 2 — Canonic answer (descending from D5)
    'd c B A | G F G A |',
    // Var 3 — Arpeggiated variation (octave 4)
    'D F A d | d A F A |',
    // Var 4 — Stepwise variation (octave 4)
    'D E F A | G F E D |',
    // Var 5 — Running passage (octave 4)
    'F A d c | B A G F |',
    // Var 6 — Theme recap (upper octave)
    'f e d c | B A B c |',
    // Finale — Ascending resolution to D5
    'D F A B | c d e d |',
  ].join('\n'),
  notes: [
    // Var 1 — Descending theme: F#5 E5 D5 C#5 B4 A4 B4 C#5
    78, 76, 74, 73, 71, 69, 71, 73,
    // Var 2 — Canonic answer: D5 C#5 B4 A4 G4 F#4 G4 A4
    74, 73, 71, 69, 67, 66, 67, 69,
    // Var 3 — Arpeggiated: D4 F#4 A4 D5 D5 A4 F#4 A4
    62, 66, 69, 74, 74, 69, 66, 69,
    // Var 4 — Stepwise: D4 E4 F#4 A4 G4 F#4 E4 D4
    62, 64, 66, 69, 67, 66, 64, 62,
    // Var 5 — Running: F#4 A4 D5 C#5 B4 A4 G4 F#4
    66, 69, 74, 73, 71, 69, 67, 66,
    // Var 6 — Theme recap: F#5 E5 D5 C#5 B4 A4 B4 C#5
    78, 76, 74, 73, 71, 69, 71, 73,
    // Finale — Ascending resolution: D4 F#4 A4 B4 C#5 D5 E5 D5
    62, 66, 69, 71, 73, 74, 76, 74,
  ],
};
export const KEY_TO_MIDI: Record<string, number> = {
  a: 60, // C4
  w: 61, // C#4
  s: 62, // D4
  e: 63, // D#4
  d: 64, // E4
  f: 65, // F4
  t: 66, // F#4
  g: 67, // G4
  y: 68, // G#4
  h: 69, // A4
  u: 70, // A#4
  j: 71, // B4
};

export const MIDI_TO_KEY: Record<number, string> = {};
Object.entries(KEY_TO_MIDI).forEach(([key, midi]) => {
  MIDI_TO_KEY[midi] = key.toUpperCase();
});

export const WHITE_KEYS = [
  { midi: 60, label: 'A', note: 'C4', finger: 1 },
  { midi: 62, label: 'S', note: 'D4', finger: 2 },
  { midi: 64, label: 'D', note: 'E4', finger: 3 },
  { midi: 65, label: 'F', note: 'F4', finger: 1 },
  { midi: 67, label: 'G', note: 'G4', finger: 2 },
  { midi: 69, label: 'H', note: 'A4', finger: 3 },
  { midi: 71, label: 'J', note: 'B4', finger: 4 },
];

export const BLACK_KEYS = [
  { midi: 61, label: 'W', note: 'C#4', afterWhiteIndex: 0, finger: 2 },
  { midi: 63, label: 'E', note: 'D#4', afterWhiteIndex: 1, finger: 3 },
  { midi: 66, label: 'T', note: 'F#4', afterWhiteIndex: 3, finger: 2 },
  { midi: 68, label: 'Y', note: 'G#4', afterWhiteIndex: 4, finger: 3 },
  { midi: 70, label: 'U', note: 'A#4', afterWhiteIndex: 5, finger: 4 },
];
