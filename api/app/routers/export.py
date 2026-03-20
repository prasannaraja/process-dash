from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlmodel import Session
from app.db import get_session
from app.services.export_md import export_day_to_md

router = APIRouter(prefix="/export", tags=["export"])

@router.post("/day/{date_str}")
def export_day(date_str: str, session: Session = Depends(get_session)):
    path = export_day_to_md(session, date_str)
    return FileResponse(path, filename=f"daily-{date_str}.md", media_type="text/markdown")

@router.post("/sprint/{sprint_id}")
def export_sprint(sprint_id: str, session: Session = Depends(get_session)):
    # Placeholder for sprint export
    return {"path": "Not implemented yet"}
