import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'kallpa.db';
const CURRENT_SCHEMA_VERSION = 1;

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the singleton database instance.
 * Opens the database and runs migrations on first call.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Enable WAL mode for better concurrent read performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  // Enable foreign key enforcement
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(db);

  dbInstance = db;
  return db;
}

/**
 * Runs all pending migrations based on the current schema version.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Create the internal version tracking table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM _schema_version LIMIT 1'
  );
  const currentVersion = versionRow?.version ?? 0;

  if (currentVersion < 1) {
    await applyMigrationV1(db);
  }

  // Future migrations go here:
  // if (currentVersion < 2) { await applyMigrationV2(db); }
}

/**
 * Migration V1: Initial schema creation with all tables and seed data.
 */
async function applyMigrationV1(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS perfil_usuario (
      id INTEGER PRIMARY KEY,
      nombre TEXT,
      carrera TEXT,
      ciclo INTEGER,
      region_origen TEXT,
      es_migrante INTEGER DEFAULT 0,
      fecha_registro TEXT,
      familiar_tel TEXT,
      familiar_consentimiento INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS registros_humor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      nivel INTEGER NOT NULL,
      contexto TEXT,
      nota TEXT
    );

    CREATE TABLE IF NOT EXISTS entradas_diario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      evento_disparador TEXT,
      pensamiento_original TEXT,
      distorsion_identificada TEXT,
      reformulacion TEXT,
      nivel_angustia_antes INTEGER,
      nivel_angustia_despues INTEGER,
      completado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS episodios_crisis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      tecnica_usada TEXT,
      duracion_minutos INTEGER,
      nivel_antes INTEGER,
      nivel_despues INTEGER,
      escalon_activado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habitos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria TEXT,
      frecuencia TEXT DEFAULT 'diario',
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS registros_habitos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habito_id INTEGER REFERENCES habitos(id),
      fecha TEXT NOT NULL,
      completado INTEGER DEFAULT 0,
      nota TEXT
    );

    CREATE TABLE IF NOT EXISTS sesiones_companion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      duracion_segundos INTEGER,
      temas TEXT,
      estado_humor_post INTEGER
    );

    CREATE TABLE IF NOT EXISTS citas_agendadas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_solicitud TEXT NOT NULL,
      psicologo_nombre TEXT,
      fecha_cita TEXT,
      hora_cita TEXT,
      modalidad TEXT,
      reporte_compartido INTEGER DEFAULT 0,
      estado TEXT DEFAULT 'pendiente'
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT
    );

    INSERT OR IGNORE INTO habitos (nombre, descripcion, categoria) VALUES
      ('Vaso de agua al despertar', 'Hidratacion matutina', 'fisico'),
      ('1 minuto de estiramiento', 'Activacion corporal suave', 'fisico'),
      ('Registrar estado de animo', 'Check-in emocional diario', 'mental'),
      ('Respiracion consciente', '3 respiraciones profundas', 'mental'),
      ('Leer 5 paginas', 'Lectura antes de dormir', 'mental');
  `);

  // Record the migration version
  await db.runAsync(
    'INSERT OR REPLACE INTO _schema_version (version) VALUES (?)',
    CURRENT_SCHEMA_VERSION
  );
}

/**
 * Closes the database connection. Use during app shutdown or testing.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

/**
 * Deletes the database entirely. Use only for testing or full reset.
 */
export async function deleteDatabase(): Promise<void> {
  await closeDatabase();
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
}

// ── Helper: date/time formatters ──────────────────────────────────────

/**
 * Returns today's date as an ISO date string (YYYY-MM-DD).
 */
export function getFechaHoy(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns the current time as HH:MM (24-hour format).
 */
export function getHoraActual(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

/**
 * Returns an ISO date string for N days ago from today.
 */
export function getFechaHaceDias(dias: number): string {
  const date = new Date();
  date.setDate(date.getDate() - dias);
  return date.toISOString().split('T')[0];
}
