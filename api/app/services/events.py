import json
from datetime import datetime, timezone
from sqlmodel import Session
from app.models import EventLog

def log_event(session: Session, event_type: str, payload: dict, local_id: str = None) -> EventLog:
    """
    Append an event to the log.
    Payload is automatically serialized to JSON.
    """
    event = EventLog(
        type=event_type,
        payload=json.dumps(payload),
        ts=datetime.now(timezone.utc)
    )
    if local_id:
        # Use provided ID if available (e.g. for offline syncing in future), else auto-gen
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
