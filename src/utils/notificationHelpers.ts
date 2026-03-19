import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'habitos_mañana'
  | 'habitos_tarde'
  | 'noche_uso_tardio'
  | 'semana_examenes'
  | 'dias_sin_registro';

interface NotificationMessage {
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Empathetic message bank
// ---------------------------------------------------------------------------

/**
 * Every message is framed positively -- no mention of missed streaks,
 * failures, or guilt-inducing language.
 */
export const MENSAJES_NOTIFICACION: Record<NotificationType, NotificationMessage[]> = {
  habitos_mañana: [
    {
      title: 'Un nuevo dia te espera',
      body: 'Hoy tienes la oportunidad de avanzar un paso mas. Tu puedes.',
    },
    {
      title: 'Buenos dias',
      body: 'Cada pequeno esfuerzo cuenta. Revisa tus habitos cuando estes listo.',
    },
    {
      title: 'Empecemos juntos',
      body: 'Tu bienestar importa. Toma un momento para planificar tu dia.',
    },
  ],
  habitos_tarde: [
    {
      title: 'Va bien el dia?',
      body: 'Aun queda tiempo para completar lo que te propusiste. Sin prisa.',
    },
    {
      title: 'Una pausa para ti',
      body: 'Recuerda que cada pequeno logro merece ser celebrado.',
    },
    {
      title: 'Sigue adelante',
      body: 'El progreso no siempre es lineal, y eso esta bien. Tu decides el ritmo.',
    },
  ],
  noche_uso_tardio: [
    {
      title: 'Hora de descansar',
      body: 'Tu cuerpo y mente necesitan recuperarse. Manana sera un gran dia.',
    },
    {
      title: 'Buenas noches',
      body: 'Descansar bien es parte de tu progreso. Deja el celular y descansa.',
    },
  ],
  semana_examenes: [
    {
      title: 'Semana de examenes',
      body: 'Recuerda tomar descansos. Estudiar con pausas mejora la retencion.',
    },
    {
      title: 'Tu puedes con esto',
      body: 'Confía en tu preparacion. Un paso a la vez.',
    },
    {
      title: 'Animo!',
      body: 'Los examenes no te definen. Da lo mejor de ti y eso sera suficiente.',
    },
  ],
  dias_sin_registro: [
    {
      title: 'Te extrañamos',
      body: 'No importa cuanto tiempo haya pasado, siempre puedes volver. Sin juicios.',
    },
    {
      title: 'Estamos aqui para ti',
      body: 'Cada dia es una nueva oportunidad. Cuando quieras, aqui estaremos.',
    },
    {
      title: 'Un pequeño paso',
      body: 'A veces solo necesitamos un empujon suave. Abre la app cuando puedas.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Permission handling
// ---------------------------------------------------------------------------

/**
 * Request notification permissions from the user.
 * Returns `true` when permission is granted.
 */
export const requestPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    // Notifications are not available in simulators / emulators.
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  // Android requires a notification channel.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Kallpa',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 75, 150],
      lightColor: '#534AB7',
    });
  }

  return true;
};

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

/** Maximum notifications per day. */
const MAX_DAILY = 1;

/** Latest hour at which a notification may fire (22:00 / 10 PM). */
const CUTOFF_HOUR = 22;

/**
 * Pick a random message from the bank for the given type.
 */
const pickMessage = (type: NotificationType): NotificationMessage => {
  const pool = MENSAJES_NOTIFICACION[type];
  return pool[Math.floor(Math.random() * pool.length)];
};

/**
 * Schedule a local notification for the given type at a specific hour (0-23).
 *
 * Rules enforced:
 *  - Maximum 1 notification per day.
 *  - No notifications after 10 PM (CUTOFF_HOUR).
 *  - User can disable completely by revoking OS permissions.
 *
 * @param type    The notification category.
 * @param hora    Hour of the day (0-23) when the notification should fire.
 * @returns The notification identifier, or `null` if scheduling was skipped.
 */
export const scheduleNotification = async (
  type: NotificationType,
  hora: number,
): Promise<string | null> => {
  // Enforce cutoff rule: never schedule after 10 PM.
  if (hora >= CUTOFF_HOUR) return null;

  // Check we haven't exceeded the daily cap.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const todayScheduled = scheduled.filter((n) => {
    const trigger = n.trigger as { hour?: number } | undefined;
    return trigger?.hour !== undefined;
  });
  if (todayScheduled.length >= MAX_DAILY) return null;

  const message = pickMessage(type);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      sound: true,
      data: { type },
    },
    trigger: {
      hour: hora,
      minute: 0,
      repeats: true,
    },
  });

  return id;
};

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

/**
 * Cancel every scheduled notification.
 */
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Cancel a single notification by identifier.
 */
export const cancelNotification = async (id: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(id);
};

// ---------------------------------------------------------------------------
// Handler setup (call once at app root)
// ---------------------------------------------------------------------------

/**
 * Configure how incoming notifications are handled while the app is
 * foregrounded.  Call this once in your root layout.
 */
export const configureNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
};
