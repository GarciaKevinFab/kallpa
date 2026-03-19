import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface ConsentToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

// ---------- lock icon (text-based, no extra dependency) ----------

const LockIcon: React.FC = () => (
  <Text style={lockStyles.icon} accessibilityElementsHidden>
    {'\uD83D\uDD12'}
  </Text>
);

const lockStyles = StyleSheet.create({
  icon: {
    fontSize: 18,
  },
});

// ---------- main component ----------

export const ConsentToggle: React.FC<ConsentToggleProps> = ({
  enabled,
  onToggle,
}) => {
  const expandProgress = useSharedValue(enabled ? 1 : 0);

  useEffect(() => {
    expandProgress.value = withTiming(enabled ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [enabled, expandProgress]);

  const expandStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(expandProgress.value, [0, 1], [0, 160]),
    opacity: expandProgress.value,
    marginTop: interpolate(expandProgress.value, [0, 1], [0, 12]),
  }));

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(value);
  };

  return (
    <View style={styles.container}>
      {/* Toggle row */}
      <View style={styles.row}>
        <LockIcon />
        <Text style={styles.label}>Compartir reporte con tu psicologo</Text>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{
            false: colors.border,
            true: colors.accent,
          }}
          thumbColor={Platform.OS === 'android' ? colors.white : undefined}
          ios_backgroundColor={colors.border}
          accessibilityLabel={`Compartir reporte con psicologo, ${enabled ? 'activado' : 'desactivado'}`}
          accessibilityRole="switch"
        />
      </View>

      {/* Expandable explanation */}
      <Animated.View style={[styles.explanationWrap, expandStyle]}>
        <View style={styles.explanationCard}>
          <Text style={styles.explanationTitle}>
            {'\u2139\uFE0F'} Tu psicologo recibira:
          </Text>
          <Text style={styles.explanationBody}>
            {'\u2022'} Tus niveles de humor de los ultimos 7 dias{'\n'}
            {'\u2022'} Los temas generales de tu diario
          </Text>
          <View style={styles.noticeRow}>
            <LockIcon />
            <Text style={styles.noticeText}>
              NO el texto completo.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Privacy note (always visible) */}
      <View style={styles.privacyRow}>
        <LockIcon />
        <Text style={styles.privacyText}>
          Tu privacidad esta protegida
        </Text>
      </View>
    </View>
  );
};

// ---------- styles ----------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 10,
    marginRight: 12,
  },
  explanationWrap: {
    overflow: 'hidden',
  },
  explanationCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 14,
  },
  explanationTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13,
    color: colors.text.primary,
    marginBottom: 8,
  },
  explanationBody: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 22,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colors.warmLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noticeText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13,
    color: colors.warm,
    marginLeft: 6,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  privacyText: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginLeft: 6,
  },
});

export default ConsentToggle;
