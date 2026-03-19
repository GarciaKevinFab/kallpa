import { getDatabase, getFechaHoy, getHoraActual, getFechaHaceDias } from '../database';

// ── Types ─────────────────────────────────────────────────────────────

export interface EpisodioCrisis {
  id: number;
  fecha: string;
  hora: string;
  tecnica_usada: string | null;
  duracion_minutos: number | null;
  nivel_antes: number | null;
  nivel_despues: number | null;
  escalon_activado: number;
}

export interface InsertEpisodioData {
  tecnica_usada?: string;
  duracion_minutos?: number;
  nivel_antes?: number;
  nivel_despues?: number;
  escalon_activado?: boolean;
}

export interface ResumenCrisis {
  total_episodios: number;
  duracion_promedio: number | null;
  reduccion_promedio: number | null;
}

// ── Queries ───────────────────────────────────────────────────────────

/**
 * Inserts a new crisis episode record.
 * Date and time are captured automatically at the moment of insertion.
 * @param data - Episode details
 * @returns The inserted row ID
 */
export async function insertEpisodio(data: InsertEpisodioData): Promise<number> {
  const db = await getDatabase();
  const fecha = getFechaHoy();
  const hora = getHoraActual();

  const result = await db.runAsync(
    `INSERT INTO episodios_crisis
       (fecha, hora, tecnica_usada, duracion_minutos,
        nivel_antes, nivel_despues, escalon_activado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    fecha,
    hora,
    data.tecnica_usada ?? null,
    data.duracion_minutos ?? null,
    data.nivel_antes ?? null,
    data.nivel_despues ?? null,
    data.escalon_activado ? 1 : 0
  );

  return result.lastInsertRowId;
}

/**
 * Returns crisis episodes, optionally limited.
 * Ordered by most recent first.
 * @param limit - Maximum number of episodes to return (default: 50)
 */
export async function getEpisodios(limit: number = 50): Promise<EpisodioCrisis[]> {
  const db = await getDatabase();

  return db.getAllAsync<EpisodioCrisis>(
    `SELECT id, fecha, hora, tecnica_usada, duracion_minutos,
            nivel_antes, nivel_despues, escalon_activado
     FROM episodios_crisis
     ORDER BY fecha DESC, hora DESC
     LIMIT ?`,
    limit
  );
}

/**
 * Returns all crisis episodes from the last N days.
 * @param dias - Number of days to look back
 */
export async function getEpisodiosUltimosDias(dias: number): Promise<EpisodioCrisis[]> {
  const db = await getDatabase();
  const fechaDesde = getFechaHaceDias(dias);

  return db.getAllAsync<EpisodioCrisis>(
    `SELECT id, fecha, hora, tecnica_usada, duracion_minutos,
            nivel_antes, nivel_despues, escalon_activado
     FROM episodios_crisis
     WHERE fecha >= ?
     ORDER BY fecha DESC, hora DESC`,
    fechaDesde
  );
}

/**
 * Returns a single crisis episode by ID, or null if not found.
 */
export async function getEpisodio(id: number): Promise<EpisodioCrisis | null> {
  const db = await getDatabase();

  return db.getFirstAsync<EpisodioCrisis>(
    `SELECT id, fecha, hora, tecnica_usada, duracion_minutos,
            nivel_antes, nivel_despues, escalon_activado
     FROM episodios_crisis
     WHERE id = ?`,
    id
  );
}

/**
 * Deletes a crisis episode by ID.
 * @returns true if a row was deleted, false otherwise
 */
export async function deleteEpisodio(id: number): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.runAsync(
    'DELETE FROM episodios_crisis WHERE id = ?',
    id
  );

  return result.changes > 0;
}

/**
 * Returns a summary of crisis episodes over the last N days:
 * total count, average duration, and average distress reduction.
 */
export async function getResumenCrisis(dias: number): Promise<ResumenCrisis> {
  const db = await getDatabase();
  const fechaDesde = getFechaHaceDias(dias);

  const row = await db.getFirstAsync<{
    total_episodios: number;
    duracion_promedio: number | null;
    reduccion_promedio: number | null;
  }>(
    `SELECT
       COUNT(*) AS total_episodios,
       ROUND(AVG(duracion_minutos), 1) AS duracion_promedio,
       ROUND(AVG(nivel_antes - nivel_despues), 1) AS reduccion_promedio
     FROM episodios_crisis
     WHERE fecha >= ?`,
    fechaDesde
  );

  return {
    total_episodios: row?.total_episodios ?? 0,
    duracion_promedio: row?.duracion_promedio ?? null,
    reduccion_promedio: row?.reduccion_promedio ?? null,
  };
}
