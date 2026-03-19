import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing, radii, shadows } from '../../src/theme/spacing';
import { KButton } from '../../src/components/ui/KButton';
import { useAppStore } from '../../src/store/useAppStore';

// ---------------------------------------------------------------------------
// Privacy Feature Card
// ---------------------------------------------------------------------------

interface PrivacyFeatureProps {
  icon: string;
  title: string;
  description: string;
  delay: number;
}

function PrivacyFeature({ icon, title, description, delay }: PrivacyFeatureProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500).springify()}
      style={featureStyles.card}
    >
      <View style={featureStyles.iconCircle}>
        <Text style={featureStyles.icon} accessibilityLabel="">
          {icon}
        </Text>
      </View>
      <View style={featureStyles.textContainer}>
        <Text style={featureStyles.title}>{title}</Text>
        <Text style={featureStyles.description}>{description}</Text>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Privacy Explanation Screen
// ---------------------------------------------------------------------------

export default function PrivacidadScreen() {
  const router = useRouter();
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const handleAccept = () => {
    // Mark onboarding as complete in Zustand + SQLite
    setOnboardingComplete();
    // Navigate to the main app
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.stepIndicator}>Paso 2 de 2</Text>
        <Text style={styles.title} accessibilityRole="header">
          Tu privacidad es lo primero
        </Text>
        <Text style={styles.subtitle}>
          Kallpa fue dise\u00F1ado pensando en que tus datos son solo tuyos. Aqu\u00ED te explicamos c\u00F3mo funciona, en palabras simples.
        </Text>

        {/* Privacy features */}
        <View style={styles.featuresSection}>
          <PrivacyFeature
            icon={'\uD83D\uDCF1'}
            title="Todo se guarda en tu tel\u00E9fono"
            description="Tu diario, tus estados de \u00E1nimo, tus h\u00E1bitos... todo vive dentro de tu dispositivo. No usamos servidores en la nube para guardar tu informaci\u00F3n personal."
            delay={200}
          />

          <PrivacyFeature
            icon={'\uD83D\uDD12'}
            title="Sin cuentas, sin contrase\u00F1as"
            description="No necesitas crear una cuenta ni iniciar sesi\u00F3n. No recopilamos tu correo, tu tel\u00E9fono, ni ning\u00FAn dato identificable."
            delay={400}
          />

          <PrivacyFeature
            icon={'\uD83D\uDEAB'}
            title="Sin nube, sin seguimiento"
            description="Nada se sube a internet autom\u00E1ticamente. Si alguna vez decides compartir un reporte con tu psic\u00F3logo, t\u00FA eliges qu\u00E9 y cu\u00E1ndo."
            delay={600}
          />

          <PrivacyFeature
            icon={'\uD83E\uDD16'}
            title="Chat con IA responsable"
            description="Cuando usas el compa\u00F1ero de IA, tus conversaciones no se guardan despu\u00E9s de cerrar la sesi\u00F3n. Usamos retenci\u00F3n cero de datos (ZDR)."
            delay={800}
          />
        </View>

        {/* Visual emphasis */}
        <Animated.View
          entering={FadeInDown.delay(1000).duration(500)}
          style={styles.emphasisCard}
        >
          <Text style={styles.emphasisIcon}>{'\uD83D\uDC9C'}</Text>
          <Text style={styles.emphasisText}>
            Creemos que cuidar tu bienestar emocional no deber\u00EDa costarte tu privacidad. Kallpa est\u00E1 hecho para acompa\u00F1arte, no para vigilarte.
          </Text>
        </Animated.View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Action */}
      <View style={styles.bottomSection}>
        <KButton
          title="Entiendo y empiezo"
          onPress={handleAccept}
          size="lg"
          fullWidth
          accessibilityLabel="Acepto la pol\u00EDtica de privacidad y comienzo a usar Kallpa"
        />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Main Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.app,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  stepIndicator: {
    fontFamily: fonts.sans.medium,
    fontSize: 12,
    color: colors.primary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.serif.regular,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.tertiary,
    marginBottom: spacing.xl,
  },
  featuresSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  emphasisCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.ms,
  },
  emphasisIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  emphasisText: {
    flex: 1,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.primary,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.app,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

// ---------------------------------------------------------------------------
// Feature Card Styles
// ---------------------------------------------------------------------------

const featureStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.ms,
    ...shadows.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryXLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  description: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.text.tertiary,
  },
});
