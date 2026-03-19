import React from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors } from '../../theme/colors';
import { shadows, radii } from '../../theme/spacing';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface KCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const getVariantStyle = (variant: CardVariant): ViewStyle => {
  switch (variant) {
    case 'default':
      return {};
    case 'elevated':
      return shadows.md;
    case 'outlined':
      return {
        borderWidth: 1,
        borderColor: colors.border,
      };
  }
};

export const KCard: React.FC<KCardProps> = ({
  children,
  variant = 'default',
  onPress,
  padding,
  style,
  accessibilityLabel,
}) => {
  const cardStyle: ViewStyle[] = [
    styles.base,
    getVariantStyle(variant),
    padding !== undefined ? { padding } : undefined,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={cardStyle}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: 16,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});

export default KCard;
