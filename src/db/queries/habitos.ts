import { getDatabase, getFechaHoy } from '../database';

// ── Types ─────────────────────────────────────────────────────────────

export interface Habito {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  frecuencia: string;
  activo: number;
}

export interface RegistroHabito {
  id: number;
  habito_id: number;
  fecha: string;
  completado: number;
  nota: string | null;
}

export interface HabitoConEstado extends Habito {
  completado_hoy: boolean;
}

export interface InsertHabitoData {
  nombre: string;
  descripcion?: string;
  categoria?: string;
  frecuencia?: string;
}

export interface RachaInfo {
  dias_consecutivos: number;
  ultima_fecha: string | null;
}

// ── Queries ───────────────────────────────────────────────────────────

/**
 * Returns all habits (active and inactive).
 */
export async function getHabitos(): Promise<Habito[]> {
  const db = await getDatabase();

  return db.getAllAsync<Habito>(
    `SELECT id, nombre, descripcion, categoria, frecuencia, activo
     FROM habitos
     ORDER BY categoria ASC, nombre ASC`
  );
}

/**
 * Returns only active habits, enriched with today's completion status.
 */
export async function getHabitosActivos(): Promise<HabitoConEstado[]> {
  const db = await getDatabase();
  const fecha = getFechaHoy();

  const rows = await db.getAllAsync<Habito & { completado_hoy: number }>(
    `SELECT
       h.id, h.nombre, h.descripcion, h.categoria, h.frecuencia, h.activo,
       COALESCE(rh.completado, 0) AS completado_hoy
     FROM habitos h
     LEFT JOIN registros_habitos rh
       ON rh.habito_id = h.id AND rh.fecha = ?
     WHERE h.activo = 1
     ORDER BY h.categoria ASC, h.nombre ASC`,
    fecha
  );

  return rows.map((row) => ({
    ...row,
    completado_hoy: row.completado_hoy === 1,
  }));
}

/**
 * Creates a new habit.
 * @returns The inserted row ID
 */
export async function insertHabito(data: InsertHabitoData): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO habitos (nombre, descripcion, categoria, frecuencia)
     VALUES (?, ?, ?, ?)`,
    data.nombre,
    data.descripcion ?? null,
    data.categoria ?? null,
    data.frecuencia ?? 'diario'
  );

  return result.lastInsertRowId;
}

/**
 * Toggles a habit's completion status for today.
 * - If no record exists for today, creates one with completado = 1.
 * - If a record exists, flips the completado flag.
 * @returns The new completado state (true = completed, false = not completed)
 */
export async function toggleHabitoHoy(habitoId: number): Promise<boolean> {
  const db = await getDatabase();
  const fecha = getFechaHoy();

  const existing = await db.getFirstAsync<RegistroHabito>(
    `SELECT id, completado
     FROM registros_habitos
     WHERE habito_id = ? AND fecha = ?`,
    habitoId,
    fecha
  );

  if (existing) {
    const nuevoEstado = existing.completado === 1 ? 0 : 1;
    await db.runAsync(
      'UPDATE registros_habitos SET completado = ? WHERE id = ?',
      nuevoEstado,
      existing.id
    );
    return nuevoEstado === 1;
  }

  await db.runAsync(
    `INSERT INTO registros_habitos (habito_id, fecha, completado)
     VALUES (?, ?, 1)`,
    habitoId,
    fecha
  );

  return true;
}

/**
 * Returns all habit records for today (one per habit that has a record).
 */
export async function getRegistrosHoy(): Promise<RegistroHabito[]> {
  const db = await getDatabase();
  const fecha = getFechaHoy();

  return db.getAllAsync<RegistroHabito>(
    `SELECT id, habito_id, fecha, completado, nota
     FROM registros_habitos
     WHERE fecha = ?`,
    fecha
  );
}

/**
 * Calculates the current streak (consecutive days completed) for a habit.
 * Counts backwards from yesterday (today may not be complete yet).
 * @param habitoId - The habit ID
 * @returns Streak information with consecutive days and last recorded date
 */
export async function getRacha(habitoId: number): Promise<RachaInfo> {
  const db = await getDatabase();

  // Fetch the last 365 days of completed records, ordered newest-first
  const registros = await db.getAllAsync<{ fecha: string }>(
    `SELECT DISTINCT fecha
     FROM registros_habitos
     WHERE habito_id = ? AND completado = 1
     ORDER BY fecha DESC
     LIMIT 365`,
    habitoId
  );

  if (registros.length === 0) {
    return { dias_consecutivos: 0, ultima_fecha: null };
  }

  // Check if today is completed; if so, start counting from today
  const hoy = getFechaHoy();
  let diasConsecutivos = 0;
  let fechaEsperada: Date;

  if (registros[0].fecha === hoy) {
    fechaEsperada = new Date(hoy);
    diasConsecutivos = 0; // will be incremented in the loop
  } else {
    // Start from yesterday
    fechaEsperada = new Date(hoy);
    fechaEsperada.setDate(fechaEsperada.getDate() - 1);

    if (registros[0].fecha !== toISODate(fechaEsperada)) {
      // No record yesterday either, streak is broken
      return { dias_consecutivos: 0, ultima_fecha: registros[0].fecha };
    }
  }

  for (const registro of registros) {
    if (registro.fecha === toISODate(fechaEsperada)) {
      diasConsecutivos++;
      fechaEsperada.setDate(fechaEsperada.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    dias_consecutivos: diasConsecutivos,
    ultima_fecha: registros[0].fecha,
  };
}

/**
 * Returns the total number of habits completed across all time.
 */
export async function getTotalCompletados(): Promise<number> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total
     FROM registros_habitos
     WHERE completado = 1`
  );

  return row?.total ?? 0;
}

/**
 * Deactivates a habit (soft delete). The habit remains in the DB but
 * won't show up in getHabitosActivos().
 */
export async function desactivarHabito(habitoId: number): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.runAsync(
    'UPDATE habitos SET activo = 0 WHERE id = ?',
    habitoId
  );

  return result.changes > 0;
}

/**
 * Reactivates a previously deactivated habit.
 */
export async function activarHabito(habitoId: number): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.runAsync(
    'UPDATE habitos SET activo = 1 WHERE id = ?',
    habitoId
  );

  return result.changes > 0;
}

// ── Helpers ───────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}
