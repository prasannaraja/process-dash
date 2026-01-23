from datetime import datetime, timezone
import uuid
from sqlmodel import Field, SQLModel
from typing import Optional

class EventLog(SQLModel, table=True):
    __tablename__ = "event_log"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    type: str = Field(index=True)
    payload: str  # JSON stored as string
    
    class Config:
        arbitrary_types_allowed = True
