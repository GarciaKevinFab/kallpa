/**
 * 4-point grid spacing scale.
 * Usage: spacing.md => 16
 */
export const spacing = {
  /** 0px */
  none: 0,
  /** 2px -- hairline gaps */
  xxs: 2,
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  ms: 12,
  /** 16px */
  md: 16,
  /** 20px */
  ml: 20,
  /** 24px */
  lg: 24,
  /** 32px */
  xl: 32,
  /** 40px */
  xxl: 40,
  /** 48px */
  xxxl: 48,
  /** 64px */
  huge: 64,
} as const;

/** Border-radius tokens */
export const radii = {
  /** 0px */
  none: 0,
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 20px */
  xl: 20,
  /** 24px */
  xxl: 24,
  /** 9999px -- pill shape */
  full: 9999,
} as const;

/** Consistent shadow presets (iOS + Android) */
export const shadows = {
  sm: {
    shadowColor: '#26215C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#26215C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#26215C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

/** Safe-area-aware screen padding */
export const layout = {
  screenPaddingHorizontal: spacing.md,
  screenPaddingTop: spacing.lg,
  cardPadding: spacing.md,
  sectionGap: spacing.lg,
  itemGap: spacing.ms,
} as const;

export type Spacing = typeof spacing;
export type Radii = typeof radii;
export type Shadows = typeof shadows;
