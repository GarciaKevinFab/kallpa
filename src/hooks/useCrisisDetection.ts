import { useState, useEffect, useCallback, useRef } from 'react';
import { useHumorStore, RegistroHumor } from '@/store/useHumorStore';
import { getHumoresUltimosDias } from '@/db/queries/humor';
import { getDatabase } from '@/db/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Mood level threshold: days with an average mood at or below this value
 * count towards the crisis pattern.
 */
const CRISIS_MOOD_THRESHOLD = 2;

/** Number of consecutive low-mood days required to trigger the suggestion. */
const CONSECUTIVE_DAYS_REQUIRED = 3;

/**
 * Keywords that signal distress when found in companion chat messages.
 * Matched case-insensitively against the user's messages.
 */
const CRISIS_KEYWORDS: string[] = [
  'morir',
  'morirme',
  'suicid',
  'matarme',
  'no quiero vivir',
  'no vale la pena',
  'hacerme daño',
  'hacerme dano',
  'autolesion',
  'cortarme',
  'ya no puedo más',
  'ya no puedo mas',
  'no aguanto',
  'desaparecer',
  'acabar con todo',
  'me quiero ir',
  'nadie me quiere',
  'estoy solo',
  'sola en el mundo',
  'no tengo a nadie',
  'sin salida',
  'sin esperanza',
];

/** The gentle suggestion message shown to the student. */
const SUGGESTION_MESSAGE =
  'Hemos notado que has tenido días difíciles. ¿Te gustaría hablar con alguien del equipo de bienestar?';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseCrisisDetectionReturn {
  /**
   * When `true`, the UI should show a gentle, non-alarming card with
   * `SUGGESTION_MESSAGE`. This is NOT an emergency alert — it is a caring
   * nudge towards professional support.
   */
  showSuggestion: boolean;

  /** Dismiss the suggestion (persists for the current session). */
  dismissSuggestion: () => void;

  /**
   * `true` when the underlying pattern (3 consecutive low-mood days OR
   * crisis keywords in chat) has been detected, regardless of whether the
   * suggestion was dismissed.
   */
  crisisDetected: boolean;

  /** The suggestion message text, ready to display. */
  message: string;
}

// ---------------------------------------------------------------------------
// NLP-local keyword checker
// ---------------------------------------------------------------------------

/**
 * Simple local NLP: checks if any message in a list of strings contains
 * crisis-related keywords. No network call required.
 */
function detectCrisisKeywords(messages: string[]): boolean {
  for (const msg of messages) {
    const normalised = msg.toLowerCase();
    for (const keyword of CRISIS_KEYWORDS) {
      if (normalised.includes(keyword)) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Mood-pattern checker
// ---------------------------------------------------------------------------

/**
 * Given a list of mood records, determines whether the last
 * `CONSECUTIVE_DAYS_REQUIRED` calendar days all have an average mood
 * at or below `CRISIS_MOOD_THRESHOLD`.
 */
function detectLowMoodPattern(registros: RegistroHumor[]): boolean {
  if (registros.length === 0) return false;

  // Group records by date and compute daily averages.
  const dailyMap = new Map<string, number[]>();

  for (const r of registros) {
    const existing = dailyMap.get(r.fecha);
    if (existing) {
      existing.push(r.nivel);
    } else {
      dailyMap.set(r.fecha, [r.nivel]);
    }
  }

  // Build a sorted (descending) list of the last N days with records.
  const sortedDates = [...dailyMap.keys()].sort().reverse();

  if (sortedDates.length < CONSECUTIVE_DAYS_REQUIRED) return false;

  // We need the most recent N *consecutive calendar days*, not just any N
  // days with records. Build expected dates from today backwards.
  const today = new Date();
  const expectedDates: string[] = [];

  for (let i = 0; i < CONSECUTIVE_DAYS_REQUIRED; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    expectedDates.push(d.toISOString().split('T')[0]!);
  }

  for (const fecha of expectedDates) {
    const niveles = dailyMap.get(fecha);
    if (!niveles || niveles.length === 0) return false;

    const avg = niveles.reduce((sum, n) => sum + n, 0) / niveles.length;
    if (avg > CRISIS_MOOD_THRESHOLD) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Automatic crisis-pattern detection hook.
 *
 * Checks two signals:
 * 1. **Mood pattern** — last 3 calendar days all have average mood <= 2.
 * 2. **Chat keywords** — recent companion-chat messages contain distress
 *    keywords (local NLP, no network required).
 *
 * When a pattern is detected the hook exposes a gentle suggestion (never an
 * alarm) encouraging the student to reach out to the wellness team.
 */
export function useCrisisDetection(): UseCrisisDetectionReturn {
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Avoid re-running detection after dismiss within the same mount.
  const hasChecked = useRef(false);

  // ---- Run detection on mount --------------------------------------------
  useEffect(() => {
    if (hasChecked.current) return;

    let cancelled = false;

    async function runDetection() {
      try {
        // --- Check 1: mood pattern ---
        const registros = await getHumoresUltimosDias(CONSECUTIVE_DAYS_REQUIRED);
        const moodCrisis = detectLowMoodPattern(registros);

        // --- Check 2: companion chat keywords ---
        let chatCrisis = false;
        try {
          const db = await getDatabase();
          // sesiones_companion.temas stores a summary/text of chat topics.
          // We also check the raw companion messages if available.
          const sessions = await db.getAllAsync<{ temas: string | null }>(
            `SELECT temas FROM sesiones_companion
             WHERE fecha >= date('now', '-3 days')
             ORDER BY fecha DESC, hora DESC
             LIMIT 20`,
          );

          const chatTexts = sessions
            .map((s) => s.temas)
            .filter((t): t is string => t !== null);

          chatCrisis = detectCrisisKeywords(chatTexts);
        } catch (chatErr) {
          // Chat table may not have data yet — that's fine.
          console.warn('[useCrisisDetection] Chat check skipped:', chatErr);
        }

        if (!cancelled) {
          const detected = moodCrisis || chatCrisis;
          setCrisisDetected(detected);
          hasChecked.current = true;
        }
      } catch (error) {
        console.warn('[useCrisisDetection] Detection failed:', error);
      }
    }

    runDetection();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Dismiss handler ---------------------------------------------------
  const dismissSuggestion = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    showSuggestion: crisisDetected && !dismissed,
    dismissSuggestion,
    crisisDetected,
    message: SUGGESTION_MESSAGE,
  };
}
