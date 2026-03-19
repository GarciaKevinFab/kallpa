import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Night mode activates at or after this hour (24h). */
const NIGHT_START_HOUR = 22; // 10 PM

/** Night mode deactivates at this hour (24h). */
const NIGHT_END_HOUR = 6; // 6 AM

/** How often (ms) we re-check the current hour while the hook is mounted. */
const CHECK_INTERVAL_MS = 60_000; // 1 minute

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseNightModeReturn {
  /** `true` when the current time falls within the night window (10 PM - 6 AM). */
  isNightMode: boolean;

  /**
   * A caring, contextual message to display during night hours.
   * `null` when night mode is inactive.
   *
   * Example:
   * "Son las 1:30 AM. ¿Estás bien? Tenemos algo para ayudarte a descansar."
   */
  nightMessage: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determines whether the given hour (0-23) falls within the night window.
 * The window wraps around midnight: 22, 23, 0, 1, 2, 3, 4, 5.
 */
function isWithinNightWindow(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/**
 * Formats the current time as a user-friendly string for the night message.
 * Uses 12-hour format with AM/PM for natural Spanish reading.
 *
 * Examples: "10:30 PM", "1:05 AM"
 */
function formatHoraAmigable(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHour}:${displayMinutes} ${ampm}`;
}

/**
 * Builds the contextual night message.
 */
function buildNightMessage(date: Date): string {
  const horaTexto = formatHoraAmigable(date);
  return `Son las ${horaTexto}. ¿Estás bien? Tenemos algo para ayudarte a descansar.`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Smart night mode hook.
 *
 * Detects the current hour and activates night mode between 10 PM and 6 AM.
 * When active, the hook:
 * - Sets `isNightMode` to `true` (can be used for warmer colours / reduced brightness).
 * - Returns a `nightMessage` suggesting the student rest.
 * - Syncs state to `useAppStore.setNightMode` so the rest of the app can
 *   respond (e.g. theme adjustments).
 *
 * Re-evaluates every minute so the transition happens seamlessly even if the
 * student keeps the app open across the boundary hour.
 */
export function useNightMode(): UseNightModeReturn {
  const setNightModeStore = useAppStore((s) => s.setNightMode);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Periodic time check -----------------------------------------------
  useEffect(() => {
    // Set an interval to refresh the current time every minute.
    intervalRef.current = setInterval(() => {
      setCurrentDate(new Date());
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ---- Derived state -----------------------------------------------------
  const isNightMode = useMemo(
    () => isWithinNightWindow(currentDate.getHours()),
    [currentDate],
  );

  const nightMessage = useMemo(
    () => (isNightMode ? buildNightMessage(currentDate) : null),
    [isNightMode, currentDate],
  );

  // ---- Sync to global store ----------------------------------------------
  useEffect(() => {
    setNightModeStore(isNightMode);
  }, [isNightMode, setNightModeStore]);

  return {
    isNightMode,
    nightMessage,
  };
}
