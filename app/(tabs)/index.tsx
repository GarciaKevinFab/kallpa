import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing, radii, shadows } from '../../src/theme/spacing';
import { useAppStore } from '../../src/store/useAppStore';
import { useHumorStore } from '../../src/store/useHumorStore';
import MoodSelector from '../../src/components/humor/MoodSelector';
import { KCard } from '../../src/components/ui/KCard';

const DB_NAME = 'kallpa.db';

// ---------------------------------------------------------------------------
// Greeting helper
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos d\u00EDas';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getSubtitle(): string {
  const day = new Date().getDay();
  const hour = new Date().getHours();

  // Weekend
  if (day === 0 || day === 6) {
    return 'Es fin de semana. \u00BFC\u00F3mo va tu descanso?';
  }

  // Monday blues
  if (day === 1 && hour < 12) {
    return 'Nuevo inicio de semana. T\u00FA puedes con esto.';
  }

  // Friday
  if (day === 5) {
    return '\u00A1Ya casi viernes! Un paso m\u00E1s.';
  }

  // Evening
  if (hour >= 20) {
    return 'Es hora de descansar. \u00BFYa registraste tu d\u00EDa?';
  }

  return '\u00BFC\u00F3mo va tu d\u00EDa hoy?';
}

// ---------------------------------------------------------------------------
// Tool Card Component
// ---------------------------------------------------------------------------

interface ToolCardProps {
  emoji: string;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}

function ToolCard({ emoji, title, description, color, onPress }: ToolCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        toolStyles.card,
        pressed && toolStyles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={`${title}: ${description}`}
      accessibilityRole="button"
    >
      <View style={[toolStyles.iconBg, { backgroundColor: color + '18' }]}>
        <Text style={toolStyles.emoji}>{emoji}</Text>
      </View>
      <Text style={toolStyles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={toolStyles.description} numberOfLines={2}>
        {description}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Insight type
// ---------------------------------------------------------------------------

interface InsightData {
  totalMoods: number;
  avgMood: number | null;
  totalDiario: number;
  totalCrisis: number;
  rachaHabitos: number;
}

// ---------------------------------------------------------------------------
// Home Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const userName = useAppStore((s) => s.userName);
  const humorHoy = useHumorStore((s) => s.humorHoy);
  const loadHumoresRecientes = useHumorStore((s) => s.loadHumoresRecientes);

  const [refreshing, setRefreshing] = useState(false);
  const [insight, setInsight] = useState<InsightData>({
    totalMoods: 0,
    avgMood: null,
    totalDiario: 0,
    totalCrisis: 0,
    rachaHabitos: 0,
  });

  // ── Load insight data from SQLite ───────────────────────────────────
  const loadInsights = useCallback(async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Total mood entries (last 30 days)
      const moodRow = await db.getFirstAsync<{ total: number; avg: number | null }>(
        `SELECT COUNT(*) as total, ROUND(AVG(nivel), 1) as avg
         FROM registros_humor
         WHERE fecha >= date('now', '-30 days')`,
      );

      // Total diary entries
      const diarioRow = await db.getFirstAsync<{ total: number }>(
        `SELECT COUNT(*) as total FROM entradas_diario`,
      );

      // Total crisis episodes
      const crisisRow = await db.getFirstAsync<{ total: number }>(
        `SELECT COUNT(*) as total FROM episodios_crisis`,
      );

      // Simple habits streak: count consecutive days with at least 1 completed habit
      const rachaRow = await db.getFirstAsync<{ racha: number }>(
        `SELECT COUNT(DISTINCT fecha) as racha
         FROM registros_habitos
         WHERE completado = 1
         AND fecha >= date('now', '-7 days')`,
      );

      setInsight({
        totalMoods: moodRow?.total ?? 0,
        avgMood: moodRow?.avg ?? null,
        totalDiario: diarioRow?.total ?? 0,
        totalCrisis: crisisRow?.total ?? 0,
        rachaHabitos: rachaRow?.racha ?? 0,
      });
    } catch (error) {
      console.warn('[HomeScreen] Failed to load insights:', error);
    }
  }, []);

  // ── Initial load ────────────────────────────────────────────────────
  useEffect(() => {
    loadHumoresRecientes();
    loadInsights();
  }, [loadHumoresRecientes, loadInsights]);

  // ── Pull to refresh ─────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadHumoresRecientes(), loadInsights()]);
    setRefreshing(false);
  }, [loadHumoresRecientes, loadInsights]);

  // ── Mood selected handler ───────────────────────────────────────────
  const handleMoodSelect = useCallback(
    (_nivel: number) => {
      // Reload insights after mood is recorded
      loadInsights();
    },
    [loadInsights],
  );

  // ── Get insight text ────────────────────────────────────────────────
  const getInsightText = (): string => {
    if (insight.totalMoods === 0) {
      return 'Registra tu primer estado de \u00E1nimo para comenzar a ver tus patrones.';
    }

    const parts: string[] = [];

    if (insight.avgMood !== null) {
      const moodLabel =
        insight.avgMood >= 4
          ? 'muy bien'
          : insight.avgMood >= 3
          ? 'bien'
          : insight.avgMood >= 2
          ? 'con algunos retos'
          : 'atravesando momentos dif\u00EDciles';
      parts.push(`En promedio, este mes te has sentido ${moodLabel}.`);
    }

    if (insight.rachaHabitos > 0) {
      parts.push(
        `Llevas ${insight.rachaHabitos} d\u00EDa${insight.rachaHabitos > 1 ? 's' : ''} activo con tus h\u00E1bitos esta semana.`,
      );
    }

    if (insight.totalDiario > 0) {
      parts.push(`Has escrito ${insight.totalDiario} entrada${insight.totalDiario > 1 ? 's' : ''} en tu diario.`);
    }

    return parts.length > 0
      ? parts.join(' ')
      : 'Sigue registrando para descubrir tus patrones emocionales.';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.white}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Purple Header ────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.greeting} accessibilityRole="header">
            {getGreeting()}, {userName || 'amigo'}
          </Text>
          <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
        </View>

        {/* ── Mood Selector ────────────────────────────────────────── */}
        <View style={styles.moodSection}>
          <MoodSelector onSelect={handleMoodSelect} />
        </View>

        {/* ── Tool Grid ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus herramientas</Text>
          <View style={styles.toolGrid}>
            <ToolCard
              emoji={'\uD83D\uDCD3'}
              title="Diario"
              description="Reestructura tus pensamientos"
              color={colors.primary}
              onPress={() => router.push('/(tabs)/diario')}
            />
            <ToolCard
              emoji={'\uD83C\uDF3F'}
              title="Calmar crisis"
              description="T\u00E9cnicas de respiraci\u00F3n"
              color={colors.accent}
              onPress={() => router.push('/(tabs)/crisis')}
            />
            <ToolCard
              emoji={'\uD83C\uDF31'}
              title="Micro-h\u00E1bitos"
              description="Peque\u00F1os pasos diarios"
              color={colors.amber}
              onPress={() => router.push('/(tabs)/habitos')}
            />
            <ToolCard
              emoji={'\uD83E\uDD1D'}
              title="Pedir ayuda"
              description="Conexi\u00F3n con psic\u00F3logos"
              color={colors.warm}
              onPress={() => router.push('/(tabs)/ayuda')}
            />
          </View>
        </View>

        {/* ── Insight del d\u00EDa ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insight del d\u00EDa</Text>
          <KCard variant="outlined" padding={spacing.md}>
            <View style={styles.insightRow}>
              <Text style={styles.insightEmoji}>{'\uD83D\uDCA1'}</Text>
              <Text style={styles.insightText}>{getInsightText()}</Text>
            </View>
            {insight.totalMoods > 0 && (
              <Pressable
                style={styles.timelineLink}
                onPress={() => router.push('/timeline')}
                accessibilityLabel="Ver mi l\u00EDnea de tiempo emocional"
                accessibilityRole="link"
              >
                <Text style={styles.timelineLinkText}>Ver mi l\u00EDnea de tiempo {'\u2192'}</Text>
              </Pressable>
            )}
          </KCard>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={styles.tabBarSpacer} />
      </ScrollView>

      {/* ── Floating Companion Button ──────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push('/companion')}
        accessibilityLabel="Abrir compa\u00F1ero de bienestar"
        accessibilityRole="button"
        accessibilityHint="Abre una conversaci\u00F3n con el compa\u00F1ero de IA"
      >
        <Text style={styles.fabEmoji}>{'\uD83E\uDD16'}</Text>
      </Pressable>
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
    paddingBottom: spacing.md,
  },
  // ── Header ──
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontFamily: fonts.serif.regular,
    fontSize: 26,
    lineHeight: 34,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primaryLight,
    opacity: 0.9,
  },
  // ── Mood ──
  moodSection: {
    marginTop: -spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    ...shadows.md,
  },
  // ── Sections ──
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.ms,
  },
  // ── Tool Grid ──
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.ms,
  },
  // ── Insight ──
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  insightEmoji: {
    fontSize: 20,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
  },
  timelineLink: {
    marginTop: spacing.ms,
    alignSelf: 'flex-end',
  },
  timelineLinkText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 76,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    zIndex: 10,
  },
  fabPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.95 }],
  },
  fabEmoji: {
    fontSize: 26,
  },
  tabBarSpacer: {
    height: Platform.OS === 'ios' ? 100 : 76,
  },
});

// ---------------------------------------------------------------------------
// Tool Card Styles
// ---------------------------------------------------------------------------

const toolStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    ...shadows.sm,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  description: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.tertiary,
  },
});
