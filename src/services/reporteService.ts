import * as SQLite from 'expo-sqlite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResumenHumor {
  /** Average mood level over the period (1-5 scale). */
  promedio: number;
  /** Lowest mood registered. */
  minimo: number;
  /** Highest mood registered. */
  maximo: number;
  /** Total number of mood records. */
  total_registros: number;
  /** Day with the lowest average mood. */
  peor_dia: string | null;
  /** Day with the highest average mood. */
  mejor_dia: string | null;
  /** Distribution: count per level (1-5). */
  distribucion: Record<number, number>;
}

export interface PatronDiario {
  /** Number of diary entries in the period. */
  total_entradas: number;
  /** Most frequently identified cognitive distortion. */
  distorsion_frecuente: string | null;
  /** Average distress level BEFORE restructuring. */
  angustia_promedio_antes: number | null;
  /** Average distress level AFTER restructuring. */
  angustia_promedio_despues: number | null;
  /** Completion rate of full CBT diary cycle (%). */
  tasa_completado: number;
}

export interface ResumenCrisis {
  /** Total crisis episodes in the period. */
  total_episodios: number;
  /** Number of times the Escalon de Ayuda was activated. */
  escalones_activados: number;
  /** Most used crisis technique. */
  tecnica_mas_usada: string | null;
  /** Average crisis duration in minutes. */
  duracion_promedio: number | null;
  /** Average distress reduction (before - after). */
  reduccion_promedio: number | null;
}

export interface ResumenHabitos {
  /** Average daily habit completion rate (%). */
  tasa_cumplimiento: number;
  /** Habit with highest completion rate. */
  habito_mas_cumplido: string | null;
  /** Habit with lowest completion rate. */
  habito_menos_cumplido: string | null;
  /** Total days with at least one habit logged. */
  dias_activos: number;
}

export interface ReporteClinico {
  /** Report generation timestamp (ISO 8601). */
  generado_en: string;
  /** Period covered in days. */
  periodo_dias: number;
  /** Start date of the period (ISO 8601 date). */
  fecha_inicio: string;
  /** End date of the period (ISO 8601 date). */
  fecha_fin: string;

  humor: ResumenHumor;
  diario: PatronDiario;
  crisis: ResumenCrisis;
  habitos: ResumenHabitos;

  /**
   * IMPORTANT: This report NEVER contains raw diary text (pensamientos,
   * reformulaciones, eventos disparadores). Only aggregate statistics
   * are included to protect the student's privacy.
   */
  _aviso_privacidad: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DB_NAME = 'kallpa.db';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100) / 100;
}

function modeOf(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const freq: Record<string, number> = {};
  for (const item of arr) {
    freq[item] = (freq[item] ?? 0) + 1;
  }
  let maxCount = 0;
  let mode: string | null = null;
  for (const [key, count] of Object.entries(freq)) {
    if (count > maxCount) {
      maxCount = count;
      mode = key;
    }
  }
  return mode;
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

/**
 * Generate a clinical report from local SQLite data.
 *
 * The report aggregates mood, diary, crisis, and habit data over the
 * specified number of days. It is designed to be shared with the
 * university psychologist via the Escalon de Ayuda system.
 *
 * **Privacy guarantee**: Raw diary text (thoughts, reformulations,
 * triggering events) is NEVER included. Only statistical summaries
 * are present.
 *
 * @param dias - Number of days to include (default: 30).
 */
export async function generarReporte(dias: number = 30): Promise<ReporteClinico> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  const fechaInicio = daysAgoISO(dias);
  const fechaFin = todayISO();

  // ------ Mood summary ------
  const humor = await buildResumenHumor(db, fechaInicio);

  // ------ Diary patterns (aggregates only, never raw text) ------
  const diario = await buildPatronDiario(db, fechaInicio);

  // ------ Crisis summary ------
  const crisis = await buildResumenCrisis(db, fechaInicio);

  // ------ Habits summary ------
  const habitos = await buildResumenHabitos(db, fechaInicio);

  return {
    generado_en: new Date().toISOString(),
    periodo_dias: dias,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    humor,
    diario,
    crisis,
    habitos,
    _aviso_privacidad:
      'Este reporte contiene SOLO datos agregados. No incluye texto de diario, pensamientos ni reformulaciones del estudiante.',
  };
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

async function buildResumenHumor(
  db: SQLite.SQLiteDatabase,
  desde: string,
): Promise<ResumenHumor> {
  // Aggregate stats
  const stats = await db.getFirstAsync<{
    promedio: number | null;
    minimo: number | null;
    maximo: number | null;
    total: number;
  }>(
    `SELECT
       AVG(nivel)   AS promedio,
       MIN(nivel)   AS minimo,
       MAX(nivel)   AS maximo,
       COUNT(*)     AS total
     FROM registros_humor
     WHERE fecha >= ?`,
    [desde],
  );

  // Best/worst day
  const peorDia = await db.getFirstAsync<{ fecha: string }>(
    `SELECT fecha
     FROM registros_humor
     WHERE fecha >= ?
     GROUP BY fecha
     ORDER BY AVG(nivel) ASC
     LIMIT 1`,
    [desde],
  );

  const mejorDia = await db.getFirstAsync<{ fecha: string }>(
    `SELECT fecha
     FROM registros_humor
     WHERE fecha >= ?
     GROUP BY fecha
     ORDER BY AVG(nivel) DESC
     LIMIT 1`,
    [desde],
  );

  // Distribution per level
  const distRows = await db.getAllAsync<{ nivel: number; cnt: number }>(
    `SELECT nivel, COUNT(*) AS cnt
     FROM registros_humor
     WHERE fecha >= ?
     GROUP BY nivel`,
    [desde],
  );

  const distribucion: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of distRows) {
    distribucion[row.nivel] = row.cnt;
  }

  return {
    promedio: stats?.promedio ? Math.round(stats.promedio * 100) / 100 : 0,
    minimo: stats?.minimo ?? 0,
    maximo: stats?.maximo ?? 0,
    total_registros: stats?.total ?? 0,
    peor_dia: peorDia?.fecha ?? null,
    mejor_dia: mejorDia?.fecha ?? null,
    distribucion,
  };
}

async function buildPatronDiario(
  db: SQLite.SQLiteDatabase,
  desde: string,
): Promise<PatronDiario> {
  // Aggregates only - no raw text fetched
  const stats = await db.getFirstAsync<{
    total: number;
    avg_antes: number | null;
    avg_despues: number | null;
    completados: number;
  }>(
    `SELECT
       COUNT(*)                          AS total,
       AVG(nivel_angustia_antes)         AS avg_antes,
       AVG(nivel_angustia_despues)       AS avg_despues,
       SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) AS completados
     FROM entradas_diario
     WHERE fecha >= ?`,
    [desde],
  );

  // Most common distortion (label only, not the student's text)
  const distortions = await db.getAllAsync<{ d: string }>(
    `SELECT distorsion_identificada AS d
     FROM entradas_diario
     WHERE fecha >= ? AND distorsion_identificada IS NOT NULL`,
    [desde],
  );

  const total = stats?.total ?? 0;

  return {
    total_entradas: total,
    distorsion_frecuente: modeOf(distortions.map((r) => r.d)),
    angustia_promedio_antes:
      stats?.avg_antes != null ? Math.round(stats.avg_antes * 100) / 100 : null,
    angustia_promedio_despues:
      stats?.avg_despues != null
        ? Math.round(stats.avg_despues * 100) / 100
        : null,
    tasa_completado: total > 0 ? Math.round(((stats?.completados ?? 0) / total) * 100) : 0,
  };
}

async function buildResumenCrisis(
  db: SQLite.SQLiteDatabase,
  desde: string,
): Promise<ResumenCrisis> {
  const stats = await db.getFirstAsync<{
    total: number;
    escalones: number;
    avg_duracion: number | null;
    avg_reduccion: number | null;
  }>(
    `SELECT
       COUNT(*)                                             AS total,
       SUM(CASE WHEN escalon_activado = 1 THEN 1 ELSE 0 END) AS escalones,
       AVG(duracion_minutos)                                AS avg_duracion,
       AVG(nivel_antes - nivel_despues)                     AS avg_reduccion
     FROM episodios_crisis
     WHERE fecha >= ?`,
    [desde],
  );

  // Most used technique
  const tecnicas = await db.getAllAsync<{ t: string }>(
    `SELECT tecnica_usada AS t
     FROM episodios_crisis
     WHERE fecha >= ? AND tecnica_usada IS NOT NULL`,
    [desde],
  );

  return {
    total_episodios: stats?.total ?? 0,
    escalones_activados: stats?.escalones ?? 0,
    tecnica_mas_usada: modeOf(tecnicas.map((r) => r.t)),
    duracion_promedio:
      stats?.avg_duracion != null
        ? Math.round(stats.avg_duracion * 100) / 100
        : null,
    reduccion_promedio:
      stats?.avg_reduccion != null
        ? Math.round(stats.avg_reduccion * 100) / 100
        : null,
  };
}

async function buildResumenHabitos(
  db: SQLite.SQLiteDatabase,
  desde: string,
): Promise<ResumenHabitos> {
  // Active habits
  const habitos = await db.getAllAsync<{ id: number; nombre: string }>(
    'SELECT id, nombre FROM habitos WHERE activo = 1',
  );

  if (habitos.length === 0) {
    return {
      tasa_cumplimiento: 0,
      habito_mas_cumplido: null,
      habito_menos_cumplido: null,
      dias_activos: 0,
    };
  }

  // Days with any record
  const diasActivos = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(DISTINCT fecha) AS cnt
     FROM registros_habitos
     WHERE fecha >= ?`,
    [desde],
  );

  // Per-habit completion rates
  const rates: { nombre: string; rate: number }[] = [];

  for (const habito of habitos) {
    const result = await db.getFirstAsync<{ total: number; completados: number }>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) AS completados
       FROM registros_habitos
       WHERE habito_id = ? AND fecha >= ?`,
      [habito.id, desde],
    );

    const rate = safeDivide(result?.completados ?? 0, result?.total ?? 0);
    rates.push({ nombre: habito.nombre, rate });
  }

  // Sort by rate to find best and worst
  rates.sort((a, b) => b.rate - a.rate);

  // Overall completion rate
  const overallStats = await db.getFirstAsync<{ total: number; completados: number }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) AS completados
     FROM registros_habitos
     WHERE fecha >= ?`,
    [desde],
  );

  return {
    tasa_cumplimiento: Math.round(
      safeDivide(overallStats?.completados ?? 0, overallStats?.total ?? 0) * 100,
    ),
    habito_mas_cumplido: rates[0]?.nombre ?? null,
    habito_menos_cumplido: rates[rates.length - 1]?.nombre ?? null,
    dias_activos: diasActivos?.cnt ?? 0,
  };
}
