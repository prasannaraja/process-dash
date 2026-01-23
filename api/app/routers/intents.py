from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db import get_session
from app.services.events import log_event, get_events
from pydantic import BaseModel, Field
from datetime import date
from typing import List

router = APIRouter(prefix="/intents", tags=["intents"])

class DailyIntentsRequest(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    intents: List[str]

    def validate_intents(self):
        if len(self.intents) > 5:
            raise ValueError("Max 5 intents allowed")

@router.post("/daily")
def set_daily_intents(req: DailyIntentsRequest, session: Session = Depends(get_session)):
    if len(req.intents) > 5:
        raise HTTPException(status_code=400, detail="Max 5 intents allowed")
        
    log_event(session, "daily_intents_set", req.dict())
    return {"ok": True}

@router.get("/daily/{date_str}")
def get_daily_intents_view(date_str: str, session: Session = Depends(get_session)):
    # Replay events to find latest for this date
    # In a real app we might use a dedicated query in services/rollups
    # Reusing the rollup logic implicitly or explicitly?
    # Let's use the valid pattern: Latest event wins.
    from app.services.rollups import get_day_rollup
    rollup = get_day_rollup(session, date_str)
    return {"date": date_str, "intents": rollup["intents"]}
