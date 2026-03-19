import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface KProgressRingProps {
  /** Progress value between 0 and 1. */
  progress: number;
  /** Outer diameter in pixels. Default 80. */
  size?: number;
  /** Ring stroke width in pixels. Default 8. */
  strokeWidth?: number;
  /** Active ring color. Defaults to primary. */
  color?: string;
  /** Background ring color. Defaults to primaryLight. */
  trackColor?: string;
  /** Whether to display the percentage number in the centre. Default true. */
  showPercentage?: boolean;
  /** Animation duration in ms. Default 600. */
  duration?: number;
  accessibilityLabel?: string;
}

export const KProgressRing: React.FC<KProgressRingProps> = ({
  progress,
  size = 80,
  strokeWidth = 8,
  color = colors.primary,
  trackColor = colors.primaryLight,
  showPercentage = true,
  duration = 600,
  accessibilityLabel,
}) => {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = size / 2;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(clampedProgress, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProgress, duration, animatedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return { strokeDashoffset };
  });

  const pctText = `${Math.round(clampedProgress * 100)}%`;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `Progreso: ${pctText}`}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clampedProgress * 100),
      }}
    >
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={centre}
          cy={centre}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={centre}
          cy={centre}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          // Rotate so progress starts from the top (12 o'clock)
          transform={`rotate(-90 ${centre} ${centre})`}
        />
      </Svg>

      {showPercentage && (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.percentageText,
              {
                fontSize: size * 0.22,
                color: color,
              },
            ]}
          >
            {pctText}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontFamily: fonts.sans.semiBold,
    textAlign: 'center',
  },
});

export default KProgressRing;
