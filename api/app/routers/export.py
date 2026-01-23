from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.db import get_session
from app.services.export_md import export_day_to_md

router = APIRouter(prefix="/export", tags=["export"])

@router.post("/day/{date_str}")
def export_day(date_str: str, session: Session = Depends(get_session)):
    path = export_day_to_md(session, date_str)
    return {"path": path}

@router.post("/week/{year_week}")
def export_week(year_week: str, session: Session = Depends(get_session)):
    # Placeholder for week export
    return {"path": "Not implemented yet"}
