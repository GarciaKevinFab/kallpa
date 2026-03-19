export const colors = {
  // Primary palette
  primary: '#534AB7',
  primaryDark: '#3C3489',
  primaryLight: '#EEEDFE',
  primaryXLight: '#F7F4FF',

  // Semantic accents
  accent: '#1D9E75',
  accentLight: '#E1F5EE',
  warm: '#D85A30',
  warmLight: '#FAECE7',
  amber: '#BA7517',
  amberLight: '#FAEEDA',

  // Text hierarchy
  text: {
    primary: '#26215C',
    secondary: '#534AB7',
    tertiary: '#8B7DD8',
    muted: '#B4AEDD',
  },

  // Backgrounds
  background: {
    app: '#F7F4FF',
    card: '#FFFFFF',
    secondary: '#EEEDFE',
  },

  // UI elements
  border: '#E8E2FF',
  success: '#1D9E75',
  danger: '#E24B4A',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type Colors = typeof colors;
