"""
Calendar Service - Google Calendar Integration
===============================================
Servicio para interactuar con Google Calendar API.
En modo desarrollo, devuelve datos de ejemplo (mock).
En produccion, se conecta a Google Calendar via credenciales
de servicio.

El servicio se usa para:
- Listar psicologos y sus calendarios
- Consultar slots disponibles
- Crear eventos de citas (delegado a n8n en produccion)
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta
from typing import Optional

from pydantic import BaseModel, Field

logger = logging.getLogger("kallpa.calendar_service")


# ------------------------------------------------------------------
# Shared models (usados tambien por las rutas)
# ------------------------------------------------------------------
class PsicologoInfo(BaseModel):
    """Datos publicos de un psicologo."""

    id: str
    nombre: str
    especialidad: str
    modalidades: list[str]
    disponible: bool
    foto_url: Optional[str] = None
    calendar_id: Optional[str] = Field(
        default=None,
        description="Google Calendar ID (solo uso interno, no se expone)",
        exclude=True,
    )


class SlotHorario(BaseModel):
    """Un slot horario para un psicologo."""

    hora_inicio: str
    hora_fin: str
    disponible: bool
    modalidad: Optional[str] = None


class AppointmentData(BaseModel):
    """Datos para crear una cita en Google Calendar."""

    psicologo_id: str
    fecha: str
    hora: str
    duracion_minutos: int = 50
    modalidad: str = "presencial"
    titulo: str = "Cita - Servicio de Bienestar"
    descripcion: Optional[str] = None


class AppointmentResult(BaseModel):
    """Resultado de la creacion de una cita."""

    event_id: str
    calendar_link: Optional[str] = None
    fecha: str
    hora_inicio: str
    hora_fin: str


# ------------------------------------------------------------------
# Mock data
# ------------------------------------------------------------------
_MOCK_PSICOLOGOS: list[dict] = [
    {
        "id": "psi-001",
        "nombre": "Dra. Martinez",
        "especialidad": "Ansiedad y estres academico",
        "modalidades": ["presencial", "virtual"],
        "disponible": True,
        "foto_url": None,
        "calendar_id": "psi001@kallpa.edu.pe",
    },
    {
        "id": "psi-002",
        "nombre": "Lic. Rodriguez",
        "especialidad": "Desarrollo personal y autoestima",
        "modalidades": ["presencial"],
        "disponible": True,
        "foto_url": None,
        "calendar_id": "psi002@kallpa.edu.pe",
    },
    {
        "id": "psi-003",
        "nombre": "Dr. Huaman",
        "especialidad": "Crisis y prevencion del suicidio",
        "modalidades": ["presencial", "virtual"],
        "disponible": True,
        "foto_url": None,
        "calendar_id": "psi003@kallpa.edu.pe",
    },
    {
        "id": "psi-004",
        "nombre": "Lic. Quispe",
        "especialidad": "Relaciones interpersonales",
        "modalidades": ["virtual"],
        "disponible": False,
        "foto_url": None,
        "calendar_id": "psi004@kallpa.edu.pe",
    },
]

# Horarios de atencion estandar (slots de 50 min con 10 min de descanso)
_HORARIOS_MANANA = [
    ("08:00", "08:50"),
    ("09:00", "09:50"),
    ("10:00", "10:50"),
    ("11:00", "11:50"),
]

_HORARIOS_TARDE = [
    ("14:00", "14:50"),
    ("15:00", "15:50"),
    ("16:00", "16:50"),
    ("17:00", "17:50"),
]


class CalendarService:
    """
    Servicio de calendario.

    En modo mock (por defecto), devuelve datos de ejemplo.
    Cuando GOOGLE_CALENDAR_CREDENTIALS esta configurado,
    se conecta a la API real de Google Calendar.
    """

    def __init__(self) -> None:
        self._use_mock = not bool(os.getenv("GOOGLE_CALENDAR_CREDENTIALS"))
        if self._use_mock:
            logger.info("CalendarService iniciado en modo MOCK")
        else:
            logger.info("CalendarService iniciado con Google Calendar API")

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------
    async def get_psicologos(self) -> list[PsicologoInfo]:
        """
        Obtiene la lista de psicologos registrados.

        Returns:
            Lista de PsicologoInfo con datos publicos.
        """
        if self._use_mock:
            return self._mock_get_psicologos()

        return await self._gcal_get_psicologos()

    async def get_psicologo_by_id(self, psicologo_id: str) -> Optional[PsicologoInfo]:
        """
        Busca un psicologo por su ID.

        Args:
            psicologo_id: Identificador del psicologo.

        Returns:
            PsicologoInfo si existe, None si no.
        """
        psicologos = await self.get_psicologos()
        for p in psicologos:
            if p.id == psicologo_id:
                return p
        return None

    async def get_available_slots(
        self,
        psicologo_id: str,
        fecha: str,
    ) -> list[SlotHorario]:
        """
        Obtiene los slots disponibles de un psicologo para una fecha.

        Args:
            psicologo_id: Identificador del psicologo.
            fecha: Fecha en formato YYYY-MM-DD.

        Returns:
            Lista de SlotHorario con disponibilidad.
        """
        if self._use_mock:
            return self._mock_get_slots(psicologo_id, fecha)

        return await self._gcal_get_slots(psicologo_id, fecha)

    async def create_appointment(
        self,
        data: AppointmentData,
    ) -> Optional[AppointmentResult]:
        """
        Crea un evento de cita en Google Calendar.

        En produccion, esto se delega normalmente al workflow de n8n.
        Este metodo existe como fallback o para uso directo.

        Args:
            data: Datos de la cita a crear.

        Returns:
            AppointmentResult si se creo exitosamente, None si fallo.
        """
        if self._use_mock:
            return self._mock_create_appointment(data)

        return await self._gcal_create_appointment(data)

    # ------------------------------------------------------------------
    # Mock implementations
    # ------------------------------------------------------------------
    def _mock_get_psicologos(self) -> list[PsicologoInfo]:
        """Devuelve psicologos de ejemplo."""
        return [PsicologoInfo(**p) for p in _MOCK_PSICOLOGOS]

    def _mock_get_slots(
        self,
        psicologo_id: str,
        fecha: str,
    ) -> list[SlotHorario]:
        """
        Genera slots de ejemplo con disponibilidad pseudo-aleatoria
        basada en la fecha y el ID del psicologo.
        """
        try:
            fecha_date = date.fromisoformat(fecha)
        except ValueError:
            return []

        # No hay atencion fines de semana
        if fecha_date.weekday() >= 5:
            return [
                SlotHorario(
                    hora_inicio=h[0],
                    hora_fin=h[1],
                    disponible=False,
                    modalidad=None,
                )
                for h in _HORARIOS_MANANA + _HORARIOS_TARDE
            ]

        # Generar disponibilidad pseudo-determinista
        seed = hash(f"{psicologo_id}-{fecha}") % 100
        psicologo = None
        for p in _MOCK_PSICOLOGOS:
            if p["id"] == psicologo_id:
                psicologo = p
                break

        modalidades = psicologo["modalidades"] if psicologo else ["presencial"]
        modalidad_default = modalidades[0] if modalidades else "presencial"

        slots: list[SlotHorario] = []
        all_horarios = _HORARIOS_MANANA + _HORARIOS_TARDE

        for i, (inicio, fin) in enumerate(all_horarios):
            # Variar disponibilidad usando hash
            slot_seed = (seed + i * 17) % 10
            disponible = slot_seed > 3  # ~60% disponible

            slots.append(
                SlotHorario(
                    hora_inicio=inicio,
                    hora_fin=fin,
                    disponible=disponible,
                    modalidad=modalidad_default if disponible else None,
                )
            )

        return slots

    def _mock_create_appointment(
        self,
        data: AppointmentData,
    ) -> AppointmentResult:
        """Simula la creacion de una cita."""
        hora_inicio = datetime.strptime(data.hora, "%H:%M")
        hora_fin = hora_inicio + timedelta(minutes=data.duracion_minutos)

        mock_event_id = f"mock-evt-{hash(f'{data.psicologo_id}{data.fecha}{data.hora}') % 99999:05d}"

        logger.info(
            "MOCK: Cita creada event_id=%s psicologo=%s fecha=%s hora=%s",
            mock_event_id,
            data.psicologo_id,
            data.fecha,
            data.hora,
        )

        return AppointmentResult(
            event_id=mock_event_id,
            calendar_link=None,
            fecha=data.fecha,
            hora_inicio=data.hora,
            hora_fin=hora_fin.strftime("%H:%M"),
        )

    # ------------------------------------------------------------------
    # Google Calendar API implementations (stubs for production)
    # ------------------------------------------------------------------
    async def _gcal_get_psicologos(self) -> list[PsicologoInfo]:
        """
        Obtiene psicologos desde la configuracion de Google Calendar.

        TODO: Implementar lectura de una Google Sheet o base de datos
        con la lista de psicologos y sus calendar IDs.
        """
        logger.warning("Google Calendar integration not yet implemented, using mock")
        return self._mock_get_psicologos()

    async def _gcal_get_slots(
        self,
        psicologo_id: str,
        fecha: str,
    ) -> list[SlotHorario]:
        """
        Consulta Google Calendar FreeBusy API para determinar
        disponibilidad real.

        TODO: Implementar con google-api-python-client:
        1. Obtener calendar_id del psicologo
        2. Llamar freebusy.query con timeMin/timeMax del dia
        3. Calcular slots libres restando eventos ocupados
        """
        logger.warning("Google Calendar integration not yet implemented, using mock")
        return self._mock_get_slots(psicologo_id, fecha)

    async def _gcal_create_appointment(
        self,
        data: AppointmentData,
    ) -> Optional[AppointmentResult]:
        """
        Crea un evento en Google Calendar.

        TODO: Implementar con google-api-python-client:
        1. Obtener calendar_id del psicologo
        2. Construir evento con start, end, summary, description
        3. Insertar evento con events.insert()
        4. Devolver event ID y link
        """
        logger.warning("Google Calendar integration not yet implemented, using mock")
        return self._mock_create_appointment(data)
