import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
} from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

const AnimatedG = Animated.createAnimatedComponent(G);

interface GardenSVGProps {
  totalCompletados: number;
}

// ---------- stage helpers ----------

/** Determine the garden stage. Garden NEVER regresses. */
const getStage = (total: number): 1 | 2 | 3 | 4 | 5 => {
  if (total > 200) return 5;
  if (total > 100) return 4;
  if (total > 50) return 3;
  if (total > 20) return 2;
  return 1;
};

// ---------- small SVG sub-components ----------

const Soil: React.FC = () => (
  <G>
    {/* ground */}
    <Rect x={0} y={190} width={300} height={60} rx={10} fill="#C9A77C" opacity={0.55} />
    <Rect x={0} y={200} width={300} height={50} rx={10} fill="#A67C52" opacity={0.45} />
    {/* grass fringe */}
    <Path
      d="M0 195 Q25 180 50 195 Q75 180 100 195 Q125 180 150 195 Q175 180 200 195 Q225 180 250 195 Q275 180 300 195 V200 H0 Z"
      fill={colors.accent}
      opacity={0.6}
    />
  </G>
);

const Sprout: React.FC<{ x: number; delay?: number }> = ({ x, delay = 0 }) => (
  <G>
    <Line x1={x} y1={195} x2={x} y2={170} stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" />
    <Ellipse cx={x - 5} cy={168} rx={6} ry={4} fill={colors.accent} transform={`rotate(-30 ${x - 5} 168)`} />
    <Ellipse cx={x + 5} cy={170} rx={6} ry={4} fill="#26C98A" transform={`rotate(25 ${x + 5} 170)`} />
  </G>
);

const SmallFlower: React.FC<{ cx: number; cy: number; petalColor: string }> = ({
  cx,
  cy,
  petalColor,
}) => (
  <G>
    {/* stem */}
    <Line x1={cx} y1={cy + 8} x2={cx} y2={195} stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
    {/* petals */}
    {[0, 60, 120, 180, 240, 300].map((angle) => {
      const rad = (angle * Math.PI) / 180;
      const px = cx + 7 * Math.cos(rad);
      const py = cy + 7 * Math.sin(rad);
      return <Circle key={angle} cx={px} cy={py} r={4} fill={petalColor} opacity={0.9} />;
    })}
    {/* center */}
    <Circle cx={cx} cy={cy} r={3.5} fill={colors.amber} />
  </G>
);

const SmallTree: React.FC<{ x: number }> = ({ x }) => (
  <G>
    {/* trunk */}
    <Rect x={x - 5} y={140} width={10} height={55} rx={3} fill="#8B6F4E" />
    {/* canopy layers */}
    <Ellipse cx={x} cy={130} rx={28} ry={22} fill={colors.accent} opacity={0.85} />
    <Ellipse cx={x - 8} cy={125} rx={18} ry={16} fill="#26C98A" opacity={0.7} />
    <Ellipse cx={x + 10} cy={128} rx={15} ry={14} fill="#1D9E75" opacity={0.65} />
  </G>
);

const LargeTree: React.FC<{ x: number }> = ({ x }) => (
  <G>
    {/* trunk */}
    <Rect x={x - 8} y={100} width={16} height={95} rx={4} fill="#8B6F4E" />
    {/* branches */}
    <Line x1={x} y1={130} x2={x - 25} y2={110} stroke="#8B6F4E" strokeWidth={4} strokeLinecap="round" />
    <Line x1={x} y1={140} x2={x + 22} y2={118} stroke="#8B6F4E" strokeWidth={4} strokeLinecap="round" />
    {/* canopy */}
    <Ellipse cx={x} cy={85} rx={45} ry={38} fill={colors.accent} opacity={0.85} />
    <Ellipse cx={x - 15} cy={78} rx={28} ry={24} fill="#26C98A" opacity={0.7} />
    <Ellipse cx={x + 18} cy={82} rx={22} ry={20} fill="#1D9E75" opacity={0.65} />
    <Ellipse cx={x} cy={70} rx={18} ry={15} fill="#3AC994" opacity={0.5} />
  </G>
);

const Star: React.FC<{ cx: number; cy: number; r: number; color: string }> = ({
  cx,
  cy,
  r,
  color,
}) => {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return <Path d={`M${points.join(' L')} Z`} fill={color} opacity={0.9} />;
};

const Constellation: React.FC<{ shining?: boolean }> = ({ shining = false }) => {
  const starPositions = [
    { cx: 40, cy: 30, r: 5 },
    { cx: 70, cy: 18, r: 4 },
    { cx: 105, cy: 25, r: 6 },
    { cx: 140, cy: 15, r: 4.5 },
    { cx: 175, cy: 28, r: 5 },
    { cx: 210, cy: 20, r: 4 },
    { cx: 250, cy: 32, r: 5.5 },
  ];

  const lineConnections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
  ];

  return (
    <G>
      {/* connection lines */}
      {lineConnections.map(([a, b], i) => (
        <Line
          key={`line-${i}`}
          x1={starPositions[a].cx}
          y1={starPositions[a].cy}
          x2={starPositions[b].cx}
          y2={starPositions[b].cy}
          stroke={colors.amber}
          strokeWidth={1}
          opacity={0.4}
          strokeDasharray="3,3"
        />
      ))}
      {/* stars */}
      {starPositions.map((s, i) => (
        <G key={`star-${i}`}>
          {shining && (
            <Circle cx={s.cx} cy={s.cy} r={s.r + 4} fill={colors.amber} opacity={0.15} />
          )}
          <Star cx={s.cx} cy={s.cy} r={s.r} color={shining ? '#FFD700' : colors.amber} />
        </G>
      ))}
    </G>
  );
};

const Butterfly: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <G>
    <Ellipse cx={x - 6} cy={y - 3} rx={5} ry={7} fill={colors.primary} opacity={0.7} transform={`rotate(-20 ${x - 6} ${y - 3})`} />
    <Ellipse cx={x + 6} cy={y - 3} rx={5} ry={7} fill="#8B7DD8" opacity={0.7} transform={`rotate(20 ${x + 6} ${y - 3})`} />
    <Ellipse cx={x} cy={y} rx={1.5} ry={4} fill={colors.text.primary} />
  </G>
);

// ---------- main component ----------

export const GardenSVG: React.FC<GardenSVGProps> = ({ totalCompletados }) => {
  const stage = useMemo(() => getStage(totalCompletados), [totalCompletados]);

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Jardín de hábitos, nivel ${stage}. ${totalCompletados} hábitos completados en total`}
      accessibilityRole="image"
    >
      <Svg width="100%" height="100%" viewBox="0 0 300 250" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E8E2FF" />
            <Stop offset="1" stopColor={colors.background.app} />
          </LinearGradient>
          <RadialGradient id="sunGlow" cx="0.8" cy="0.15" rx="0.2" ry="0.25">
            <Stop offset="0" stopColor="#FFE8A3" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#FFE8A3" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* sky */}
        <Rect x={0} y={0} width={300} height={250} fill="url(#skyGrad)" />

        {/* sun glow */}
        <Circle cx={250} cy={40} r={55} fill="url(#sunGlow)" />
        <Circle cx={250} cy={40} r={18} fill="#FFD97A" opacity={0.85} />

        {/* ---------- stage-based content ---------- */}

        {/* Stage 4 & 5: constellation */}
        {stage >= 4 && <Constellation shining={stage >= 5} />}

        {/* Stage 5: butterflies & extra flowers */}
        {stage >= 5 && (
          <G>
            <Butterfly x={60} y={80} />
            <Butterfly x={230} y={65} />
            <SmallFlower cx={30} cy={165} petalColor="#E899C5" />
            <SmallFlower cx={270} cy={160} petalColor="#FFD97A" />
            <SmallFlower cx={200} cy={168} petalColor="#B4AEDD" />
          </G>
        )}

        {/* Stage 3+: tree */}
        {stage === 3 && <SmallTree x={150} />}
        {stage >= 4 && <LargeTree x={150} />}

        {/* Stage 2+: flowers */}
        {stage >= 2 && (
          <G>
            <SmallFlower cx={70} cy={168} petalColor={colors.warm} />
            <SmallFlower cx={230} cy={172} petalColor={colors.primary} />
          </G>
        )}
        {stage >= 3 && (
          <SmallFlower cx={110} cy={170} petalColor="#E899C5" />
        )}

        {/* Stage 1+: always at least one sprout */}
        {stage >= 1 && <Sprout x={150} />}
        {stage >= 2 && <Sprout x={190} />}

        {/* Ground (always) */}
        <Soil />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 300 / 250,
    maxHeight: 220,
  },
});

export default GardenSVG;
