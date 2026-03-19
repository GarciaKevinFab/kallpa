import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

// ---------- types ----------

export interface Slot {
  id: string;
  hora: string;       // e.g. "09:30"
  disponible: boolean;
}

interface SlotPickerProps {
  slots: Slot[];
  selectedSlot: string | null;
  onSelect: (slotId: string) => void;
}

// ---------- single pill ----------

const SlotPill: React.FC<{
  slot: Slot;
  selected: boolean;
  onPress: () => void;
}> = ({ slot, selected, onPress }) => {
  const available = slot.disponible;

  const handlePress = () => {
    if (!available) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!available}
      accessibilityRole="button"
      accessibilityLabel={`Horario ${slot.hora}, ${available ? (selected ? 'seleccionado' : 'disponible') : 'ocupado'}`}
      accessibilityState={{ disabled: !available, selected }}
      style={({ pressed }) => [
        styles.pill,
        available ? styles.pillAvailable : styles.pillOccupied,
        selected && styles.pillSelected,
        pressed && available && styles.pillPressed,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          available ? styles.textAvailable : styles.textOccupied,
          selected && styles.textSelected,
        ]}
      >
        {slot.hora}
      </Text>
    </Pressable>
  );
};

// ---------- main component ----------

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  selectedSlot,
  onSelect,
}) => {
  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay horarios disponibles</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.grid}
      accessibilityRole="radiogroup"
      accessibilityLabel="Seleccionar horario"
    >
      {slots.map((slot) => (
        <SlotPill
          key={slot.id}
          slot={slot}
          selected={selectedSlot === slot.id}
          onPress={() => onSelect(slot.id)}
        />
      ))}
    </View>
  );
};

// ---------- styles ----------

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
    alignItems: 'center',
  },
  pillAvailable: {
    backgroundColor: colors.accentLight,
  },
  pillOccupied: {
    backgroundColor: '#F0EEF5',
    opacity: 0.55,
  },
  pillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pillPressed: {
    opacity: 0.8,
  },
  pillText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
  },
  textAvailable: {
    color: colors.accent,
  },
  textOccupied: {
    color: colors.text.muted,
  },
  textSelected: {
    color: colors.primary,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
});

export default SlotPicker;
