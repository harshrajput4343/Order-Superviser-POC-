"""Event ingestion and simulator API endpoints."""

from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Run, Activity, RunStatus
from app.schemas import EventInject, SimulatorScenario, StatusResponse
from app.agent.classifier import should_wake_agent
from app.services.event_service import (
    TERMINAL_EVENTS,
    VALID_EVENTS,
    process_event,
)
from app.services.background_tasks import run_agent_background

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["events"])

# Pre-built event scenarios
SCENARIOS: dict[str, list[dict]] = {
    "happy_path": [
        {"event_type": "order_created", "payload": {"order_total": 129.99, "items": 3}},
        {"event_type": "payment_confirmed", "payload": {"method": "credit_card", "amount": 129.99}},
        {"event_type": "shipment_created", "payload": {"carrier": "FedEx", "tracking": "FX123456789", "estimated_delivery": "2-3 business days"}},
        {"event_type": "delivered", "payload": {"signed_by": "Customer", "delivery_time": "2 business days"}},
    ],
    "delayed_shipment": [
        {"event_type": "order_created", "payload": {"order_total": 89.50, "items": 2}},
        {"event_type": "payment_confirmed", "payload": {"method": "paypal", "amount": 89.50}},
        {"event_type": "shipment_created", "payload": {"carrier": "UPS", "tracking": "UPS987654321", "estimated_delivery": "3-5 business days"}},
        {"event_type": "shipment_delayed", "payload": {"reason": "Weather conditions", "new_estimate": "7-10 business days"}},
        {"event_type": "customer_message_received", "payload": {"message": "Where is my order? It was supposed to arrive yesterday."}},
        {"event_type": "delivered", "payload": {"signed_by": "Customer", "delivery_time": "8 business days", "was_delayed": True}},
    ],
    "payment_failure": [
        {"event_type": "order_created", "payload": {"order_total": 250.00, "items": 1}},
        {"event_type": "payment_failed", "payload": {"reason": "Insufficient funds", "method": "credit_card"}},
        {"event_type": "customer_message_received", "payload": {"message": "I updated my payment method, please try again."}},
        {"event_type": "payment_confirmed", "payload": {"method": "debit_card", "amount": 250.00}},
        {"event_type": "shipment_created", "payload": {"carrier": "USPS", "tracking": "USPS111222333", "estimated_delivery": "5-7 business days"}},
        {"event_type": "delivered", "payload": {"signed_by": "Neighbor", "delivery_time": "5 business days"}},
    ],
    "refund": [
        {"event_type": "order_created", "payload": {"order_total": 75.00, "items": 2}},
        {"event_type": "payment_confirmed", "payload": {"method": "credit_card", "amount": 75.00}},
        {"event_type": "shipment_created", "payload": {"carrier": "DHL", "tracking": "DHL555666777", "estimated_delivery": "4-6 business days"}},
        {"event_type": "delivered", "payload": {"signed_by": "Customer", "delivery_time": "4 business days"}},
        {"event_type": "refund_requested", "payload": {"reason": "Item damaged during shipping", "items_affected": 1}},
    ],
}


@router.post("/runs/{run_id}/events", response_model=StatusResponse)
async def inject_event(
    run_id: uuid.UUID,
    data: EventInject,
    db: AsyncSession = Depends(get_db),
):
    """Inject an event into a run."""
    # Validate event type
    if data.event_type not in VALID_EVENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event type '{data.event_type}'. Valid types: {sorted(VALID_EVENTS)}",
        )

    # Load run
    result = await db.execute(select(Run).where(Run.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if run.status in (RunStatus.COMPLETED.value, RunStatus.TERMINATED.value):
        raise HTTPException(status_code=400, detail="Cannot inject events into a completed/terminated run")

    # Persist event and update run state via shared service
    await process_event(db, run, data.event_type, data.payload)

    # Check if this is a terminal event
    if data.event_type in TERMINAL_EVENTS:
        wake_activity = Activity(
            run_id=run.id,
            type="wake_decision",
            subtype="terminal_event",
            content={
                "event_type": data.event_type,
                "decision": "wake",
                "reason": f"Terminal event '{data.event_type}' received. Agent will process and run will complete.",
            },
        )
        db.add(wake_activity)
        await db.commit()

        asyncio.create_task(_handle_terminal_event(run_id, data.event_type))

        return StatusResponse(
            status="success",
            message=f"Terminal event '{data.event_type}' received. Agent will process final actions.",
        )

    # Run classifier to decide whether to wake the agent
    run_status = run.status if isinstance(run.status, str) else run.status.value
    order_status = (run.state or {}).get("order_status", "unknown")

    should_wake, reason = await should_wake_agent(
        event_type=data.event_type,
        event_payload=data.payload,
        run_status=run_status,
        order_status=order_status,
        wake_guidance=run.wake_guidance,
        next_wake_at=run.next_wake_at.isoformat() if run.next_wake_at else None,
    )

    # Record wake decision
    wake_activity = Activity(
        run_id=run.id,
        type="wake_decision",
        subtype="classifier_decision",
        content={
            "event_type": data.event_type,
            "decision": "wake" if should_wake else "stay_asleep",
            "reason": reason,
        },
    )
    db.add(wake_activity)
    await db.commit()

    if should_wake:
        run.status = RunStatus.RUNNING.value
        await db.commit()

        from app.scheduler import cancel_wake_up
        cancel_wake_up(run.id)

        asyncio.create_task(run_agent_background(run_id, f"event: {data.event_type}"))

        return StatusResponse(
            status="success",
            message=f"Event '{data.event_type}' received. Agent woken up. Reason: {reason}",
        )

    return StatusResponse(
        status="success",
        message=f"Event '{data.event_type}' stored. Agent stays asleep. Reason: {reason}",
    )


@router.post("/simulator/scenario", response_model=StatusResponse)
async def fire_scenario(
    data: SimulatorScenario,
    run_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Fire a pre-built event scenario. If run_id is provided, events are sent to that run."""
    if data.scenario not in SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{data.scenario}'. Available: {list(SCENARIOS.keys())}",
        )

    if not run_id:
        raise HTTPException(status_code=400, detail="run_id query parameter is required")

    events = SCENARIOS[data.scenario]

    # Fire events with small delays between them
    asyncio.create_task(_fire_scenario_events(run_id, events))

    return StatusResponse(
        status="success",
        message=f"Scenario '{data.scenario}' started with {len(events)} events for run {run_id}.",
    )


async def _fire_scenario_events(run_id: uuid.UUID, events: list[dict]) -> None:
    """Fire scenario events with delays between each.

    The scenario runner bypasses the LLM classifier and always wakes the agent
    directly — this is intentional; scenarios are meant to exercise the full
    agent loop for every event in the sequence.
    """
    from app.database import AsyncSessionLocal

    for i, event in enumerate(events):
        if i > 0:
            await asyncio.sleep(3)  # 3-second spacing between scenario events

        event_type: str = event["event_type"]
        payload: dict = event.get("payload", {})

        try:
            async with AsyncSessionLocal() as db:
                # Check run is still active before each event
                result = await db.execute(select(Run).where(Run.id == run_id))
                run = result.scalar_one_or_none()

                if not run or run.status in (RunStatus.COMPLETED.value, RunStatus.TERMINATED.value):
                    logger.info("Run %s is no longer active — stopping scenario.", run_id)
                    break

                # Persist event and update state via shared service (no duplication)
                await process_event(db, run, event_type, payload)

                # Scenarios always wake the agent (no classifier gate)
                if event_type in TERMINAL_EVENTS:
                    await _handle_terminal_event(run_id, event_type)
                else:
                    run.status = RunStatus.RUNNING.value
                    await db.commit()
                    await run_agent_background(run_id, f"event: {event_type}")

        except Exception as exc:
            logger.error("Error firing scenario event %s: %s", event_type, exc, exc_info=True)


async def _handle_terminal_event(run_id: uuid.UUID, event_type: str) -> None:
    """Handle a terminal event: let the agent process it once, then complete the run."""
    try:
        from app.agent.runtime import run_agent, generate_final_summary_and_complete

        await run_agent(run_id, wake_trigger=f"terminal_event: {event_type}")
        await generate_final_summary_and_complete(run_id)
    except Exception as exc:
        logger.error("Terminal event handling error for run %s: %s", run_id, exc, exc_info=True)
