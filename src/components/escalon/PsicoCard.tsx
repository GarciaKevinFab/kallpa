import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

// ---------- types ----------

export interface TimeSlot {
  id: string;
  hora: string;       // e.g. "10:00"
  disponible: boolean;
}

interface PsicoCardProps {
  nombre: string;
  especialidad: string;
  slotsDisponibles: TimeSlot[];
  selectedSlot?: string | null;
  onSelectSlot: (slotId: string) => void;
}

// ---------- avatar ----------

const AvatarInitials: React.FC<{ nombre: string }> = ({ nombre }) => {
  const parts = nombre.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : nombre.slice(0, 2).toUpperCase();

  return (
    <View style={avatarStyles.circle} accessibilityElementsHidden>
      <Text style={avatarStyles.text}>{initials}</Text>
    </View>
  );
};

const avatarStyles = StyleSheet.create({
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    color: colors.primary,
  },
});

// ---------- slot pill ----------

const SlotPill: React.FC<{
  slot: TimeSlot;
  selected: boolean;
  onPress: () => void;
}> = ({ slot, selected, onPress }) => {
  const isAvailable = slot.disponible;

  const handlePress = () => {
    if (!isAvailable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isAvailable}
      accessibilityRole="button"
      accessibilityLabel={`Horario ${slot.hora}, ${isAvailable ? (selected ? 'seleccionado' : 'disponible') : 'ocupado'}`}
      accessibilityState={{ disabled: !isAvailable, selected }}
      style={({ pressed }) => [
        pillStyles.base,
        isAvailable ? pillStyles.available : pillStyles.occupied,
        selected && pillStyles.selected,
        pressed && isAvailable && pillStyles.pressed,
      ]}
    >
      <Text
        style={[
          pillStyles.label,
          isAvailable ? pillStyles.labelAvailable : pillStyles.labelOccupied,
          selected && pillStyles.labelSelected,
        ]}
      >
        {slot.hora}
      </Text>
    </Pressable>
  );
};

const pillStyles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
    marginBottom: 8,
  },
  available: {
    backgroundColor: colors.accentLight,
  },
  occupied: {
    backgroundColor: '#F0EEF5',
    opacity: 0.6,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
  },
  labelAvailable: {
    color: colors.accent,
  },
  labelOccupied: {
    color: colors.text.muted,
  },
  labelSelected: {
    color: colors.primary,
  },
});

// ---------- main component ----------

export const PsicoCard: React.FC<PsicoCardProps> = ({
  nombre,
  especialidad,
  slotsDisponibles,
  selectedSlot,
  onSelectSlot,
}) => {
  return (
    <Animated.View
      entering={FadeIn.duration(350)}
      style={styles.card}
      accessibilityLabel={`Psicólogo ${nombre}, especialidad ${especialidad}`}
    >
      {/* Header */}
      <View style={styles.header}>
        <AvatarInitials nombre={nombre} />
        <View style={styles.headerText}>
          <Text style={styles.nombre} numberOfLines={1}>
            {nombre}
          </Text>
          <Text style={styles.especialidad} numberOfLines={1}>
            {especialidad}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Slots */}
      <Text style={styles.slotsTitle}>Horarios disponibles</Text>
      <View style={styles.slotsRow}>
        {slotsDisponibles.map((slot) => (
          <SlotPill
            key={slot.id}
            slot={slot}
            selected={selectedSlot === slot.id}
            onPress={() => onSelectSlot(slot.id)}
          />
        ))}
      </View>

      {slotsDisponibles.length === 0 && (
        <Text style={styles.noSlots}>No hay horarios disponibles</Text>
      )}
    </Animated.View>
  );
};

// ---------- styles ----------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 14,
  },
  nombre: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 22,
  },
  especialidad: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  slotsTitle: {
    fontFamily: fonts.sans.medium,
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noSlots: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
});

export default PsicoCard;
