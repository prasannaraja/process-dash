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


def _delete(path: str) -> None:
    with _client() as c:
        r = c.delete(path)
        r.raise_for_status()


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

# ── Sprints (extended) ────────────────────────────────────────────────────────

def update_sprint(sprint_id: str, name: str = None, start_date: str = None,
                  duration_days: int = None, force_recalculate: bool = False) -> dict:
    body: dict = {}
    if name is not None:
        body["name"] = name
    if start_date is not None:
        body["startDate"] = start_date
    if duration_days is not None:
        body["durationDays"] = duration_days
    if force_recalculate:
        body["forceRecalculate"] = True
    return _patch(f"/sprints/{sprint_id}", body)


def list_sprint_summaries() -> dict:
    return _get("/sprints/summaries")


def save_sprint_summary(sprint_id: str, top_fragmenters: list[str],
                        not_performance_issues: list[str], one_change_next_week: str) -> dict:
    return _post(f"/sprints/{sprint_id}/summary", {
        "topFragmenters": top_fragmenters,
        "notPerformanceIssues": not_performance_issues,
        "oneChangeNextWeek": one_change_next_week,
    })


# ── Stories (extended) ────────────────────────────────────────────────────────

def update_story(story_id: str, title: str = None, description: str = None,
                 story_points: int = None, status: str = None) -> dict:
    body: dict = {}
    if title is not None:
        body["title"] = title
    if description is not None:
        body["description"] = description
    if story_points is not None:
        body["storyPoints"] = story_points
    if status is not None:
        body["status"] = status
    return _patch(f"/stories/{story_id}", body)


def delete_story(story_id: str) -> dict:
    _delete(f"/stories/{story_id}")
    return {"deleted": True, "story_id": story_id}


# ── Todos (extended) ──────────────────────────────────────────────────────────

def uncomplete_todo(todo_id: str, completion_date: str) -> dict:
    return _patch(f"/todos/{todo_id}/uncomplete", {"completionDate": completion_date})


def delete_todo(todo_id: str) -> dict:
    _delete(f"/todos/{todo_id}")
    return {"deleted": True, "todo_id": todo_id}


# ── Projects (extended) ───────────────────────────────────────────────────────

def list_projects() -> dict:
    return _get("/projects")


def get_project(project_id: str) -> dict:
    return _get(f"/projects/{project_id}")


def create_project(name: str, description: str = None) -> dict:
    body: dict = {"name": name}
    if description:
        body["description"] = description
    return _post("/projects", body)


def update_project(project_id: str, name: str = None, description: str = None,
                   allocation_start_date: str = None, allocation_end_date: str = None) -> dict:
    body: dict = {}
    if name is not None:
        body["name"] = name
    if description is not None:
        body["description"] = description
    if allocation_start_date is not None:
        body["allocationStartDate"] = allocation_start_date
    if allocation_end_date is not None:
        body["allocationEndDate"] = allocation_end_date
    return _patch(f"/projects/{project_id}", body)


def delete_project(project_id: str) -> dict:
    _delete(f"/projects/{project_id}")
    return {"deleted": True, "project_id": project_id}


def list_project_members(project_id: str) -> dict:
    return _get(f"/projects/{project_id}/members")


def add_project_member(project_id: str, name: str, email: str = None, role: str = "CONTRIBUTOR") -> dict:
    body: dict = {"name": name, "role": role}
    if email:
        body["email"] = email
    return _post(f"/projects/{project_id}/members", body)


def update_project_member(project_id: str, member_id: str, name: str = None,
                          email: str = None, role: str = None, is_active: bool = None) -> dict:
    body: dict = {}
    if name is not None:
        body["name"] = name
    if email is not None:
        body["email"] = email
    if role is not None:
        body["role"] = role
    if is_active is not None:
        body["isActive"] = is_active
    return _patch(f"/projects/{project_id}/members/{member_id}", body)


def list_project_contacts(project_id: str) -> dict:
    return _get(f"/projects/{project_id}/contacts")


def add_project_contact(project_id: str, name: str, email: str = None,
                        contact_role: str = "STAKEHOLDER", is_primary: bool = False) -> dict:
    return _post(f"/projects/{project_id}/contacts", {
        "name": name, "email": email, "contactRole": contact_role, "isPrimary": is_primary,
    })


def list_project_allocations(project_id: str) -> dict:
    return _get(f"/projects/{project_id}/allocations")


def add_project_allocation(project_id: str, team_member_id: str, start_date: str,
                           end_date: str = None, allocation_percentage: int = 100) -> dict:
    body: dict = {"teamMemberId": team_member_id, "startDate": start_date,
                  "allocationPercentage": allocation_percentage}
    if end_date:
        body["endDate"] = end_date
    return _post(f"/projects/{project_id}/allocations", body)


def get_project_config(project_id: str) -> dict:
    return _get(f"/projects/{project_id}/config")


def update_project_config(project_id: str, default_sprint_duration_days: int = None,
                          github_repo: str = None, github_username: str = None) -> dict:
    body: dict = {}
    if default_sprint_duration_days is not None:
        body["defaultSprintDurationDays"] = default_sprint_duration_days
    if github_repo is not None:
        body["githubRepo"] = github_repo
    if github_username is not None:
        body["githubUsername"] = github_username
    return _patch(f"/projects/{project_id}/config", body)


def get_projects_dashboard() -> dict:
    return _get("/reports/projects")


def get_project_report(project_id: str) -> dict:
    return _get(f"/reports/projects/{project_id}/data")


# ── Financial Years ────────────────────────────────────────────────────────────

def list_financial_years() -> dict:
    return _get("/financial-years")


def get_current_financial_year() -> dict:
    return _get("/financial-years/current")


def create_financial_year(label: str, start_date: str, end_date: str,
                          org_goal: str = None, prev_year_feedback: str = None,
                          is_current: bool = False) -> dict:
    body: dict = {"label": label, "startDate": start_date, "endDate": end_date, "isCurrent": is_current}
    if org_goal:
        body["orgGoal"] = org_goal
    if prev_year_feedback:
        body["prevYearFeedback"] = prev_year_feedback
    return _post("/financial-years", body)


def update_financial_year(fy_id: str, org_goal: str = None,
                          prev_year_feedback: str = None, is_current: bool = None) -> dict:
    body: dict = {}
    if org_goal is not None:
        body["orgGoal"] = org_goal
    if prev_year_feedback is not None:
        body["prevYearFeedback"] = prev_year_feedback
    if is_current is not None:
        body["isCurrent"] = is_current
    return _patch(f"/financial-years/{fy_id}", body)


# ── Sprint Tasks ───────────────────────────────────────────────────────────────

def list_sprint_tasks(sprint_id: str) -> dict:
    return _get(f"/sprints/{sprint_id}/tasks")


def create_sprint_task(sprint_id: str, title: str) -> dict:
    return _post(f"/sprints/{sprint_id}/tasks", {"title": title})


def toggle_sprint_task(sprint_id: str, task_id: str, is_done: bool) -> dict:
    return _patch(f"/sprints/{sprint_id}/tasks/{task_id}", {"isDone": is_done})


def delete_sprint_task(sprint_id: str, task_id: str) -> dict:
    _delete(f"/sprints/{sprint_id}/tasks/{task_id}")
    return {"deleted": True, "task_id": task_id}
