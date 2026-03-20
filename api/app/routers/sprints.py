from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.db import get_session
from app.db import ensure_default_project
from app.models import SprintDefinition
from app.services.events import log_event
from app.services.rollups import (
    get_sprint_rollup,
    has_saved_sprint_summary,
    list_sprint_definitions,
    list_sprint_summaries,
)


router = APIRouter(prefix="/sprints", tags=["sprints"])


class SprintCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    startDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    durationDays: int = Field(..., ge=1, le=60)
    projectId: Optional[str] = None


class SprintUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    startDate: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    durationDays: Optional[int] = Field(default=None, ge=1, le=60)
    forceRecalculate: bool = False


class SprintSummaryRequest(BaseModel):
    topFragmenters: List[str]
    notPerformanceIssues: List[str]
    oneChangeNextWeek: str


def _parse_iso_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD") from exc


def _compute_end_date(start_date: date, duration_days: int) -> date:
    return start_date + timedelta(days=duration_days - 1)


def _ensure_no_overlap(
    session: Session,
    start_date: date,
    end_date: date,
    exclude_id: Optional[str] = None,
):
    candidates = session.exec(
        select(SprintDefinition).where(SprintDefinition.is_archived == False)  # noqa: E712
    ).all()

    for sprint in candidates:
        if exclude_id and sprint.id == exclude_id:
            continue
        if not (end_date < sprint.start_date or start_date > sprint.end_date):
            raise HTTPException(
                status_code=409,
                detail=f"Sprint date range overlaps with '{sprint.name}' ({sprint.start_date} to {sprint.end_date}).",
            )


@router.get("")
def get_sprints(projectId: Optional[str] = None, session: Session = Depends(get_session)):
    items = []
    for sprint in list_sprint_definitions(session, project_id=projectId):
        items.append(
            {
                "id": sprint.id,
                "projectId": sprint.project_id,
                "name": sprint.name,
                "startDate": sprint.start_date.isoformat(),
                "endDate": sprint.end_date.isoformat(),
                "durationDays": sprint.duration_days,
                "isArchived": sprint.is_archived,
            }
        )
    return {"items": items}


@router.post("")
def create_sprint(req: SprintCreateRequest, session: Session = Depends(get_session)):
    start_date = _parse_iso_date(req.startDate)
    end_date = _compute_end_date(start_date, req.durationDays)
    _ensure_no_overlap(session, start_date, end_date)

    project = None
    if req.projectId:
        project = req.projectId
    else:
        project = ensure_default_project(session).id

    sprint = SprintDefinition(
        project_id=project,
        name=req.name.strip(),
        start_date=start_date,
        end_date=end_date,
        duration_days=req.durationDays,
    )
    session.add(sprint)
    session.commit()
    session.refresh(sprint)

    return {
        "id": sprint.id,
        "projectId": sprint.project_id,
        "name": sprint.name,
        "startDate": sprint.start_date.isoformat(),
        "endDate": sprint.end_date.isoformat(),
        "durationDays": sprint.duration_days,
        "isArchived": sprint.is_archived,
    }


@router.get("/summaries")
def get_sprint_summaries(projectId: Optional[str] = None, session: Session = Depends(get_session)):
    return {"items": list_sprint_summaries(session, project_id=projectId)}


@router.get("/{sprint_id}/rollup")
def get_sprint_rollup_view(sprint_id: str, session: Session = Depends(get_session)):
    return get_sprint_rollup(session, sprint_id)


@router.post("/{sprint_id}/summary")
def save_sprint_summary(
    sprint_id: str,
    req: SprintSummaryRequest,
    session: Session = Depends(get_session),
):
    sprint = session.get(SprintDefinition, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    payload = req.model_dump()
    payload["sprintId"] = sprint_id
    log_event(session, "sprint_summary_saved", payload)
    return {"ok": True}


@router.patch("/{sprint_id}")
def update_sprint(
    sprint_id: str,
    req: SprintUpdateRequest,
    session: Session = Depends(get_session),
):
    sprint = session.get(SprintDefinition, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    has_summary = has_saved_sprint_summary(session, sprint_id)
    changing_dates_or_duration = req.startDate is not None or req.durationDays is not None
    if has_summary and changing_dates_or_duration and not req.forceRecalculate:
        return {
            "ok": False,
            "requiresConfirmation": True,
            "warning": "This sprint already has saved summaries. Confirm to modify dates/duration and recalculate progress.",
        }

    next_name = req.name.strip() if req.name is not None else sprint.name
    next_start = _parse_iso_date(req.startDate) if req.startDate is not None else sprint.start_date
    next_duration = req.durationDays if req.durationDays is not None else sprint.duration_days
    next_end = _compute_end_date(next_start, next_duration)

    _ensure_no_overlap(session, next_start, next_end, exclude_id=sprint.id)

    sprint.name = next_name
    sprint.start_date = next_start
    sprint.end_date = next_end
    sprint.duration_days = next_duration
    sprint.updated_at = datetime.now(timezone.utc)

    session.add(sprint)
    session.commit()
    session.refresh(sprint)

    return {
        "ok": True,
        "id": sprint.id,
        "name": sprint.name,
        "startDate": sprint.start_date.isoformat(),
        "endDate": sprint.end_date.isoformat(),
        "durationDays": sprint.duration_days,
        "isArchived": sprint.is_archived,
    }
