import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, radii, shadows } from '../../theme/spacing';
import { fonts } from '../../theme/typography';
import { insertHumor } from '../../db/queries/humor';

// ── Types ──────────────────────────────────────────────────────────────

interface MoodOption {
  nivel: number;
  emoji: string;
  label: string;
}

interface MoodSelectorProps {
  /** Called after a mood is selected (and optionally persisted). */
  onSelect: (nivel: number) => void;
  /** Optional context string saved alongside the mood record. */
  contexto?: string;
  /** If true, skips SQLite persistence (useful in previews / tests). */
  skipPersist?: boolean;
}

// ── Data ───────────────────────────────────────────────────────────────

const MOOD_OPTIONS: MoodOption[] = [
  { nivel: 1, emoji: '\uD83D\uDE14', label: 'Bajo' },
  { nivel: 2, emoji: '\uD83D\uDE10', label: 'Neutro' },
  { nivel: 3, emoji: '\uD83D\uDE42', label: 'Bien' },
  { nivel: 4, emoji: '\uD83D\uDE0A', label: 'Muy bien' },
  { nivel: 5, emoji: '\uD83E\uDD29', label: 'Genial' },
];

// ── Animated Button ────────────────────────────────────────────────────

interface MoodButtonProps {
  option: MoodOption;
  isSelected: boolean;
  showCheck: boolean;
  onPress: (nivel: number) => void;
}

function MoodButton({ option, isSelected, showCheck, onPress }: MoodButtonProps) {
  const scale = useSharedValue(1);
  const checkOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (isSelected) {
      // Bounce animation
      scale.value = withSequence(
        withSpring(1.25, { damping: 6, stiffness: 200 }),
        withSpring(1.15, { damping: 8, stiffness: 150 }),
      );
    } else {
      scale.value = withSpring(1, { damping: 10 });
    }
  }, [isSelected, scale]);

  React.useEffect(() => {
    checkOpacity.value = showCheck
      ? withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(1, { duration: 800 }),
          withTiming(0, { duration: 400 }),
        )
      : withTiming(0, { duration: 150 });
  }, [showCheck, checkOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  const handlePress = useCallback(() => {
    onPress(option.nivel);
  }, [onPress, option.nivel]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={`Estado de ${option.label}, nivel ${option.nivel}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={styles.buttonWrapper}
    >
      <Animated.View
        style={[
          styles.moodCircle,
          isSelected && styles.moodCircleSelected,
          animatedStyle,
        ]}
      >
        <Text style={styles.emoji}>{option.emoji}</Text>

        {/* Subtle confirmation check */}
        <Animated.View style={[styles.checkBadge, checkStyle]}>
          <Text style={styles.checkMark}>{'\u2713'}</Text>
        </Animated.View>
      </Animated.View>

      <Text
        style={[styles.label, isSelected && styles.labelSelected]}
        numberOfLines={1}
      >
        {option.label}
      </Text>
    </Pressable>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function MoodSelector({
  onSelect,
  contexto,
  skipPersist = false,
}: MoodSelectorProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showCheck, setShowCheck] = useState(false);

  const handleSelect = useCallback(
    async (nivel: number) => {
      setSelected(nivel);
      setShowCheck(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Persist to SQLite
      if (!skipPersist) {
        try {
          await insertHumor(nivel, contexto);
        } catch (err) {
          console.warn('[MoodSelector] Failed to persist mood:', err);
        }
      }

      onSelect(nivel);

      // Reset check after animation finishes
      setTimeout(() => setShowCheck(false), 1400);
    },
    [onSelect, contexto, skipPersist],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {'\u00BF'}C{'\u00F3'}mo te sientes?
      </Text>
      <View style={styles.row}>
        {MOOD_OPTIONS.map((option) => (
          <MoodButton
            key={option.nivel}
            option={option}
            isSelected={selected === option.nivel}
            showCheck={showCheck && selected === option.nivel}
            onPress={handleSelect}
          />
        ))}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const CIRCLE_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.ms,
  },
  buttonWrapper: {
    alignItems: 'center',
    width: CIRCLE_SIZE + spacing.sm,
  },
  moodCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  moodCircleSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    ...shadows.md,
  },
  emoji: {
    fontSize: 26,
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: colors.white,
    fontSize: 12,
    fontFamily: fonts.sans.semiBold,
  },
  label: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.primary,
    fontFamily: fonts.sans.semiBold,
  },
});
