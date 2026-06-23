import uuid
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from pydantic import BaseModel, Field
from typing import List, Optional
from app.db import get_session
from app.services.events import log_event
from app.models import EventLog
import json

router = APIRouter(prefix="/todos", tags=["todos"])


class AddTodoRequest(BaseModel):
    text: str = Field(..., min_length=1)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


class CompleteTodoRequest(BaseModel):
    completionDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


def _parse_payload(event: EventLog) -> dict:
    return json.loads(event.payload)


def _build_todos_for_date(session: Session, date_str: str) -> List[dict]:
    """
    Replay todo events to build the list of todos visible on a given date.
    A todo is visible on its creation date.
    A todo is marked completed on the completionDate logged in todo_completed.
    A todo is removed if a todo_deleted event exists for it.
    """
    # Fetch all todo events ordered by time
    events = session.exec(
        select(EventLog)
        .where(EventLog.type.in_(["todo_added", "todo_completed", "todo_deleted"]))
        .order_by(EventLog.ts)
    ).all()

    todos: dict[str, dict] = {}
    deleted_ids: set[str] = set()

    for evt in events:
        p = _parse_payload(evt)
        todo_id = p.get("todoId")
        if not todo_id:
            continue

        if evt.type == "todo_added":
            if p.get("date") == date_str:
                todos[todo_id] = {
                    "todoId": todo_id,
                    "text": p.get("text", ""),
                    "date": p.get("date"),
                    "completed": False,
                    "completionDate": None,
                }
        elif evt.type == "todo_completed":
            if todo_id in todos:
                todos[todo_id]["completed"] = True
                todos[todo_id]["completionDate"] = p.get("completionDate")
        elif evt.type == "todo_deleted":
            deleted_ids.add(todo_id)

    return [t for tid, t in todos.items() if tid not in deleted_ids]


@router.post("")
def add_todo(req: AddTodoRequest, session: Session = Depends(get_session)):
    todo_id = str(uuid.uuid4())
    log_event(session, "todo_added", {
        "todoId": todo_id,
        "text": req.text,
        "date": req.date,
    })
    return {"ok": True, "todoId": todo_id}


@router.patch("/{todo_id}/complete")
def complete_todo(
    todo_id: str,
    req: CompleteTodoRequest,
    session: Session = Depends(get_session),
):
    log_event(session, "todo_completed", {
        "todoId": todo_id,
        "completionDate": req.completionDate,
    })
    return {"ok": True}


@router.patch("/{todo_id}/uncomplete")
def uncomplete_todo(
    todo_id: str,
    req: CompleteTodoRequest,
    session: Session = Depends(get_session),
):
    """Re-open a completed todo."""
    log_event(session, "todo_uncompleted", {
        "todoId": todo_id,
        "completionDate": req.completionDate,
    })
    return {"ok": True}


@router.delete("/{todo_id}")
def delete_todo(
    todo_id: str,
    session: Session = Depends(get_session),
):
    log_event(session, "todo_deleted", {"todoId": todo_id})
    return {"ok": True}


@router.get("/{date_str}")
def get_todos(date_str: str, session: Session = Depends(get_session)):
    todos = _build_todos_for_date(session, date_str)
    return {"date": date_str, "todos": todos}
