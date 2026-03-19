import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as SQLite from 'expo-sqlite';
import { colors } from '../src/theme/colors';
import { fonts } from '../src/theme/typography';
import { spacing, radii, shadows } from '../src/theme/spacing';
import { KButton } from '../src/components/ui/KButton';
import { KCard } from '../src/components/ui/KCard';
import { KChip } from '../src/components/ui/KChip';

const DB_NAME = 'kallpa.db';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2;
const CHART_HEIGHT = 160;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MoodDataPoint {
  fecha: string;
  promedio: number;
  registros: number;
}

interface TimelineEvent {
  fecha: string;
  tipo: 'diario' | 'crisis' | 'cita';
  detalle: string;
}

interface InsightData {
  mejorSemana: string | null;
  peorDia: string | null;
  rachaRegistros: number;
  totalRegistros: number;
  promedioGeneral: number | null;
}

// ---------------------------------------------------------------------------
// Period options
// ---------------------------------------------------------------------------

type Period = 30 | 60 | 90;

const PERIODS: { value: Period; label: string }[] = [
  { value: 30, label: '30 d\u00EDas' },
  { value: 60, label: '60 d\u00EDas' },
  { value: 90, label: '90 d\u00EDas' },
];

// ---------------------------------------------------------------------------
// Simple chart component (no external charting library)
// ---------------------------------------------------------------------------

function MoodChart({ data }: { data: MoodDataPoint[] }) {
  if (data.length === 0) {
    return (
      <View style={chartStyles.empty}>
        <Text style={chartStyles.emptyText}>
          A\u00FAn no hay datos suficientes para mostrar tu l\u00EDnea de tiempo
        </Text>
      </View>
    );
  }

  const maxVal = 5;
  const minVal = 1;
  const range = maxVal - minVal;

  // Calculate bar positions
  const barWidth = Math.max(4, Math.min(12, (CHART_WIDTH - data.length * 2) / data.length));
  const totalBarSpace = data.length * (barWidth + 2);
  const startOffset = Math.max(0, (CHART_WIDTH - totalBarSpace) / 2);

  return (
    <View style={chartStyles.container}>
      {/* Y-axis labels */}
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.yLabel}>{'\uD83E\uDD29'}</Text>
        <Text style={chartStyles.yLabel}>{'\uD83D\uDE42'}</Text>
        <Text style={chartStyles.yLabel}>{'\uD83D\uDE14'}</Text>
      </View>

      {/* Chart area */}
      <View style={chartStyles.chartArea}>
        {/* Grid lines */}
        <View style={[chartStyles.gridLine, { top: 0 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT / 2 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT }]} />

        {/* Bars */}
        <View style={chartStyles.barsContainer}>
          {data.map((point, index) => {
            const height = ((point.promedio - minVal) / range) * CHART_HEIGHT;
            const barColor =
              point.promedio >= 4
                ? colors.accent
                : point.promedio >= 3
                ? colors.primary
                : point.promedio >= 2
                ? colors.amber
                : colors.warm;

            return (
              <Animated.View
                key={point.fecha}
                entering={FadeIn.delay(index * 30).duration(300)}
                style={[
                  chartStyles.bar,
                  {
                    width: barWidth,
                    height: Math.max(4, height),
                    backgroundColor: barColor,
                    marginHorizontal: 1,
                  },
                ]}
                accessibilityLabel={`${point.fecha}: promedio ${point.promedio}`}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Timeline Event Marker
// ---------------------------------------------------------------------------

function EventMarker({ event }: { event: TimelineEvent }) {
  const emojiMap = {
    diario: '\uD83D\uDCD3',
    crisis: '\uD83C\uDF3F',
    cita: '\uD83E\uDD1D',
  };

  const labelMap = {
    diario: 'Diario',
    crisis: 'Crisis',
    cita: 'Cita',
  };

  return (
    <View style={markerStyles.container}>
      <View style={markerStyles.dot}>
        <Text style={markerStyles.emoji}>{emojiMap[event.tipo]}</Text>
      </View>
      <View style={markerStyles.content}>
        <Text style={markerStyles.date}>{event.fecha}</Text>
        <Text style={markerStyles.type}>{labelMap[event.tipo]}</Text>
        <Text style={markerStyles.detail} numberOfLines={1}>
          {event.detalle}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Insight Card
// ---------------------------------------------------------------------------

function InsightCard({ icon, text }: { icon: string; text: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={insightStyles.card}>
      <Text style={insightStyles.icon}>{icon}</Text>
      <Text style={insightStyles.text}>{text}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Timeline Screen
// ---------------------------------------------------------------------------

export default function TimelineScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>(30);
  const [moodData, setMoodData] = useState<MoodDataPoint[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [insights, setInsights] = useState<InsightData>({
    mejorSemana: null,
    peorDia: null,
    rachaRegistros: 0,
    totalRegistros: 0,
    promedioGeneral: null,
  });

  // ── Load data ───────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Daily mood averages
      const moodRows = await db.getAllAsync<MoodDataPoint>(
        `SELECT fecha, ROUND(AVG(nivel), 1) as promedio, COUNT(*) as registros
         FROM registros_humor
         WHERE fecha >= date('now', ? || ' days')
         GROUP BY fecha
         ORDER BY fecha ASC`,
        [`-${period}`],
      );
      setMoodData(moodRows);

      // Timeline events: diary, crisis, appointments
      const diarioEvents = await db.getAllAsync<{ fecha: string; evento_disparador: string | null }>(
        `SELECT fecha, evento_disparador
         FROM entradas_diario
         WHERE fecha >= date('now', ? || ' days')
         ORDER BY fecha DESC
         LIMIT 20`,
        [`-${period}`],
      );

      const crisisEvents = await db.getAllAsync<{ fecha: string; tecnica_usada: string | null }>(
        `SELECT fecha, tecnica_usada
         FROM episodios_crisis
         WHERE fecha >= date('now', ? || ' days')
         ORDER BY fecha DESC
         LIMIT 20`,
        [`-${period}`],
      );

      const citaEvents = await db.getAllAsync<{ fecha_solicitud: string; psicologo_nombre: string | null }>(
        `SELECT fecha_solicitud, psicologo_nombre
         FROM citas_agendadas
         WHERE fecha_solicitud >= date('now', ? || ' days')
         ORDER BY fecha_solicitud DESC
         LIMIT 10`,
        [`-${period}`],
      );

      const allEvents: TimelineEvent[] = [
        ...diarioEvents.map((e) => ({
          fecha: e.fecha,
          tipo: 'diario' as const,
          detalle: e.evento_disparador || 'Entrada de diario',
        })),
        ...crisisEvents.map((e) => ({
          fecha: e.fecha,
          tipo: 'crisis' as const,
          detalle: e.tecnica_usada || 'Ejercicio de calma',
        })),
        ...citaEvents.map((e) => ({
          fecha: e.fecha_solicitud,
          tipo: 'cita' as const,
          detalle: e.psicologo_nombre || 'Cita con psic\u00F3logo',
        })),
      ].sort((a, b) => b.fecha.localeCompare(a.fecha));

      setEvents(allEvents.slice(0, 20));

      // ── Calculate insights ────────────────────────────────────────
      const totalRegistros = moodRows.reduce((sum, r) => sum + r.registros, 0);
      const promedioGeneral =
        moodRows.length > 0
          ? Math.round(
              (moodRows.reduce((sum, r) => sum + r.promedio * r.registros, 0) / totalRegistros) *
                10,
            ) / 10
          : null;

      // Best week (highest average in any 7-day window)
      let mejorSemana: string | null = null;
      let mejorPromedio = 0;
      if (moodRows.length >= 7) {
        for (let i = 0; i <= moodRows.length - 7; i++) {
          const window = moodRows.slice(i, i + 7);
          const avg = window.reduce((s, r) => s + r.promedio, 0) / 7;
          if (avg > mejorPromedio) {
            mejorPromedio = avg;
            mejorSemana = window[0]?.fecha ?? null;
          }
        }
      }

      // Worst day of week
      const dayTotals: Record<number, { sum: number; count: number }> = {};
      for (const row of moodRows) {
        const dayOfWeek = new Date(row.fecha + 'T12:00:00').getDay();
        if (!dayTotals[dayOfWeek]) {
          dayTotals[dayOfWeek] = { sum: 0, count: 0 };
        }
        dayTotals[dayOfWeek]!.sum += row.promedio;
        dayTotals[dayOfWeek]!.count += 1;
      }

      let peorDia: string | null = null;
      let peorAvg = Infinity;
      const DIAS = ['domingos', 'lunes', 'martes', 'mi\u00E9rcoles', 'jueves', 'viernes', 's\u00E1bados'];
      for (const [day, data] of Object.entries(dayTotals)) {
        const avg = data.sum / data.count;
        if (avg < peorAvg && data.count >= 2) {
          peorAvg = avg;
          peorDia = DIAS[Number(day)] ?? null;
        }
      }

      // Consecutive days registering mood
      let rachaRegistros = 0;
      if (moodRows.length > 0) {
        const hoy = new Date().toISOString().split('T')[0];
        const fechas = new Set(moodRows.map((r) => r.fecha));
        const d = new Date();
        while (fechas.has(d.toISOString().split('T')[0]!)) {
          rachaRegistros++;
          d.setDate(d.getDate() - 1);
        }
      }

      setInsights({
        mejorSemana,
        peorDia,
        rachaRegistros,
        totalRegistros,
        promedioGeneral,
      });
    } catch (error) {
      console.warn('[TimelineScreen] Failed to load data:', error);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Volver"
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'\u2039'} Volver</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          Tu l\u00EDnea de tiempo
        </Text>
        <Text style={styles.subtitle}>
          Observa c\u00F3mo ha sido tu camino emocional. Toda esta informaci\u00F3n vive solo en tu tel\u00E9fono.
        </Text>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {PERIODS.map((p) => (
            <KChip
              key={p.value}
              label={p.label}
              selected={period === p.value}
              onPress={() => setPeriod(p.value)}
              accessibilityLabel={`Ver \u00FAltimos ${p.label}`}
            />
          ))}
        </View>

        {/* Mood Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado de \u00E1nimo</Text>
          <KCard variant="elevated" padding={spacing.md}>
            <MoodChart data={moodData} />
          </KCard>
        </View>

        {/* Insights */}
        {insights.totalRegistros > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tus insights</Text>

            {insights.rachaRegistros > 0 && (
              <InsightCard
                icon={'\uD83D\uDD25'}
                text={`Llevas ${insights.rachaRegistros} d\u00EDa${insights.rachaRegistros > 1 ? 's' : ''} consecutivo${insights.rachaRegistros > 1 ? 's' : ''} registrando tu humor.`}
              />
            )}

            {insights.mejorSemana && (
              <InsightCard
                icon={'\u2B50'}
                text={`Tu mejor semana fue la del ${insights.mejorSemana}.`}
              />
            )}

            {insights.peorDia && (
              <InsightCard
                icon={'\uD83D\uDCA1'}
                text={`Los ${insights.peorDia} tiendes a sentirte con menos energ\u00EDa.`}
              />
            )}

            {insights.promedioGeneral !== null && (
              <InsightCard
                icon={'\uD83D\uDCCA'}
                text={`Tu promedio emocional de este per\u00EDodo es ${insights.promedioGeneral}/5.`}
              />
            )}
          </View>
        )}

        {/* Timeline Events */}
        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Eventos recientes</Text>
            {events.map((event, index) => (
              <Animated.View key={`${event.fecha}-${event.tipo}-${index}`} entering={FadeInDown.delay(index * 50).duration(300)}>
                <EventMarker event={event} />
              </Animated.View>
            ))}
          </View>
        )}

        {/* Export placeholder */}
        <View style={styles.section}>
          <KCard variant="outlined" padding={spacing.md}>
            <View style={styles.exportRow}>
              <View style={styles.exportInfo}>
                <Text style={styles.exportTitle}>{'\uD83D\uDCC4'} Exportar como PDF</Text>
                <Text style={styles.exportDescription}>
                  Genera un resumen de tu progreso para compartir con tu psic\u00F3logo (pr\u00F3ximamente).
                </Text>
              </View>
              <KButton
                title="Exportar"
                onPress={() => {
                  // Placeholder for future PDF export functionality
                  // Alert instead of a no-op for user feedback
                }}
                variant="outline"
                size="sm"
                disabled
                accessibilityLabel="Exportar l\u00EDnea de tiempo como PDF. Pr\u00F3ximamente disponible."
              />
            </View>
          </KCard>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 15,
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: fonts.serif.regular,
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.ms,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  exportDescription: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.tertiary,
  },
});

// ---------------------------------------------------------------------------
// Chart Styles
// ---------------------------------------------------------------------------

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: CHART_HEIGHT + spacing.lg,
  },
  yAxis: {
    width: 28,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  yLabel: {
    fontSize: 14,
  },
  chartArea: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: CHART_HEIGHT,
  },
  bar: {
    borderRadius: 2,
    minWidth: 4,
  },
  empty: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

// ---------------------------------------------------------------------------
// Event Marker Styles
// ---------------------------------------------------------------------------

const markerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryXLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.ms,
  },
  emoji: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  date: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    color: colors.text.muted,
  },
  type: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  detail: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.tertiary,
  },
});

// ---------------------------------------------------------------------------
// Insight Styles
// ---------------------------------------------------------------------------

const insightStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.ms,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  icon: {
    fontSize: 20,
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
  },
});
