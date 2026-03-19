// ---------------------------------------------------------------------------
// Escalon de Ayuda - n8n Webhook integration
// ---------------------------------------------------------------------------
// Connects to the university's n8n instance to handle psychological
// appointment scheduling through the Bienestar department.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DatosCita {
  /** Student name. */
  nombre_estudiante: string;
  /** Student institutional email. */
  correo: string;
  /** Student career / programme. */
  carrera: string;
  /** Preferred appointment date (ISO 8601 date string). */
  fecha_preferida: string;
  /** Preferred time slot, e.g. "09:00". */
  hora_preferida: string;
  /** Appointment modality: in-person or virtual. */
  modalidad: 'presencial' | 'virtual';
  /** Urgency level: routine, urgent, or crisis. */
  urgencia: 'rutina' | 'urgente' | 'crisis';
  /** Optional notes for the psychologist (never includes diary text). */
  nota?: string;
}

export interface RespuestaCita {
  success: boolean;
  cita_id?: string;
  mensaje: string;
  fecha_confirmada?: string;
  hora_confirmada?: string;
}

export interface SlotDisponible {
  fecha: string;
  hora: string;
  psicologo: string;
  modalidad: 'presencial' | 'virtual';
}

export interface RespuestaDisponibilidad {
  success: boolean;
  slots: SlotDisponible[];
  mensaje: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Base URL for the n8n webhook endpoints.
 *
 * In production this should come from an environment variable or
 * a remote config service. For development / local n8n, the
 * default points to a typical self-hosted n8n instance.
 */
const N8N_WEBHOOK_BASE =
  process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL ?? 'https://n8n.kallpa.edu.pe/webhook';

const ENDPOINTS = {
  agendarCita: `${N8N_WEBHOOK_BASE}/agendar-cita`,
  disponibilidad: `${N8N_WEBHOOK_BASE}/disponibilidad`,
} as const;

/** Request timeout in milliseconds. */
const TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wraps `fetch` with an AbortController timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Schedule an appointment with the university psychologist via n8n webhook.
 *
 * @returns A response object. On network/server failure, `success` will be
 *          `false` with a user-friendly Spanish message.
 */
export async function agendarCita(data: DatosCita): Promise<RespuestaCita> {
  try {
    const response = await fetchWithTimeout(ENDPOINTS.agendarCita, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn(
        `[escalon] agendarCita failed (${response.status}):`,
        errorBody,
      );

      return {
        success: false,
        mensaje:
          'No se pudo agendar la cita en este momento. Por favor intenta nuevamente o contacta directamente a Bienestar Universitario.',
      };
    }

    const json: RespuestaCita = await response.json();
    return json;
  } catch (error) {
    console.warn('[escalon] agendarCita error:', error);

    const isAbort = error instanceof DOMException && error.name === 'AbortError';

    return {
      success: false,
      mensaje: isAbort
        ? 'La solicitud tardo demasiado. Verifica tu conexion e intenta nuevamente.'
        : 'Error de conexion. Verifica que tengas acceso a internet e intenta nuevamente.',
    };
  }
}

/**
 * Fetch available appointment slots for a given date.
 *
 * @param fecha - ISO 8601 date string (e.g. "2026-03-20").
 * @returns Available slots or an empty list with a user-friendly message.
 */
export async function getDisponibilidad(
  fecha: string,
): Promise<RespuestaDisponibilidad> {
  try {
    const url = `${ENDPOINTS.disponibilidad}?fecha=${encodeURIComponent(fecha)}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn(
        `[escalon] getDisponibilidad failed (${response.status}):`,
        errorBody,
      );

      return {
        success: false,
        slots: [],
        mensaje:
          'No se pudo consultar la disponibilidad. Por favor intenta nuevamente.',
      };
    }

    const json: RespuestaDisponibilidad = await response.json();
    return json;
  } catch (error) {
    console.warn('[escalon] getDisponibilidad error:', error);

    const isAbort = error instanceof DOMException && error.name === 'AbortError';

    return {
      success: false,
      slots: [],
      mensaje: isAbort
        ? 'La consulta tardo demasiado. Verifica tu conexion e intenta nuevamente.'
        : 'Error de conexion. Verifica que tengas acceso a internet e intenta nuevamente.',
    };
  }
}
