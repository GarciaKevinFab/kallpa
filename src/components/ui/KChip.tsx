import React, { useEffect } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface KChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  accessibilityLabel?: string;
}

const ANIM_DURATION = 200;
const ANIM_CONFIG = { duration: ANIM_DURATION, easing: Easing.out(Easing.quad) };

export const KChip: React.FC<KChipProps> = ({
  label,
  selected = false,
  onPress,
  color,
  accessibilityLabel,
}) => {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, ANIM_CONFIG);
  }, [selected, progress]);

  const activeBg = color ?? colors.primary;
  const inactiveBg = colors.primaryLight;

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [inactiveBg, activeBg],
    );
    return { backgroundColor };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const textColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.primary, colors.white],
    );
    return { color: textColor };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={[styles.container, animatedContainerStyle]}
    >
      <Animated.Text style={[styles.label, animatedTextStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default KChip;
