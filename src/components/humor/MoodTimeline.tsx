import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing, radii, shadows } from '../../theme/spacing';
import { fonts } from '../../theme/typography';

// ── Types ──────────────────────────────────────────────────────────────

interface MoodDataPoint {
  fecha: string;
  nivel: number;
  /** Optional note from diary entry */
  nota?: string;
}

/** Marker overlaid on the timeline for special events */
interface TimelineMarker {
  fecha: string;
  tipo: 'diario' | 'crisis' | 'cita';
}

interface MoodTimelineProps {
  data: MoodDataPoint[];
  days?: 30 | 60 | 90;
  markers?: TimelineMarker[];
}

interface TooltipData {
  fecha: string;
  nivel: number;
  nota?: string;
  x: number;
  y: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;

const PADDING_LEFT = 32;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 32;

const CHART_HEIGHT = 180;
const Y_MIN = 1;
const Y_MAX = 5;

/**
 * Interpolate between warm (low mood) and accent (high mood).
 * Returns a hex color string.
 */
function moodColor(nivel: number): string {
  const t = Math.max(0, Math.min(1, (nivel - Y_MIN) / (Y_MAX - Y_MIN)));
  // Simple lerp between warm (#D85A30) and accent (#1D9E75)
  const r = Math.round(216 + (29 - 216) * t);
  const g = Math.round(90 + (158 - 90) * t);
  const b = Math.round(48 + (117 - 48) * t);
  return `rgb(${r},${g},${b})`;
}

function formatDateShort(fecha: string): string {
  const parts = fecha.split('-');
  if (parts.length < 3) return fecha;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${day} ${months[month - 1] ?? ''}`;
}

function markerSymbol(tipo: TimelineMarker['tipo']): string {
  switch (tipo) {
    case 'diario':
      return '\uD83D\uDCD3'; // notebook
    case 'crisis':
      return '\u26A0\uFE0F'; // warning
    case 'cita':
      return '\uD83D\uDCC5'; // calendar
    default:
      return '';
  }
}

// ── Component ──────────────────────────────────────────────────────────

export default function MoodTimeline({
  data,
  days = 30,
  markers = [],
}: MoodTimelineProps) {
  const chartWidth = SCREEN_WIDTH - spacing.md * 2;
  const drawWidth = chartWidth - PADDING_LEFT - PADDING_RIGHT;
  const drawHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const tooltipOpacity = useSharedValue(0);

  // Sort and filter data
  const sortedData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return [...data]
      .filter((d) => d.fecha >= cutoffStr)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [data, days]);

  // Compute pixel positions
  const points = useMemo(() => {
    if (sortedData.length === 0) return [];
    const minDate = new Date(sortedData[0].fecha).getTime();
    const maxDate = new Date(sortedData[sortedData.length - 1].fecha).getTime();
    const dateRange = maxDate - minDate || 1;

    return sortedData.map((d) => {
      const dateMs = new Date(d.fecha).getTime();
      const x = PADDING_LEFT + ((dateMs - minDate) / dateRange) * drawWidth;
      const y =
        PADDING_TOP +
        drawHeight -
        ((d.nivel - Y_MIN) / (Y_MAX - Y_MIN)) * drawHeight;
      return { ...d, x, y };
    });
  }, [sortedData, drawWidth, drawHeight]);

  // Build SVG path
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Smooth cubic bezier
      const cpx1 = prev.x + (curr.x - prev.x) / 3;
      const cpx2 = prev.x + ((curr.x - prev.x) * 2) / 3;
      d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  // Marker positions
  const markerPositions = useMemo(() => {
    if (sortedData.length === 0 || markers.length === 0) return [];
    const minDate = new Date(sortedData[0].fecha).getTime();
    const maxDate = new Date(sortedData[sortedData.length - 1].fecha).getTime();
    const dateRange = maxDate - minDate || 1;

    return markers
      .filter((m) => {
        const ms = new Date(m.fecha).getTime();
        return ms >= minDate && ms <= maxDate;
      })
      .map((m) => {
        const dateMs = new Date(m.fecha).getTime();
        const x = PADDING_LEFT + ((dateMs - minDate) / dateRange) * drawWidth;
        return { ...m, x };
      });
  }, [markers, sortedData, drawWidth]);

  // X-axis labels (evenly spaced)
  const xLabels = useMemo(() => {
    if (sortedData.length === 0) return [];
    const count = Math.min(6, sortedData.length);
    const step = Math.max(1, Math.floor(sortedData.length / count));
    const labels: { fecha: string; x: number }[] = [];
    for (let i = 0; i < sortedData.length; i += step) {
      const p = points[i];
      if (p) labels.push({ fecha: p.fecha, x: p.x });
    }
    return labels;
  }, [sortedData, points]);

  // Tap handling
  const handleTapPoint = useCallback(
    (point: (typeof points)[0]) => {
      setTooltip({
        fecha: point.fecha,
        nivel: point.nivel,
        nota: point.nota,
        x: point.x,
        y: point.y,
      });
      tooltipOpacity.value = withTiming(1, { duration: 200 });
    },
    [tooltipOpacity],
  );

  const dismissTooltip = useCallback(() => {
    tooltipOpacity.value = withTiming(0, { duration: 150 });
    setTimeout(() => setTooltip(null), 160);
  }, [tooltipOpacity]);

  const tooltipAnimStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
  }));

  // Tap gesture to find nearest point
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const tapX = event.x;
      const tapY = event.y;

      // Find closest point within 20px
      let closestIdx = -1;
      let closestDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const dx = points[i].x - tapX;
        const dy = points[i].y - tapY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist && dist < 24) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      if (closestIdx >= 0) {
        runOnJS(handleTapPoint)(points[closestIdx]);
      } else {
        runOnJS(dismissTooltip)();
      }
    });

  if (sortedData.length === 0) {
    return (
      <View style={[styles.container, { width: chartWidth }]}>
        <Text style={styles.emptyText}>
          A{'\u00FA'}n no hay registros de humor.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: chartWidth }]}>
      <GestureDetector gesture={tapGesture}>
        <View>
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="lineGrad" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor={colors.warm} stopOpacity="1" />
                <Stop offset="1" stopColor={colors.accent} stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* Horizontal grid lines for levels 1-5 */}
            {[1, 2, 3, 4, 5].map((level) => {
              const y =
                PADDING_TOP +
                drawHeight -
                ((level - Y_MIN) / (Y_MAX - Y_MIN)) * drawHeight;
              return (
                <React.Fragment key={`grid-${level}`}>
                  <Line
                    x1={PADDING_LEFT}
                    y1={y}
                    x2={PADDING_LEFT + drawWidth}
                    y2={y}
                    stroke={colors.border}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <SvgText
                    x={PADDING_LEFT - 8}
                    y={y + 4}
                    fontSize={10}
                    fill={colors.text.tertiary}
                    textAnchor="end"
                    fontFamily={fonts.sans.regular}
                  >
                    {level}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Line path */}
            {pathD ? (
              <Path
                d={pathD}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Data dots */}
            {points.map((p, i) => (
              <Circle
                key={`dot-${i}`}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={moodColor(p.nivel)}
                stroke={colors.white}
                strokeWidth={1.5}
              />
            ))}

            {/* Marker symbols at bottom */}
            {markerPositions.map((m, i) => (
              <SvgText
                key={`marker-${i}`}
                x={m.x}
                y={CHART_HEIGHT - 4}
                fontSize={10}
                textAnchor="middle"
              >
                {markerSymbol(m.tipo)}
              </SvgText>
            ))}

            {/* X-axis date labels */}
            {xLabels.map((l, i) => (
              <SvgText
                key={`xlabel-${i}`}
                x={l.x}
                y={CHART_HEIGHT - PADDING_BOTTOM + 16}
                fontSize={9}
                fill={colors.text.tertiary}
                textAnchor="middle"
                fontFamily={fonts.sans.regular}
              >
                {formatDateShort(l.fecha)}
              </SvgText>
            ))}
          </Svg>

          {/* Tooltip overlay */}
          {tooltip && (
            <Animated.View
              style={[
                styles.tooltip,
                tooltipAnimStyle,
                {
                  left: Math.min(
                    Math.max(tooltip.x - 60, 4),
                    chartWidth - 128,
                  ),
                  top: Math.max(tooltip.y - 60, 4),
                },
              ]}
            >
              <Text style={styles.tooltipDate}>
                {formatDateShort(tooltip.fecha)}
              </Text>
              <Text style={styles.tooltipLevel}>
                Nivel: {tooltip.nivel}
              </Text>
              {tooltip.nota ? (
                <Text style={styles.tooltipNote} numberOfLines={2}>
                  {tooltip.nota}
                </Text>
              ) : null}
            </Animated.View>
          )}
        </View>
      </GestureDetector>

      {/* Legend */}
      {markers.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>{'\uD83D\uDCD3'}</Text>
            <Text style={styles.legendLabel}>Diario</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>{'\u26A0\uFE0F'}</Text>
            <Text style={styles.legendLabel}>Crisis</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendIcon}>{'\uD83D\uDCC5'}</Text>
            <Text style={styles.legendLabel}>Cita</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.xs,
    ...shadows.sm,
  },
  emptyText: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.background.card,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.sm,
    minWidth: 120,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tooltipDate: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 12,
    color: colors.text.primary,
  },
  tooltipLevel: {
    fontFamily: fonts.sans.medium,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  tooltipNote: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendIcon: {
    fontSize: 12,
  },
  legendLabel: {
    fontFamily: fonts.sans.regular,
    fontSize: 10,
    color: colors.text.tertiary,
  },
});
