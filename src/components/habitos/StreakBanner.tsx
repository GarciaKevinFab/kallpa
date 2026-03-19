import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface StreakBannerProps {
  diasActivos: number;
  progresoSemanal: number; // 0-7
}

// ---------- weekly progress bar ----------

const WeeklyProgress: React.FC<{ progress: number }> = ({ progress }) => {
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <View style={weekStyles.container}>
      {days.map((label, i) => {
        const filled = i < progress;
        return (
          <View key={label + i} style={weekStyles.dayColumn}>
            <View
              style={[
                weekStyles.segment,
                filled ? weekStyles.segmentFilled : weekStyles.segmentEmpty,
              ]}
              accessibilityLabel={`${label}: ${filled ? 'completado' : 'pendiente'}`}
            />
            <Text style={[weekStyles.dayLabel, filled && weekStyles.dayLabelFilled]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const weekStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 6,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  segment: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  segmentFilled: {
    backgroundColor: colors.white,
  },
  segmentEmpty: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dayLabel: {
    fontFamily: fonts.sans.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  dayLabelFilled: {
    color: colors.white,
  },
});

// ---------- main component ----------

export const StreakBanner: React.FC<StreakBannerProps> = ({
  diasActivos,
  progresoSemanal,
}) => {
  const clamped = Math.min(Math.max(progresoSemanal, 0), 7);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(100)}
      style={styles.wrapper}
      accessibilityLabel={`Racha de ${diasActivos} días activos. Progreso semanal: ${clamped} de 7 días`}
      accessibilityRole="summary"
    >
      {/* Gradient background via SVG */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="bannerGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.primary} />
              <Stop offset="0.6" stopColor={colors.primaryDark} />
              <Stop offset="1" stopColor="#2D2570" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" rx={18} fill="url(#bannerGrad)" />
        </Svg>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Fire + big number */}
        <View style={styles.topRow}>
          <Text style={styles.fireEmoji}>{'\uD83D\uDD25'}</Text>
          <Text style={styles.bigNumber}>{diasActivos}</Text>
          <Text style={styles.daysLabel}>
            {diasActivos === 1 ? 'dia activo' : 'dias activos'}
          </Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {'\uD83C\uDF31'} Tu jardin nunca retrocede
        </Text>

        {/* Weekly bar */}
        <WeeklyProgress progress={clamped} />
      </View>
    </Animated.View>
  );
};

// ---------- styles ----------

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fireEmoji: {
    fontSize: 26,
    marginRight: 6,
  },
  bigNumber: {
    fontFamily: fonts.serif.medium,
    fontSize: 42,
    color: colors.white,
    lineHeight: 48,
  },
  daysLabel: {
    fontFamily: fonts.sans.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
    paddingBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
});

export default StreakBanner;
