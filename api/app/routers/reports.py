from fastapi import APIRouter, Depends
from sqlmodel import Session
from typing import List, Dict, Any
from app.db import get_session
from app.services.rollups import get_day_rollup, get_projects_dashboard, get_project_data

router = APIRouter(tags=["reports"])

@router.get("/days/{date_str}")
def get_day_view(date_str: str, session: Session = Depends(get_session)):
    return get_day_rollup(session, date_str)

@router.get("/reports/projects")
def get_projects_dashboard_view(session: Session = Depends(get_session)):
    return {"items": get_projects_dashboard(session)}

@router.get("/reports/projects/{project_id}/data")
def get_project_data_view(project_id: str, session: Session = Depends(get_session)):
    return get_project_data(session, project_id)
