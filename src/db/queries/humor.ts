import { getDatabase, getFechaHoy, getHoraActual, getFechaHaceDias } from '../database';

// ── Types ─────────────────────────────────────────────────────────────

export interface RegistroHumor {
  id: number;
  fecha: string;
  hora: string;
  nivel: number;
  contexto: string | null;
  nota: string | null;
}

export interface PromedioSemanal {
  fecha: string;
  promedio: number;
  registros: number;
}

// ── Queries ───────────────────────────────────────────────────────────

/**
 * Inserts a new mood record.
 * @param nivel - Mood level (e.g. 1-10)
 * @param contexto - Optional context (e.g. "en clase", "solo en casa")
 * @param nota - Optional free-text note
 * @returns The inserted row ID
 */
export async function insertHumor(
  nivel: number,
  contexto?: string,
  nota?: string
): Promise<number> {
  const db = await getDatabase();
  const fecha = getFechaHoy();
  const hora = getHoraActual();

  const result = await db.runAsync(
    `INSERT INTO registros_humor (fecha, hora, nivel, contexto, nota)
     VALUES (?, ?, ?, ?, ?)`,
    fecha,
    hora,
    nivel,
    contexto ?? null,
    nota ?? null
  );

  return result.lastInsertRowId;
}

/**
 * Returns all mood records for today, ordered by most recent first.
 */
export async function getHumorHoy(): Promise<RegistroHumor[]> {
  const db = await getDatabase();
  const fecha = getFechaHoy();

  return db.getAllAsync<RegistroHumor>(
    `SELECT id, fecha, hora, nivel, contexto, nota
     FROM registros_humor
     WHERE fecha = ?
     ORDER BY hora DESC`,
    fecha
  );
}

/**
 * Returns all mood records from the last N days, ordered by date and time descending.
 * @param dias - Number of days to look back (e.g. 7 for last week)
 */
export async function getHumoresUltimosDias(dias: number): Promise<RegistroHumor[]> {
  const db = await getDatabase();
  const fechaDesde = getFechaHaceDias(dias);

  return db.getAllAsync<RegistroHumor>(
    `SELECT id, fecha, hora, nivel, contexto, nota
     FROM registros_humor
     WHERE fecha >= ?
     ORDER BY fecha DESC, hora DESC`,
    fechaDesde
  );
}

/**
 * Returns the daily average mood for each of the last 7 days.
 * Useful for rendering a weekly mood chart.
 */
export async function getPromedioSemanal(): Promise<PromedioSemanal[]> {
  const db = await getDatabase();
  const fechaDesde = getFechaHaceDias(7);

  return db.getAllAsync<PromedioSemanal>(
    `SELECT
       fecha,
       ROUND(AVG(nivel), 1) AS promedio,
       COUNT(*) AS registros
     FROM registros_humor
     WHERE fecha >= ?
     GROUP BY fecha
     ORDER BY fecha ASC`,
    fechaDesde
  );
}

/**
 * Returns a single mood record by ID, or null if not found.
 */
export async function getHumor(id: number): Promise<RegistroHumor | null> {
  const db = await getDatabase();

  return db.getFirstAsync<RegistroHumor>(
    `SELECT id, fecha, hora, nivel, contexto, nota
     FROM registros_humor
     WHERE id = ?`,
    id
  );
}

/**
 * Deletes a mood record by ID.
 * @returns true if a row was deleted, false otherwise
 */
export async function deleteHumor(id: number): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.runAsync(
    'DELETE FROM registros_humor WHERE id = ?',
    id
  );

  return result.changes > 0;
}
