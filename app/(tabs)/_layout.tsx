import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';

// ---------------------------------------------------------------------------
// Tab icon component (emoji-based to avoid external icon library dependency)
// ---------------------------------------------------------------------------

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <Text
        style={[styles.tabEmoji, focused && styles.tabEmojiActive]}
        accessibilityLabel={label}
      >
        {emoji}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tab Layout
// ---------------------------------------------------------------------------

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarAccessibilityLabel: 'Pantalla de inicio',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={'\uD83C\uDFE0'} label="Inicio" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="diario"
        options={{
          title: 'Diario',
          tabBarAccessibilityLabel: 'Diario cognitivo',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={'\uD83D\uDCD3'} label="Diario" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="crisis"
        options={{
          title: 'Crisis',
          tabBarAccessibilityLabel: 'Calmar crisis',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={'\uD83C\uDF3F'} label="Crisis" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="habitos"
        options={{
          title: 'H\u00E1bitos',
          tabBarAccessibilityLabel: 'Micro-h\u00E1bitos',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={'\uD83C\uDF31'} label="H\u00E1bitos" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ayuda"
        options={{
          title: 'Ayuda',
          tabBarAccessibilityLabel: 'Escal\u00F3n de ayuda',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={'\uD83E\uDD1D'} label="Ayuda" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 8,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  tabLabel: {
    fontFamily: fonts.sans.medium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 28,
  },
  tabEmoji: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabEmojiActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
});
