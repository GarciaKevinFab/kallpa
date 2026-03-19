import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface KButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  haptic?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

const SIZE_CONFIG: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number; iconGap: number }> = {
  sm: { height: 36, paddingHorizontal: 14, fontSize: 12, iconGap: 6 },
  md: { height: 48, paddingHorizontal: 20, fontSize: 14, iconGap: 8 },
  lg: { height: 56, paddingHorizontal: 28, fontSize: 16, iconGap: 10 },
};

const getVariantStyles = (
  variant: ButtonVariant,
  pressed: boolean,
  disabled: boolean,
): { container: ViewStyle; text: TextStyle } => {
  const opacity = disabled ? 0.5 : pressed ? 0.85 : 1;

  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: pressed ? colors.primaryDark : colors.primary,
          opacity,
        },
        text: { color: colors.white },
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: pressed ? colors.border : colors.primaryLight,
          opacity,
        },
        text: { color: colors.primary },
      };
    case 'outline':
      return {
        container: {
          backgroundColor: pressed ? colors.primaryXLight : colors.transparent,
          borderWidth: 1.5,
          borderColor: colors.primary,
          opacity,
        },
        text: { color: colors.primary },
      };
    case 'ghost':
      return {
        container: {
          backgroundColor: pressed ? colors.primaryXLight : colors.transparent,
          opacity,
        },
        text: { color: colors.primary },
      };
    case 'danger':
      return {
        container: {
          backgroundColor: pressed ? '#C73F3E' : colors.danger,
          opacity,
        },
        text: { color: colors.white },
      };
  }
};

export const KButton: React.FC<KButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  haptic = true,
  accessibilityLabel,
  style,
}) => {
  const sizeConfig = SIZE_CONFIG[size];

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // Haptics not available on this device; silently ignore.
      });
    }
    onPress();
  }, [disabled, loading, haptic, onPress]);

  const indicatorColor = variant === 'primary' || variant === 'danger' ? colors.white : colors.primary;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => {
        const variantStyles = getVariantStyles(variant, pressed, disabled || loading);
        return [
          styles.base,
          {
            height: sizeConfig.height,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            borderRadius: size === 'sm' ? 10 : 14,
          },
          variantStyles.container,
          fullWidth && styles.fullWidth,
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const variantStyles = getVariantStyles(variant, pressed, disabled || loading);
        return (
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={indicatorColor}
                accessibilityLabel="Cargando"
              />
            ) : (
              <>
                {icon && <View style={{ marginRight: sizeConfig.iconGap }}>{icon}</View>}
                <Text
                  style={[
                    styles.label,
                    { fontSize: sizeConfig.fontSize },
                    variantStyles.text,
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              </>
            )}
          </View>
        );
      }}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.sans.semiBold,
    textAlign: 'center',
  },
});

export default KButton;
