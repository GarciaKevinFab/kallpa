import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing, radii, shadows } from '../../src/theme/spacing';
import { KButton } from '../../src/components/ui/KButton';
import { KChip } from '../../src/components/ui/KChip';
import { insertEpisodio } from '../../src/db/queries/crisis';

// ---------------------------------------------------------------------------
// Technique Data
// ---------------------------------------------------------------------------

interface Technique {
  id: string;
  name: string;
  emoji: string;
  description: string;
  type: 'breathing' | 'grounding' | 'muscle';
}

const TECHNIQUES: Technique[] = [
  {
    id: 'respiracion_478',
    name: 'Respiraci\u00F3n 4-7-8',
    emoji: '\uD83C\uDF2C\uFE0F',
    description: 'Inhala 4 seg, mant\u00E9n 7 seg, exhala 8 seg. Calma el sistema nervioso r\u00E1pidamente.',
    type: 'breathing',
  },
  {
    id: 'grounding_54321',
    name: 'T\u00E9cnica 5-4-3-2-1',
    emoji: '\uD83D\uDD90\uFE0F',
    description: 'Ancla tus sentidos al presente: 5 cosas que ves, 4 que tocas, 3 que oyes, 2 que hueles, 1 que saboreas.',
    type: 'grounding',
  },
  {
    id: 'relajacion_muscular',
    name: 'Relajaci\u00F3n muscular',
    emoji: '\uD83E\uDDD8',
    description: 'Tensa y suelta grupos musculares progresivamente para liberar la tensi\u00F3n f\u00EDsica.',
    type: 'muscle',
  },
];

// ---------------------------------------------------------------------------
// Breathing Ring Component
// ---------------------------------------------------------------------------

interface BreathingPhase {
  label: string;
  duration: number; // seconds
  color: string;
}

const BREATH_PHASES: BreathingPhase[] = [
  { label: 'Inhala', duration: 4, color: colors.primary },
  { label: 'Mant\u00E9n', duration: 7, color: colors.amber },
  { label: 'Exhala', duration: 8, color: colors.accent },
];

function BreathingRing({ onComplete }: { onComplete: () => void }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalCycles = 4;

  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0.3);

  const currentPhase = BREATH_PHASES[phaseIndex % BREATH_PHASES.length];

  // ── Start the exercise ──────────────────────────────────────────────
  const startExercise = useCallback(() => {
    setIsRunning(true);
    setPhaseIndex(0);
    setCycle(0);
    const firstPhase = BREATH_PHASES[0]!;
    setCountdown(firstPhase.duration);

    // Animate ring for inhale
    ringScale.value = withTiming(1.3, { duration: firstPhase.duration * 1000, easing: Easing.inOut(Easing.ease) });
    ringOpacity.value = withTiming(0.8, { duration: firstPhase.duration * 1000 });
  }, [ringScale, ringOpacity]);

  // ── Countdown timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Move to next phase
          setPhaseIndex((prevPhase) => {
            const nextPhase = prevPhase + 1;

            // Check if all cycles complete
            if (nextPhase >= BREATH_PHASES.length * totalCycles) {
              setIsRunning(false);
              onComplete();
              return prevPhase;
            }

            // If we completed a full cycle (3 phases)
            if (nextPhase % BREATH_PHASES.length === 0) {
              setCycle((c) => c + 1);
            }

            const nextPhaseData = BREATH_PHASES[nextPhase % BREATH_PHASES.length]!;
            setCountdown(nextPhaseData.duration);

            // Animate ring based on phase
            const phaseType = nextPhase % BREATH_PHASES.length;
            if (phaseType === 0) {
              // Inhale: expand
              ringScale.value = withTiming(1.3, { duration: nextPhaseData.duration * 1000, easing: Easing.inOut(Easing.ease) });
              ringOpacity.value = withTiming(0.8, { duration: nextPhaseData.duration * 1000 });
            } else if (phaseType === 1) {
              // Hold: stay
              ringScale.value = withTiming(1.3, { duration: nextPhaseData.duration * 1000 });
              ringOpacity.value = withTiming(0.6, { duration: nextPhaseData.duration * 1000 });
            } else {
              // Exhale: contract
              ringScale.value = withTiming(0.8, { duration: nextPhaseData.duration * 1000, easing: Easing.inOut(Easing.ease) });
              ringOpacity.value = withTiming(0.3, { duration: nextPhaseData.duration * 1000 });
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

            return nextPhase;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, onComplete, ringScale, ringOpacity]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={breathStyles.container}>
      <View style={breathStyles.ringContainer}>
        <Animated.View
          style={[
            breathStyles.ring,
            { borderColor: currentPhase?.color ?? colors.primary },
            ringAnimatedStyle,
          ]}
        >
          {isRunning ? (
            <View style={breathStyles.ringContent}>
              <Text style={[breathStyles.phaseLabel, { color: currentPhase?.color }]}>
                {currentPhase?.label}
              </Text>
              <Text style={breathStyles.countdown}>{countdown}</Text>
            </View>
          ) : (
            <Text style={breathStyles.readyEmoji}>{'\uD83C\uDF2C\uFE0F'}</Text>
          )}
        </Animated.View>
      </View>

      {isRunning && (
        <Text style={breathStyles.cycleText}>
          Ciclo {cycle + 1} de {totalCycles}
        </Text>
      )}

      {!isRunning && (
        <KButton
          title="Comenzar respiraci\u00F3n"
          onPress={startExercise}
          size="lg"
          accessibilityLabel="Comenzar ejercicio de respiraci\u00F3n 4-7-8"
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Grounding Card Component
// ---------------------------------------------------------------------------

const GROUNDING_STEPS = [
  { count: 5, sense: 'VES', emoji: '\uD83D\uDC41\uFE0F', prompt: 'Nombra 5 cosas que puedes ver a tu alrededor' },
  { count: 4, sense: 'TOCAS', emoji: '\u270B', prompt: 'Nombra 4 cosas que puedes tocar' },
  { count: 3, sense: 'OYES', emoji: '\uD83D\uDC42', prompt: 'Nombra 3 sonidos que puedes escuchar' },
  { count: 2, sense: 'HUELES', emoji: '\uD83D\uDC43', prompt: 'Nombra 2 olores que puedes percibir' },
  { count: 1, sense: 'SABOREAS', emoji: '\uD83D\uDC45', prompt: 'Nombra 1 sabor que puedes sentir' },
];

function GroundingCard({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = GROUNDING_STEPS[currentStep];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentStep < GROUNDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <View style={groundStyles.container}>
      {step && (
        <>
          <View style={groundStyles.card}>
            <Text style={groundStyles.emoji}>{step.emoji}</Text>
            <Text style={groundStyles.count}>{step.count}</Text>
            <Text style={groundStyles.sense}>cosas que {step.sense}</Text>
            <Text style={groundStyles.prompt}>{step.prompt}</Text>
          </View>

          <Text style={groundStyles.progress}>
            Paso {currentStep + 1} de {GROUNDING_STEPS.length}
          </Text>

          <KButton
            title={currentStep < GROUNDING_STEPS.length - 1 ? 'Siguiente' : 'Terminar'}
            onPress={handleNext}
            size="lg"
            accessibilityLabel={
              currentStep < GROUNDING_STEPS.length - 1
                ? 'Ir al siguiente sentido'
                : 'Completar ejercicio de anclaje'
            }
          />
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Muscle Relaxation Component
// ---------------------------------------------------------------------------

const MUSCLE_GROUPS = [
  { name: 'Manos', instruction: 'Aprieta los pu\u00F1os con fuerza por 5 segundos, luego su\u00E9ltalos.' },
  { name: 'Hombros', instruction: 'Levanta los hombros hacia las orejas, mant\u00E9n 5 segundos, y deja caer.' },
  { name: 'Rostro', instruction: 'Arruga la cara (frente, ojos, boca) por 5 segundos, luego relajala.' },
  { name: 'Piernas', instruction: 'Tensa los muslos y pantorrillas por 5 segundos, y su\u00E9ltalos.' },
  { name: 'Todo el cuerpo', instruction: 'Tensa todo tu cuerpo a la vez por 5 segundos, y libera la tensi\u00F3n con una exhalaci\u00F3n larga.' },
];

function MuscleRelaxation({ onComplete }: { onComplete: () => void }) {
  const [currentGroup, setCurrentGroup] = useState(0);
  const group = MUSCLE_GROUPS[currentGroup];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentGroup < MUSCLE_GROUPS.length - 1) {
      setCurrentGroup((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <View style={groundStyles.container}>
      {group && (
        <>
          <View style={groundStyles.card}>
            <Text style={groundStyles.emoji}>{'\uD83E\uDDD8'}</Text>
            <Text style={[groundStyles.sense, { marginBottom: spacing.sm }]}>{group.name}</Text>
            <Text style={groundStyles.prompt}>{group.instruction}</Text>
          </View>

          <Text style={groundStyles.progress}>
            Grupo {currentGroup + 1} de {MUSCLE_GROUPS.length}
          </Text>

          <KButton
            title={currentGroup < MUSCLE_GROUPS.length - 1 ? 'Siguiente grupo' : 'Terminar'}
            onPress={handleNext}
            size="lg"
            accessibilityLabel={
              currentGroup < MUSCLE_GROUPS.length - 1
                ? 'Siguiente grupo muscular'
                : 'Completar relajaci\u00F3n muscular'
            }
          />
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Crisis Screen
// ---------------------------------------------------------------------------

export default function CrisisScreen() {
  const [selectedTechnique, setSelectedTechnique] = useState<string>('respiracion_478');
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(() => Date.now());

  const technique = TECHNIQUES.find((t) => t.id === selectedTechnique);

  // ── Handle technique completion ─────────────────────────────────────
  const handleComplete = useCallback(async () => {
    setCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Log to SQLite
    try {
      const durationMinutes = Math.round((Date.now() - startTime) / 60000);
      await insertEpisodio({
        tecnica_usada: selectedTechnique,
        duracion_minutos: Math.max(1, durationMinutes),
      });
    } catch (error) {
      console.warn('[CrisisScreen] Failed to log episode:', error);
    }
  }, [selectedTechnique, startTime]);

  // ── Reset ───────────────────────────────────────────────────────────
  const handleReset = () => {
    setCompleted(false);
  };

  // ── Render technique content ────────────────────────────────────────
  const renderTechnique = () => {
    if (completed) {
      return (
        <View style={styles.completedSection}>
          <Text style={styles.completedEmoji}>{'\uD83C\uDF1F'}</Text>
          <Text style={styles.completedTitle}>{'\u00A1'}Lo lograste!</Text>
          <Text style={styles.completedText}>
            Te tomaste un momento para cuidarte. Eso es lo que importa. {'\u00BF'}Te sientes un poco mejor?
          </Text>
          <View style={styles.completedActions}>
            <KButton
              title="Repetir ejercicio"
              onPress={handleReset}
              variant="outline"
              accessibilityLabel="Repetir el ejercicio de calma"
            />
            <KButton
              title="Estoy mejor"
              onPress={handleReset}
              variant="primary"
              accessibilityLabel="Confirmar que me siento mejor"
            />
          </View>
        </View>
      );
    }

    switch (technique?.type) {
      case 'breathing':
        return <BreathingRing onComplete={handleComplete} />;
      case 'grounding':
        return <GroundingCard onComplete={handleComplete} />;
      case 'muscle':
        return <MuscleRelaxation onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title} accessibilityRole="header">
          Calmar crisis
        </Text>
        <Text style={styles.subtitle}>
          Est\u00E1s a salvo aqu\u00ED. Elige una t\u00E9cnica que te ayude a sentirte mejor.
        </Text>

        {/* Technique Selector */}
        <View style={styles.techniqueSelector}>
          {TECHNIQUES.map((t) => (
            <KChip
              key={t.id}
              label={`${t.emoji} ${t.name}`}
              selected={selectedTechnique === t.id}
              onPress={() => {
                setSelectedTechnique(t.id);
                setCompleted(false);
              }}
              accessibilityLabel={`T\u00E9cnica: ${t.name}`}
            />
          ))}
        </View>

        {/* Technique description */}
        {technique && !completed && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{technique.description}</Text>
          </View>
        )}

        {/* Technique content */}
        <View style={styles.techniqueContent}>
          {renderTechnique()}
        </View>

        <View style={styles.tabBarSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Main Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.app,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    fontFamily: fonts.serif.regular,
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
  },
  techniqueSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  descriptionCard: {
    backgroundColor: colors.primaryXLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  descriptionText: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.primary,
  },
  techniqueContent: {
    alignItems: 'center',
    minHeight: 300,
  },
  completedSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  completedEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  completedTitle: {
    fontFamily: fonts.serif.regular,
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  completedText: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  completedActions: {
    flexDirection: 'row',
    gap: spacing.ms,
  },
  tabBarSpacer: {
    height: Platform.OS === 'ios' ? 100 : 76,
  },
});

// ---------------------------------------------------------------------------
// Breathing Styles
// ---------------------------------------------------------------------------

const RING_SIZE = 200;

const breathStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    width: '100%',
  },
  ringContainer: {
    width: RING_SIZE + 40,
    height: RING_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 6,
    backgroundColor: colors.primaryXLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContent: {
    alignItems: 'center',
  },
  phaseLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  countdown: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 48,
    color: colors.text.primary,
  },
  readyEmoji: {
    fontSize: 48,
  },
  cycleText: {
    fontFamily: fonts.sans.medium,
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: spacing.lg,
  },
});

// ---------------------------------------------------------------------------
// Grounding Styles
// ---------------------------------------------------------------------------

const groundStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    width: '100%',
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  count: {
    fontFamily: fonts.serif.medium,
    fontSize: 56,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sense: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 16,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  prompt: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  progress: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
});
