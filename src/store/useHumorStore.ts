import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistroHumor {
  id: number;
  fecha: string;
  hora: string;
  nivel: number;
  contexto: string | null;
  nota: string | null;
}

interface HumorState {
  /** Current mood level for today (1-5 scale), null if not yet registered. */
  humorHoy: number | null;

  /** Recent mood records (last 7 days by default). */
  humoresRecientes: RegistroHumor[];

  /** Record today's mood and persist it to SQLite. */
  setHumorHoy: (nivel: number, contexto?: string) => Promise<void>;

  /** Load recent mood records from SQLite. */
  loadHumoresRecientes: (dias?: number) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DB_NAME = 'kallpa.db';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTime(): string {
  return new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useHumorStore = create<HumorState>((set) => ({
  // ---- initial state ----
  humorHoy: null,
  humoresRecientes: [],

  // ---- actions ----
  setHumorHoy: async (nivel: number, contexto?: string) => {
    try {
      const fecha = todayISO();
      const hora = nowTime();

      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Check if a record already exists for today
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM registros_humor WHERE fecha = ? ORDER BY id DESC LIMIT 1',
        [fecha],
      );

      if (existing) {
        // Update today's latest record
        await db.runAsync(
          'UPDATE registros_humor SET nivel = ?, hora = ?, contexto = ? WHERE id = ?',
          [nivel, hora, contexto ?? null, existing.id],
        );
      } else {
        // Insert new record
        await db.runAsync(
          'INSERT INTO registros_humor (fecha, hora, nivel, contexto) VALUES (?, ?, ?, ?)',
          [fecha, hora, nivel, contexto ?? null],
        );
      }

      set({ humorHoy: nivel });
    } catch (error) {
      console.warn('[useHumorStore] Failed to set humor:', error);
    }
  },

  loadHumoresRecientes: async (dias: number = 7) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      const rows = await db.getAllAsync<RegistroHumor>(
        `SELECT id, fecha, hora, nivel, contexto, nota
         FROM registros_humor
         WHERE fecha >= date('now', ? || ' days')
         ORDER BY fecha DESC, hora DESC`,
        [`-${dias}`],
      );

      // Determine today's mood from the latest record matching today
      const today = todayISO();
      const todayRecord = rows.find((r) => r.fecha === today);

      set({
        humoresRecientes: rows,
        humorHoy: todayRecord?.nivel ?? null,
      });
    } catch (error) {
      console.warn('[useHumorStore] Failed to load humores:', error);
    }
  },
}));
