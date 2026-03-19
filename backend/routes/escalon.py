"""
Escalon Routes - Appointment & Alert Endpoints
================================================
Rutas principales para agendamiento de citas, consulta de disponibilidad
y alertas de seguimiento con consentimiento.

Ningun dato sensible se persiste en este servidor. Todo se reenvia
a los workflows de n8n correspondientes.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from enum import Enum
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from services.n8n_service import N8NService

logger = logging.getLogger("kallpa.escalon")

router = APIRouter()

n8n = N8NService()


# ------------------------------------------------------------------
# Models
# ------------------------------------------------------------------
class Modalidad(str, Enum):
    """Modalidades de atencion disponibles."""

    PRESENCIAL = "presencial"
    VIRTUAL = "virtual"


class NivelSeveridad(str, Enum):
    """Niveles de severidad para alertas de seguimiento."""

    BAJO = "bajo"
    MEDIO = "medio"
    ALTO = "alto"
    CRITICO = "critico"


class SolicitudCita(BaseModel):
    """Modelo de solicitud de cita."""

    fecha_solicitada: str = Field(
        ...,
        description="Fecha de la cita en formato YYYY-MM-DD",
        examples=["2026-04-15"],
    )
    hora_solicitada: str = Field(
        ...,
        description="Hora de la cita en formato HH:MM",
        examples=["10:00"],
    )
    psicologo_id: str = Field(
        ...,
        description="Identificador del psicologo asignado",
        examples=["psi-001"],
    )
    reporte_cifrado: Optional[str] = Field(
        default=None,
        description=(
            "Reporte del triaje cifrado con la llave publica del psicologo. "
            "El backend NO descifra este campo."
        ),
    )
    modalidad: Modalidad = Field(
        default=Modalidad.PRESENCIAL,
        description="Modalidad de la cita",
    )
    correo_anonimo: Optional[str] = Field(
        default=None,
        description="Correo anonimo del estudiante para confirmacion",
    )

    @field_validator("fecha_solicitada")
    @classmethod
    def validar_fecha(cls, v: str) -> str:
        """Valida formato de fecha y que no sea en el pasado."""
        try:
            fecha = date.fromisoformat(v)
        except ValueError:
            raise ValueError("Formato de fecha invalido. Usar YYYY-MM-DD")
        if fecha < date.today():
            raise ValueError("No se pueden agendar citas en fechas pasadas")
        return v

    @field_validator("hora_solicitada")
    @classmethod
    def validar_hora(cls, v: str) -> str:
        """Valida formato de hora HH:MM."""
        try:
            datetime.strptime(v, "%H:%M")
        except ValueError:
            raise ValueError("Formato de hora invalido. Usar HH:MM")
        return v


class RespuestaCita(BaseModel):
    """Respuesta tras agendar una cita."""

    status: str
    mensaje: str
    cita_id: Optional[str] = None
    fecha_confirmada: Optional[str] = None
    hora_confirmada: Optional[str] = None


class SolicitudAlerta(BaseModel):
    """Modelo de alerta de seguimiento con consentimiento explicito."""

    severidad: NivelSeveridad = Field(
        ...,
        description="Nivel de severidad detectado en el triaje",
    )
    consentimiento_contacto: bool = Field(
        ...,
        description=(
            "El estudiante consiente explicitamente ser contactado. "
            "Sin consentimiento, la alerta solo se registra anonimamente."
        ),
    )
    psicologo_id: Optional[str] = Field(
        default=None,
        description="Psicologo preferido para seguimiento",
    )
    reporte_cifrado: Optional[str] = Field(
        default=None,
        description="Reporte cifrado del triaje para el psicologo",
    )
    correo_anonimo: Optional[str] = Field(
        default=None,
        description="Correo anonimo para seguimiento (solo si hay consentimiento)",
    )
    notas_contexto: Optional[str] = Field(
        default=None,
        description="Notas de contexto no identificables",
    )


class RespuestaAlerta(BaseModel):
    """Respuesta tras registrar una alerta de seguimiento."""

    status: str
    mensaje: str
    seguimiento_activado: bool
    referencia: Optional[str] = None


class SlotDisponible(BaseModel):
    """Un slot de tiempo disponible."""

    hora: str
    disponible: bool
    psicologo_id: Optional[str] = None


class RespuestaDisponibilidad(BaseModel):
    """Respuesta de consulta de disponibilidad."""

    fecha: str
    slots: list[SlotDisponible]
    total_disponibles: int


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------
@router.post(
    "/agendar-cita",
    response_model=RespuestaCita,
    summary="Agendar una cita con un psicologo",
)
async def agendar_cita(solicitud: SolicitudCita) -> RespuestaCita:
    """
    Agenda una cita con un psicologo.

    El flujo:
    1. Valida los datos de entrada.
    2. Reenvia la solicitud al webhook de n8n para agendamiento.
    3. n8n se encarga de crear el evento en Google Calendar y
       enviar la confirmacion por correo.
    4. Devuelve la confirmacion al frontend.

    **Ningun dato se almacena en este servidor.**
    """
    logger.info(
        "Solicitud de cita: fecha=%s hora=%s psicologo=%s modalidad=%s",
        solicitud.fecha_solicitada,
        solicitud.hora_solicitada,
        solicitud.psicologo_id,
        solicitud.modalidad.value,
    )

    payload = {
        "tipo": "agendamiento",
        "fecha": solicitud.fecha_solicitada,
        "hora": solicitud.hora_solicitada,
        "psicologo_id": solicitud.psicologo_id,
        "modalidad": solicitud.modalidad.value,
        "reporte_cifrado": solicitud.reporte_cifrado,
        "correo_anonimo": solicitud.correo_anonimo,
    }

    response = await n8n.send_webhook("N8N_WEBHOOK_AGENDAMIENTO", payload)

    if response is None:
        raise HTTPException(
            status_code=503,
            detail="Servicio de agendamiento no disponible. Intente mas tarde.",
        )

    cita_id = response.get("cita_id")
    return RespuestaCita(
        status="confirmado",
        mensaje="Cita registrada correctamente",
        cita_id=cita_id,
        fecha_confirmada=solicitud.fecha_solicitada,
        hora_confirmada=solicitud.hora_solicitada,
    )


@router.get(
    "/disponibilidad/{fecha}",
    response_model=RespuestaDisponibilidad,
    summary="Consultar disponibilidad general para una fecha",
)
async def get_disponibilidad(
    fecha: str,
    modalidad: Optional[Modalidad] = Query(
        default=None,
        description="Filtrar por modalidad",
    ),
) -> RespuestaDisponibilidad:
    """
    Consulta los horarios disponibles para una fecha dada.

    Consulta al workflow de n8n que a su vez revisa Google Calendar
    de los psicologos registrados.
    """
    # Validar formato de fecha
    try:
        fecha_parsed = date.fromisoformat(fecha)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de fecha invalido. Usar YYYY-MM-DD",
        )

    if fecha_parsed < date.today():
        raise HTTPException(
            status_code=400,
            detail="No se puede consultar disponibilidad de fechas pasadas",
        )

    logger.info("Consulta de disponibilidad: fecha=%s modalidad=%s", fecha, modalidad)

    payload = {
        "tipo": "consulta_disponibilidad",
        "fecha": fecha,
        "modalidad": modalidad.value if modalidad else None,
    }

    response = await n8n.send_webhook("N8N_WEBHOOK_DISPONIBILIDAD", payload)

    if response is not None and "slots" in response:
        slots = [SlotDisponible(**s) for s in response["slots"]]
    else:
        # Fallback: generar slots de ejemplo si n8n no responde
        logger.warning("n8n no respondio, usando slots de ejemplo")
        slots = _generar_slots_ejemplo()

    disponibles = [s for s in slots if s.disponible]

    return RespuestaDisponibilidad(
        fecha=fecha,
        slots=slots,
        total_disponibles=len(disponibles),
    )


@router.post(
    "/alerta-seguimiento",
    response_model=RespuestaAlerta,
    summary="Registrar alerta de seguimiento por triaje",
)
async def alerta_seguimiento(alerta: SolicitudAlerta) -> RespuestaAlerta:
    """
    Registra una alerta de seguimiento basada en el resultado del triaje.

    - Si el estudiante **consiente** ser contactado, se activa seguimiento
      y se notifica al psicologo asignado.
    - Si **no consiente**, solo se registra de forma anonima con fines
      estadisticos (sin datos identificables).

    La logica de notificacion y registro se maneja en n8n.
    """
    logger.info(
        "Alerta de seguimiento: severidad=%s consentimiento=%s",
        alerta.severidad.value,
        alerta.consentimiento_contacto,
    )

    # Si no hay consentimiento, eliminar cualquier dato que pudiera identificar
    if not alerta.consentimiento_contacto:
        alerta.correo_anonimo = None
        alerta.reporte_cifrado = None
        alerta.psicologo_id = None

    payload = {
        "tipo": "alerta_seguimiento",
        "severidad": alerta.severidad.value,
        "consentimiento": alerta.consentimiento_contacto,
        "psicologo_id": alerta.psicologo_id,
        "reporte_cifrado": alerta.reporte_cifrado,
        "correo_anonimo": alerta.correo_anonimo,
        "notas_contexto": alerta.notas_contexto,
    }

    response = await n8n.send_webhook("N8N_WEBHOOK_TRIAJE", payload)

    if response is None and alerta.severidad == NivelSeveridad.CRITICO:
        # Para casos criticos, si n8n falla, lanzar error para reintentar
        raise HTTPException(
            status_code=503,
            detail=(
                "No se pudo registrar la alerta critica. "
                "Por favor intente nuevamente o contacte directamente "
                "al servicio de bienestar universitario."
            ),
        )

    seguimiento = alerta.consentimiento_contacto and response is not None

    return RespuestaAlerta(
        status="registrado",
        mensaje=(
            "Alerta registrada. Se activara seguimiento con el psicologo."
            if seguimiento
            else "Alerta registrada de forma anonima."
        ),
        seguimiento_activado=seguimiento,
        referencia=response.get("referencia") if response else None,
    )


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def _generar_slots_ejemplo() -> list[SlotDisponible]:
    """Genera slots de ejemplo para cuando n8n no esta disponible."""
    horas = [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
        "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
        "16:00", "16:30", "17:00",
    ]
    slots = []
    for i, hora in enumerate(horas):
        slots.append(
            SlotDisponible(
                hora=hora,
                disponible=(i % 3 != 0),  # Algunos ocupados como ejemplo
                psicologo_id=f"psi-{(i % 3) + 1:03d}",
            )
        )
    return slots
