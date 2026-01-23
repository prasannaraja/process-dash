from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db import get_session
from app.services.events import log_event
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/blocks", tags=["blocks"])

class StartBlockRequest(BaseModel):
    date: str
    intent: str
    notes: Optional[str] = None

class InterruptBlockRequest(BaseModel):
    blockId: str
    reasonCode: str

class EndBlockRequest(BaseModel):
    blockId: str
    actualOutcome: Optional[str] = None
    durationMinutes: Optional[int] = None

@router.post("/start")
def start_block(req: StartBlockRequest, session: Session = Depends(get_session)):
    block_id = str(uuid.uuid4())
    payload = req.dict()
    payload["blockId"] = block_id
    
    log_event(session, "intent_block_started", payload)
    return {"blockId": block_id}

@router.post("/interrupt")
def interrupt_block(req: InterruptBlockRequest, session: Session = Depends(get_session)):
    valid_reasons = {
        "MEETING", "DEPENDENCY", "CONTEXT_SWITCH", 
        "FAMILY", "EMOTIONAL_LOAD", "TECH_ISSUE", "UNPLANNED_REQUEST"
    }
    if req.reasonCode not in valid_reasons:
        raise HTTPException(status_code=400, detail=f"Invalid reason code. Must be one of {valid_reasons}")
        
    log_event(session, "intent_block_interrupted", req.dict())
    return {"ok": True}

@router.post("/end")
def end_block(req: EndBlockRequest, session: Session = Depends(get_session)):
    log_event(session, "intent_block_ended", req.dict())
    return {"ok": True}
