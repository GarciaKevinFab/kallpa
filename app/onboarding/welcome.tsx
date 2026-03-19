import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing, radii } from '../../src/theme/spacing';
import { KButton } from '../../src/components/ui/KButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = 160;

// ---------------------------------------------------------------------------
// Welcome Screen
// ---------------------------------------------------------------------------

export default function WelcomeScreen() {
  const router = useRouter();

  // ── Breathing circle animation ──────────────────────────────────────
  const breathScale = useSharedValue(1);
  const breathOpacity = useSharedValue(0.6);

  useEffect(() => {
    // Pulsating "breathing" animation: expand and contract gently
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
      false,
    );

    breathOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [breathScale, breathOpacity]);

  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
    opacity: breathOpacity.value,
  }));

  const logoScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  // ── Navigation ──────────────────────────────────────────────────────
  const handleComenzar = () => {
    router.push('/onboarding/perfil');
  };

  return (
    <View style={styles.container}>
      {/* Purple gradient background at top */}
      <View style={styles.gradientContainer}>
        <View style={styles.gradientFill} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Animated breathing circle with logo */}
        <View style={styles.logoSection}>
          <Animated.View style={[styles.breathCircleOuter, breathingStyle]} />
          <Animated.View style={[styles.breathCircleMiddle, breathingStyle]} />
          <Animated.View style={[styles.logoCircle, logoStyle]}>
            <Text
              style={styles.logoText}
              accessibilityLabel="Logo de Kallpa"
            >
              K
            </Text>
          </Animated.View>
        </View>

        {/* App name */}
        <Animated.Text
          entering={FadeIn.delay(400).duration(800)}
          style={styles.appName}
          accessibilityRole="header"
        >
          Kallpa
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text
          entering={FadeIn.delay(800).duration(800)}
          style={styles.tagline}
          accessibilityLabel="Tu fuerza, contigo siempre"
        >
          Tu fuerza, contigo siempre
        </Animated.Text>

        {/* Description */}
        <Animated.Text
          entering={FadeIn.delay(1200).duration(800)}
          style={styles.description}
        >
          Acomp\u00E1\u00F1amiento emocional dise\u00F1ado para ti, estudiante universitario en Huancayo. Todo se guarda en tu tel\u00E9fono, solo para ti.
        </Animated.Text>
      </View>

      {/* Bottom action */}
      <Animated.View
        entering={FadeIn.delay(1600).duration(800)}
        style={styles.bottomSection}
      >
        <KButton
          title="Comenzar"
          onPress={handleComenzar}
          size="lg"
          fullWidth
          accessibilityLabel="Comenzar configuraci\u00F3n de Kallpa"
        />

        <Text style={styles.privacyHint}>
          Tus datos nunca salen de tu tel\u00E9fono
        </Text>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.app,
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    overflow: 'hidden',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  gradientFill: {
    flex: 1,
    backgroundColor: colors.primary,
    opacity: 0.95,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.huge,
  },
  logoSection: {
    width: CIRCLE_SIZE + 60,
    height: CIRCLE_SIZE + 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  breathCircleOuter: {
    position: 'absolute',
    width: CIRCLE_SIZE + 56,
    height: CIRCLE_SIZE + 56,
    borderRadius: (CIRCLE_SIZE + 56) / 2,
    backgroundColor: colors.white,
    opacity: 0.1,
  },
  breathCircleMiddle: {
    position: 'absolute',
    width: CIRCLE_SIZE + 28,
    height: CIRCLE_SIZE + 28,
    borderRadius: (CIRCLE_SIZE + 28) / 2,
    backgroundColor: colors.white,
    opacity: 0.15,
  },
  logoCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  logoText: {
    fontFamily: fonts.serif.medium,
    fontSize: 72,
    color: colors.primary,
    marginTop: -4,
  },
  appName: {
    fontFamily: fonts.serif.medium,
    fontSize: 36,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontFamily: fonts.serif.regular,
    fontSize: 18,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  description: {
    fontFamily: fonts.sans.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  privacyHint: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.muted,
    marginTop: spacing.ms,
    textAlign: 'center',
  },
});
