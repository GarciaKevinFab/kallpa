import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';
import { fonts } from '../../theme/typography';

// ── Types ──────────────────────────────────────────────────────────────

export type CrisisTechnique = '478' | 'box' | 'grounding';

interface TechniqueSelectorProps {
  /** Currently selected technique. */
  selected: CrisisTechnique | null;
  /** Called when a technique pill is pressed. */
  onSelect: (technique: CrisisTechnique) => void;
}

interface TechniqueOption {
  key: CrisisTechnique;
  label: string;
  accessibilityLabel: string;
}

// ── Data ───────────────────────────────────────────────────────────────

const TECHNIQUES: TechniqueOption[] = [
  {
    key: '478',
    label: 'Respiraci\u00F3n 4-7-8',
    accessibilityLabel: 'T\u00E9cnica de respiraci\u00F3n cuatro siete ocho',
  },
  {
    key: 'box',
    label: 'Respiraci\u00F3n en caja',
    accessibilityLabel: 'T\u00E9cnica de respiraci\u00F3n en caja',
  },
  {
    key: 'grounding',
    label: 'Grounding 5-4-3-2-1',
    accessibilityLabel: 'T\u00E9cnica de grounding cinco cuatro tres dos uno',
  },
];

// ── Component ──────────────────────────────────────────────────────────

export default function TechniqueSelector({
  selected,
  onSelect,
}: TechniqueSelectorProps) {
  const handlePress = useCallback(
    (key: CrisisTechnique) => {
      Haptics.selectionAsync().catch(() => {});
      onSelect(key);
    },
    [onSelect],
  );

  return (
    <View style={styles.container}>
      {TECHNIQUES.map((tech) => {
        const isActive = selected === tech.key;
        return (
          <Pressable
            key={tech.key}
            onPress={() => handlePress(tech.key)}
            accessibilityLabel={tech.accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {tech.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.primary,
  },
  pillTextActive: {
    color: colors.white,
  },
});
