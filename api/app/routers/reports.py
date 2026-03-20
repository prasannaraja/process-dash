from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.db import get_session
from app.services.rollups import get_day_rollup

router = APIRouter(tags=["reports"])

@router.get("/days/{date_str}")
def get_day_view(date_str: str, session: Session = Depends(get_session)):
    return get_day_rollup(session, date_str)
