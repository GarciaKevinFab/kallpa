"""
n8n Webhook Service
====================
Servicio para comunicarse con los workflows de n8n via webhooks.
Maneja reintentos, timeouts y errores de conexion de forma robusta.

Cada workflow de n8n se identifica por una variable de entorno
que contiene la URL del webhook correspondiente.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("kallpa.n8n_service")

# Configuracion de timeouts
_DEFAULT_TIMEOUT = 30.0  # segundos
_MAX_RETRIES = 2


class N8NServiceError(Exception):
    """Error al comunicarse con n8n."""

    def __init__(self, message: str, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class N8NService:
    """
    Cliente para interactuar con webhooks de n8n.

    Uso:
        n8n = N8NService()
        response = await n8n.send_webhook("N8N_WEBHOOK_AGENDAMIENTO", payload)
    """

    def __init__(
        self,
        timeout: float = _DEFAULT_TIMEOUT,
        max_retries: int = _MAX_RETRIES,
    ) -> None:
        """
        Inicializa el servicio de n8n.

        Args:
            timeout: Tiempo maximo de espera en segundos por request.
            max_retries: Numero maximo de reintentos en caso de error.
        """
        self._timeout = timeout
        self._max_retries = max_retries
        self._base_headers = {
            "Content-Type": "application/json",
            "User-Agent": "Kallpa-Backend/1.0",
        }

        # Cargar token de autenticacion si existe
        auth_token = os.getenv("N8N_AUTH_TOKEN")
        if auth_token:
            self._base_headers["Authorization"] = f"Bearer {auth_token}"
            logger.info("N8NService: autenticacion por token configurada")
        else:
            logger.info("N8NService: sin autenticacion de token")

    def _get_webhook_url(self, env_key: str) -> Optional[str]:
        """
        Obtiene la URL del webhook desde variables de entorno.

        Args:
            env_key: Nombre de la variable de entorno.

        Returns:
            URL del webhook o None si no esta configurada.
        """
        url = os.getenv(env_key, "").strip()
        if not url:
            logger.warning("Webhook no configurado: %s", env_key)
            return None
        return url

    async def send_webhook(
        self,
        env_key: str,
        data: dict[str, Any],
    ) -> Optional[dict[str, Any]]:
        """
        Envia datos a un webhook de n8n.

        Args:
            env_key: Nombre de la variable de entorno con la URL del webhook.
            data: Payload a enviar como JSON.

        Returns:
            Diccionario con la respuesta de n8n, o None si hubo un error
            no critico (el caller decide como manejar).

        Raises:
            N8NServiceError: Si ocurre un error critico que debe propagarse.
        """
        url = self._get_webhook_url(env_key)
        if url is None:
            logger.error("Webhook URL no disponible para %s", env_key)
            return None

        return await self._post_with_retry(url, data, env_key)

    async def send_to_url(
        self,
        url: str,
        data: dict[str, Any],
    ) -> Optional[dict[str, Any]]:
        """
        Envia datos directamente a una URL de webhook.

        Args:
            url: URL completa del webhook.
            data: Payload a enviar como JSON.

        Returns:
            Diccionario con la respuesta o None en caso de error.
        """
        return await self._post_with_retry(url, data, url)

    async def _post_with_retry(
        self,
        url: str,
        data: dict[str, Any],
        label: str,
    ) -> Optional[dict[str, Any]]:
        """
        Realiza un POST con reintentos.

        Args:
            url: URL destino.
            data: Payload JSON.
            label: Etiqueta para logs.

        Returns:
            Respuesta parseada o None.
        """
        last_error: Optional[Exception] = None

        for attempt in range(1, self._max_retries + 1):
            try:
                result = await self._do_post(url, data)
                if attempt > 1:
                    logger.info(
                        "Webhook %s exitoso en intento %d",
                        label,
                        attempt,
                    )
                return result

            except httpx.TimeoutException as exc:
                last_error = exc
                logger.warning(
                    "Timeout en webhook %s (intento %d/%d): %s",
                    label,
                    attempt,
                    self._max_retries,
                    str(exc),
                )

            except httpx.ConnectError as exc:
                last_error = exc
                logger.warning(
                    "Error de conexion webhook %s (intento %d/%d): %s",
                    label,
                    attempt,
                    self._max_retries,
                    str(exc),
                )

            except N8NServiceError as exc:
                # Error de respuesta HTTP (4xx, 5xx)
                last_error = exc
                if exc.status_code and 400 <= exc.status_code < 500:
                    # Errores 4xx no se reintentan
                    logger.error(
                        "Error cliente %d en webhook %s: %s",
                        exc.status_code,
                        label,
                        str(exc),
                    )
                    return None

                logger.warning(
                    "Error servidor en webhook %s (intento %d/%d): %s",
                    label,
                    attempt,
                    self._max_retries,
                    str(exc),
                )

            except Exception as exc:
                last_error = exc
                logger.error(
                    "Error inesperado en webhook %s: %s",
                    label,
                    str(exc),
                    exc_info=True,
                )
                return None

        logger.error(
            "Webhook %s fallo despues de %d intentos. Ultimo error: %s",
            label,
            self._max_retries,
            str(last_error),
        )
        return None

    async def _do_post(
        self,
        url: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Ejecuta un POST HTTP a la URL indicada.

        Args:
            url: URL destino.
            data: Payload JSON.

        Returns:
            Diccionario con la respuesta.

        Raises:
            N8NServiceError: Si la respuesta tiene un status code no exitoso.
            httpx.TimeoutException: Si excede el timeout.
            httpx.ConnectError: Si no puede conectar.
        """
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            logger.debug("POST %s payload_keys=%s", url, list(data.keys()))

            response = await client.post(
                url,
                json=data,
                headers=self._base_headers,
            )

            if response.status_code >= 400:
                body = response.text[:500]  # Limitar longitud del error
                raise N8NServiceError(
                    f"n8n respondio con status {response.status_code}: {body}",
                    status_code=response.status_code,
                )

            # Intentar parsear como JSON
            try:
                result = response.json()
            except Exception:
                # Si n8n devuelve texto plano, envolverlo
                result = {
                    "raw_response": response.text,
                    "status_code": response.status_code,
                }

            logger.info(
                "Webhook exitoso: url=%s status=%d",
                url,
                response.status_code,
            )
            return result

    async def health_check(self) -> dict[str, Any]:
        """
        Verifica la conectividad con los webhooks configurados.

        Returns:
            Diccionario con el estado de cada webhook.
        """
        webhook_envs = [
            "N8N_WEBHOOK_AGENDAMIENTO",
            "N8N_WEBHOOK_DISPONIBILIDAD",
            "N8N_WEBHOOK_TRIAJE",
            "N8N_WEBHOOK_CONFIRMACION",
        ]

        status: dict[str, Any] = {}
        for env_key in webhook_envs:
            url = self._get_webhook_url(env_key)
            if url is None:
                status[env_key] = {"configured": False}
            else:
                status[env_key] = {
                    "configured": True,
                    "url_prefix": url[:40] + "..." if len(url) > 40 else url,
                }

        return status
