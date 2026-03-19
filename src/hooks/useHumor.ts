import { useState, useEffect, useCallback } from 'react';
import { useHumorStore, RegistroHumor } from '@/store/useHumorStore';
import {
  insertHumor,
  getHumorHoy,
  getHumoresUltimosDias,
} from '@/db/queries/humor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseHumorReturn {
  /** Current mood level for today (1-5), null if not yet registered. */
  humorHoy: number | null;

  /** Recent mood records (last 7 days). */
  humoresRecientes: RegistroHumor[];

  /**
   * Register a mood entry: persists to SQLite and updates the Zustand store.
   * @param nivel   - Mood level (1-5)
   * @param contexto - Optional situational context (e.g. "en clase")
   * @param nota     - Optional free-text note
   */
  registrarHumor: (
    nivel: number,
    contexto?: string,
    nota?: string,
  ) => Promise<void>;

  /** True while the initial data load is in progress. */
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Mood management hook.
 *
 * Bridges the `useHumorStore` Zustand store with the SQLite query layer,
 * providing a single ergonomic API for components to read/write mood data.
 *
 * - Loads recent moods on mount.
 * - `registrarHumor` inserts into SQLite **and** refreshes the store.
 */
export function useHumor(): UseHumorReturn {
  const {
    humorHoy,
    humoresRecientes,
    setHumorHoy,
    loadHumoresRecientes,
  } = useHumorStore();

  const [loading, setLoading] = useState(true);

  // ---- Load recent moods on mount ----------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadHumoresRecientes(7);
      } catch (error) {
        console.warn('[useHumor] Failed to load recent moods:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // loadHumoresRecientes is stable (Zustand action), safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Register a new mood -----------------------------------------------
  const registrarHumor = useCallback(
    async (nivel: number, contexto?: string, nota?: string) => {
      try {
        // 1. Persist to SQLite via the query layer (supports `nota`)
        await insertHumor(nivel, contexto, nota);

        // 2. Update the Zustand store (sets humorHoy + refreshes list)
        //    setHumorHoy persists too, but we already did — the store
        //    method is idempotent (UPSERT) so this keeps state in sync.
        await setHumorHoy(nivel, contexto);

        // 3. Reload recent records so the list reflects the new entry
        await loadHumoresRecientes(7);
      } catch (error) {
        console.warn('[useHumor] Failed to register mood:', error);
        throw error;
      }
    },
    [setHumorHoy, loadHumoresRecientes],
  );

  return {
    humorHoy,
    humoresRecientes,
    registrarHumor,
    loading,
  };
}
