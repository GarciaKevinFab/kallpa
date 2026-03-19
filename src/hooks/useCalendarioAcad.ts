import { useState, useEffect, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PeriodoAcademico {
  /** Human-readable period name, e.g. "Parciales 2026-I". */
  nombre: string;
  /** Inclusive start date (ISO YYYY-MM-DD). */
  inicio: string;
  /** Inclusive end date (ISO YYYY-MM-DD). */
  fin: string;
  /** Period category. */
  tipo: 'parciales' | 'finales' | 'vacaciones' | 'clases';
}

interface UseCalendarioAcadReturn {
  /** `true` if today falls within an exam period (parciales or finales). */
  esSemanaExamenes: boolean;

  /**
   * Contextual message for the Home screen.
   * Changes depending on the current academic period.
   * `null` during regular class weeks with no special message.
   */
  mensajeContextual: string | null;

  /**
   * The current academic period, or `null` if today does not match
   * any configured period.
   */
  periodoActual: PeriodoAcademico | null;
}

// ---------------------------------------------------------------------------
// Academic calendar configuration — Universidad Continental
// ---------------------------------------------------------------------------
// These dates are hardcoded for the current academic year.
// Update them each semester or feed them from a remote config endpoint.
// ---------------------------------------------------------------------------

const PERIODOS_ACADEMICOS: PeriodoAcademico[] = [
  // ── 2026-I ──────────────────────────────────────────────────────────
  {
    nombre: 'Inicio de clases 2026-I',
    inicio: '2026-03-16',
    fin: '2026-03-22',
    tipo: 'clases',
  },
  {
    nombre: 'Parciales 2026-I',
    inicio: '2026-05-04',
    fin: '2026-05-10',
    tipo: 'parciales',
  },
  {
    nombre: 'Finales 2026-I',
    inicio: '2026-07-06',
    fin: '2026-07-12',
    tipo: 'finales',
  },
  {
    nombre: 'Vacaciones inter-ciclo 2026',
    inicio: '2026-07-20',
    fin: '2026-08-09',
    tipo: 'vacaciones',
  },

  // ── 2026-II ─────────────────────────────────────────────────────────
  {
    nombre: 'Inicio de clases 2026-II',
    inicio: '2026-08-10',
    fin: '2026-08-16',
    tipo: 'clases',
  },
  {
    nombre: 'Parciales 2026-II',
    inicio: '2026-10-05',
    fin: '2026-10-11',
    tipo: 'parciales',
  },
  {
    nombre: 'Finales 2026-II',
    inicio: '2026-12-07',
    fin: '2026-12-13',
    tipo: 'finales',
  },
  {
    nombre: 'Vacaciones fin de año',
    inicio: '2026-12-21',
    fin: '2027-01-04',
    tipo: 'vacaciones',
  },
];

// ---------------------------------------------------------------------------
// Contextual messages
// ---------------------------------------------------------------------------

const MENSAJES: Record<PeriodoAcademico['tipo'], string> = {
  parciales: 'Semana intensa. Estamos contigo.',
  finales: 'Recta final. Recuerda que no estás solo/a en esto.',
  vacaciones: '¡Tiempo de descansar! Aprovecha para recargar energías.',
  clases: '¡Nuevo inicio! Recuerda ir a tu ritmo.',
};

/**
 * Message shown a few days *before* an exam period starts, as a heads-up.
 * Set to `null` to disable the pre-exam notice.
 */
const PRE_EXAM_DAYS = 3;
const MENSAJE_PRE_EXAMENES =
  'Se acercan los exámenes. ¿Ya tienes tu plan de estudio? Estamos aquí si necesitas apoyo.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns an ISO YYYY-MM-DD string for a given Date, using local time.
 */
function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Checks whether `fecha` (YYYY-MM-DD) falls within [inicio, fin] inclusive.
 */
function isDateInRange(fecha: string, inicio: string, fin: string): boolean {
  return fecha >= inicio && fecha <= fin;
}

/**
 * Checks whether `fecha` is within `days` calendar days before `targetDate`.
 */
function isDaysBefore(fecha: string, targetDate: string, days: number): boolean {
  const target = new Date(targetDate + 'T00:00:00');
  const check = new Date(fecha + 'T00:00:00');
  const diff = (target.getTime() - check.getTime()) / (1000 * 60 * 60 * 24);
  return diff > 0 && diff <= days;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Academic calendar integration hook for Universidad Continental.
 *
 * Determines the current academic period based on hardcoded (but configurable)
 * date ranges and returns contextual information for the Home screen:
 *
 * - Whether it is exam week (parciales or finales).
 * - A short motivational/contextual message.
 * - The active period metadata.
 *
 * Also provides a pre-exam heads-up a few days before exams start.
 */
export function useCalendarioAcad(): UseCalendarioAcadReturn {
  const [hoy, setHoy] = useState(() => toLocalISO(new Date()));

  // Re-check the date once per hour in case the app stays open past midnight.
  useEffect(() => {
    const interval = setInterval(() => {
      const nuevaFecha = toLocalISO(new Date());
      setHoy((prev) => (prev !== nuevaFecha ? nuevaFecha : prev));
    }, 3_600_000); // 1 hour

    return () => clearInterval(interval);
  }, []);

  // ---- Compute derived values --------------------------------------------
  const result = useMemo((): UseCalendarioAcadReturn => {
    // Find the period that matches today.
    const periodoActual =
      PERIODOS_ACADEMICOS.find((p) => isDateInRange(hoy, p.inicio, p.fin)) ??
      null;

    if (periodoActual) {
      const esSemanaExamenes =
        periodoActual.tipo === 'parciales' || periodoActual.tipo === 'finales';

      return {
        esSemanaExamenes,
        mensajeContextual: MENSAJES[periodoActual.tipo],
        periodoActual,
      };
    }

    // No active period — check if exams are approaching.
    const proximoExamen = PERIODOS_ACADEMICOS.find(
      (p) =>
        (p.tipo === 'parciales' || p.tipo === 'finales') &&
        isDaysBefore(hoy, p.inicio, PRE_EXAM_DAYS),
    );

    if (proximoExamen) {
      return {
        esSemanaExamenes: false,
        mensajeContextual: MENSAJE_PRE_EXAMENES,
        periodoActual: null,
      };
    }

    // Regular academic day — no special context.
    return {
      esSemanaExamenes: false,
      mensajeContextual: null,
      periodoActual: null,
    };
  }, [hoy]);

  return result;
}
