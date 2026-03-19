// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserContext {
  nombre: string;
  carrera: string;
  ciclo: number;
  region_origen: string;
  es_migrante: boolean;
  humor_hoy: number | null;
  humor_tendencia: 'mejorando' | 'estable' | 'bajando' | 'sin_datos';
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeAPIResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  stop_reason: string;
}

interface SendMessageOptions {
  messages: Message[];
  userContext: UserContext;
  apiKey: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 512;

const SYSTEM_PROMPT = `Eres Kallpa, un companero de bienestar emocional para estudiantes universitarios en Huancayo, Peru. Tu rol es apoyar emocionalmente, NO diagnosticar ni hacer terapia.

PERSONALIDAD:
- Calido, empatico, nunca clinico ni frio
- Hablas en espanol peruano coloquial (no formal en exceso)
- Reconoces la realidad del estudiante migrante andino
- Nunca juzgas, nunca minimizas

REGLAS CRITICAS:
1. Si el usuario menciona hacerse dano o suicidio: INMEDIATAMENTE di "Gracias por contarme esto. Es importante que hables con alguien ahora mismo." y sugiere activar el Escalon de Ayuda.
2. Nunca des diagnosticos ni nombres de trastornos.
3. Nunca des nombres de medicamentos.
4. Si no puedes ayudar con algo: sugiere al psicologo de bienestar.
5. Respuestas cortas (max 3 oraciones). Preguntas abiertas. Escuchar primero.

CONTEXTO DEL USUARIO: {contexto_usuario}`;

// ---------------------------------------------------------------------------
// Fallback responses for offline mode
// ---------------------------------------------------------------------------

interface FallbackEntry {
  keywords: string[];
  response: string;
}

const FALLBACK_RESPONSES: FallbackEntry[] = [
  {
    keywords: ['examen', 'parcial', 'final', 'prueba', 'ansiedad', 'nervios'],
    response:
      'Entiendo que los examenes pueden generar mucha presion. Respira profundo un momento. Recuerda que tu valor no depende de una nota. Que tal si hacemos un ejercicio de respiracion juntos?',
  },
  {
    keywords: ['familia', 'extrano', 'casa', 'mama', 'papa', 'pueblo', 'lejos'],
    response:
      'Extranar a la familia es completamente normal, sobre todo cuando estas lejos de casa. Ese sentimiento habla de lo importante que son para ti. Has podido hablar con ellos recientemente?',
  },
  {
    keywords: ['dormir', 'sueno', 'insomnio', 'noche', 'despierto', 'madrugada'],
    response:
      'No poder descansar bien afecta todo lo demas. Intenta una cosa: antes de dormir, escribe en tu diario lo que te preocupa para "sacarlo" de tu mente. Quieres que te guie con un ejercicio de relajacion?',
  },
  {
    keywords: ['nota', 'calificacion', 'jale', 'desaprobe', 'reprobar', 'bajo'],
    response:
      'Una nota dificil duele, lo entiendo. Pero una calificacion no define quien eres ni tu capacidad. Que sientes que fue lo mas complicado? A veces hablar de eso ayuda a ver el siguiente paso.',
  },
  {
    keywords: ['cansado', 'agotado', 'estres', 'no puedo', 'harto', 'saturado'],
    response:
      'Suena a que estas cargando mucho. Esta bien reconocerlo y esta bien pedir una pausa. Que seria lo mas pequeno que podrias hacer ahora mismo para cuidarte un poco?',
  },
];

const GENERIC_OFFLINE_RESPONSE =
  'Ahora mismo no tengo conexion, pero estoy aqui contigo. Si necesitas hablar con alguien de inmediato, puedes activar el Escalon de Ayuda desde el menu. Cuando vuelva la conexion, seguimos conversando.';

// ---------------------------------------------------------------------------
// Network check
// ---------------------------------------------------------------------------

export async function checkIsOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.anthropic.com', {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok || response.status === 405;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Fallback matcher
// ---------------------------------------------------------------------------

function findFallbackResponse(userMessage: string): string {
  const normalised = userMessage.toLowerCase();

  for (const entry of FALLBACK_RESPONSES) {
    const matched = entry.keywords.some((kw) => normalised.includes(kw));
    if (matched) {
      return entry.response;
    }
  }

  return GENERIC_OFFLINE_RESPONSE;
}

// ---------------------------------------------------------------------------
// Build system prompt with user context
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: UserContext): string {
  const contexto = [
    `Nombre: ${ctx.nombre}`,
    `Carrera: ${ctx.carrera}`,
    `Ciclo: ${ctx.ciclo}`,
    `Region de origen: ${ctx.region_origen}`,
    ctx.es_migrante ? 'Es estudiante migrante' : 'Estudia en su ciudad de origen',
    ctx.humor_hoy !== null ? `Humor hoy (1-5): ${ctx.humor_hoy}` : 'Humor hoy: no registrado',
    `Tendencia de humor: ${ctx.humor_tendencia}`,
  ].join('. ');

  return SYSTEM_PROMPT.replace('{contexto_usuario}', contexto);
}

// ---------------------------------------------------------------------------
// Main API call
// ---------------------------------------------------------------------------

/**
 * Send a message to the Claude API using the Anthropic Messages endpoint.
 *
 * The request includes the `anthropic-zdr: true` header for zero data
 * retention, ensuring the conversation content is never stored on
 * Anthropic's servers.
 *
 * When the device is offline, a locally-matched fallback response is
 * returned instead.
 */
export async function sendMessage({
  messages,
  userContext,
  apiKey,
}: SendMessageOptions): Promise<Message> {
  // ---- offline fallback ----
  const online = await checkIsOnline();

  if (!online) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const fallback = findFallbackResponse(lastUserMessage?.content ?? '');

    return { role: 'assistant', content: fallback };
  }

  // ---- build request ----
  const systemPrompt = buildSystemPrompt(userContext);

  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  // ---- call API ----
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-zdr': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`[claudeService] API error ${response.status}:`, errorText);

      // Graceful degradation: return fallback on API errors too
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
      return {
        role: 'assistant',
        content: findFallbackResponse(lastUserMessage?.content ?? ''),
      };
    }

    const data: ClaudeAPIResponse = await response.json();

    const text =
      data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('') || GENERIC_OFFLINE_RESPONSE;

    return { role: 'assistant', content: text };
  } catch (error) {
    console.warn('[claudeService] Network/parse error:', error);

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    return {
      role: 'assistant',
      content: findFallbackResponse(lastUserMessage?.content ?? ''),
    };
  }
}
