# Kallpa - Tu fuerza, contigo siempre

App de autogestión emocional y prevención en salud mental para estudiantes universitarios de la **Universidad Continental** (Huancayo, Perú).

**Principio arquitectónico:** Local-First. Todos los datos emocionales viven exclusivamente en el dispositivo del usuario (SQLite cifrado AES-256).

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Mobile | React Native 0.73+ con Expo SDK 50 |
| Navegación | Expo Router (file-based) |
| Base de datos | SQLite local (expo-sqlite) cifrado |
| Estado | Zustand + React Query |
| UI | NativeWind (Tailwind) + Reanimated 3 |
| Backend | FastAPI (Python 3.11+) |
| Orquestación | n8n (webhooks, Google Calendar) |
| IA | Claude API (claude-sonnet-4-6) con Zero Data Retention |

## Módulos

- **Home** — Check-in de humor diario (5 niveles emoji)
- **Diario Cognitivo** — Reestructuración de pensamientos en 4 pasos guiados
- **Calmar Crisis** — Respiración 4-7-8, respiración en caja, grounding 5-4-3-2-1
- **Micro-hábitos** — Seguimiento con jardín SVG evolutivo (nunca retrocede)
- **Escalón de Ayuda** — Agendamiento anónimo con psicólogos de bienestar UC
- **Companion IA** — Chat empático con Claude API (sin almacenar conversaciones)
- **Timeline Emocional** — Gráficos de humor con insights locales

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [Python](https://python.org/) 3.11+ (para el backend)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- [Expo Go](https://expo.dev/go) en tu celular (Android/iOS)
- Git

## Cómo levantar el proyecto

### 1. Clonar el repositorio

```bash
git clone https://github.com/GarciaKevinFab/kallpa.git
cd kallpa
```

### 2. Instalar dependencias del frontend

```bash
npm install
```

### 3. Iniciar la app móvil (desarrollo)

```bash
npx expo start
```

Esto abrirá Metro Bundler. Opciones para ver la app:

- **Celular físico:** Escanea el código QR con Expo Go (Android) o la cámara (iOS)
- **Emulador Android:** Presiona `a` en la terminal (requiere Android Studio)
- **Simulador iOS:** Presiona `i` en la terminal (requiere macOS + Xcode)
- **Web:** Presiona `w` en la terminal

### 4. Levantar el backend (opcional, solo para Escalón de Ayuda)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Editar .env con tus webhooks de n8n y credenciales
uvicorn main:app --reload --port 8000
```

El backend corre en `http://localhost:8000`. Documentación automática en `http://localhost:8000/docs`.

### 5. Configurar n8n (opcional, para agendamiento real)

```bash
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
```

Importar los workflows desde `n8n/workflows/` en la interfaz de n8n (`http://localhost:5678`).

## Variables de entorno

### Backend (.env)

```env
N8N_WEBHOOK_AGENDAMIENTO=https://tu-n8n.com/webhook/agendar
N8N_WEBHOOK_DISPONIBILIDAD=https://tu-n8n.com/webhook/disponibilidad
N8N_WEBHOOK_ALERTAS=https://tu-n8n.com/webhook/alertas
N8N_AUTH_TOKEN=tu-token-secreto
```

### App móvil

La API key de Claude se configura en `src/services/claudeService.ts`. Para producción, usar variables de entorno con `expo-constants`.

## Estructura del proyecto

```
kallpa/
├── app/                    # Pantallas (Expo Router)
│   ├── (tabs)/             # 5 tabs principales
│   ├── onboarding/         # 3 pantallas de onboarding
│   ├── companion.tsx       # Chat IA
│   └── timeline.tsx        # Timeline emocional
├── src/
│   ├── components/         # 15 componentes de features + 4 UI base
│   ├── db/                 # SQLite schema + queries
│   ├── hooks/              # 4 hooks personalizados
│   ├── services/           # Claude API, crypto, reportes, NLP
│   ├── store/              # 3 stores Zustand
│   ├── theme/              # Colores, tipografía, spacing
│   └── utils/              # Helpers de fecha, cifrado, notificaciones
├── backend/                # FastAPI Python
├── n8n/workflows/          # 3 workflows de orquestación
└── assets/fonts/           # DM Sans + Playfair Display
```

## Comandos útiles

```bash
# Desarrollo
npx expo start                    # Iniciar Metro Bundler
npx expo start --clear            # Limpiar caché e iniciar

# Build de producción
npx eas build --platform android  # Build Android (APK/AAB)
npx eas build --platform ios      # Build iOS

# Backend
uvicorn main:app --reload         # Servidor de desarrollo
```

## Paleta de colores

| Color | Hex | Uso |
|-------|-----|-----|
| Púrpura Kallpa | `#534AB7` | Primario |
| Teal | `#1D9E75` | Acento (crecimiento) |
| Coral | `#D85A30` | Calidez (crisis) |
| Fondo | `#F7F4FF` | Background general |

## Privacidad y seguridad

- Datos emocionales **nunca salen del dispositivo** sin consentimiento explícito
- Chat con IA usa **Zero Data Retention** (Anthropic no almacena mensajes)
- Reportes clínicos cifrados con **AES-256** antes de cualquier transmisión
- El backend **no almacena datos personales** del estudiante
- Agendamiento de citas es **anónimo** por defecto

## Autor

**Kevin Fabrizio Garcia Espiritu**
Universidad Continental — Huancayo, Perú

## Licencia

Este proyecto es de uso académico para la Universidad Continental.
