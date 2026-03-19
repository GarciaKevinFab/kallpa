import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface NuevoHabitoData {
  nombre: string;
  descripcion?: string;
  categoria?: string;
  frecuencia?: string;
}

interface HabitosState {
  /** All active habits. */
  habitos: Habito[];

  /** Today's habit completion records. */
  registrosHoy: RegistroHabito[];

  /** Count of habits completed today. */
  totalCompletados: number;

  /** Load all active habits and today's records from SQLite. */
  loadHabitos: () => Promise<void>;

  /** Toggle a habit's completion status for today. */
  toggleHabito: (habitoId: number) => Promise<void>;

  /** Create a new habit. */
  addHabito: (data: NuevoHabitoData) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DB_NAME = 'kallpa.db';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function countCompleted(registros: RegistroHabito[]): number {
  return registros.filter((r) => r.completado === 1).length;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useHabitosStore = create<HabitosState>((set, get) => ({
  // ---- initial state ----
  habitos: [],
  registrosHoy: [],
  totalCompletados: 0,

  // ---- actions ----
  loadHabitos: async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const fecha = todayISO();

      // Fetch active habits
      const habitos = await db.getAllAsync<Habito>(
        'SELECT id, nombre, descripcion, categoria, frecuencia, activo FROM habitos WHERE activo = 1 ORDER BY id ASC',
      );

      // Fetch today's records
      const registrosHoy = await db.getAllAsync<RegistroHabito>(
        'SELECT id, habito_id, fecha, completado, nota FROM registros_habitos WHERE fecha = ?',
        [fecha],
      );

      set({
        habitos,
        registrosHoy,
        totalCompletados: countCompleted(registrosHoy),
      });
    } catch (error) {
      console.warn('[useHabitosStore] Failed to load habitos:', error);
    }
  },

  toggleHabito: async (habitoId: number) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const fecha = todayISO();

      // Check for an existing record today
      const existing = await db.getFirstAsync<RegistroHabito>(
        'SELECT id, habito_id, fecha, completado, nota FROM registros_habitos WHERE habito_id = ? AND fecha = ?',
        [habitoId, fecha],
      );

      if (existing) {
        const newValue = existing.completado === 1 ? 0 : 1;
        await db.runAsync(
          'UPDATE registros_habitos SET completado = ? WHERE id = ?',
          [newValue, existing.id],
        );
      } else {
        // Create record as completed
        await db.runAsync(
          'INSERT INTO registros_habitos (habito_id, fecha, completado) VALUES (?, ?, 1)',
          [habitoId, fecha],
        );
      }

      // Reload today's records to stay in sync
      const registrosHoy = await db.getAllAsync<RegistroHabito>(
        'SELECT id, habito_id, fecha, completado, nota FROM registros_habitos WHERE fecha = ?',
        [fecha],
      );

      set({
        registrosHoy,
        totalCompletados: countCompleted(registrosHoy),
      });
    } catch (error) {
      console.warn('[useHabitosStore] Failed to toggle habito:', error);
    }
  },

  addHabito: async (data: NuevoHabitoData) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      await db.runAsync(
        'INSERT INTO habitos (nombre, descripcion, categoria, frecuencia, activo) VALUES (?, ?, ?, ?, 1)',
        [
          data.nombre,
          data.descripcion ?? null,
          data.categoria ?? null,
          data.frecuencia ?? 'diario',
        ],
      );

      // Reload the full list
      await get().loadHabitos();
    } catch (error) {
      console.warn('[useHabitosStore] Failed to add habito:', error);
    }
  },
}));
