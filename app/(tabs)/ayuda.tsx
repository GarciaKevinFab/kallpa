import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as SQLite from 'expo-sqlite';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing, radii, shadows } from '../../src/theme/spacing';
import { KButton } from '../../src/components/ui/KButton';
import { KCard } from '../../src/components/ui/KCard';

const DB_NAME = 'kallpa.db';

// ---------------------------------------------------------------------------
// Mock psychologist data (would come from backend in production)
// ---------------------------------------------------------------------------

interface Psicologo {
  id: string;
  nombre: string;
  especialidad: string;
  disponible: boolean;
  modalidad: 'presencial' | 'virtual' | 'ambos';
  horario: string;
  foto_emoji: string;
}

const MOCK_PSICOLOGOS: Psicologo[] = [
  {
    id: '1',
    nombre: 'Lic. Mar\u00EDa Torres',
    especialidad: 'Ansiedad y estr\u00E9s acad\u00E9mico',
    disponible: true,
    modalidad: 'ambos',
    horario: '9:00 - 13:00',
    foto_emoji: '\uD83D\uDC69\u200D\u2695\uFE0F',
  },
  {
    id: '2',
    nombre: 'Lic. Carlos Mendoza',
    especialidad: 'Adaptaci\u00F3n y migraci\u00F3n',
    disponible: true,
    modalidad: 'presencial',
    horario: '14:00 - 18:00',
    foto_emoji: '\uD83D\uDC68\u200D\u2695\uFE0F',
  },
  {
    id: '3',
    nombre: 'Lic. Ana Quispe',
    especialidad: 'Bienestar emocional',
    disponible: false,
    modalidad: 'virtual',
    horario: '10:00 - 14:00',
    foto_emoji: '\uD83D\uDC69\u200D\u2695\uFE0F',
  },
];

// ---------------------------------------------------------------------------
// Appointment history type
// ---------------------------------------------------------------------------

interface CitaHistorial {
  id: number;
  fecha_solicitud: string;
  psicologo_nombre: string | null;
  fecha_cita: string | null;
  hora_cita: string | null;
  modalidad: string | null;
  estado: string;
}

// ---------------------------------------------------------------------------
// PsicoCard Component
// ---------------------------------------------------------------------------

interface PsicoCardProps {
  psicologo: Psicologo;
  selected: boolean;
  onSelect: () => void;
}

function PsicoCard({ psicologo, selected, onSelect }: PsicoCardProps) {
  const modalidadText =
    psicologo.modalidad === 'ambos'
      ? 'Presencial / Virtual'
      : psicologo.modalidad === 'presencial'
      ? 'Presencial'
      : 'Virtual';

  return (
    <Pressable
      style={[
        psicoStyles.card,
        selected && psicoStyles.cardSelected,
        !psicologo.disponible && psicoStyles.cardDisabled,
      ]}
      onPress={psicologo.disponible ? onSelect : undefined}
      disabled={!psicologo.disponible}
      accessibilityLabel={`${psicologo.nombre}, ${psicologo.especialidad}. ${
        psicologo.disponible ? 'Disponible' : 'No disponible'
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !psicologo.disponible }}
    >
      <View style={psicoStyles.avatarContainer}>
        <Text style={psicoStyles.avatar}>{psicologo.foto_emoji}</Text>
      </View>
      <View style={psicoStyles.info}>
        <Text style={psicoStyles.name}>{psicologo.nombre}</Text>
        <Text style={psicoStyles.specialty}>{psicologo.especialidad}</Text>
        <View style={psicoStyles.metaRow}>
          <Text style={psicoStyles.metaText}>{modalidadText}</Text>
          <Text style={psicoStyles.metaDivider}>{'\u00B7'}</Text>
          <Text style={psicoStyles.metaText}>{psicologo.horario}</Text>
        </View>
      </View>
      <View
        style={[
          psicoStyles.badge,
          psicologo.disponible ? psicoStyles.badgeAvailable : psicoStyles.badgeUnavailable,
        ]}
      >
        <Text style={psicoStyles.badgeText}>
          {psicologo.disponible ? 'Disponible' : 'Ocupado'}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Consent Toggle Component
// ---------------------------------------------------------------------------

interface ConsentToggleProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
}

function ConsentToggle({ value, onValueChange }: ConsentToggleProps) {
  return (
    <View style={consentStyles.container}>
      <View style={consentStyles.textSection}>
        <Text style={consentStyles.title}>Compartir reporte an\u00F3nimo</Text>
        <Text style={consentStyles.description}>
          Si activas esta opci\u00F3n, se generar\u00E1 un resumen an\u00F3nimo de tus datos recientes (humor, h\u00E1bitos, entradas del diario) para que el psic\u00F3logo pueda entender mejor tu contexto. Nunca se comparte texto literal.
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.text.muted}
        accessibilityLabel="Compartir reporte an\u00F3nimo con el psic\u00F3logo"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ayuda Screen
// ---------------------------------------------------------------------------

export default function AyudaScreen() {
  const [selectedPsico, setSelectedPsico] = useState<string | null>(null);
  const [shareReport, setShareReport] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [historial, setHistorial] = useState<CitaHistorial[]>([]);

  // ── Load appointment history ────────────────────────────────────────
  const loadHistorial = useCallback(async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const rows = await db.getAllAsync<CitaHistorial>(
        `SELECT id, fecha_solicitud, psicologo_nombre, fecha_cita, hora_cita, modalidad, estado
         FROM citas_agendadas
         ORDER BY fecha_solicitud DESC
         LIMIT 10`,
      );
      setHistorial(rows);
    } catch (error) {
      console.warn('[AyudaScreen] Failed to load historial:', error);
    }
  }, []);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  // ── Confirm appointment ─────────────────────────────────────────────
  const handleConfirmarCita = useCallback(async () => {
    if (!selectedPsico) return;

    const psico = MOCK_PSICOLOGOS.find((p) => p.id === selectedPsico);
    if (!psico) return;

    setConfirming(true);
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const fechaSolicitud = new Date().toISOString().split('T')[0];

      await db.runAsync(
        `INSERT INTO citas_agendadas
          (fecha_solicitud, psicologo_nombre, modalidad, reporte_compartido, estado)
         VALUES (?, ?, ?, ?, 'pendiente')`,
        [
          fechaSolicitud,
          psico.nombre,
          psico.modalidad === 'ambos' ? 'presencial' : psico.modalidad,
          shareReport ? 1 : 0,
        ],
      );

      Alert.alert(
        'Solicitud enviada',
        `Tu solicitud de cita con ${psico.nombre} fue registrada. El servicio de Bienestar te contactar\u00E1 pronto para confirmar la fecha y hora.`,
        [{ text: 'Entendido' }],
      );

      setSelectedPsico(null);
      setShareReport(false);
      await loadHistorial();
    } catch (error) {
      console.warn('[AyudaScreen] Failed to confirm cita:', error);
      Alert.alert(
        'No pudimos registrar tu solicitud',
        'Int\u00E9ntalo de nuevo en un momento. Si el problema persiste, contacta directamente a Bienestar Universitario.',
        [{ text: 'Entendido' }],
      );
    } finally {
      setConfirming(false);
    }
  }, [selectedPsico, shareReport, loadHistorial]);

  // ── Status label helper ─────────────────────────────────────────────
  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return { color: colors.accent };
      case 'cancelada':
        return { color: colors.danger };
      default:
        return { color: colors.amber };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title} accessibilityRole="header">
          Escal\u00F3n de Ayuda
        </Text>
        <Text style={styles.subtitle}>
          Conecta con profesionales de Bienestar Universitario. Todo es confidencial.
        </Text>

        {/* Privacy Banner */}
        <View style={styles.privacyBanner}>
          <Text style={styles.privacyIcon}>{'\uD83D\uDD12'}</Text>
          <Text style={styles.privacyText}>
            Tu solicitud es an\u00F3nima. Solo compartes lo que t\u00FA eliges.
          </Text>
        </View>

        {/* Psychologists available today */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Psic\u00F3logos disponibles hoy</Text>
          {MOCK_PSICOLOGOS.map((psico, i) => (
            <Animated.View key={psico.id} entering={FadeInDown.delay(i * 100).duration(400)}>
              <PsicoCard
                psicologo={psico}
                selected={selectedPsico === psico.id}
                onSelect={() => setSelectedPsico(psico.id)}
              />
            </Animated.View>
          ))}
        </View>

        {/* Consent Toggle */}
        {selectedPsico && (
          <View style={styles.section}>
            <ConsentToggle value={shareReport} onValueChange={setShareReport} />
          </View>
        )}

        {/* Confirm Button */}
        {selectedPsico && (
          <View style={styles.section}>
            <KButton
              title="Confirmar cita"
              onPress={handleConfirmarCita}
              size="lg"
              fullWidth
              loading={confirming}
              accessibilityLabel="Confirmar solicitud de cita"
            />
          </View>
        )}

        {/* Appointment History */}
        {historial.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historial de citas</Text>
            {historial.map((cita) => (
              <KCard key={cita.id} variant="outlined" padding={spacing.md} style={histStyles.card}>
                <View style={histStyles.row}>
                  <View style={histStyles.info}>
                    <Text style={histStyles.psico}>{cita.psicologo_nombre ?? 'Psic\u00F3logo'}</Text>
                    <Text style={histStyles.date}>
                      Solicitada: {cita.fecha_solicitud}
                    </Text>
                    {cita.fecha_cita && (
                      <Text style={histStyles.date}>
                        Cita: {cita.fecha_cita} a las {cita.hora_cita}
                      </Text>
                    )}
                  </View>
                  <Text style={[histStyles.estado, getEstadoStyle(cita.estado)]}>
                    {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                  </Text>
                </View>
              </KCard>
            ))}
          </View>
        )}

        <View style={styles.tabBarSpacer} />
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
  privacyBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyText: {
    flex: 1,
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    lineHeight: 20,
    color: colors.primary,
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
  tabBarSpacer: {
    height: Platform.OS === 'ios' ? 100 : 76,
  },
});

// ---------------------------------------------------------------------------
// PsicoCard Styles
// ---------------------------------------------------------------------------

const psicoStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryXLight,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.ms,
  },
  avatar: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: 2,
  },
  specialty: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    color: colors.text.muted,
  },
  metaDivider: {
    color: colors.text.muted,
    fontSize: 11,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
    marginLeft: spacing.sm,
  },
  badgeAvailable: {
    backgroundColor: colors.accentLight,
  },
  badgeUnavailable: {
    backgroundColor: colors.warmLight,
  },
  badgeText: {
    fontFamily: fonts.sans.medium,
    fontSize: 10,
    color: colors.text.primary,
  },
});

// ---------------------------------------------------------------------------
// Consent Styles
// ---------------------------------------------------------------------------

const consentStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.ms,
    ...shadows.sm,
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
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

// ---------------------------------------------------------------------------
// History Styles
// ---------------------------------------------------------------------------

const histStyles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  psico: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 2,
  },
  date: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.muted,
  },
  estado: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
});
