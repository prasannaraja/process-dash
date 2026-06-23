import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, select

from app.db import get_session
from app.models import SprintDefinition, UserStory, STORY_STATUSES, STORY_POINTS_VALUES
from app.services.events import log_event

router = APIRouter(prefix="/stories", tags=["stories"])


# ── Request / response models ──────────────────────────────────────────────────

class StoryCreateRequest(BaseModel):
    sprintId: str
    projectId: Optional[str] = None
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    acceptanceCriteria: Optional[str] = None
    storyPoints: Optional[int] = None

    @field_validator("storyPoints")
    @classmethod
    def validate_points(cls, v):
        if v is not None and v not in STORY_POINTS_VALUES:
            raise ValueError(f"storyPoints must be one of {sorted(STORY_POINTS_VALUES)}")
        return v


class StoryUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    acceptanceCriteria: Optional[str] = None
    storyPoints: Optional[int] = None
    status: Optional[str] = None

    @field_validator("storyPoints")
    @classmethod
    def validate_points(cls, v):
        if v is not None and v not in STORY_POINTS_VALUES:
            raise ValueError(f"storyPoints must be one of {sorted(STORY_POINTS_VALUES)}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in STORY_STATUSES:
            raise ValueError(f"status must be one of {STORY_STATUSES}")
        return v


class StoryStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in STORY_STATUSES:
            raise ValueError(f"status must be one of {STORY_STATUSES}")
        return v


# ── Helpers ────────────────────────────────────────────────────────────────────

def _story_to_dict(story: UserStory) -> dict:
    return {
        "id": story.id,
        "sprintId": story.sprint_id,
        "projectId": story.project_id,
        "title": story.title,
        "description": story.description,
        "acceptanceCriteria": story.acceptance_criteria,
        "storyPoints": story.story_points,
        "status": story.status,
        "createdAt": story.created_at.isoformat(),
        "updatedAt": story.updated_at.isoformat(),
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
def list_stories(
    sprintId: Optional[str] = None,
    projectId: Optional[str] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = select(UserStory).where(UserStory.is_deleted == False)  # noqa: E712
    if sprintId:
        query = query.where(UserStory.sprint_id == sprintId)
    if projectId:
        query = query.where(UserStory.project_id == projectId)
    if status:
        if status not in STORY_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {STORY_STATUSES}")
        query = query.where(UserStory.status == status)
    stories = session.exec(query.order_by(UserStory.created_at)).all()
    return {"items": [_story_to_dict(s) for s in stories]}


@router.post("")
def create_story(req: StoryCreateRequest, session: Session = Depends(get_session)):
    # Validate sprint exists
    sprint = session.get(SprintDefinition, req.sprintId)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    # Inherit projectId from sprint if not explicitly provided
    project_id = req.projectId or sprint.project_id

    story = UserStory(
        sprint_id=req.sprintId,
        project_id=project_id,
        title=req.title.strip(),
        description=req.description,
        acceptance_criteria=req.acceptanceCriteria,
        story_points=req.storyPoints,
    )
    session.add(story)
    session.flush()  # get story.id without final commit

    log_event(
        session,
        "user_story_created",
        {
            "storyId": story.id,
            "sprintId": story.sprint_id,
            "projectId": story.project_id,
            "title": story.title,
            "storyPoints": story.story_points,
        },
        project_id=project_id,
    )
    session.commit()
    session.refresh(story)
    return _story_to_dict(story)


@router.get("/{story_id}")
def get_story(story_id: str, session: Session = Depends(get_session)):
    story = session.get(UserStory, story_id)
    if not story or story.is_deleted:
        raise HTTPException(status_code=404, detail="Story not found")
    return _story_to_dict(story)


@router.patch("/{story_id}")
def update_story(
    story_id: str,
    req: StoryUpdateRequest,
    session: Session = Depends(get_session),
):
    story = session.get(UserStory, story_id)
    if not story or story.is_deleted:
        raise HTTPException(status_code=404, detail="Story not found")

    old_status = story.status
    changed = False

    if req.title is not None:
        story.title = req.title.strip()
        changed = True
    if req.description is not None:
        story.description = req.description
        changed = True
    if req.acceptanceCriteria is not None:
        story.acceptance_criteria = req.acceptanceCriteria
        changed = True
    if req.storyPoints is not None:
        story.story_points = req.storyPoints
        changed = True
    if req.status is not None and req.status != old_status:
        story.status = req.status
        changed = True

    if changed:
        story.updated_at = datetime.now(timezone.utc)
        session.add(story)

        if req.status is not None and req.status != old_status:
            log_event(
                session,
                "user_story_status_changed",
                {
                    "storyId": story.id,
                    "sprintId": story.sprint_id,
                    "oldStatus": old_status,
                    "newStatus": req.status,
                },
                project_id=story.project_id,
            )
        else:
            session.commit()
            session.refresh(story)

    session.commit()
    session.refresh(story)
    return _story_to_dict(story)


@router.patch("/{story_id}/status")
def update_story_status(
    story_id: str,
    req: StoryStatusRequest,
    session: Session = Depends(get_session),
):
    story = session.get(UserStory, story_id)
    if not story or story.is_deleted:
        raise HTTPException(status_code=404, detail="Story not found")

    old_status = story.status
    if req.status == old_status:
        return _story_to_dict(story)

    story.status = req.status
    story.updated_at = datetime.now(timezone.utc)
    session.add(story)

    log_event(
        session,
        "user_story_status_changed",
        {
            "storyId": story.id,
            "sprintId": story.sprint_id,
            "oldStatus": old_status,
            "newStatus": req.status,
        },
        project_id=story.project_id,
    )
    session.commit()
    session.refresh(story)
    return _story_to_dict(story)


@router.delete("/{story_id}")
def delete_story(story_id: str, session: Session = Depends(get_session)):
    story = session.get(UserStory, story_id)
    if not story or story.is_deleted:
        raise HTTPException(status_code=404, detail="Story not found")

    story.is_deleted = True
    story.updated_at = datetime.now(timezone.utc)
    session.add(story)

    log_event(
        session,
        "user_story_deleted",
        {"storyId": story.id, "sprintId": story.sprint_id},
        project_id=story.project_id,
    )
    session.commit()
    return {"ok": True}
