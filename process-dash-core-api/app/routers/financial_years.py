from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional
from pydantic import BaseModel

from app.db import get_session
from app.models import FinancialYear

router = APIRouter(prefix="/financial-years", tags=["financial-years"])


def _fy_dict(fy: FinancialYear) -> dict:
    return {
        "id": fy.id,
        "label": fy.label,
        "startDate": str(fy.start_date),
        "endDate": str(fy.end_date),
        "orgGoal": fy.org_goal,
        "prevYearFeedback": fy.prev_year_feedback,
        "isCurrent": fy.is_current,
        "createdAt": fy.created_at.isoformat() if fy.created_at else None,
    }


class FYCreateRequest(BaseModel):
    label: str
    startDate: str
    endDate: str
    orgGoal: Optional[str] = None
    prevYearFeedback: Optional[str] = None
    isCurrent: bool = False


class FYUpdateRequest(BaseModel):
    label: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    orgGoal: Optional[str] = None
    prevYearFeedback: Optional[str] = None
    isCurrent: Optional[bool] = None


@router.get("")
def list_financial_years(session: Session = Depends(get_session)):
    items = session.exec(select(FinancialYear).order_by(FinancialYear.start_date.desc())).all()
    return {"items": [_fy_dict(fy) for fy in items]}


@router.post("", status_code=201)
def create_financial_year(req: FYCreateRequest, session: Session = Depends(get_session)):
    from datetime import date
    # if marking as current, clear others
    if req.isCurrent:
        existing = session.exec(select(FinancialYear).where(FinancialYear.is_current == True)).all()  # noqa
        for e in existing:
            e.is_current = False
            session.add(e)

    fy = FinancialYear(
        label=req.label,
        start_date=date.fromisoformat(req.startDate),
        end_date=date.fromisoformat(req.endDate),
        org_goal=req.orgGoal,
        prev_year_feedback=req.prevYearFeedback,
        is_current=req.isCurrent,
    )
    session.add(fy)
    session.commit()
    session.refresh(fy)
    return _fy_dict(fy)


@router.get("/current")
def get_current_financial_year(session: Session = Depends(get_session)):
    fy = session.exec(select(FinancialYear).where(FinancialYear.is_current == True)).first()  # noqa
    if not fy:
        raise HTTPException(status_code=404, detail="No current financial year set")
    return _fy_dict(fy)


@router.patch("/{fy_id}")
def update_financial_year(fy_id: str, req: FYUpdateRequest, session: Session = Depends(get_session)):
    from datetime import date
    fy = session.get(FinancialYear, fy_id)
    if not fy:
        raise HTTPException(status_code=404, detail="Financial year not found")

    if req.label is not None:
        fy.label = req.label
    if req.startDate is not None:
        fy.start_date = date.fromisoformat(req.startDate)
    if req.endDate is not None:
        fy.end_date = date.fromisoformat(req.endDate)
    if req.orgGoal is not None:
        fy.org_goal = req.orgGoal
    if req.prevYearFeedback is not None:
        fy.prev_year_feedback = req.prevYearFeedback
    if req.isCurrent is not None:
        if req.isCurrent:
            existing = session.exec(select(FinancialYear).where(FinancialYear.is_current == True)).all()  # noqa
            for e in existing:
                if e.id != fy_id:
                    e.is_current = False
                    session.add(e)
        fy.is_current = req.isCurrent

    session.add(fy)
    session.commit()
    session.refresh(fy)
    return _fy_dict(fy)
