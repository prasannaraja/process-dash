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
        "isClosed": sprint.is_closed,
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
        "isClosed": sprint.is_closed,
    }


@router.get("/summaries")
def get_sprint_summaries(projectId: Optional[str] = None, session: Session = Depends(get_session)):
    return {"items": list_sprint_summaries(session, project_id=projectId)}


@router.get("/{sprint_id}")
def get_sprint(sprint_id: str, session: Session = Depends(get_session)):
    sprint = session.get(SprintDefinition, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return {
        "id": sprint.id,
        "projectId": sprint.project_id,
        "name": sprint.name,
        "startDate": sprint.start_date.isoformat(),
        "endDate": sprint.end_date.isoformat(),
        "durationDays": sprint.duration_days,
        "isArchived": sprint.is_archived,
        "isClosed": sprint.is_closed,
    }


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
        "isClosed": sprint.is_closed,
    }


# ── Sprint close + carry-forward ───────────────────────────────────────────────

class CarryForwardRequest(BaseModel):
    storyIds: List[str]          # stories to carry forward
    targetSprintId: str          # destination sprint


@router.post("/{sprint_id}/close")
def close_sprint(sprint_id: str, session: Session = Depends(get_session)):
    """Mark a sprint closed and return its unfinished stories."""
    from app.models import UserStory
    from sqlmodel import select as sql_select

    sprint = session.get(SprintDefinition, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    sprint.is_closed = True
    sprint.updated_at = datetime.now(timezone.utc)
    session.add(sprint)

    log_event(
        session,
        "sprint_closed",
        {"sprintId": sprint_id, "sprintName": sprint.name},
        project_id=sprint.project_id,
    )
    session.commit()

    # Return unfinished stories so the UI can offer carry-forward
    from app.routers.stories import _story_to_dict, _parse_tags  # local import to avoid circular
    unfinished = session.exec(
        sql_select(UserStory).where(
            UserStory.sprint_id == sprint_id,
            UserStory.is_deleted == False,  # noqa: E712
            UserStory.status != "DONE",
        )
    ).all()

    return {
        "ok": True,
        "sprintId": sprint_id,
        "unfinishedStories": [_story_to_dict(s) for s in unfinished],
    }


@router.post("/{sprint_id}/carry-forward")
def carry_forward_stories(
    sprint_id: str,
    req: CarryForwardRequest,
    session: Session = Depends(get_session),
):
    """Copy selected stories to a target sprint and mark originals as CARRIED_OVER."""
    import uuid as _uuid
    from app.models import UserStory
    from app.routers.stories import _story_to_dict, _parse_tags  # local import

    source_sprint = session.get(SprintDefinition, sprint_id)
    if not source_sprint:
        raise HTTPException(status_code=404, detail="Source sprint not found")

    target_sprint = session.get(SprintDefinition, req.targetSprintId)
    if not target_sprint:
        raise HTTPException(status_code=404, detail="Target sprint not found")

    moved = []
    for story_id in req.storyIds:
        story = session.get(UserStory, story_id)
        if not story or story.is_deleted or story.sprint_id != sprint_id:
            continue

        # Mark original as CARRIED_OVER
        story.status = "CARRIED_OVER"
        story.updated_at = datetime.now(timezone.utc)
        session.add(story)

        # Create a fresh copy in the target sprint
        new_story = UserStory(
            id=str(_uuid.uuid4()),
            sprint_id=req.targetSprintId,
            project_id=story.project_id,
            title=story.title,
            description=story.description,
            acceptance_criteria=story.acceptance_criteria,
            story_points=story.story_points,
            tags=story.tags,
            status="TODO",
        )
        session.add(new_story)
        session.flush()

        log_event(
            session,
            "user_story_carried_forward",
            {
                "originalStoryId": story.id,
                "newStoryId": new_story.id,
                "fromSprintId": sprint_id,
                "toSprintId": req.targetSprintId,
                "title": story.title,
                "tags": _parse_tags(story.tags),
            },
            project_id=story.project_id,
        )
        moved.append(_story_to_dict(new_story))

    session.commit()
    return {"ok": True, "movedStories": moved, "count": len(moved)}
