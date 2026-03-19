import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing, radii, shadows } from '../../src/theme/spacing';
import { KButton } from '../../src/components/ui/KButton';
import { KCard } from '../../src/components/ui/KCard';
import {
  insertEntrada,
  getEntradas,
  getEntrada,
  type EntradaDiario,
  type InsertEntradaData,
} from '../../src/db/queries/diario';

// ---------------------------------------------------------------------------
// Distortion Data
// ---------------------------------------------------------------------------

const DISTORTIONS = [
  { id: 'catastrofizacion', emoji: '\uD83C\uDF2A\uFE0F', label: 'Catastrofizaci\u00F3n', description: 'Pensar que lo peor va a pasar' },
  { id: 'lectura_mente', emoji: '\uD83E\uDDE0', label: 'Lectura de mente', description: 'Asumir qu\u00E9 piensa el otro' },
  { id: 'generalizacion', emoji: '\u267E\uFE0F', label: 'Generalizaci\u00F3n', description: '"Siempre" o "nunca"' },
  { id: 'filtro_negativo', emoji: '\uD83D\uDD0D', label: 'Filtro negativo', description: 'Solo ver lo malo' },
  { id: 'personalizacion', emoji: '\uD83C\uDFAF', label: 'Personalizaci\u00F3n', description: 'Creer que todo es tu culpa' },
  { id: 'deberia', emoji: '\u261D\uFE0F', label: 'Los "deber\u00EDa"', description: 'Reglas r\u00EDgidas sobre ti o el mundo' },
  { id: 'etiquetado', emoji: '\uD83C\uDFF7\uFE0F', label: 'Etiquetado', description: '"Soy un fracaso"' },
  { id: 'descalificacion', emoji: '\u274C', label: 'Descalificaci\u00F3n', description: 'Restar importancia a lo positivo' },
];

// ---------------------------------------------------------------------------
// Diary Flow Steps
// ---------------------------------------------------------------------------

type FlowStep = 'evento' | 'pensamiento' | 'distorsion' | 'reformulacion' | 'angustia' | 'done';

const FLOW_STEPS: { key: FlowStep; label: string; description: string }[] = [
  { key: 'evento', label: '\u00BFQu\u00E9 pas\u00F3?', description: 'Describe brevemente la situaci\u00F3n que te provoc\u00F3 malestar' },
  { key: 'pensamiento', label: '\u00BFQu\u00E9 pensaste?', description: '\u00BFQu\u00E9 te dijiste a ti mismo/a en ese momento?' },
  { key: 'distorsion', label: '\u00BFQu\u00E9 trampa mental podr\u00EDa ser?', description: 'A veces nuestros pensamientos nos enga\u00F1an. \u00BFCon cu\u00E1l de estas se parece?' },
  { key: 'reformulacion', label: '\u00BFQu\u00E9 podr\u00EDas pensar en cambio?', description: 'Intenta reformular ese pensamiento de forma m\u00E1s equilibrada' },
  { key: 'angustia', label: '\u00BFC\u00F3mo te sientes ahora?', description: 'Del 1 al 10, \u00BFcu\u00E1nta angustia sientes despu\u00E9s de reflexionar?' },
  { key: 'done', label: '\u00A1Bien hecho!', description: 'Reflexionar sobre tus pensamientos es un acto de valent\u00EDa' },
];

// ---------------------------------------------------------------------------
// Entry Item Component
// ---------------------------------------------------------------------------

interface EntryItemProps {
  entry: EntradaDiario;
  onPress: () => void;
}

function EntryItem({ entry, onPress }: EntryItemProps) {
  const distortion = DISTORTIONS.find((d) => d.id === entry.distorsion_identificada);
  const dateStr = entry.fecha;

  return (
    <Pressable
      style={({ pressed }) => [entryStyles.card, pressed && entryStyles.pressed]}
      onPress={onPress}
      accessibilityLabel={`Entrada del ${dateStr}. ${distortion?.label ?? 'Sin distorsi\u00F3n identificada'}`}
      accessibilityRole="button"
    >
      <View style={entryStyles.left}>
        <Text style={entryStyles.emoji}>{distortion?.emoji ?? '\uD83D\uDCD3'}</Text>
      </View>
      <View style={entryStyles.content}>
        <Text style={entryStyles.date}>{dateStr} - {entry.hora}</Text>
        <Text style={entryStyles.evento} numberOfLines={2}>
          {entry.evento_disparador || 'Sin descripci\u00F3n'}
        </Text>
        {distortion && (
          <Text style={entryStyles.distortion}>{distortion.label}</Text>
        )}
      </View>
      <Text style={entryStyles.chevron}>{'\u203A'}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Diario Screen
// ---------------------------------------------------------------------------

export default function DiarioScreen() {
  const [entries, setEntries] = useState<EntradaDiario[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFlow, setShowFlow] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntradaDiario | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Flow state
  const [flowStep, setFlowStep] = useState<FlowStep>('evento');
  const [evento, setEvento] = useState('');
  const [pensamiento, setPensamiento] = useState('');
  const [distorsion, setDistorsion] = useState('');
  const [reformulacion, setReformulacion] = useState('');
  const [angustiaBefore, setAngustiaBefore] = useState(5);
  const [angustiaAfter, setAngustiaAfter] = useState(5);
  const [saving, setSaving] = useState(false);

  // ── Load entries ────────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    try {
      const data = await getEntradas(100);
      setEntries(data);
    } catch (error) {
      console.warn('[DiarioScreen] Failed to load entries:', error);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // ── Filtered entries ────────────────────────────────────────────────
  const filteredEntries = searchQuery.trim()
    ? entries.filter(
        (e) =>
          (e.evento_disparador?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          (e.pensamiento_original?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          (e.reformulacion?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
      )
    : entries;

  // ── Flow navigation ─────────────────────────────────────────────────
  const stepIndex = FLOW_STEPS.findIndex((s) => s.key === flowStep);
  const currentStepData = FLOW_STEPS[stepIndex];

  const goNext = () => {
    const nextStep = FLOW_STEPS[stepIndex + 1];
    if (nextStep) {
      setFlowStep(nextStep.key);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      const prevStep = FLOW_STEPS[stepIndex - 1];
      if (prevStep) {
        setFlowStep(prevStep.key);
      }
    }
  };

  const canProceed = (): boolean => {
    switch (flowStep) {
      case 'evento': return evento.trim().length > 0;
      case 'pensamiento': return pensamiento.trim().length > 0;
      case 'distorsion': return distorsion !== '';
      case 'reformulacion': return reformulacion.trim().length > 0;
      case 'angustia': return true;
      default: return true;
    }
  };

  // ── Save entry ──────────────────────────────────────────────────────
  const saveEntry = useCallback(async () => {
    setSaving(true);
    try {
      const data: InsertEntradaData = {
        evento_disparador: evento.trim(),
        pensamiento_original: pensamiento.trim(),
        distorsion_identificada: distorsion,
        reformulacion: reformulacion.trim(),
        nivel_angustia_antes: angustiaBefore,
        nivel_angustia_despues: angustiaAfter,
        completado: true,
      };

      await insertEntrada(data);
      await loadEntries();
      setFlowStep('done');
    } catch (error) {
      console.warn('[DiarioScreen] Save error:', error);
      Alert.alert(
        'No pudimos guardar tu entrada',
        'Int\u00E9ntalo de nuevo en un momento.',
        [{ text: 'Entendido' }],
      );
    } finally {
      setSaving(false);
    }
  }, [evento, pensamiento, distorsion, reformulacion, angustiaBefore, angustiaAfter, loadEntries]);

  // ── Reset flow ──────────────────────────────────────────────────────
  const resetFlow = () => {
    setFlowStep('evento');
    setEvento('');
    setPensamiento('');
    setDistorsion('');
    setReformulacion('');
    setAngustiaBefore(5);
    setAngustiaAfter(5);
    setShowFlow(false);
  };

  // ── View entry detail ───────────────────────────────────────────────
  const handleViewEntry = useCallback(async (entry: EntradaDiario) => {
    try {
      const full = await getEntrada(entry.id);
      setSelectedEntry(full);
      setShowDetail(true);
    } catch {
      setSelectedEntry(entry);
      setShowDetail(true);
    }
  }, []);

  // ── Render flow step content ────────────────────────────────────────
  const renderFlowContent = () => {
    switch (flowStep) {
      case 'evento':
        return (
          <TextInput
            style={flowStyles.textArea}
            placeholder="Ej: Me fue mal en el parcial de matem\u00E1ticas..."
            placeholderTextColor={colors.text.muted}
            value={evento}
            onChangeText={setEvento}
            multiline
            maxLength={500}
            accessibilityLabel="Describe la situaci\u00F3n"
          />
        );

      case 'pensamiento':
        return (
          <TextInput
            style={flowStyles.textArea}
            placeholder="Ej: Soy un fracaso, nunca voy a aprobar..."
            placeholderTextColor={colors.text.muted}
            value={pensamiento}
            onChangeText={setPensamiento}
            multiline
            maxLength={500}
            accessibilityLabel="Escribe tu pensamiento autom\u00E1tico"
          />
        );

      case 'distorsion':
        return (
          <View style={flowStyles.distortionGrid}>
            {DISTORTIONS.map((d) => (
              <Pressable
                key={d.id}
                style={[
                  flowStyles.distortionCard,
                  distorsion === d.id && flowStyles.distortionCardSelected,
                ]}
                onPress={() => setDistorsion(d.id)}
                accessibilityLabel={`${d.label}: ${d.description}`}
                accessibilityState={{ selected: distorsion === d.id }}
              >
                <Text style={flowStyles.distortionEmoji}>{d.emoji}</Text>
                <Text style={[flowStyles.distortionLabel, distorsion === d.id && flowStyles.distortionLabelSelected]}>
                  {d.label}
                </Text>
                <Text style={flowStyles.distortionDesc} numberOfLines={2}>
                  {d.description}
                </Text>
              </Pressable>
            ))}
          </View>
        );

      case 'reformulacion':
        return (
          <TextInput
            style={flowStyles.textArea}
            placeholder="Ej: Un parcial no define mi capacidad. Puedo mejorar para el siguiente..."
            placeholderTextColor={colors.text.muted}
            value={reformulacion}
            onChangeText={setReformulacion}
            multiline
            maxLength={500}
            accessibilityLabel="Reformula tu pensamiento"
          />
        );

      case 'angustia':
        return (
          <View style={flowStyles.angustiaSection}>
            <Text style={flowStyles.angustiaLabel}>Nivel de angustia ahora (1-10)</Text>
            <View style={flowStyles.angustiaRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  style={[
                    flowStyles.angustiaCircle,
                    angustiaAfter === n && flowStyles.angustiaCircleSelected,
                  ]}
                  onPress={() => setAngustiaAfter(n)}
                  accessibilityLabel={`Nivel ${n}`}
                  accessibilityState={{ selected: angustiaAfter === n }}
                >
                  <Text style={[
                    flowStyles.angustiaNumber,
                    angustiaAfter === n && flowStyles.angustiaNumberSelected,
                  ]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 'done':
        return (
          <View style={flowStyles.doneSection}>
            <Text style={flowStyles.doneEmoji}>{'\uD83C\uDF1F'}</Text>
            <Text style={flowStyles.doneTitle}>{'\u00A1'}Bien hecho!</Text>
            <Text style={flowStyles.doneText}>
              Reflexionar sobre tus pensamientos es un acto de valent\u00EDa. Cada entrada te acerca m\u00E1s a entenderte mejor.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Diario Cognitivo
        </Text>
        <KButton
          title="+ Nueva entrada"
          onPress={() => setShowFlow(true)}
          size="sm"
          variant="secondary"
          accessibilityLabel="Crear nueva entrada en el diario"
        />
      </View>

      {/* ── Search ────────────────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en tu diario..."
          placeholderTextColor={colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Buscar entradas del diario"
          accessibilityHint="Escribe para filtrar tus entradas"
        />
      </View>

      {/* ── Entry List ────────────────────────────────────────────── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{'\uD83D\uDCD3'}</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Sin resultados' : 'Tu diario est\u00E1 vac\u00EDo'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Intenta con otras palabras'
                : 'Escribe tu primera entrada para comenzar a reestructurar tus pensamientos.'}
            </Text>
          </View>
        ) : (
          filteredEntries.map((entry, i) => (
            <Animated.View key={entry.id} entering={FadeInDown.delay(i * 50).duration(300)}>
              <EntryItem entry={entry} onPress={() => handleViewEntry(entry)} />
            </Animated.View>
          ))
        )}
        <View style={styles.tabBarSpacer} />
      </ScrollView>

      {/* ── Flow Modal ────────────────────────────────────────────── */}
      <Modal visible={showFlow} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={flowStyles.container} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={flowStyles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Flow header */}
            <View style={flowStyles.header}>
              <Pressable
                onPress={flowStep === 'done' ? resetFlow : () => {
                  if (stepIndex === 0) {
                    resetFlow();
                  } else {
                    goBack();
                  }
                }}
                accessibilityLabel={flowStep === 'done' ? 'Cerrar' : stepIndex === 0 ? 'Cancelar' : 'Volver'}
              >
                <Text style={flowStyles.backText}>
                  {flowStep === 'done' ? 'Cerrar' : stepIndex === 0 ? 'Cancelar' : '\u2039 Volver'}
                </Text>
              </Pressable>
              {flowStep !== 'done' && (
                <Text style={flowStyles.stepCount}>
                  {stepIndex + 1}/{FLOW_STEPS.length - 1}
                </Text>
              )}
            </View>

            {/* Progress bar */}
            {flowStep !== 'done' && (
              <View style={flowStyles.progressTrack}>
                <View
                  style={[
                    flowStyles.progressFill,
                    { width: `${((stepIndex + 1) / (FLOW_STEPS.length - 1)) * 100}%` },
                  ]}
                />
              </View>
            )}

            <ScrollView
              style={flowStyles.scrollView}
              contentContainerStyle={flowStyles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Step title and description */}
              {currentStepData && (
                <View style={flowStyles.stepHeader}>
                  <Text style={flowStyles.stepTitle}>{currentStepData.label}</Text>
                  <Text style={flowStyles.stepDescription}>{currentStepData.description}</Text>
                </View>
              )}

              {/* Step content */}
              {renderFlowContent()}
            </ScrollView>

            {/* Bottom action */}
            {flowStep !== 'done' && (
              <View style={flowStyles.bottomAction}>
                {flowStep === 'angustia' ? (
                  <KButton
                    title="Guardar entrada"
                    onPress={saveEntry}
                    size="lg"
                    fullWidth
                    loading={saving}
                    accessibilityLabel="Guardar entrada del diario"
                  />
                ) : (
                  <KButton
                    title="Siguiente"
                    onPress={goNext}
                    size="lg"
                    fullWidth
                    disabled={!canProceed()}
                    accessibilityLabel="Ir al siguiente paso"
                  />
                )}
              </View>
            )}

            {flowStep === 'done' && (
              <View style={flowStyles.bottomAction}>
                <KButton
                  title="Volver al diario"
                  onPress={resetFlow}
                  size="lg"
                  fullWidth
                  accessibilityLabel="Volver a la lista del diario"
                />
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Detail Modal ──────────────────────────────────────────── */}
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={flowStyles.container} edges={['top', 'bottom']}>
          <View style={flowStyles.header}>
            <Pressable onPress={() => setShowDetail(false)} accessibilityLabel="Cerrar detalle">
              <Text style={flowStyles.backText}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView style={flowStyles.scrollView} contentContainerStyle={flowStyles.scrollContent}>
            {selectedEntry && (
              <>
                <Text style={detailStyles.date}>
                  {selectedEntry.fecha} - {selectedEntry.hora}
                </Text>

                <Text style={detailStyles.sectionLabel}>Situaci\u00F3n</Text>
                <Text style={detailStyles.sectionText}>
                  {selectedEntry.evento_disparador || 'No descrito'}
                </Text>

                <Text style={detailStyles.sectionLabel}>Pensamiento original</Text>
                <Text style={detailStyles.sectionText}>
                  {selectedEntry.pensamiento_original || 'No registrado'}
                </Text>

                <Text style={detailStyles.sectionLabel}>Distorsi\u00F3n identificada</Text>
                <View style={detailStyles.distortionRow}>
                  <Text style={detailStyles.sectionText}>
                    {DISTORTIONS.find((d) => d.id === selectedEntry.distorsion_identificada)?.emoji ?? ''}{' '}
                    {DISTORTIONS.find((d) => d.id === selectedEntry.distorsion_identificada)?.label ?? 'No identificada'}
                  </Text>
                </View>

                <Text style={detailStyles.sectionLabel}>Reformulaci\u00F3n</Text>
                <Text style={[detailStyles.sectionText, detailStyles.reformulacion]}>
                  {selectedEntry.reformulacion || 'No registrada'}
                </Text>

                {selectedEntry.nivel_angustia_antes !== null && selectedEntry.nivel_angustia_despues !== null && (
                  <View style={detailStyles.angustiaComparison}>
                    <View style={detailStyles.angustiaItem}>
                      <Text style={detailStyles.angustiaValue}>{selectedEntry.nivel_angustia_antes}</Text>
                      <Text style={detailStyles.angustiaItemLabel}>Antes</Text>
                    </View>
                    <Text style={detailStyles.angustiaArrow}>{'\u2192'}</Text>
                    <View style={detailStyles.angustiaItem}>
                      <Text style={[detailStyles.angustiaValue, detailStyles.angustiaAfter]}>
                        {selectedEntry.nivel_angustia_despues}
                      </Text>
                      <Text style={detailStyles.angustiaItemLabel}>Despu\u00E9s</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontFamily: fonts.serif.regular,
    fontSize: 24,
    color: colors.text.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    color: colors.text.primary,
    height: 42,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  tabBarSpacer: {
    height: Platform.OS === 'ios' ? 100 : 76,
  },
});

// ---------------------------------------------------------------------------
// Entry Item Styles
// ---------------------------------------------------------------------------

const entryStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  left: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryXLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.ms,
  },
  emoji: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  date: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    color: colors.text.muted,
    marginBottom: 2,
  },
  evento: {
    fontFamily: fonts.sans.medium,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  distortion: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },
});

// ---------------------------------------------------------------------------
// Flow Styles
// ---------------------------------------------------------------------------

const flowStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.app,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 15,
    color: colors.primary,
  },
  stepCount: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    color: colors.text.muted,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  stepHeader: {
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontFamily: fonts.serif.regular,
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.tertiary,
  },
  textArea: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.text.primary,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  distortionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  distortionCard: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.ms,
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
  },
  distortionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryXLight,
  },
  distortionEmoji: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  distortionLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13,
    color: colors.text.primary,
    marginBottom: 2,
  },
  distortionLabelSelected: {
    color: colors.primary,
  },
  distortionDesc: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.text.muted,
  },
  angustiaSection: {
    alignItems: 'center',
  },
  angustiaLabel: {
    fontFamily: fonts.sans.medium,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  angustiaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  angustiaCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
  },
  angustiaCircleSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  angustiaNumber: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.text.tertiary,
  },
  angustiaNumberSelected: {
    color: colors.primary,
  },
  doneSection: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  doneEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  doneTitle: {
    fontFamily: fonts.serif.regular,
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  doneText: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  bottomAction: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background.app,
  },
});

// ---------------------------------------------------------------------------
// Detail Styles
// ---------------------------------------------------------------------------

const detailStyles = StyleSheet.create({
  date: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 12,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  sectionText: {
    fontFamily: fonts.sans.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.text.primary,
  },
  distortionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reformulacion: {
    color: colors.accent,
    fontStyle: 'italic',
  },
  angustiaComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  angustiaItem: {
    alignItems: 'center',
  },
  angustiaValue: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 32,
    color: colors.warm,
  },
  angustiaAfter: {
    color: colors.accent,
  },
  angustiaItemLabel: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.muted,
    marginTop: spacing.xxs,
  },
  angustiaArrow: {
    fontSize: 24,
    color: colors.text.muted,
  },
});
