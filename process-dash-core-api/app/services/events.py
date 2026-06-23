import json
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Session
from app.models import EventLog


def log_event(
    session: Session,
    event_type: str,
    payload: dict,
    local_id: str = None,
    project_id: str = None,
    occurred_at: Optional[datetime] = None,
) -> EventLog:
    """
    Append an event to the log.

    ts       — wall-clock time the event was recorded (always now).
    occurred_at — when the event actually happened. Defaults to ts when not
                  supplied. Pass explicitly for retroactive logging (e.g. "I
                  finished that block two hours ago").
    """
    now = datetime.now(timezone.utc)
    event = EventLog(
        type=event_type,
        payload=json.dumps(payload),
        ts=now,
        occurred_at=occurred_at if occurred_at is not None else now,
        project_id=project_id,
    )
    if local_id:
        event.id = local_id

    session.add(event)
    session.commit()
    session.refresh(event)
    return event

def get_events(session: Session, event_type: str = None, after: datetime = None):
    query = session.query(EventLog).order_by(EventLog.ts)
    if event_type:
        query = query.filter(EventLog.type == event_type)
    if after:
        query = query.filter(EventLog.ts > after)
    return query.all()
