"""
Calendar Routes - Psychologist & Availability Endpoints
========================================================
Rutas para consultar psicologos disponibles y sus horarios
individuales. Delega la consulta de calendarios a
calendar_service y/o n8n.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.calendar_service import CalendarService

logger = logging.getLogger("kallpa.calendar")

router = APIRouter()

calendar_svc = CalendarService()


# ------------------------------------------------------------------
# Models
# ------------------------------------------------------------------
class Psicologo(BaseModel):
    """Informacion publica de un psicologo."""

    id: str = Field(..., description="Identificador unico del psicologo")
    nombre: str = Field(..., description="Nombre visible (puede ser seudonomimo)")
    especialidad: str = Field(..., description="Area de especialidad")
    modalidades: list[str] = Field(
        ...,
        description="Modalidades que ofrece: presencial, virtual",
    )
    disponible: bool = Field(
        ...,
        description="Si tiene horarios disponibles esta semana",
    )
    foto_url: Optional[str] = Field(
        default=None,
        description="URL de la foto de perfil (opcional)",
    )


class SlotHorario(BaseModel):
    """Un slot de horario para un psicologo especifico."""

    hora_inicio: str = Field(..., description="Hora de inicio HH:MM")
    hora_fin: str = Field(..., description="Hora de fin HH:MM")
    disponible: bool = Field(..., description="Si el slot esta libre")
    modalidad: Optional[str] = Field(
        default=None,
        description="Modalidad disponible en este slot",
    )


class RespuestaPsicologos(BaseModel):
    """Respuesta con la lista de psicologos."""

    psicologos: list[Psicologo]
    total: int


class RespuestaHorarios(BaseModel):
    """Respuesta con los horarios de un psicologo para una fecha."""

    psicologo_id: str
    psicologo_nombre: str
    fecha: str
    slots: list[SlotHorario]
    total_disponibles: int


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------
@router.get(
    "/psicologos",
    response_model=RespuestaPsicologos,
    summary="Listar psicologos disponibles",
)
async def listar_psicologos(
    especialidad: Optional[str] = Query(
        default=None,
        description="Filtrar por especialidad",
    ),
    modalidad: Optional[str] = Query(
        default=None,
        description="Filtrar por modalidad: presencial o virtual",
    ),
) -> RespuestaPsicologos:
    """
    Devuelve la lista de psicologos registrados en el sistema.

    Solo muestra informacion publica: nombre (o seudonimo),
    especialidad y modalidades disponibles. No expone datos
    de contacto directo.
    """
    logger.info(
        "Consulta de psicologos: especialidad=%s modalidad=%s",
        especialidad,
        modalidad,
    )

    psicologos = await calendar_svc.get_psicologos()

    # Aplicar filtros
    if especialidad:
        especialidad_lower = especialidad.lower()
        psicologos = [
            p for p in psicologos if especialidad_lower in p.especialidad.lower()
        ]

    if modalidad:
        modalidad_lower = modalidad.lower()
        psicologos = [
            p for p in psicologos if modalidad_lower in [m.lower() for m in p.modalidades]
        ]

    return RespuestaPsicologos(
        psicologos=psicologos,
        total=len(psicologos),
    )


@router.get(
    "/disponibilidad/{psicologo_id}/{fecha}",
    response_model=RespuestaHorarios,
    summary="Consultar disponibilidad de un psicologo",
)
async def get_disponibilidad_psicologo(
    psicologo_id: str,
    fecha: str,
) -> RespuestaHorarios:
    """
    Consulta los horarios disponibles de un psicologo especifico
    para una fecha dada.

    Lee la informacion de Google Calendar via el servicio de calendario
    (o mock data en desarrollo).
    """
    # Validar fecha
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
            detail="No se puede consultar fechas pasadas",
        )

    logger.info(
        "Disponibilidad psicologo: id=%s fecha=%s",
        psicologo_id,
        fecha,
    )

    # Verificar que el psicologo existe
    psicologo = await calendar_svc.get_psicologo_by_id(psicologo_id)
    if psicologo is None:
        raise HTTPException(
            status_code=404,
            detail=f"Psicologo con id '{psicologo_id}' no encontrado",
        )

    # Obtener slots
    slots = await calendar_svc.get_available_slots(psicologo_id, fecha)

    disponibles = [s for s in slots if s.disponible]

    return RespuestaHorarios(
        psicologo_id=psicologo_id,
        psicologo_nombre=psicologo.nombre,
        fecha=fecha,
        slots=slots,
        total_disponibles=len(disponibles),
    )
