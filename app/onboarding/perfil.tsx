import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing, radii, shadows } from '../../src/theme/spacing';
import { KButton } from '../../src/components/ui/KButton';
import { useAppStore } from '../../src/store/useAppStore';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CARRERAS = [
  'Ingenier\u00EDa de Sistemas',
  'Ingenier\u00EDa Civil',
  'Ingenier\u00EDa Ambiental',
  'Ingenier\u00EDa El\u00E9ctrica',
  'Ingenier\u00EDa Mec\u00E1nica',
  'Ingenier\u00EDa Qu\u00EDmica',
  'Medicina Humana',
  'Enfermer\u00EDa',
  'Psicolog\u00EDa',
  'Derecho',
  'Contabilidad',
  'Administraci\u00F3n',
  'Econom\u00EDa',
  'Educaci\u00F3n',
  'Arquitectura',
  'Ciencias de la Comunicaci\u00F3n',
  'Trabajo Social',
  'Otra',
];

const REGIONES_PERU = [
  'Amazonas', 'Ancash', 'Apur\u00EDmac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Hu\u00E1nuco',
  'Ica', 'Jun\u00EDn', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Mart\u00EDn', 'Tacna', 'Tumbes', 'Ucayali',
];

const CICLOS = Array.from({ length: 10 }, (_, i) => i + 1);

const DB_NAME = 'kallpa.db';

// ---------------------------------------------------------------------------
// Picker Modal Component (inline)
// ---------------------------------------------------------------------------

interface PickerSheetProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

function PickerSheet({ visible, title, options, selected, onSelect, onClose }: PickerSheetProps) {
  if (!visible) return null;

  return (
    <View style={pickerStyles.overlay}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} accessibilityLabel="Cerrar selector" />
      <View style={pickerStyles.sheet}>
        <Text style={pickerStyles.sheetTitle}>{title}</Text>
        <ScrollView style={pickerStyles.optionsList} showsVerticalScrollIndicator>
          {options.map((option) => (
            <Pressable
              key={option}
              style={[
                pickerStyles.option,
                selected === option && pickerStyles.optionSelected,
              ]}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
              accessibilityLabel={`Seleccionar ${option}`}
              accessibilityState={{ selected: selected === option }}
            >
              <Text
                style={[
                  pickerStyles.optionText,
                  selected === option && pickerStyles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
              {selected === option && (
                <Text style={pickerStyles.checkMark}>{'\u2713'}</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
        <KButton title="Cerrar" onPress={onClose} variant="ghost" fullWidth />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Profile Setup Screen
// ---------------------------------------------------------------------------

export default function PerfilScreen() {
  const router = useRouter();
  const setUserName = useAppStore((s) => s.setUserName);

  // Form state
  const [nombre, setNombre] = useState('');
  const [carrera, setCarrera] = useState('');
  const [ciclo, setCiclo] = useState<number | null>(null);
  const [esDeHuancayo, setEsDeHuancayo] = useState(true);
  const [regionOrigen, setRegionOrigen] = useState('');
  const [familiarTel, setFamiliarTel] = useState('');
  const [saving, setSaving] = useState(false);

  // Picker visibility
  const [carreraPickerVisible, setCarreraPickerVisible] = useState(false);
  const [cicloPickerVisible, setCicloPickerVisible] = useState(false);
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);

  // ── Validation ──────────────────────────────────────────────────────
  const isFormValid = nombre.trim().length >= 2 && carrera !== '' && ciclo !== null;

  // ── Save to SQLite ──────────────────────────────────────────────────
  const handleContinuar = useCallback(async () => {
    if (!isFormValid) return;

    setSaving(true);
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const fechaRegistro = new Date().toISOString().split('T')[0];

      await db.runAsync(
        `INSERT OR REPLACE INTO perfil_usuario
          (id, nombre, carrera, ciclo, region_origen, es_migrante, fecha_registro, familiar_tel)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre.trim(),
          carrera,
          ciclo,
          esDeHuancayo ? 'Jun\u00EDn' : regionOrigen,
          esDeHuancayo ? 0 : 1,
          fechaRegistro,
          familiarTel.trim() || null,
        ],
      );

      // Update Zustand store
      setUserName(nombre.trim());

      router.push('/onboarding/privacidad');
    } catch (error) {
      console.warn('[PerfilScreen] Save error:', error);
      Alert.alert(
        'Ups, algo sali\u00F3 mal',
        'No pudimos guardar tu informaci\u00F3n. Int\u00E9ntalo de nuevo, por favor.',
        [{ text: 'Entendido' }],
      );
    } finally {
      setSaving(false);
    }
  }, [nombre, carrera, ciclo, esDeHuancayo, regionOrigen, familiarTel, isFormValid, router, setUserName]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.stepIndicator}>Paso 1 de 2</Text>
          <Text style={styles.title} accessibilityRole="header">
            Cu\u00E9ntanos sobre ti
          </Text>
          <Text style={styles.subtitle}>
            Esta informaci\u00F3n nos ayuda a personalizar tu experiencia. Se guarda solo en tu tel\u00E9fono.
          </Text>

          {/* Name field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="\u00BFC\u00F3mo te llamas?"
              placeholderTextColor={colors.text.muted}
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              maxLength={50}
              accessibilityLabel="Tu nombre"
              accessibilityHint="Escribe tu nombre o apodo"
            />
          </View>

          {/* Career picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Carrera</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setCarreraPickerVisible(true)}
              accessibilityLabel="Seleccionar carrera"
              accessibilityHint="Abre la lista de carreras disponibles"
            >
              <Text style={[styles.pickerButtonText, !carrera && styles.placeholderText]}>
                {carrera || 'Selecciona tu carrera'}
              </Text>
              <Text style={styles.chevron}>{'\u25BE'}</Text>
            </Pressable>
          </View>

          {/* Cycle picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Ciclo</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setCicloPickerVisible(true)}
              accessibilityLabel="Seleccionar ciclo"
              accessibilityHint="Abre la lista de ciclos acad\u00E9micos"
            >
              <Text style={[styles.pickerButtonText, ciclo === null && styles.placeholderText]}>
                {ciclo !== null ? `Ciclo ${ciclo}` : 'Selecciona tu ciclo'}
              </Text>
              <Text style={styles.chevron}>{'\u25BE'}</Text>
            </Pressable>
          </View>

          {/* Huancayo toggle */}
          <View style={styles.fieldGroup}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Text style={styles.label}>{'\u00BF'}Eres de Huancayo?</Text>
                <Text style={styles.hint}>
                  Nos ayuda a entender mejor tu contexto
                </Text>
              </View>
              <Switch
                value={esDeHuancayo}
                onValueChange={setEsDeHuancayo}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={esDeHuancayo ? colors.primary : colors.text.muted}
                accessibilityLabel="Soy de Huancayo"
                accessibilityState={{ checked: esDeHuancayo }}
              />
            </View>
          </View>

          {/* Region picker (shown only if not from Huancayo) */}
          {!esDeHuancayo && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{'\u00BF'}De qu\u00E9 regi\u00F3n vienes?</Text>
              <Pressable
                style={styles.pickerButton}
                onPress={() => setRegionPickerVisible(true)}
                accessibilityLabel="Seleccionar regi\u00F3n de origen"
                accessibilityHint="Abre la lista de regiones del Per\u00FA"
              >
                <Text style={[styles.pickerButtonText, !regionOrigen && styles.placeholderText]}>
                  {regionOrigen || 'Selecciona tu regi\u00F3n'}
                </Text>
                <Text style={styles.chevron}>{'\u25BE'}</Text>
              </Pressable>
            </View>
          )}

          {/* Family contact (optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Vincular familiar (opcional)</Text>
            <Text style={styles.hint}>
              Si deseas, puedes agregar el tel\u00E9fono de un familiar de confianza para emergencias.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="N\u00FAmero de tel\u00E9fono"
              placeholderTextColor={colors.text.muted}
              value={familiarTel}
              onChangeText={setFamiliarTel}
              keyboardType="phone-pad"
              maxLength={15}
              accessibilityLabel="Tel\u00E9fono de familiar de confianza"
              accessibilityHint="Opcional. N\u00FAmero de un familiar para emergencias"
            />
          </View>

          {/* Spacer to ensure content is above the button */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Bottom action */}
        <View style={styles.bottomSection}>
          <KButton
            title="Continuar"
            onPress={handleContinuar}
            size="lg"
            fullWidth
            disabled={!isFormValid}
            loading={saving}
            accessibilityLabel="Continuar al siguiente paso"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Picker modals */}
      <PickerSheet
        visible={carreraPickerVisible}
        title="Selecciona tu carrera"
        options={CARRERAS}
        selected={carrera}
        onSelect={setCarrera}
        onClose={() => setCarreraPickerVisible(false)}
      />
      <PickerSheet
        visible={cicloPickerVisible}
        title="Selecciona tu ciclo"
        options={CICLOS.map(String)}
        selected={ciclo !== null ? String(ciclo) : ''}
        onSelect={(val) => setCiclo(Number(val))}
        onClose={() => setCicloPickerVisible(false)}
      />
      <PickerSheet
        visible={regionPickerVisible}
        title="Selecciona tu regi\u00F3n"
        options={REGIONES_PERU}
        selected={regionOrigen}
        onSelect={setRegionOrigen}
        onClose={() => setRegionPickerVisible(false)}
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
  keyboardView: {
    flex: 1,
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
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  hint: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    lineHeight: 18,
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
  pickerButton: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontFamily: fonts.sans.regular,
    fontSize: 15,
    color: colors.text.primary,
    flex: 1,
  },
  placeholderText: {
    color: colors.text.muted,
  },
  chevron: {
    fontSize: 14,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flex: 1,
    marginRight: spacing.md,
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
// Picker Styles
// ---------------------------------------------------------------------------

const pickerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '60%',
    ...shadows.lg,
  },
  sheetTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  optionsList: {
    marginBottom: spacing.md,
  },
  option: {
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontFamily: fonts.sans.regular,
    fontSize: 15,
    color: colors.text.primary,
  },
  optionTextSelected: {
    fontFamily: fonts.sans.semiBold,
    color: colors.primary,
  },
  checkMark: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: fonts.sans.semiBold,
  },
});
