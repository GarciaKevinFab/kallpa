import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  runOnJS,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

// ---------- types ----------

type HabitCategoria = 'salud' | 'mente' | 'social' | 'productividad' | 'creatividad' | string;

interface Habit {
  id: string;
  nombre: string;
  categoria: HabitCategoria;
  racha: number;
}

interface HabitItemProps {
  habit: Habit;
  completadoHoy: boolean;
  onToggle: (id: string) => void;
}

// ---------- helpers ----------

const CATEGORY_ICONS: Record<string, string> = {
  salud: '\u{1F3CB}',        // weight lifter
  mente: '\u{1F9E0}',        // brain
  social: '\u{1F91D}',       // handshake
  productividad: '\u{1F4CB}', // clipboard
  creatividad: '\u{1F3A8}',  // palette
};

const getCategoryIcon = (cat: HabitCategoria): string =>
  CATEGORY_ICONS[cat] ?? '\u{2B50}'; // fallback star

// ---------- particle mini-component ----------

const PARTICLE_COUNT = 6;

const Particle: React.FC<{ index: number; fire: Animated.SharedValue<number> }> = ({
  index,
  fire,
}) => {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
  const distance = 18 + (index % 3) * 6;

  const animStyle = useAnimatedStyle(() => {
    const progress = fire.value;
    return {
      opacity: progress > 0 ? 1 - progress : 0,
      transform: [
        { translateX: Math.cos(angle) * distance * progress },
        { translateY: Math.sin(angle) * distance * progress },
        { scale: 1 - progress * 0.6 },
      ],
    };
  });

  const particleColors = [colors.accent, colors.amber, colors.warm, colors.primary, '#E899C5', '#26C98A'];

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: particleColors[index % particleColors.length] },
        animStyle,
      ]}
      pointerEvents="none"
    />
  );
};

// ---------- main component ----------

export const HabitItem: React.FC<HabitItemProps> = ({ habit, completadoHoy, onToggle }) => {
  const checkScale = useSharedValue(1);
  const particleFire = useSharedValue(0);

  const handleToggle = useCallback(() => {
    if (!completadoHoy) {
      // Checking: celebrate
      checkScale.value = withSequence(
        withTiming(0.7, { duration: 80 }),
        withSpring(1.2, { damping: 4, stiffness: 300 }),
        withTiming(1, { duration: 120 }),
      );
      particleFire.value = 0;
      particleFire.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      // Un-checking: subtle scale only, NO visual penalty
      checkScale.value = withSequence(
        withTiming(0.85, { duration: 80 }),
        withTiming(1, { duration: 120 }),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    onToggle(habit.id);
  }, [completadoHoy, habit.id, onToggle, checkScale, particleFire]);

  const checkboxAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.row}>
      {/* Checkbox */}
      <Pressable
        onPress={handleToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completadoHoy }}
        accessibilityLabel={`${completadoHoy ? 'Completado' : 'Pendiente'}: ${habit.nombre}`}
        hitSlop={12}
        style={styles.checkHitArea}
      >
        <View style={styles.particleContainer}>
          {/* Particles */}
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <Particle key={i} index={i} fire={particleFire} />
          ))}

          <Animated.View
            style={[
              styles.checkbox,
              completadoHoy && styles.checkboxChecked,
              checkboxAnimStyle,
            ]}
          >
            {completadoHoy && <Text style={styles.checkmark}>{'\u2713'}</Text>}
          </Animated.View>
        </View>
      </Pressable>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={1}>
          {habit.nombre}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.categoryIcon}>{getCategoryIcon(habit.categoria)}</Text>
          <Text style={styles.categoryLabel}>{habit.categoria}</Text>
        </View>
      </View>

      {/* Streak */}
      <View
        style={styles.streakBadge}
        accessibilityLabel={`Racha de ${habit.racha} días`}
      >
        <Text style={styles.streakEmoji}>{'\uD83D\uDD25'}</Text>
        <Text style={styles.streakCount}>{habit.racha}</Text>
      </View>
    </Animated.View>
  );
};

// ---------- styles ----------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkHitArea: {
    padding: 4,
  },
  particleContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background.app,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.sans.semiBold,
    lineHeight: 18,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  nombre: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  categoryIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  categoryLabel: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  streakEmoji: {
    fontSize: 13,
    marginRight: 3,
  },
  streakCount: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
});

export default HabitItem;
