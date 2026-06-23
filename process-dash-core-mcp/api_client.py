"""
Thin HTTP client wrapping process-dash-core-api.
All methods return the parsed JSON body or raise on non-2xx.
"""

import os
import httpx

BASE_URL = os.environ.get("CORE_API_BASE_URL", "http://localhost:8000/api")


def _client() -> httpx.Client:
    return httpx.Client(base_url=BASE_URL, timeout=15.0)


def _get(path: str, params: dict = None) -> dict:
    with _client() as c:
        r = c.get(path, params=params or {})
        r.raise_for_status()
        return r.json()


def _post(path: str, body: dict = None) -> dict:
    with _client() as c:
        r = c.post(path, json=body or {})
        r.raise_for_status()
        return r.json()


def _patch(path: str, body: dict = None) -> dict:
    with _client() as c:
        r = c.patch(path, json=body or {})
        r.raise_for_status()
        return r.json()


# ── Health ─────────────────────────────────────────────────────────────────────

def get_health() -> dict:
    return _get("/health")


# ── Day rollup ─────────────────────────────────────────────────────────────────

def get_day(date: str) -> dict:
    return _get(f"/days/{date}")


# ── Daily intents ──────────────────────────────────────────────────────────────

def set_intents(date: str, intents: list[str]) -> dict:
    return _post("/intents/daily", {"date": date, "intents": intents})


def get_intents(date: str) -> dict:
    return _get(f"/intents/daily/{date}")


# ── Focus blocks ───────────────────────────────────────────────────────────────

def start_block(date: str, intent: str, notes: str = None,
                project_id: str = None, story_id: str = None) -> dict:
    body = {"date": date, "intent": intent}
    if notes:
        body["notes"] = notes
    if project_id:
        body["projectId"] = project_id
    if story_id:
        body["storyId"] = story_id
    return _post("/blocks/start", body)


def interrupt_block(block_id: str, reason_code: str) -> dict:
    return _post("/blocks/interrupt", {"blockId": block_id, "reasonCode": reason_code})


def end_block(block_id: str, actual_outcome: str = None,
              duration_minutes: int = None) -> dict:
    body: dict = {"blockId": block_id}
    if actual_outcome:
        body["actualOutcome"] = actual_outcome
    if duration_minutes is not None:
        body["durationMinutes"] = duration_minutes
    return _post("/blocks/end", body)


# ── Recovery ───────────────────────────────────────────────────────────────────

def start_recovery(kind: str, date: str) -> dict:
    return _post("/recovery/start", {"kind": kind, "date": date})


def end_recovery(block_id: str, duration_minutes: int) -> dict:
    return _post("/recovery/end", {"blockId": block_id, "durationMinutes": duration_minutes})


# ── Sprints ────────────────────────────────────────────────────────────────────

def list_sprints(project_id: str = None) -> dict:
    params = {}
    if project_id:
        params["projectId"] = project_id
    return _get("/sprints", params)


def get_sprint(sprint_id: str) -> dict:
    return _get(f"/sprints/{sprint_id}")


def get_sprint_rollup(sprint_id: str) -> dict:
    return _get(f"/sprints/{sprint_id}/rollup")


def create_sprint(name: str, start_date: str, duration_days: int,
                  project_id: str = None) -> dict:
    body: dict = {"name": name, "startDate": start_date, "durationDays": duration_days}
    if project_id:
        body["projectId"] = project_id
    return _post("/sprints", body)


# ── User stories ───────────────────────────────────────────────────────────────

def list_stories(sprint_id: str = None, project_id: str = None,
                 status: str = None) -> dict:
    params = {}
    if sprint_id:
        params["sprintId"] = sprint_id
    if project_id:
        params["projectId"] = project_id
    if status:
        params["status"] = status
    return _get("/stories", params)


def create_story(sprint_id: str, title: str, story_points: int = None,
                 description: str = None, project_id: str = None) -> dict:
    body: dict = {"sprintId": sprint_id, "title": title}
    if story_points is not None:
        body["storyPoints"] = story_points
    if description:
        body["description"] = description
    if project_id:
        body["projectId"] = project_id
    return _post("/stories", body)


def update_story_status(story_id: str, status: str) -> dict:
    return _patch(f"/stories/{story_id}/status", {"status": status})


def get_story(story_id: str) -> dict:
    return _get(f"/stories/{story_id}")


# ── Todos ──────────────────────────────────────────────────────────────────────

def get_todos(date: str) -> dict:
    return _get(f"/todos/{date}")


def add_todo(text: str, date: str) -> dict:
    return _post("/todos", {"text": text, "date": date})


def complete_todo(todo_id: str, completion_date: str) -> dict:
    return _patch(f"/todos/{todo_id}/complete", {"completionDate": completion_date})


# ── Projects ───────────────────────────────────────────────────────────────────

def list_projects() -> dict:
    return _get("/projects")


def get_project(project_id: str) -> dict:
    return _get(f"/projects/{project_id}")
