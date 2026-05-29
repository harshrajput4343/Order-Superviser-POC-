"""Singleton Groq async client — reuse HTTP connection pool across wake cycles.

Creating a new AsyncGroq() on every invocation spawns a new httpx.AsyncClient,
discarding the existing connection pool and adding latency. This module provides
a single shared client that is initialised once and reused for the lifetime of
the process.
"""

from __future__ import annotations

import logging

from groq import AsyncGroq

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    """Return the shared AsyncGroq client, creating it once on first call."""
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=get_settings().GROQ_API_KEY)
        logger.debug("Groq AsyncClient initialised (singleton).")
    return _client
