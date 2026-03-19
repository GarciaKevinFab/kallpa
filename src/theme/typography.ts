import { TextStyle } from 'react-native';
import { colors } from './colors';

export const fonts = {
  sans: {
    regular: 'DMSans-Regular',
    medium: 'DMSans-Medium',
    semiBold: 'DMSans-SemiBold',
  },
  serif: {
    regular: 'PlayfairDisplay-Regular',
    medium: 'PlayfairDisplay-Medium',
  },
} as const;

export const textStyles = {
  /** Serif display heading -- hero sections, screen titles */
  h1: {
    fontFamily: fonts.serif.regular,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text.primary,
  } satisfies TextStyle,

  /** Sans-serif section heading */
  h2: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text.primary,
  } satisfies TextStyle,

  /** Sans-serif sub-heading / card title */
  h3: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.primary,
  } satisfies TextStyle,

  /** Default body text */
  body: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
  } satisfies TextStyle,

  /** Smaller body variant */
  bodySmall: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.primary,
  } satisfies TextStyle,

  /** Captions, timestamps, metadata */
  caption: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.text.tertiary,
  } satisfies TextStyle,

  /** Button labels */
  button: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  } satisfies TextStyle,

  /** Small button / tag labels */
  buttonSmall: {
    fontFamily: fonts.sans.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  } satisfies TextStyle,

  /** Tab bar labels */
  tabLabel: {
    fontFamily: fonts.sans.medium,
    fontSize: 10,
    lineHeight: 14,
    color: colors.text.tertiary,
  } satisfies TextStyle,
} as const;

export type TextStyles = typeof textStyles;
