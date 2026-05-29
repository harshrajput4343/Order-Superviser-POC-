"""Shared event processing service.

Previously the event-injection endpoint (events.py) and the scenario simulator
(_fire_scenario_events) each had their own copy of the EVENT_STATUS_MAP dict
and the state-mutation logic (~60 lines duplicated).  This module is the single
source of truth.  Both callers now call process_event() and import the shared
constants from here.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Activity, Run

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Maps inbound event_type strings to the canonical order_status value stored
# in run.state["order_status"].
EVENT_STATUS_MAP: dict[str, str] = {
    "order_created": "created",
    "payment_confirmed": "payment_confirmed",
    "payment_failed": "payment_failed",
    "shipment_created": "shipped",
    "shipment_delayed": "shipment_delayed",
    "delivered": "delivered",
    "refund_requested": "refund_requested",
    "refund_completed": "refunded",
    "order_cancelled": "cancelled",
}

# Events that unconditionally end the run lifecycle.
TERMINAL_EVENTS: frozenset[str] = frozenset(
    {"delivered", "refund_completed", "order_cancelled"}
)

# All event types accepted by the system.
VALID_EVENTS: frozenset[str] = frozenset(
    {
        "order_created",
        "payment_confirmed",
        "payment_failed",
        "shipment_created",
        "shipment_delayed",
        "delivered",
        "refund_requested",
        "refund_completed",
        "customer_message_received",
        "no_update_for_n_hours",
        "order_cancelled",
        "item_out_of_stock",
        "address_change_requested",
    }
)


# ---------------------------------------------------------------------------
# Service function
# ---------------------------------------------------------------------------


async def process_event(
    db: AsyncSession,
    run: Run,
    event_type: str,
    payload: dict[str, Any],
) -> None:
    """Persist an event activity and update run state.

    This is the single source of truth for event processing — called by
    both the event injection endpoint and the scenario simulator so that
    any change in event handling logic only needs to be made once.

    Callers are responsible for committing the session after calling this
    function if they want to do additional work before the commit; otherwise
    they may rely on the commit that happens here.
    """
    # Record the event as an immutable activity entry.
    activity = Activity(
        run_id=run.id,
        type="event",
        subtype=event_type,
        content=payload,
    )
    db.add(activity)

    # Update run state — append to events_received list and set last_event.
    state: dict[str, Any] = run.state or {}
    events_received: list[str] = state.get("events_received", [])
    events_received.append(event_type)
    state["events_received"] = events_received
    state["last_event"] = event_type

    # Derive order_status from the event type when a mapping exists.
    if event_type in EVENT_STATUS_MAP:
        state["order_status"] = EVENT_STATUS_MAP[event_type]

    run.state = state
    await db.commit()
