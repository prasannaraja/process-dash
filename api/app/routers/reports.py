from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.db import get_session
from app.services.rollups import get_day_rollup, get_week_rollup
from app.services.events import log_event
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(tags=["reports"])

class WeeklySummaryRequest(BaseModel):
    topFragmenters: List[str]
    notPerformanceIssues: List[str]
    oneChangeNextWeek: str

@router.get("/days/{date_str}")
def get_day_view(date_str: str, session: Session = Depends(get_session)):
    return get_day_rollup(session, date_str)

@router.get("/weeks/{year_week}")
def get_week_view(year_week: str, session: Session = Depends(get_session)):
    return get_week_rollup(session, year_week)

@router.post("/weeks/{year_week}/summary")
def save_weekly_summary(
    year_week: str, 
    req: WeeklySummaryRequest, 
    session: Session = Depends(get_session)
):
    payload = req.dict()
    payload["yearWeek"] = year_week
    log_event(session, "weekly_summary_saved", payload)
    return {"ok": True}
