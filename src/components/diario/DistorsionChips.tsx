import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';
import { fonts } from '../../theme/typography';

// ── Types ──────────────────────────────────────────────────────────────

export interface DistorsionChipsProps {
  /** Currently selected distortions. */
  selected: string[];
  /** Called when the selection changes. */
  onSelectionChange: (selected: string[]) => void;
}

// ── Data ───────────────────────────────────────────────────────────────

const DISTORSIONES: readonly string[] = [
  'Todo o nada',
  'Catastrofizaci\u00F3n',
  'Lectura de mente',
  'Personalizaci\u00F3n',
  'Descuento positivo',
  'Filtro mental',
  'Generalizaci\u00F3n',
  'Deber\u00EDa/Debo',
] as const;

// ── Component ──────────────────────────────────────────────────────────

export default function DistorsionChips({
  selected,
  onSelectionChange,
}: DistorsionChipsProps) {
  const toggle = useCallback(
    (label: string) => {
      Haptics.selectionAsync().catch(() => {});

      const isSelected = selected.includes(label);
      if (isSelected) {
        onSelectionChange(selected.filter((s) => s !== label));
      } else {
        onSelectionChange([...selected, label]);
      }
    },
    [selected, onSelectionChange],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Distorsiones cognitivas</Text>
      <View style={styles.chipRow}>
        {DISTORSIONES.map((label) => {
          const isActive = selected.includes(label);
          return (
            <Pressable
              key={label}
              onPress={() => toggle(label)}
              accessibilityLabel={`Distorsi\u00F3n: ${label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.primary,
  },
  chipTextActive: {
    color: colors.white,
  },
});
