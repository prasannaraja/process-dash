from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional
from pydantic import BaseModel

from app.db import get_session
from app.models import SprintTask, SprintDefinition

router = APIRouter(prefix="/sprints/{sprint_id}/tasks", tags=["sprint-tasks"])


def _assert_sprint(session: Session, sprint_id: str) -> SprintDefinition:
    sprint = session.get(SprintDefinition, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


def _task_dict(t: SprintTask) -> dict:
    return {
        "id": t.id,
        "sprintId": t.sprint_id,
        "title": t.title,
        "isDone": t.is_done,
        "createdAt": t.created_at.isoformat() if t.created_at else None,
        "updatedAt": t.updated_at.isoformat() if t.updated_at else None,
    }


class TaskCreateRequest(BaseModel):
    title: str
    isDone: bool = False


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    isDone: Optional[bool] = None


@router.get("")
def list_tasks(sprint_id: str, session: Session = Depends(get_session)):
    _assert_sprint(session, sprint_id)
    tasks = session.exec(
        select(SprintTask)
        .where(SprintTask.sprint_id == sprint_id)
        .order_by(SprintTask.created_at)
    ).all()
    return {"items": [_task_dict(t) for t in tasks]}


@router.post("", status_code=201)
def create_task(sprint_id: str, req: TaskCreateRequest, session: Session = Depends(get_session)):
    _assert_sprint(session, sprint_id)
    task = SprintTask(sprint_id=sprint_id, title=req.title.strip(), is_done=req.isDone)
    session.add(task)
    session.commit()
    session.refresh(task)
    return _task_dict(task)


@router.patch("/{task_id}")
def update_task(sprint_id: str, task_id: str, req: TaskUpdateRequest, session: Session = Depends(get_session)):
    task = session.get(SprintTask, task_id)
    if not task or task.sprint_id != sprint_id:
        raise HTTPException(status_code=404, detail="Task not found")
    if req.title is not None:
        task.title = req.title.strip()
    if req.isDone is not None:
        task.is_done = req.isDone
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)
    return _task_dict(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(sprint_id: str, task_id: str, session: Session = Depends(get_session)):
    task = session.get(SprintTask, task_id)
    if not task or task.sprint_id != sprint_id:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
