import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppState {
  isOnboardingComplete: boolean;
  userName: string;
  isNightMode: boolean;

  setOnboardingComplete: () => void;
  setUserName: (name: string) => void;
  setNightMode: (value: boolean) => void;
  loadFromDB: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DB_NAME = 'kallpa.db';

/**
 * Persist a single key/value pair to the `configuracion` table.
 * Fire-and-forget: errors are logged, never thrown to the caller.
 */
async function persistConfig(key: string, value: string): Promise<void> {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.runAsync(
      'INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)',
      [key, value],
    );
  } catch (error) {
    console.warn(`[useAppStore] Failed to persist "${key}":`, error);
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>((set) => ({
  // ---- initial state ----
  isOnboardingComplete: false,
  userName: '',
  isNightMode: false,

  // ---- actions ----
  setOnboardingComplete: () => {
    set({ isOnboardingComplete: true });
    persistConfig('onboarding_complete', '1');
  },

  setUserName: (name: string) => {
    set({ userName: name });
    persistConfig('user_name', name);
  },

  setNightMode: (value: boolean) => {
    set({ isNightMode: value });
    persistConfig('night_mode', value ? '1' : '0');
  },

  loadFromDB: async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      const rows = await db.getAllAsync<{ clave: string; valor: string }>(
        'SELECT clave, valor FROM configuracion WHERE clave IN (?, ?, ?)',
        ['onboarding_complete', 'user_name', 'night_mode'],
      );

      const config: Record<string, string> = {};
      for (const row of rows) {
        config[row.clave] = row.valor;
      }

      set({
        isOnboardingComplete: config['onboarding_complete'] === '1',
        userName: config['user_name'] ?? '',
        isNightMode: config['night_mode'] === '1',
      });
    } catch (error) {
      console.warn('[useAppStore] Failed to load config from DB:', error);
    }
  },
}));
