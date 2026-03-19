-- Kallpa SQLite Schema
-- Version 1: Initial schema

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
