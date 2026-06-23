from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel
from typing import Optional

from app.db import get_session
from app.services.events import log_event

router = APIRouter(prefix="/recovery", tags=["recovery"])

class StartRecoveryRequest(BaseModel):
    kind: str # "COFFEE" | "LUNCH"
    date: str

class EndRecoveryRequest(BaseModel):
    blockId: str
    durationMinutes: int

@router.post("/start")
def start_recovery(req: StartRecoveryRequest, session: Session = Depends(get_session)):
    if req.kind not in ["COFFEE", "LUNCH"]:
        raise HTTPException(status_code=400, detail="Invalid recovery kind. Must be COFFEE or LUNCH.")
        
    block_id = str(uuid4())
    payload = {
        "blockId": block_id,
        "kind": req.kind,
        "date": req.date
    }
    
    log_event(session, "recovery_block_started", payload)
    return {"blockId": block_id}

@router.post("/end")
def end_recovery(req: EndRecoveryRequest, session: Session = Depends(get_session)):
    payload = {
        "blockId": req.blockId,
        "durationMinutes": req.durationMinutes
    }
    
    log_event(session, "recovery_block_ended", payload)
    return {"status": "ok"}
