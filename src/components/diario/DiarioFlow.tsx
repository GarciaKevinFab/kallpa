import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInRight,
  FadeOutLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { spacing, radii, shadows } from '../../theme/spacing';
import { fonts } from '../../theme/typography';
import { insertEntrada } from '../../db/queries/diario';
import DistorsionChips from './DistorsionChips';

// ── Types ──────────────────────────────────────────────────────────────

interface DiarioFlowProps {
  /** Called after the entry is successfully saved. */
  onComplete?: (entradaId: number) => void;
  /** Called when the user explicitly cancels the flow. */
  onCancel?: () => void;
}

interface DiarioState {
  eventoDisparador: string;
  angustiaAntes: number;
  pensamientoOriginal: string;
  distorsiones: string[];
  evidenciaAFavor: string;
  evidenciaEnContra: string;
  reformulacion: string;
  angustiaDespues: number;
}

const TOTAL_STEPS = 4;

// ── Sub-components ─────────────────────────────────────────────────────

/** Distress slider (1-10) */
function DistressSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <View style={sliderStyles.container}>
      <Text style={sliderStyles.label}>{label}</Text>
      <View style={sliderStyles.row}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(n);
            }}
            accessibilityLabel={`Nivel de angustia ${n}`}
            accessibilityRole="button"
            accessibilityState={{ selected: n === value }}
            style={[
              sliderStyles.dot,
              n === value && sliderStyles.dotActive,
              n <= value && sliderStyles.dotFilled,
            ]}
          >
            <Text
              style={[
                sliderStyles.dotText,
                n <= value && sliderStyles.dotTextFilled,
              ]}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.hint}>Baja</Text>
        <Text style={sliderStyles.hint}>Alta</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    color: colors.text.tertiary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  dotFilled: {
    backgroundColor: colors.primaryLight,
  },
  dotText: {
    fontFamily: fonts.sans.medium,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  dotTextFilled: {
    color: colors.primary,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hint: {
    fontFamily: fonts.sans.regular,
    fontSize: 10,
    color: colors.text.muted,
  },
});

/** Stepper dots at top */
function StepperDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={stepperStyles.container}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            stepperStyles.dot,
            i < current && stepperStyles.dotCompleted,
            i === current && stepperStyles.dotCurrent,
          ]}
        />
      ))}
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotCompleted: {
    backgroundColor: colors.accent,
  },
  dotCurrent: {
    backgroundColor: colors.primary,
    width: 24,
    borderRadius: radii.full,
  },
});

/** Step 1: Event + distress before */
function Step1({
  evento,
  angustia,
  onEventoChange,
  onAngustiaChange,
}: {
  evento: string;
  angustia: number;
  onEventoChange: (v: string) => void;
  onAngustiaChange: (v: number) => void;
}) {
  return (
    <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)}>
      <Text style={flowStyles.question}>
        {'\u00BF'}Qu{'\u00E9'} pas{'\u00F3'} hoy que te afect{'\u00F3'}?
      </Text>
      <TextInput
        style={flowStyles.textInput}
        placeholder="Describe brevemente lo que sucedi\u00F3..."
        placeholderTextColor={colors.text.muted}
        value={evento}
        onChangeText={onEventoChange}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        accessibilityLabel="Evento que te afect\u00F3"
      />
      <View style={{ height: spacing.lg }} />
      <DistressSlider
        value={angustia}
        onChange={onAngustiaChange}
        label="Nivel de angustia (antes)"
      />
    </Animated.View>
  );
}

/** Step 2: Thought + distortions */
function Step2({
  pensamiento,
  distorsiones,
  onPensamientoChange,
  onDistorsionesChange,
}: {
  pensamiento: string;
  distorsiones: string[];
  onPensamientoChange: (v: string) => void;
  onDistorsionesChange: (v: string[]) => void;
}) {
  return (
    <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)}>
      <Text style={flowStyles.question}>
        {'\u00BF'}Qu{'\u00E9'} pensamiento surgi{'\u00F3'}?
      </Text>
      <TextInput
        style={flowStyles.textInput}
        placeholder="Escribe el pensamiento autom\u00E1tico..."
        placeholderTextColor={colors.text.muted}
        value={pensamiento}
        onChangeText={onPensamientoChange}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        accessibilityLabel="Pensamiento autom\u00E1tico"
      />
      <View style={{ height: spacing.lg }} />
      <DistorsionChips
        selected={distorsiones}
        onSelectionChange={onDistorsionesChange}
      />
    </Animated.View>
  );
}

/** Step 3: Evidence for / against */
function Step3({
  evidenciaAFavor,
  evidenciaEnContra,
  onEvidenciaAFavorChange,
  onEvidenciaEnContraChange,
}: {
  evidenciaAFavor: string;
  evidenciaEnContra: string;
  onEvidenciaAFavorChange: (v: string) => void;
  onEvidenciaEnContraChange: (v: string) => void;
}) {
  return (
    <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)}>
      <Text style={flowStyles.question}>
        {'\u00BF'}Qu{'\u00E9'} evidencia REAL tienes?
      </Text>
      <Text style={flowStyles.subLabel}>A favor del pensamiento</Text>
      <TextInput
        style={flowStyles.textInput}
        placeholder="Evidencia que apoya el pensamiento..."
        placeholderTextColor={colors.text.muted}
        value={evidenciaAFavor}
        onChangeText={onEvidenciaAFavorChange}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        accessibilityLabel="Evidencia a favor del pensamiento"
      />
      <View style={{ height: spacing.md }} />
      <Text style={flowStyles.subLabel}>En contra del pensamiento</Text>
      <TextInput
        style={flowStyles.textInput}
        placeholder="Evidencia que contradice el pensamiento..."
        placeholderTextColor={colors.text.muted}
        value={evidenciaEnContra}
        onChangeText={onEvidenciaEnContraChange}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        accessibilityLabel="Evidencia en contra del pensamiento"
      />
    </Animated.View>
  );
}

/** Step 4: Reformulation + distress after */
function Step4({
  reformulacion,
  angustia,
  onReformulacionChange,
  onAngustiaChange,
}: {
  reformulacion: string;
  angustia: number;
  onReformulacionChange: (v: string) => void;
  onAngustiaChange: (v: number) => void;
}) {
  return (
    <Animated.View entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(200)}>
      <Text style={flowStyles.question}>
        {'\u00BF'}C{'\u00F3'}mo lo ver{'\u00ED'}as de forma m{'\u00E1'}s equilibrada?
      </Text>
      <TextInput
        style={flowStyles.textInput}
        placeholder="Escribe un pensamiento m\u00E1s equilibrado..."
        placeholderTextColor={colors.text.muted}
        value={reformulacion}
        onChangeText={onReformulacionChange}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        accessibilityLabel="Pensamiento equilibrado"
      />
      <View style={{ height: spacing.lg }} />
      <DistressSlider
        value={angustia}
        onChange={onAngustiaChange}
        label="Nivel de angustia (despu\u00E9s)"
      />
    </Animated.View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function DiarioFlow({ onComplete, onCancel }: DiarioFlowProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [state, setState] = useState<DiarioState>({
    eventoDisparador: '',
    angustiaAntes: 5,
    pensamientoOriginal: '',
    distorsiones: [],
    evidenciaAFavor: '',
    evidenciaEnContra: '',
    reformulacion: '',
    angustiaDespues: 5,
  });

  const update = useCallback(
    <K extends keyof DiarioState>(key: K, value: DiarioState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        return state.eventoDisparador.trim().length > 0;
      case 1:
        return state.pensamientoOriginal.trim().length > 0;
      case 2:
        return (
          state.evidenciaAFavor.trim().length > 0 ||
          state.evidenciaEnContra.trim().length > 0
        );
      case 3:
        return state.reformulacion.trim().length > 0;
      default:
        return false;
    }
  }, [step, state]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setStep((s) => s + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [step]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [step]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );

    try {
      const entradaId = await insertEntrada({
        evento_disparador: state.eventoDisparador,
        pensamiento_original: state.pensamientoOriginal,
        distorsion_identificada: state.distorsiones.join(', '),
        reformulacion: `[A favor] ${state.evidenciaAFavor}\n[En contra] ${state.evidenciaEnContra}\n[Reformulaci\u00F3n] ${state.reformulacion}`,
        nivel_angustia_antes: state.angustiaAntes,
        nivel_angustia_despues: state.angustiaDespues,
        completado: true,
      });
      onComplete?.(entradaId);
    } catch (err) {
      console.warn('[DiarioFlow] Failed to save entry:', err);
    } finally {
      setSaving(false);
    }
  }, [state, saving, onComplete]);

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <KeyboardAvoidingView
      style={flowStyles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        ref={scrollRef}
        style={flowStyles.scroll}
        contentContainerStyle={flowStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StepperDots current={step} total={TOTAL_STEPS} />

        <Text style={flowStyles.stepLabel}>
          Paso {step + 1} de {TOTAL_STEPS}
        </Text>

        {step === 0 && (
          <Step1
            evento={state.eventoDisparador}
            angustia={state.angustiaAntes}
            onEventoChange={(v) => update('eventoDisparador', v)}
            onAngustiaChange={(v) => update('angustiaAntes', v)}
          />
        )}
        {step === 1 && (
          <Step2
            pensamiento={state.pensamientoOriginal}
            distorsiones={state.distorsiones}
            onPensamientoChange={(v) => update('pensamientoOriginal', v)}
            onDistorsionesChange={(v) => update('distorsiones', v)}
          />
        )}
        {step === 2 && (
          <Step3
            evidenciaAFavor={state.evidenciaAFavor}
            evidenciaEnContra={state.evidenciaEnContra}
            onEvidenciaAFavorChange={(v) => update('evidenciaAFavor', v)}
            onEvidenciaEnContraChange={(v) => update('evidenciaEnContra', v)}
          />
        )}
        {step === 3 && (
          <Step4
            reformulacion={state.reformulacion}
            angustia={state.angustiaDespues}
            onReformulacionChange={(v) => update('reformulacion', v)}
            onAngustiaChange={(v) => update('angustiaDespues', v)}
          />
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={flowStyles.navRow}>
        {step > 0 ? (
          <Pressable
            onPress={goPrev}
            style={flowStyles.navBtnSecondary}
            accessibilityLabel="Paso anterior"
            accessibilityRole="button"
          >
            <Text style={flowStyles.navBtnSecondaryText}>Anterior</Text>
          </Pressable>
        ) : onCancel ? (
          <Pressable
            onPress={onCancel}
            style={flowStyles.navBtnSecondary}
            accessibilityLabel="Cancelar"
            accessibilityRole="button"
          >
            <Text style={flowStyles.navBtnSecondaryText}>Cancelar</Text>
          </Pressable>
        ) : (
          <View style={flowStyles.navSpacer} />
        )}

        {isLastStep ? (
          <Pressable
            onPress={handleSave}
            disabled={!canGoNext || saving}
            style={[
              flowStyles.navBtnPrimary,
              flowStyles.navBtnSave,
              (!canGoNext || saving) && flowStyles.navBtnDisabled,
            ]}
            accessibilityLabel="Guardar en mi diario"
            accessibilityRole="button"
          >
            <Text style={flowStyles.navBtnPrimaryText}>
              {saving ? 'Guardando...' : 'Guardar en mi diario'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={goNext}
            disabled={!canGoNext}
            style={[
              flowStyles.navBtnPrimary,
              !canGoNext && flowStyles.navBtnDisabled,
            ]}
            accessibilityLabel="Siguiente paso"
            accessibilityRole="button"
          >
            <Text style={flowStyles.navBtnPrimaryText}>Siguiente</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Flow Styles ────────────────────────────────────────────────────────

const flowStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.app,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stepLabel: {
    fontFamily: fonts.sans.medium,
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  question: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  subLabel: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.ms,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.primary,
    minHeight: 80,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    backgroundColor: colors.background.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.ms,
  },
  navSpacer: {
    flex: 1,
  },
  navBtnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.ms,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnSave: {
    backgroundColor: colors.accent,
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnPrimaryText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.white,
  },
  navBtnSecondary: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: radii.md,
    paddingVertical: spacing.ms,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnSecondaryText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
});
