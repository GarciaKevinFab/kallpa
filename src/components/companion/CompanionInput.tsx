import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface CompanionInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

// ---------- send arrow icon (pure text, no icon lib) ----------

const SendArrow: React.FC<{ active: boolean }> = ({ active }) => (
  <Text
    style={[
      sendStyles.arrow,
      { color: active ? colors.white : colors.text.muted },
    ]}
    accessibilityElementsHidden
  >
    {'\u2191'}
  </Text>
);

const sendStyles = StyleSheet.create({
  arrow: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
});

// ---------- main component ----------

export const CompanionInput: React.FC<CompanionInputProps> = ({
  onSend,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const focusScale = useSharedValue(0);

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSend(trimmed);
    setText('');
  }, [text, disabled, onSend]);

  const handleFocus = () => {
    focusScale.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    focusScale.value = withTiming(0, { duration: 200 });
  };

  const borderAnimStyle = useAnimatedStyle(() => ({
    borderColor:
      focusScale.value > 0.5 ? colors.primary : colors.border,
  }));

  return (
    <Animated.View
      style={[styles.container, borderAnimStyle]}
      accessibilityLabel="Campo de entrada de chat"
    >
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Escribe como te sientes..."
        placeholderTextColor={colors.text.muted}
        editable={!disabled}
        multiline
        maxLength={500}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="default"
        accessibilityLabel="Escribe como te sientes"
        accessibilityState={{ disabled }}
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensaje"
        accessibilityState={{ disabled: !canSend }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.sendButton,
          canSend ? styles.sendActive : styles.sendInactive,
          pressed && canSend && styles.sendPressed,
        ]}
      >
        <SendArrow active={canSend} />
      </Pressable>
    </Animated.View>
  );
};

// ---------- styles ----------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.background.card,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    color: colors.text.primary,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 6 : 8,
    paddingBottom: Platform.OS === 'ios' ? 6 : 8,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 1,
  },
  sendActive: {
    backgroundColor: colors.primary,
  },
  sendInactive: {
    backgroundColor: colors.background.secondary,
  },
  sendPressed: {
    backgroundColor: colors.primaryDark,
  },
});

export default CompanionInput;
