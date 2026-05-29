"""Shared background task wrappers for agent invocations.

Previously, both runs.py and events.py each defined an identical private
`_run_agent_background` coroutine (~8 lines each).  This module provides
the single canonical implementation that both callers import.
"""

from __future__ import annotations

import logging
import uuid

logger = logging.getLogger(__name__)


async def run_agent_background(run_id: uuid.UUID, trigger: str) -> None:
    """Invoke the agent runtime in the background.

    Designed to be wrapped in asyncio.create_task().  Catches and logs all
    exceptions so that an unhandled agent error never silently kills the task.
    """
    try:
        from app.agent.runtime import run_agent  # deferred to avoid circular import

        await run_agent(run_id, wake_trigger=trigger)
    except Exception as exc:
        logger.error(
            "Background agent error for run %s (trigger=%s): %s",
            run_id,
            trigger,
            exc,
            exc_info=True,
        )
