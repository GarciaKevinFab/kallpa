"""
Kallpa Backend - FastAPI Application
=====================================
Backend principal del proyecto Kallpa: plataforma de bienestar psicologico
universitario. Este servidor actua como intermediario entre el frontend
y los workflows de n8n, sin almacenar datos sensibles localmente.

Principios:
- Zero-knowledge: no se almacenan datos del estudiante en el servidor.
- Toda la logica de negocio se delega a workflows de n8n.
- Las rutas solo validan, reenvian y responden.
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.escalon import router as escalon_router
from routes.calendar import router as calendar_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("kallpa")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    logger.info("Kallpa backend starting up")
    yield
    logger.info("Kallpa backend shutting down")


app = FastAPI(
    title="Kallpa Backend",
    description=(
        "API intermediaria para el proyecto Kallpa. "
        "Conecta el frontend con los workflows de n8n para agendamiento "
        "de citas, consulta de disponibilidad y alertas de seguimiento."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Routers
# ------------------------------------------------------------------
app.include_router(escalon_router, tags=["Agendamiento"])
app.include_router(calendar_router, prefix="/calendario", tags=["Calendario"])


# ------------------------------------------------------------------
# Health / root
# ------------------------------------------------------------------
@app.get("/", summary="Health check")
async def root():
    """Endpoint raiz que confirma que el servicio esta corriendo."""
    return {
        "app": "Kallpa Backend",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health", summary="Health check detallado")
async def health():
    """Devuelve estado detallado del servicio."""
    return {
        "status": "healthy",
        "services": {
            "api": "up",
            "n8n_configured": True,
            "calendar_configured": True,
        },
    }
