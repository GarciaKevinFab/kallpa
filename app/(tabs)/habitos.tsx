import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing, radii, shadows } from '../../src/theme/spacing';
import { KButton } from '../../src/components/ui/KButton';
import { KCard } from '../../src/components/ui/KCard';
import { KProgressRing } from '../../src/components/ui/KProgressRing';
import {
  getHabitosActivos,
  insertHabito,
  toggleHabitoHoy,
  getRacha,
  type HabitoConEstado,
} from '../../src/db/queries/habitos';

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
  fisico: { emoji: '\uD83C\uDFCB\uFE0F', color: colors.warm },
  mental: { emoji: '\uD83E\uDDE0', color: colors.primary },
  social: { emoji: '\uD83D\uDC65', color: colors.accent },
  default: { emoji: '\u2B50', color: colors.amber },
};

function getCategoryConfig(cat: string | null) {
  return CATEGORY_CONFIG[cat ?? ''] ?? CATEGORY_CONFIG['default']!;
}

// ---------------------------------------------------------------------------
// Garden Visualization (simple SVG-free version)
// ---------------------------------------------------------------------------

function GardenVisualization({ totalCompleted }: { totalCompleted: number }) {
  // Each plant represents ~5 completions
  const plantCount = Math.min(Math.floor(totalCompleted / 3), 12);
  const PLANTS = ['\uD83C\uDF31', '\uD83C\uDF3F', '\uD83C\uDF3B', '\uD83C\uDF37', '\uD83C\uDF3A', '\uD83C\uDF33'];

  if (plantCount === 0) {
    return (
      <View style={gardenStyles.container}>
        <Text style={gardenStyles.emptyEmoji}>{'\uD83C\uDF31'}</Text>
        <Text style={gardenStyles.emptyText}>
          Tu jard\u00EDn crecer\u00E1 con cada h\u00E1bito completado
        </Text>
      </View>
    );
  }

  return (
    <View style={gardenStyles.container}>
      <View style={gardenStyles.grid}>
        {Array.from({ length: plantCount }, (_, i) => (
          <Animated.Text
            key={i}
            entering={FadeIn.delay(i * 100).duration(400)}
            style={gardenStyles.plant}
          >
            {PLANTS[i % PLANTS.length]}
          </Animated.Text>
        ))}
      </View>
      <Text style={gardenStyles.gardenLabel}>
        {totalCompleted} h\u00E1bito{totalCompleted !== 1 ? 's' : ''} completado{totalCompleted !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Streak Banner Component
// ---------------------------------------------------------------------------

function StreakBanner({ streak }: { streak: number }) {
  if (streak === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={streakStyles.banner}>
      <Text style={streakStyles.emoji}>{'\uD83D\uDD25'}</Text>
      <View style={streakStyles.textContainer}>
        <Text style={streakStyles.count}>{streak} d\u00EDa{streak > 1 ? 's' : ''}</Text>
        <Text style={streakStyles.label}>de racha activa</Text>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Habit Item Component
// ---------------------------------------------------------------------------

interface HabitItemProps {
  habit: HabitoConEstado;
  onToggle: () => void;
}

function HabitItem({ habit, onToggle }: HabitItemProps) {
  const catConfig = getCategoryConfig(habit.categoria);

  return (
    <Pressable
      style={[habitStyles.card, habit.completado_hoy && habitStyles.cardCompleted]}
      onPress={onToggle}
      accessibilityLabel={`${habit.nombre}. ${habit.completado_hoy ? 'Completado' : 'Pendiente'}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: habit.completado_hoy }}
    >
      <View
        style={[
          habitStyles.checkbox,
          habit.completado_hoy && habitStyles.checkboxChecked,
          { borderColor: catConfig.color },
        ]}
      >
        {habit.completado_hoy && (
          <Text style={habitStyles.checkmark}>{'\u2713'}</Text>
        )}
      </View>
      <View style={habitStyles.content}>
        <Text
          style={[
            habitStyles.name,
            habit.completado_hoy && habitStyles.nameCompleted,
          ]}
        >
          {habit.nombre}
        </Text>
        {habit.descripcion && (
          <Text style={habitStyles.description} numberOfLines={1}>
            {habit.descripcion}
          </Text>
        )}
      </View>
      <Text style={habitStyles.categoryEmoji}>{catConfig.emoji}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Add Habit Modal
// ---------------------------------------------------------------------------

interface AddHabitModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, desc: string, category: string) => void;
}

function AddHabitModal({ visible, onClose, onAdd }: AddHabitModalProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('mental');

  const handleAdd = () => {
    if (name.trim().length < 2) return;
    onAdd(name.trim(), desc.trim(), category);
    setName('');
    setDesc('');
    setCategory('mental');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={addStyles.container} edges={['top', 'bottom']}>
        <View style={addStyles.header}>
          <Pressable onPress={onClose} accessibilityLabel="Cancelar">
            <Text style={addStyles.cancelText}>Cancelar</Text>
          </Pressable>
          <Text style={addStyles.headerTitle}>Nuevo h\u00E1bito</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={addStyles.form} contentContainerStyle={addStyles.formContent} keyboardShouldPersistTaps="handled">
          <View style={addStyles.field}>
            <Text style={addStyles.label}>Nombre del h\u00E1bito</Text>
            <TextInput
              style={addStyles.input}
              placeholder="Ej: Caminar 10 minutos"
              placeholderTextColor={colors.text.muted}
              value={name}
              onChangeText={setName}
              maxLength={60}
              accessibilityLabel="Nombre del h\u00E1bito"
            />
          </View>

          <View style={addStyles.field}>
            <Text style={addStyles.label}>Descripci\u00F3n (opcional)</Text>
            <TextInput
              style={addStyles.input}
              placeholder="Ej: Despu\u00E9s del almuerzo"
              placeholderTextColor={colors.text.muted}
              value={desc}
              onChangeText={setDesc}
              maxLength={100}
              accessibilityLabel="Descripci\u00F3n del h\u00E1bito"
            />
          </View>

          <View style={addStyles.field}>
            <Text style={addStyles.label}>Categor\u00EDa</Text>
            <View style={addStyles.categoryRow}>
              {Object.entries(CATEGORY_CONFIG)
                .filter(([key]) => key !== 'default')
                .map(([key, config]) => (
                  <Pressable
                    key={key}
                    style={[
                      addStyles.categoryChip,
                      category === key && addStyles.categoryChipSelected,
                    ]}
                    onPress={() => setCategory(key)}
                    accessibilityLabel={`Categor\u00EDa ${key}`}
                    accessibilityState={{ selected: category === key }}
                  >
                    <Text style={addStyles.categoryEmoji}>{config.emoji}</Text>
                    <Text
                      style={[
                        addStyles.categoryText,
                        category === key && addStyles.categoryTextSelected,
                      ]}
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
        </ScrollView>

        <View style={addStyles.bottomAction}>
          <KButton
            title="Agregar h\u00E1bito"
            onPress={handleAdd}
            size="lg"
            fullWidth
            disabled={name.trim().length < 2}
            accessibilityLabel="Agregar nuevo h\u00E1bito"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Habitos Screen
// ---------------------------------------------------------------------------

export default function HabitosScreen() {
  const [habits, setHabits] = useState<HabitoConEstado[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  // ── Load habits ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const data = await getHabitosActivos();
      setHabits(data);

      const completedToday = data.filter((h) => h.completado_hoy).length;
      setTotalCompleted(completedToday);

      // Get streak from the first habit as a general indicator
      if (data.length > 0 && data[0]) {
        const rachaInfo = await getRacha(data[0].id);
        setStreak(rachaInfo.dias_consecutivos);
      }
    } catch (error) {
      console.warn('[HabitosScreen] Failed to load habits:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Toggle habit ────────────────────────────────────────────────────
  const handleToggle = useCallback(
    async (habitId: number) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        await toggleHabitoHoy(habitId);
        await loadData();
      } catch (error) {
        console.warn('[HabitosScreen] Toggle error:', error);
      }
    },
    [loadData],
  );

  // ── Add habit ───────────────────────────────────────────────────────
  const handleAddHabit = useCallback(
    async (nombre: string, descripcion: string, categoria: string) => {
      try {
        await insertHabito({ nombre, descripcion, categoria });
        await loadData();
      } catch (error) {
        console.warn('[HabitosScreen] Add error:', error);
        Alert.alert(
          'No pudimos agregar el h\u00E1bito',
          'Int\u00E9ntalo de nuevo en un momento.',
          [{ text: 'Entendido' }],
        );
      }
    },
    [loadData],
  );

  // ── Progress calculation ────────────────────────────────────────────
  const progress = habits.length > 0 ? totalCompleted / habits.length : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title} accessibilityRole="header">
          Micro-h\u00E1bitos
        </Text>
        <Text style={styles.subtitle}>
          Peque\u00F1os pasos que suman grandes cambios
        </Text>

        {/* Streak Banner */}
        <StreakBanner streak={streak} />

        {/* Today's Progress */}
        <View style={styles.progressSection}>
          <KCard variant="elevated" padding={spacing.lg}>
            <View style={styles.progressRow}>
              <KProgressRing
                progress={progress}
                size={80}
                color={colors.accent}
                accessibilityLabel={`Progreso de hoy: ${Math.round(progress * 100)}%`}
              />
              <View style={styles.progressText}>
                <Text style={styles.progressTitle}>Hoy</Text>
                <Text style={styles.progressCount}>
                  {totalCompleted} de {habits.length}
                </Text>
                <Text style={styles.progressLabel}>h\u00E1bitos completados</Text>
              </View>
            </View>
          </KCard>
        </View>

        {/* Garden Visualization */}
        <GardenVisualization totalCompleted={totalCompleted} />

        {/* Habit List */}
        <View style={styles.habitListSection}>
          <Text style={styles.sectionTitle}>H\u00E1bitos de hoy</Text>
          {habits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                A\u00FAn no tienes h\u00E1bitos configurados. Agrega uno para empezar.
              </Text>
            </View>
          ) : (
            habits.map((habit, i) => (
              <Animated.View key={habit.id} entering={FadeInDown.delay(i * 60).duration(300)}>
                <HabitItem habit={habit} onToggle={() => handleToggle(habit.id)} />
              </Animated.View>
            ))
          )}
        </View>

        <View style={styles.tabBarSpacer} />
      </ScrollView>

      {/* FAB: Add habit */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setShowAddModal(true)}
        accessibilityLabel="Agregar nuevo micro-h\u00E1bito"
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Add Habit Modal */}
      <AddHabitModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddHabit}
      />
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
    paddingTop: spacing.lg,
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
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  progressText: {
    flex: 1,
  },
  progressTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    color: colors.text.primary,
  },
  progressCount: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 24,
    color: colors.accent,
  },
  progressLabel: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.muted,
  },
  habitListSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.ms,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 76,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    zIndex: 10,
  },
  fabPressed: {
    backgroundColor: '#178A64',
    transform: [{ scale: 0.95 }],
  },
  fabText: {
    fontSize: 28,
    color: colors.white,
    fontFamily: fonts.sans.semiBold,
    marginTop: -2,
  },
  tabBarSpacer: {
    height: Platform.OS === 'ios' ? 100 : 76,
  },
});

// ---------------------------------------------------------------------------
// Streak Styles
// ---------------------------------------------------------------------------

const streakStyles = StyleSheet.create({
  banner: {
    backgroundColor: colors.amberLight,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  count: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 16,
    color: colors.amber,
  },
  label: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.tertiary,
  },
});

// ---------------------------------------------------------------------------
// Garden Styles
// ---------------------------------------------------------------------------

const gardenStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.accentLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  plant: {
    fontSize: 28,
  },
  gardenLabel: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.accent,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: spacing.sm,
    opacity: 0.5,
  },
  emptyText: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    color: colors.accent,
    opacity: 0.7,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Habit Item Styles
// ---------------------------------------------------------------------------

const habitStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardCompleted: {
    backgroundColor: colors.accentLight,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.ms,
    backgroundColor: colors.background.card,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sans.semiBold,
  },
  content: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  nameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
  },
  description: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  categoryEmoji: {
    fontSize: 18,
    marginLeft: spacing.sm,
  },
});

// ---------------------------------------------------------------------------
// Add Modal Styles
// ---------------------------------------------------------------------------

const addStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.app,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 15,
    color: colors.primary,
  },
  headerTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 17,
    color: colors.text.primary,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    fontFamily: fonts.sans.regular,
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 48,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background.card,
  },
  categoryChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    color: colors.text.tertiary,
  },
  categoryTextSelected: {
    color: colors.primary,
  },
  bottomAction: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background.app,
  },
});
