import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, radii, shadows } from '../../theme/spacing';
import { fonts } from '../../theme/typography';

// ── Types ──────────────────────────────────────────────────────────────

interface GroundingCardProps {
  /** Called when all 5 steps are completed. */
  onComplete?: () => void;
}

interface GroundingStep {
  count: number;
  sense: string;
  emoji: string;
  instruction: string;
  placeholder: string;
}

// ── Data ───────────────────────────────────────────────────────────────

const GROUNDING_STEPS: GroundingStep[] = [
  {
    count: 5,
    sense: 'VES',
    emoji: '\uD83D\uDC41\uFE0F',
    instruction: 'Nombra 5 cosas que puedas VER a tu alrededor.',
    placeholder: 'Ej: la pared, mi mano, una planta...',
  },
  {
    count: 4,
    sense: 'TOCAS',
    emoji: '\u270B',
    instruction: 'Nombra 4 cosas que puedas TOCAR ahora mismo.',
    placeholder: 'Ej: la mesa, mi ropa, el suelo...',
  },
  {
    count: 3,
    sense: 'ESCUCHAS',
    emoji: '\uD83D\uDC42',
    instruction: 'Nombra 3 cosas que puedas ESCUCHAR.',
    placeholder: 'Ej: el viento, m\u00FAsica lejana...',
  },
  {
    count: 2,
    sense: 'HUELES',
    emoji: '\uD83D\uDC43',
    instruction: 'Nombra 2 cosas que puedas OLER.',
    placeholder: 'Ej: el aire fresco, mi perfume...',
  },
  {
    count: 1,
    sense: 'SABOREAS',
    emoji: '\uD83D\uDC45',
    instruction: 'Nombra 1 cosa que puedas SABOREAR.',
    placeholder: 'Ej: un vaso de agua, mi labio...',
  },
];

const TOTAL_STEPS = GROUNDING_STEPS.length;

// ── Component ──────────────────────────────────────────────────────────

export default function GroundingCard({ onComplete }: GroundingCardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(
    Array(TOTAL_STEPS).fill(''),
  );
  const [completed, setCompleted] = useState(false);

  const step = GROUNDING_STEPS[currentStep];

  const updateAnswer = useCallback(
    (text: string) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentStep] = text;
        return next;
      });
    },
    [currentStep],
  );

  const goNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // All steps done
      setCompleted(true);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      onComplete?.();
    }
  }, [currentStep, onComplete]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const hasAnswer = answers[currentStep]?.trim().length > 0;

  if (completed) {
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        style={styles.completionContainer}
      >
        <Text style={styles.completionEmoji}>{'\uD83C\uDF1F'}</Text>
        <Text style={styles.completionTitle}>Bien hecho.</Text>
        <Text style={styles.completionMessage}>
          Est{'\u00E1'}s aqu{'\u00ED'} y est{'\u00E1'}s bien.
        </Text>
        <Pressable
          onPress={() => {
            setCurrentStep(0);
            setAnswers(Array(TOTAL_STEPS).fill(''));
            setCompleted(false);
          }}
          style={styles.repeatBtn}
          accessibilityLabel="Repetir ejercicio de grounding"
          accessibilityRole="button"
        >
          <Text style={styles.repeatBtnText}>Repetir</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressRow}>
        {GROUNDING_STEPS.map((s, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i < currentStep && styles.progressDotDone,
              i === currentStep && styles.progressDotCurrent,
            ]}
          >
            <Text
              style={[
                styles.progressDotText,
                (i <= currentStep) && styles.progressDotTextActive,
              ]}
            >
              {s.count}
            </Text>
          </View>
        ))}
      </View>

      {/* Card */}
      <Animated.View
        key={`grounding-step-${currentStep}`}
        entering={FadeInRight.duration(250)}
        exiting={FadeOutLeft.duration(200)}
        style={styles.card}
      >
        <Text style={styles.emoji}>{step.emoji}</Text>
        <Text style={styles.countBadge}>
          {step.count} {step.count === 1 ? 'cosa' : 'cosas'} que {step.sense}
        </Text>
        <Text style={styles.instruction}>{step.instruction}</Text>

        <TextInput
          style={styles.textInput}
          placeholder={step.placeholder}
          placeholderTextColor={colors.text.muted}
          value={answers[currentStep]}
          onChangeText={updateAnswer}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel={`${step.count} cosas que ${step.sense.toLowerCase()}`}
        />
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navRow}>
        {currentStep > 0 ? (
          <Pressable
            onPress={goPrev}
            style={styles.navBtnSecondary}
            accessibilityLabel="Paso anterior"
            accessibilityRole="button"
          >
            <Text style={styles.navBtnSecondaryText}>Anterior</Text>
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}

        <Pressable
          onPress={goNext}
          disabled={!hasAnswer}
          style={[
            styles.navBtnPrimary,
            !hasAnswer && styles.navBtnDisabled,
          ]}
          accessibilityLabel={
            currentStep < TOTAL_STEPS - 1
              ? 'Siguiente sentido'
              : 'Completar ejercicio'
          }
          accessibilityRole="button"
        >
          <Text style={styles.navBtnPrimaryText}>
            {currentStep < TOTAL_STEPS - 1 ? 'Siguiente' : 'Completar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  progressDotDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  progressDotCurrent: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  progressDotText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13,
    color: colors.text.tertiary,
  },
  progressDotTextActive: {
    color: colors.white,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.ms,
    ...shadows.md,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  countBadge: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.primary,
    textAlign: 'center',
  },
  instruction: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    backgroundColor: colors.background.app,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.ms,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
    minHeight: 80,
    marginTop: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.ms,
  },
  navSpacer: {
    flex: 1,
  },
  navBtnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.ms,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnPrimaryText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.white,
  },
  navBtnSecondary: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: radii.md,
    paddingVertical: spacing.ms,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnSecondaryText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.text.primary,
  },

  // Completion
  completionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  completionEmoji: {
    fontSize: 48,
  },
  completionTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text.primary,
  },
  completionMessage: {
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  repeatBtn: {
    backgroundColor: colors.background.secondary,
    borderRadius: radii.full,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repeatBtnText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
});
