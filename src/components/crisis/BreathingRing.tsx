import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, radii, shadows } from '../../theme/spacing';
import { fonts } from '../../theme/typography';

// ── Types ──────────────────────────────────────────────────────────────

type Technique = '478' | 'box';

interface BreathingRingProps {
  technique: Technique;
  /** Called when 4 cycles are completed. */
  onComplete?: () => void;
}

type Phase478 = 'inhale' | 'hold' | 'exhale';
type PhaseBox = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

// ── Constants ──────────────────────────────────────────────────────────

const RING_SIZE = 220;
const RING_MIN_SCALE = 0.55;
const RING_MAX_SCALE = 1.0;

const TARGET_CYCLES = 4;

// 4-7-8 timings in seconds
const T478_INHALE = 4;
const T478_HOLD = 7;
const T478_EXHALE = 8;

// Box timings in seconds (4s per side)
const TBOX_SIDE = 4;

// Colors
const COLOR_INHALE = colors.accent; // teal
const COLOR_HOLD = colors.primary; // purple
const COLOR_EXHALE = '#B4AEDD'; // lavender

const PHASE_LABELS: Record<string, string> = {
  inhale: 'Inhala',
  hold: 'Ret\u00E9n',
  holdIn: 'Ret\u00E9n',
  exhale: 'Exhala',
  holdOut: 'Ret\u00E9n',
};

// ── Animated Box Drawing ───────────────────────────────────────────────

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function BoxAnimation({ progress }: { progress: Animated.SharedValue<number> }) {
  const BOX_SIZE = 120;
  const STROKE_WIDTH = 4;
  const HALF = BOX_SIZE / 2;
  const OFFSET = (RING_SIZE - BOX_SIZE) / 2;

  // Box perimeter segments: top, right, bottom, left (each 0.25 of progress)
  // We use 4 lines that grow as progress advances through each quarter

  const boxAnimStyle = useAnimatedStyle(() => {
    return { opacity: 1 };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: RING_SIZE,
          height: RING_SIZE,
        },
        boxAnimStyle,
      ]}
    >
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Full box outline (faint) */}
        <Rect
          x={OFFSET}
          y={OFFSET}
          width={BOX_SIZE}
          height={BOX_SIZE}
          stroke={colors.border}
          strokeWidth={2}
          fill="none"
          rx={4}
          ry={4}
        />
        {/* Animated box overlay drawn via dasharray trick */}
        <AnimatedBoxPath size={BOX_SIZE} offset={OFFSET} progress={progress} />
      </Svg>
    </Animated.View>
  );
}

/** Draws the box path progressively using stroke-dashoffset */
function AnimatedBoxPath({
  size,
  offset,
  progress,
}: {
  size: number;
  offset: number;
  progress: Animated.SharedValue<number>;
}) {
  const perimeter = size * 4;

  const animStyle = useAnimatedStyle(() => ({
    // Map 0-1 progress to dashoffset
    strokeDashoffset: perimeter * (1 - progress.value),
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill]}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Rect
          x={offset}
          y={offset}
          width={size}
          height={size}
          stroke={colors.primary}
          strokeWidth={4}
          fill="none"
          rx={4}
          ry={4}
          strokeDasharray={`${perimeter}`}
          strokeDashoffset={perimeter}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function BreathingRing({
  technique,
  onComplete,
}: BreathingRingProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [phase, setPhase] = useState<string>('inhale');
  const [completed, setCompleted] = useState(false);

  const scale = useSharedValue(RING_MIN_SCALE);
  const boxProgress = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  // Phase color
  const phaseColor = (() => {
    if (phase === 'inhale') return COLOR_INHALE;
    if (phase === 'exhale') return COLOR_EXHALE;
    return COLOR_HOLD;
  })();

  // Ring animated style (used for 4-7-8)
  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: phaseColor,
  }));

  // ── 4-7-8 Logic ────────────────────────────────────────

  const run478Cycle = useCallback(
    (cycleNum: number) => {
      if (abortRef.current) return;

      // Inhale (4s)
      setPhase('inhale');
      scale.value = withTiming(RING_MAX_SCALE, {
        duration: T478_INHALE * 1000,
        easing: Easing.inOut(Easing.ease),
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      timerRef.current = setTimeout(() => {
        if (abortRef.current) return;

        // Hold (7s)
        setPhase('hold');

        timerRef.current = setTimeout(() => {
          if (abortRef.current) return;

          // Exhale (8s)
          setPhase('exhale');
          scale.value = withTiming(RING_MIN_SCALE, {
            duration: T478_EXHALE * 1000,
            easing: Easing.inOut(Easing.ease),
          });

          timerRef.current = setTimeout(() => {
            if (abortRef.current) return;

            const next = cycleNum + 1;
            setCycles(next);

            if (next >= TARGET_CYCLES) {
              setCompleted(true);
              setIsRunning(false);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              ).catch(() => {});
              onComplete?.();
            } else {
              run478Cycle(next);
            }
          }, T478_EXHALE * 1000);
        }, T478_HOLD * 1000);
      }, T478_INHALE * 1000);
    },
    [scale, onComplete],
  );

  // ── Box Breathing Logic ────────────────────────────────

  const runBoxCycle = useCallback(
    (cycleNum: number) => {
      if (abortRef.current) return;

      const phases: PhaseBox[] = ['inhale', 'holdIn', 'exhale', 'holdOut'];
      let phaseIdx = 0;

      const runPhase = () => {
        if (abortRef.current) return;
        if (phaseIdx >= phases.length) {
          // Cycle complete
          const next = cycleNum + 1;
          setCycles(next);
          if (next >= TARGET_CYCLES) {
            setCompleted(true);
            setIsRunning(false);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
            onComplete?.();
          } else {
            runBoxCycle(next);
          }
          return;
        }

        const currentPhase = phases[phaseIdx];
        setPhase(currentPhase);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        // Animate box progress from current quarter to next
        const startProgress = phaseIdx / 4;
        const endProgress = (phaseIdx + 1) / 4;
        boxProgress.value = startProgress;
        boxProgress.value = withTiming(endProgress, {
          duration: TBOX_SIDE * 1000,
          easing: Easing.linear,
        });

        // Also animate scale for visual feedback
        if (currentPhase === 'inhale') {
          scale.value = withTiming(RING_MAX_SCALE, {
            duration: TBOX_SIDE * 1000,
            easing: Easing.inOut(Easing.ease),
          });
        } else if (currentPhase === 'exhale') {
          scale.value = withTiming(RING_MIN_SCALE, {
            duration: TBOX_SIDE * 1000,
            easing: Easing.inOut(Easing.ease),
          });
        }

        timerRef.current = setTimeout(() => {
          phaseIdx++;
          runPhase();
        }, TBOX_SIDE * 1000);
      };

      boxProgress.value = 0;
      runPhase();
    },
    [scale, boxProgress, onComplete],
  );

  // ── Start / Stop ───────────────────────────────────────

  const start = useCallback(() => {
    abortRef.current = false;
    setIsRunning(true);
    setCycles(0);
    setCompleted(false);
    setPhase('inhale');
    scale.value = RING_MIN_SCALE;
    boxProgress.value = 0;

    if (technique === '478') {
      run478Cycle(0);
    } else {
      runBoxCycle(0);
    }
  }, [technique, run478Cycle, runBoxCycle, scale, boxProgress]);

  const stop = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelAnimation(scale);
    cancelAnimation(boxProgress);
    scale.value = withTiming(RING_MIN_SCALE, { duration: 300 });
  }, [scale, boxProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Render ─────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>
        {technique === '478'
          ? 'Respiraci\u00F3n 4-7-8'
          : 'Respiraci\u00F3n en caja'}
      </Text>

      {/* Ring area */}
      <View style={styles.ringArea}>
        {technique === 'box' && isRunning && (
          <BoxAnimation progress={boxProgress} />
        )}

        <Animated.View
          style={[
            styles.ring,
            ringAnimStyle,
            { borderColor: phaseColor },
          ]}
        >
          <Text style={[styles.phaseLabel, { color: phaseColor }]}>
            {isRunning ? PHASE_LABELS[phase] ?? '' : ''}
          </Text>
        </Animated.View>
      </View>

      {/* Cycle counter */}
      <Text style={styles.cycleCounter}>
        {completed
          ? '\u00A1Bien hecho! Completaste los 4 ciclos.'
          : isRunning
            ? `Ciclo ${cycles + 1} de ${TARGET_CYCLES}`
            : `${TARGET_CYCLES} ciclos`}
      </Text>

      {/* Start / Stop button */}
      {!completed ? (
        <Pressable
          onPress={isRunning ? stop : start}
          style={[styles.actionBtn, isRunning && styles.actionBtnStop]}
          accessibilityLabel={isRunning ? 'Detener respiraci\u00F3n' : 'Iniciar respiraci\u00F3n'}
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnText}>
            {isRunning ? 'Detener' : 'Iniciar'}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={start}
          style={styles.actionBtn}
          accessibilityLabel="Repetir ejercicio"
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnText}>Repetir</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text.primary,
  },
  ringArea: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 6,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    ...shadows.lg,
  },
  phaseLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 24,
    lineHeight: 32,
  },
  cycleCounter: {
    fontFamily: fonts.sans.medium,
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.xxl,
    minWidth: 160,
    alignItems: 'center',
  },
  actionBtnStop: {
    backgroundColor: colors.warm,
  },
  actionBtnText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 16,
    color: colors.white,
  },
});
