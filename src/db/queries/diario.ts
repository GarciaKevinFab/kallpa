import { getDatabase, getFechaHoy, getHoraActual, getFechaHaceDias } from '../database';

// ── Types ─────────────────────────────────────────────────────────────

export interface EntradaDiario {
  id: number;
  fecha: string;
  hora: string;
  evento_disparador: string | null;
  pensamiento_original: string | null;
  distorsion_identificada: string | null;
  reformulacion: string | null;
  nivel_angustia_antes: number | null;
  nivel_angustia_despues: number | null;
  completado: number;
}

export interface InsertEntradaData {
  evento_disparador?: string;
  pensamiento_original?: string;
  distorsion_identificada?: string;
  reformulacion?: string;
  nivel_angustia_antes?: number;
  nivel_angustia_despues?: number;
  completado?: boolean;
}

export interface UpdateEntradaData {
  evento_disparador?: string;
  pensamiento_original?: string;
  distorsion_identificada?: string;
  reformulacion?: string;
  nivel_angustia_antes?: number;
  nivel_angustia_despues?: number;
  completado?: boolean;
}

// ── Queries ───────────────────────────────────────────────────────────

/**
 * Inserts a new journal entry (cognitive restructuring diary).
 * @param data - Partial entry data. Date and time are set automatically.
 * @returns The inserted row ID
 */
export async function insertEntrada(data: InsertEntradaData): Promise<number> {
  const db = await getDatabase();
  const fecha = getFechaHoy();
  const hora = getHoraActual();

  const result = await db.runAsync(
    `INSERT INTO entradas_diario
       (fecha, hora, evento_disparador, pensamiento_original,
        distorsion_identificada, reformulacion,
        nivel_angustia_antes, nivel_angustia_despues, completado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    fecha,
    hora,
    data.evento_disparador ?? null,
    data.pensamiento_original ?? null,
    data.distorsion_identificada ?? null,
    data.reformulacion ?? null,
    data.nivel_angustia_antes ?? null,
    data.nivel_angustia_despues ?? null,
    data.completado ? 1 : 0
  );

  return result.lastInsertRowId;
}

/**
 * Returns journal entries, optionally limited.
 * Ordered by most recent first.
 * @param limit - Maximum number of entries to return (default: 50)
 */
export async function getEntradas(limit: number = 50): Promise<EntradaDiario[]> {
  const db = await getDatabase();

  return db.getAllAsync<EntradaDiario>(
    `SELECT id, fecha, hora, evento_disparador, pensamiento_original,
            distorsion_identificada, reformulacion,
            nivel_angustia_antes, nivel_angustia_despues, completado
     FROM entradas_diario
     ORDER BY fecha DESC, hora DESC
     LIMIT ?`,
    limit
  );
}

/**
 * Returns a single journal entry by ID, or null if not found.
 */
export async function getEntrada(id: number): Promise<EntradaDiario | null> {
  const db = await getDatabase();

  return db.getFirstAsync<EntradaDiario>(
    `SELECT id, fecha, hora, evento_disparador, pensamiento_original,
            distorsion_identificada, reformulacion,
            nivel_angustia_antes, nivel_angustia_despues, completado
     FROM entradas_diario
     WHERE id = ?`,
    id
  );
}

/**
 * Returns all journal entries from the last N days.
 * @param dias - Number of days to look back
 */
export async function getEntradasUltimosDias(dias: number): Promise<EntradaDiario[]> {
  const db = await getDatabase();
  const fechaDesde = getFechaHaceDias(dias);

  return db.getAllAsync<EntradaDiario>(
    `SELECT id, fecha, hora, evento_disparador, pensamiento_original,
            distorsion_identificada, reformulacion,
            nivel_angustia_antes, nivel_angustia_despues, completado
     FROM entradas_diario
     WHERE fecha >= ?
     ORDER BY fecha DESC, hora DESC`,
    fechaDesde
  );
}

/**
 * Updates an existing journal entry with the provided fields.
 * Only the fields present in `data` are updated; others remain unchanged.
 * @param id - The entry ID to update
 * @param data - Fields to update
 * @returns true if a row was updated, false otherwise
 */
export async function updateEntrada(
  id: number,
  data: UpdateEntradaData
): Promise<boolean> {
  const db = await getDatabase();

  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.evento_disparador !== undefined) {
    setClauses.push('evento_disparador = ?');
    params.push(data.evento_disparador);
  }
  if (data.pensamiento_original !== undefined) {
    setClauses.push('pensamiento_original = ?');
    params.push(data.pensamiento_original);
  }
  if (data.distorsion_identificada !== undefined) {
    setClauses.push('distorsion_identificada = ?');
    params.push(data.distorsion_identificada);
  }
  if (data.reformulacion !== undefined) {
    setClauses.push('reformulacion = ?');
    params.push(data.reformulacion);
  }
  if (data.nivel_angustia_antes !== undefined) {
    setClauses.push('nivel_angustia_antes = ?');
    params.push(data.nivel_angustia_antes);
  }
  if (data.nivel_angustia_despues !== undefined) {
    setClauses.push('nivel_angustia_despues = ?');
    params.push(data.nivel_angustia_despues);
  }
  if (data.completado !== undefined) {
    setClauses.push('completado = ?');
    params.push(data.completado ? 1 : 0);
  }

  if (setClauses.length === 0) {
    return false;
  }

  params.push(id);

  const result = await db.runAsync(
    `UPDATE entradas_diario SET ${setClauses.join(', ')} WHERE id = ?`,
    ...params
  );

  return result.changes > 0;
}

/**
 * Deletes a journal entry by ID.
 * @returns true if a row was deleted, false otherwise
 */
export async function deleteEntrada(id: number): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.runAsync(
    'DELETE FROM entradas_diario WHERE id = ?',
    id
  );

  return result.changes > 0;
}
