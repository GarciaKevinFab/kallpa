import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: string; // e.g. "10:32 AM"
}

// ---------- companion avatar ----------

const CompanionAvatar: React.FC = () => (
  <View style={avatarStyles.circle} accessibilityElementsHidden>
    <Text style={avatarStyles.letter}>K</Text>
  </View>
);

const avatarStyles = StyleSheet.create({
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  letter: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 15,
    color: colors.white,
    lineHeight: 18,
  },
});

// ---------- main component ----------

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isUser,
  timestamp,
}) => {
  return (
    <Animated.View
      entering={FadeInUp.duration(250).delay(50)}
      style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperCompanion]}
      accessibilityLabel={`${isUser ? 'Tu' : 'Kallpa'}: ${message}. ${timestamp}`}
    >
      {/* Avatar (companion only) */}
      {!isUser && <CompanionAvatar />}

      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleCompanion,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.textUser : styles.textCompanion,
          ]}
        >
          {message}
        </Text>
        <Text
          style={[
            styles.timestamp,
            isUser ? styles.timestampUser : styles.timestampCompanion,
          ]}
        >
          {timestamp}
        </Text>
      </View>
    </Animated.View>
  );
};

// ---------- styles ----------

const SHADOW_USER = {
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
  elevation: 3,
};

const SHADOW_COMPANION = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  wrapperUser: {
    justifyContent: 'flex-end',
  },
  wrapperCompanion: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
    ...SHADOW_USER,
  },
  bubbleCompanion: {
    backgroundColor: colors.background.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOW_COMPANION,
  },
  messageText: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  textUser: {
    color: colors.white,
  },
  textCompanion: {
    color: colors.text.primary,
  },
  timestamp: {
    fontFamily: fonts.sans.regular,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.65)',
  },
  timestampCompanion: {
    color: colors.text.muted,
  },
});

export default ChatBubble;
