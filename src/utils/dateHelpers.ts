import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Core formatters
// ---------------------------------------------------------------------------

/** Format a date as DD/MM/YYYY. */
export const formatFecha = (date: Date = new Date()): string =>
  format(date, 'dd/MM/yyyy');

/** Format a date's time as HH:MM (24-hour). */
export const formatHora = (date: Date = new Date()): string =>
  format(date, 'HH:mm');

/** Return ISO date string YYYY-MM-DD. */
export const getISODate = (date: Date = new Date()): string =>
  format(date, 'yyyy-MM-dd');

// ---------------------------------------------------------------------------
// Contextual helpers
// ---------------------------------------------------------------------------

export type Contexto = 'mañana' | 'tarde' | 'noche';

/**
 * Return a time-of-day context based on the current hour.
 *   05-11 => mañana
 *   12-18 => tarde
 *   19-04 => noche
 */
export const getContexto = (date: Date = new Date()): Contexto => {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'mañana';
  if (h >= 12 && h < 19) return 'tarde';
  return 'noche';
};

/**
 * Contextual greeting in Spanish.
 */
export const getSaludoDia = (date: Date = new Date()): string => {
  const contexto = getContexto(date);
  switch (contexto) {
    case 'mañana':
      return 'Buenos dias';
    case 'tarde':
      return 'Buenas tardes';
    case 'noche':
      return 'Buenas noches';
  }
};

/**
 * Return the current day-of-week name in Spanish (capitalised).
 * e.g. "Lunes", "Martes", etc.
 */
export const getDiaSemana = (date: Date = new Date()): string => {
  const dayName = format(date, 'EEEE', { locale: es });
  return dayName.charAt(0).toUpperCase() + dayName.slice(1);
};

// ---------------------------------------------------------------------------
// Relative date helpers
// ---------------------------------------------------------------------------

/**
 * Return a Date that is `dias` days before today (or before the provided base date).
 */
export const getDaysAgo = (dias: number, base: Date = new Date()): Date =>
  subDays(base, dias);
