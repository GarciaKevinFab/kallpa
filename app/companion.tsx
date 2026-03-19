import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../src/theme/colors';
import { fonts } from '../src/theme/typography';
import { spacing, radii, shadows } from '../src/theme/spacing';
import { KButton } from '../src/components/ui/KButton';
import { sendMessage, type Message, type UserContext } from '../src/services/claudeService';
import { useAppStore } from '../src/store/useAppStore';
import { useHumorStore } from '../src/store/useHumorStore';

const DB_NAME = 'kallpa.db';
const API_KEY_STORE_KEY = 'kallpa_claude_api_key';

// ---------------------------------------------------------------------------
// Crisis keyword detection
// ---------------------------------------------------------------------------

const CRISIS_KEYWORDS = [
  'suicidio', 'suicida', 'matarme', 'morir', 'no quiero vivir',
  'hacerme da\u00F1o', 'autolesion', 'cortarme', 'desaparecer',
  'acabar con todo', 'no vale la pena',
];

function detectCrisisKeywords(text: string): boolean {
  const normalized = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => normalized.includes(kw));
}

// ---------------------------------------------------------------------------
// Chat Bubble Component
// ---------------------------------------------------------------------------

interface ChatBubbleProps {
  message: Message;
  showCrisisButton: boolean;
  onCrisisPress: () => void;
}

function ChatBubble({ message, showCrisisButton, onCrisisPress }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <Animated.View
      entering={FadeInUp.duration(300).springify()}
      style={[
        bubbleStyles.container,
        isUser ? bubbleStyles.containerUser : bubbleStyles.containerAssistant,
      ]}
    >
      <View
        style={[
          bubbleStyles.bubble,
          isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleAssistant,
        ]}
        accessibilityLabel={`${isUser ? 'T\u00FA' : 'Kallpa'}: ${message.content}`}
      >
        <Text
          style={[
            bubbleStyles.text,
            isUser ? bubbleStyles.textUser : bubbleStyles.textAssistant,
          ]}
        >
          {message.content}
        </Text>
      </View>

      {showCrisisButton && !isUser && (
        <Pressable
          style={bubbleStyles.crisisButton}
          onPress={onCrisisPress}
          accessibilityLabel="Activar Escal\u00F3n de Ayuda"
          accessibilityRole="button"
        >
          <Text style={bubbleStyles.crisisButtonText}>
            {'\uD83E\uDD1D'} Activar Escal\u00F3n de Ayuda
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Companion Input Component
// ---------------------------------------------------------------------------

interface CompanionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  loading: boolean;
}

function CompanionInput({ value, onChangeText, onSend, loading }: CompanionInputProps) {
  const canSend = value.trim().length > 0 && !loading;

  return (
    <View style={inputStyles.container}>
      <TextInput
        style={inputStyles.input}
        placeholder="Escribe c\u00F3mo te sientes..."
        placeholderTextColor={colors.text.muted}
        value={value}
        onChangeText={onChangeText}
        multiline
        maxLength={1000}
        editable={!loading}
        accessibilityLabel="Escribe un mensaje para el compa\u00F1ero"
        accessibilityHint="Escribe c\u00F3mo te sientes para conversar con Kallpa"
      />
      <Pressable
        style={[inputStyles.sendButton, canSend && inputStyles.sendButtonActive]}
        onPress={onSend}
        disabled={!canSend}
        accessibilityLabel="Enviar mensaje"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
      >
        <Text style={[inputStyles.sendIcon, canSend && inputStyles.sendIconActive]}>
          {loading ? '\u23F3' : '\u2191'}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Companion Screen
// ---------------------------------------------------------------------------

export default function CompanionScreen() {
  const router = useRouter();
  const userName = useAppStore((s) => s.userName);
  const humorHoy = useHumorStore((s) => s.humorHoy);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionStart] = useState(() => Date.now());
  const [showCrisis, setShowCrisis] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // ── Build user context ──────────────────────────────────────────────
  const [userContext, setUserContext] = useState<UserContext>({
    nombre: userName || 'Estudiante',
    carrera: '',
    ciclo: 0,
    region_origen: '',
    es_migrante: false,
    humor_hoy: humorHoy,
    humor_tendencia: 'sin_datos',
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        const perfil = await db.getFirstAsync<{
          nombre: string;
          carrera: string;
          ciclo: number;
          region_origen: string;
          es_migrante: number;
        }>(
          'SELECT nombre, carrera, ciclo, region_origen, es_migrante FROM perfil_usuario WHERE id = 1',
        );

        if (perfil) {
          setUserContext((prev) => ({
            ...prev,
            nombre: perfil.nombre || prev.nombre,
            carrera: perfil.carrera || '',
            ciclo: perfil.ciclo || 0,
            region_origen: perfil.region_origen || '',
            es_migrante: perfil.es_migrante === 1,
          }));
        }
      } catch (error) {
        console.warn('[CompanionScreen] Failed to load profile:', error);
      }
    }

    loadProfile();
  }, [userName]);

  // ── Welcome message ─────────────────────────────────────────────────
  useEffect(() => {
    const greeting = getTimeGreeting();
    const welcomeMessage: Message = {
      role: 'assistant',
      content: `${greeting}, ${userContext.nombre}. Soy Kallpa, tu compa\u00F1ero de bienestar. \u00BFC\u00F3mo te sientes hoy? Estoy aqu\u00ED para escucharte.`,
    };
    setMessages([welcomeMessage]);
  }, [userContext.nombre]);

  // ── Get API key ─────────────────────────────────────────────────────
  const getApiKey = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(API_KEY_STORE_KEY);
    } catch {
      return null;
    }
  };

  // ── Send message ────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    // Check for crisis keywords in user message
    if (detectCrisisKeywords(trimmed)) {
      setShowCrisis(true);
    }

    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        // Offline or no key: the service will use fallbacks
        const response = await sendMessage({
          messages: [...messages, userMessage],
          userContext: { ...userContext, humor_hoy: humorHoy },
          apiKey: '',
        });
        setMessages((prev) => [...prev, response]);

        // Check assistant response for crisis indicators
        if (detectCrisisKeywords(response.content)) {
          setShowCrisis(true);
        }
      } else {
        const response = await sendMessage({
          messages: [...messages, userMessage],
          userContext: { ...userContext, humor_hoy: humorHoy },
          apiKey,
        });
        setMessages((prev) => [...prev, response]);

        if (detectCrisisKeywords(response.content)) {
          setShowCrisis(true);
        }
      }
    } catch (error) {
      console.warn('[CompanionScreen] Send error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content:
          'Perd\u00F3n, no pude conectarme en este momento. Si necesitas hablar con alguien ahora, puedes activar el Escal\u00F3n de Ayuda desde el men\u00FA principal.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [inputText, loading, messages, userContext, humorHoy]);

  // ── Auto scroll to bottom ───────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages.length]);

  // ── Log session on unmount (only metadata, no chat content) ─────────
  useEffect(() => {
    return () => {
      const duracionSegundos = Math.round((Date.now() - sessionStart) / 1000);
      if (duracionSegundos > 10) {
        logSession(duracionSegundos).catch(() => {});
      }
    };
  }, [sessionStart]);

  const logSession = async (duracion: number) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const fecha = new Date().toISOString().split('T')[0];
      const hora = new Date().toTimeString().slice(0, 5);

      await db.runAsync(
        `INSERT INTO sesiones_companion (fecha, hora, duracion_segundos)
         VALUES (?, ?, ?)`,
        [fecha, hora, duracion],
      );
    } catch (error) {
      console.warn('[CompanionScreen] Failed to log session:', error);
    }
  };

  // ── Handle crisis action ────────────────────────────────────────────
  const handleCrisisPress = () => {
    router.back();
    // Small delay to let the modal close, then navigate to ayuda
    setTimeout(() => {
      router.push('/(tabs)/ayuda');
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Cerrar conversaci\u00F3n"
            accessibilityRole="button"
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>{'\u2193'}</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{'\uD83E\uDD16'} Kallpa</Text>
            <Text style={styles.headerSubtitle}>Tu compa\u00F1ero de bienestar</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {/* Privacy notice */}
        <View style={styles.privacyNotice}>
          <Text style={styles.privacyText}>
            {'\uD83D\uDD12'} Las conversaciones no se guardan despu\u00E9s de cerrar esta pantalla
          </Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          renderItem={({ item, index }) => (
            <ChatBubble
              message={item}
              showCrisisButton={showCrisis && index === messages.length - 1 && item.role === 'assistant'}
              onCrisisPress={handleCrisisPress}
            />
          )}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Typing indicator */}
        {loading && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.typingContainer}>
            <Text style={styles.typingText}>Kallpa est\u00E1 escribiendo...</Text>
          </Animated.View>
        )}

        {/* Input */}
        <CompanionInput
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          loading={loading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos d\u00EDas';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background.card,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: colors.primary,
    fontFamily: fonts.sans.semiBold,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 16,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    color: colors.text.muted,
  },
  privacyNotice: {
    backgroundColor: colors.primaryXLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  privacyText: {
    fontFamily: fonts.sans.regular,
    fontSize: 11,
    color: colors.primary,
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  typingContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  typingText: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
});

// ---------------------------------------------------------------------------
// Bubble Styles
// ---------------------------------------------------------------------------

const bubbleStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.ms,
    maxWidth: '85%',
  },
  containerUser: {
    alignSelf: 'flex-end',
  },
  containerAssistant: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radii.xs,
  },
  bubbleAssistant: {
    backgroundColor: colors.background.card,
    borderBottomLeftRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  textUser: {
    color: colors.white,
  },
  textAssistant: {
    color: colors.text.primary,
  },
  crisisButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.warmLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  crisisButtonText: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13,
    color: colors.warm,
  },
});

// ---------------------------------------------------------------------------
// Input Styles
// ---------------------------------------------------------------------------

const inputStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background.card,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.app,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.ms : spacing.sm,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    color: colors.text.primary,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  sendIcon: {
    fontSize: 18,
    color: colors.text.muted,
    fontFamily: fonts.sans.semiBold,
  },
  sendIconActive: {
    color: colors.white,
  },
});
