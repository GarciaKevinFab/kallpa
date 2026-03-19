// ---------------------------------------------------------------------------
// Local NLP - Offline sentiment analysis and risk detection
// ---------------------------------------------------------------------------
// All processing runs on-device. No text is ever sent to an external server
// from this module.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiesgoDetectado {
  /** Whether crisis-level keywords were found. */
  esRiesgo: boolean;
  /** Severity: 'ninguno' | 'bajo' | 'medio' | 'alto' | 'critico'. */
  nivel: 'ninguno' | 'bajo' | 'medio' | 'alto' | 'critico';
  /** Keywords that triggered the detection. */
  palabrasDetectadas: string[];
  /** Recommended action. */
  accionSugerida: string;
}

export interface TemaExtraido {
  tema: string;
  frecuencia: number;
}

export interface ResultadoSentimiento {
  /** Score from -1 (very negative) to +1 (very positive). */
  puntaje: number;
  /** Human-readable label. */
  etiqueta: 'muy_negativo' | 'negativo' | 'neutro' | 'positivo' | 'muy_positivo';
}

// ---------------------------------------------------------------------------
// Crisis keywords
// ---------------------------------------------------------------------------

/**
 * CRISIS_KEYWORDS - Hierarchical list of risk-indicating terms and phrases.
 *
 * Organised by severity level. Matching is case-insensitive and
 * accent-insensitive. Each entry can be a single word or a multi-word
 * phrase that is searched as a substring.
 */
export const CRISIS_KEYWORDS = {
  critico: [
    'suicidarme',
    'suicidio',
    'quitarme la vida',
    'quiero morir',
    'no quiero vivir',
    'acabar con todo',
    'matarme',
    'me voy a matar',
    'no vale la pena vivir',
    'mejor muerto',
    'mejor muerta',
    'tirarme del puente',
    'cortarme las venas',
  ],
  alto: [
    'hacerme dano',
    'autolesion',
    'cortarme',
    'me corto',
    'golpearme',
    'lastimarme',
    'no quiero seguir',
    'no puedo mas',
    'ya no aguanto',
    'no tiene sentido',
    'sin salida',
    'nadie me quiere',
    'estoy solo',
    'estoy sola',
    'no le importo a nadie',
  ],
  medio: [
    'desesperado',
    'desesperada',
    'no sirvo para nada',
    'soy un fracaso',
    'todo me sale mal',
    'no tengo futuro',
    'llorar todo el dia',
    'no puedo levantarme',
    'no quiero salir',
    'oscuridad',
    'vacio',
    'atrapado',
    'atrapada',
    'sin esperanza',
  ],
  bajo: [
    'triste',
    'deprimido',
    'deprimida',
    'ansiedad',
    'angustia',
    'nervios',
    'estres',
    'agotado',
    'agotada',
    'no puedo dormir',
    'insomnio',
    'soledad',
    'miedo',
  ],
} as const;

// ---------------------------------------------------------------------------
// Theme / topic keywords for extraction
// ---------------------------------------------------------------------------

const TEMA_KEYWORDS: Record<string, string[]> = {
  academico: [
    'examen', 'parcial', 'final', 'nota', 'calificacion', 'profesor',
    'tarea', 'trabajo', 'clase', 'universidad', 'estudiar', 'aprobar',
    'desaprobar', 'jalar', 'ciclo', 'curso', 'exposicion',
  ],
  familiar: [
    'familia', 'mama', 'papa', 'hermano', 'hermana', 'padres',
    'casa', 'pueblo', 'extranar', 'lejos', 'llamada', 'visita',
  ],
  social: [
    'amigos', 'companeros', 'relacion', 'pareja', 'novio', 'novia',
    'pelea', 'conflicto', 'solo', 'sola', 'grupo', 'fiesta',
  ],
  economico: [
    'dinero', 'plata', 'beca', 'trabajo', 'pagar', 'alquiler',
    'pension', 'comer', 'pasaje', 'deuda', 'economico',
  ],
  salud: [
    'dormir', 'sueno', 'comer', 'enfermo', 'dolor', 'cansado',
    'cansada', 'agotado', 'medico', 'hospital', 'pastilla',
  ],
  identidad: [
    'migrante', 'quechua', 'sierra', 'costumbre', 'discriminacion',
    'identidad', 'origen', 'diferente', 'encajar', 'pertenecer',
  ],
};

// ---------------------------------------------------------------------------
// Sentiment lexicon (Spanish, context-appropriate)
// ---------------------------------------------------------------------------

const POSITIVE_WORDS = new Set([
  'bien', 'mejor', 'feliz', 'contento', 'contenta', 'alegre', 'tranquilo',
  'tranquila', 'logre', 'avance', 'exito', 'bonito', 'bonita', 'genial',
  'increible', 'esperanza', 'motivado', 'motivada', 'orgulloso', 'orgullosa',
  'agradecido', 'agradecida', 'animado', 'animada', 'calma', 'paz',
  'confianza', 'apoyo', 'amor', 'carino', 'fuerza', 'valiente', 'seguro',
  'segura', 'progreso', 'celebrar', 'sonreir', 'risa', 'divertido',
]);

const NEGATIVE_WORDS = new Set([
  'mal', 'peor', 'triste', 'deprimido', 'deprimida', 'ansioso', 'ansiosa',
  'miedo', 'preocupado', 'preocupada', 'estres', 'agotado', 'agotada',
  'fracaso', 'error', 'culpa', 'verguenza', 'enojo', 'rabia', 'odio',
  'frustrado', 'frustrada', 'desesperado', 'desesperada', 'llorar',
  'dolor', 'soledad', 'vacio', 'oscuro', 'terrible', 'horrible',
  'nervioso', 'nerviosa', 'inseguro', 'insegura', 'perdido', 'perdida',
  'impotente', 'inutil', 'cansancio', 'angustia', 'dificil', 'problema',
]);

const INTENSIFIERS = new Set([
  'muy', 'demasiado', 'bastante', 'totalmente', 'completamente',
  'extremadamente', 'super', 'recontra', 'bien' /* as in "bien triste" */,
]);

const NEGATORS = new Set([
  'no', 'ni', 'nunca', 'jamas', 'tampoco', 'nada', 'sin',
]);

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')   // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenise(text: string): string[] {
  return normalise(text).split(' ').filter(Boolean);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect crisis risk level in a piece of text.
 *
 * Scans for keywords from `CRISIS_KEYWORDS` and returns the highest
 * severity level found along with the matched terms.
 */
export function detectarRiesgo(texto: string): RiesgoDetectado {
  const normalised = normalise(texto);
  const palabrasDetectadas: string[] = [];
  let nivelDetectado: RiesgoDetectado['nivel'] = 'ninguno';

  const levels: Array<{ key: keyof typeof CRISIS_KEYWORDS; nivel: RiesgoDetectado['nivel'] }> = [
    { key: 'critico', nivel: 'critico' },
    { key: 'alto', nivel: 'alto' },
    { key: 'medio', nivel: 'medio' },
    { key: 'bajo', nivel: 'bajo' },
  ];

  for (const { key, nivel } of levels) {
    for (const keyword of CRISIS_KEYWORDS[key]) {
      const normKeyword = normalise(keyword);
      if (normalised.includes(normKeyword)) {
        palabrasDetectadas.push(keyword);
        // Keep the highest severity found
        if (
          nivelDetectado === 'ninguno' ||
          severityOrder(nivel) > severityOrder(nivelDetectado)
        ) {
          nivelDetectado = nivel;
        }
      }
    }
  }

  return {
    esRiesgo: nivelDetectado !== 'ninguno',
    nivel: nivelDetectado,
    palabrasDetectadas,
    accionSugerida: getAccionSugerida(nivelDetectado),
  };
}

/**
 * Extract themes from an array of diary entry texts.
 *
 * Counts keyword matches across all texts and returns themes sorted
 * by frequency (descending).
 */
export function extraerTemas(textos: string[]): TemaExtraido[] {
  const conteo: Record<string, number> = {};

  for (const texto of textos) {
    const normalised = normalise(texto);

    for (const [tema, keywords] of Object.entries(TEMA_KEYWORDS)) {
      for (const kw of keywords) {
        if (normalised.includes(normalise(kw))) {
          conteo[tema] = (conteo[tema] ?? 0) + 1;
          break; // Count each theme at most once per text
        }
      }
    }
  }

  return Object.entries(conteo)
    .map(([tema, frecuencia]) => ({ tema, frecuencia }))
    .sort((a, b) => b.frecuencia - a.frecuencia);
}

/**
 * Calculate a basic sentiment score for a piece of text.
 *
 * Uses a bag-of-words approach with intensifiers and negators.
 * Returns a score between -1 (very negative) and +1 (very positive).
 */
export function calcularSentimiento(texto: string): ResultadoSentimiento {
  const tokens = tokenise(texto);

  if (tokens.length === 0) {
    return { puntaje: 0, etiqueta: 'neutro' };
  }

  let score = 0;
  let prevIsNegator = false;
  let prevIsIntensifier = false;

  for (const token of tokens) {
    if (NEGATORS.has(token)) {
      prevIsNegator = true;
      continue;
    }

    if (INTENSIFIERS.has(token)) {
      prevIsIntensifier = true;
      continue;
    }

    let wordScore = 0;

    if (POSITIVE_WORDS.has(token)) {
      wordScore = 1;
    } else if (NEGATIVE_WORDS.has(token)) {
      wordScore = -1;
    }

    // Apply modifiers
    if (wordScore !== 0) {
      if (prevIsIntensifier) {
        wordScore *= 1.5;
      }
      if (prevIsNegator) {
        wordScore *= -0.75; // Negation flips but dampens slightly
      }
    }

    score += wordScore;
    prevIsNegator = false;
    prevIsIntensifier = false;
  }

  // Normalise to [-1, 1] range
  const maxPossible = tokens.length * 1.5; // theoretical max
  const normalised = Math.max(-1, Math.min(1, score / Math.max(maxPossible, 1)));

  // Round to 2 decimal places
  const puntaje = Math.round(normalised * 100) / 100;

  return {
    puntaje,
    etiqueta: getEtiqueta(puntaje),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function severityOrder(nivel: RiesgoDetectado['nivel']): number {
  const order: Record<RiesgoDetectado['nivel'], number> = {
    ninguno: 0,
    bajo: 1,
    medio: 2,
    alto: 3,
    critico: 4,
  };
  return order[nivel];
}

function getAccionSugerida(nivel: RiesgoDetectado['nivel']): string {
  switch (nivel) {
    case 'critico':
      return 'ACTIVAR ESCALON DE AYUDA INMEDIATAMENTE. Conectar con linea de crisis o profesional de salud mental.';
    case 'alto':
      return 'Sugerir activar el Escalon de Ayuda. Ofrecer contacto con psicologo de bienestar universitario.';
    case 'medio':
      return 'Monitorear de cerca. Ofrecer tecnicas de regulacion emocional y sugerir consulta con psicologo.';
    case 'bajo':
      return 'Ofrecer apoyo emocional y tecnicas de afrontamiento. Hacer seguimiento en proximas interacciones.';
    case 'ninguno':
    default:
      return 'Continuar interaccion normal con apoyo empatico.';
  }
}

function getEtiqueta(puntaje: number): ResultadoSentimiento['etiqueta'] {
  if (puntaje <= -0.5) return 'muy_negativo';
  if (puntaje <= -0.15) return 'negativo';
  if (puntaje <= 0.15) return 'neutro';
  if (puntaje <= 0.5) return 'positivo';
  return 'muy_positivo';
}
