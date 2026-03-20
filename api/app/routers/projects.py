from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.db import ensure_default_project, get_session
from app.models import (
    Project,
    ProjectConfiguration,
    ProjectContact,
    TeamAllocation,
    TeamMember,
)


router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None
    allocationStartDate: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    allocationEndDate: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = None
    allocationStartDate: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    allocationEndDate: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    isActive: Optional[bool] = None


class ProjectConfigUpdateRequest(BaseModel):
    defaultSprintDurationDays: Optional[int] = Field(default=None, ge=1, le=60)


class TeamMemberCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: Optional[str] = None
    role: str = Field(default="CONTRIBUTOR")


class TeamMemberUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    email: Optional[str] = None
    role: Optional[str] = None
    isActive: Optional[bool] = None


class ProjectContactCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: Optional[str] = None
    contactRole: str = Field(default="STAKEHOLDER")
    isPrimary: bool = False


class TeamAllocationCreateRequest(BaseModel):
    teamMemberId: str
    startDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    endDate: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    allocationPercentage: int = Field(default=100, ge=1, le=100)


def _parse_iso_date(value: Optional[str]) -> Optional[date]:
    if value is None:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD") from exc


def _project_dict(project: Project):
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "allocationStartDate": project.allocation_start_date.isoformat() if project.allocation_start_date else None,
        "allocationEndDate": project.allocation_end_date.isoformat() if project.allocation_end_date else None,
        "isActive": project.is_active,
    }


def _assert_project_exists(session: Session, project_id: str) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("")
def list_projects(session: Session = Depends(get_session)):
    ensure_default_project(session)
    projects = session.exec(select(Project).order_by(Project.created_at.desc())).all()
    return {"items": [_project_dict(p) for p in projects]}


@router.post("")
def create_project(req: ProjectCreateRequest, session: Session = Depends(get_session)):
    start_date = _parse_iso_date(req.allocationStartDate)
    end_date = _parse_iso_date(req.allocationEndDate)
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Allocation start date cannot be after end date")

    project = Project(
        name=req.name.strip(),
        description=req.description,
        allocation_start_date=start_date,
        allocation_end_date=end_date,
    )
    session.add(project)
    session.commit()
    session.refresh(project)

    config = ProjectConfiguration(project_id=project.id)
    session.add(config)
    session.commit()

    return _project_dict(project)


@router.get("/{project_id}")
def get_project(project_id: str, session: Session = Depends(get_session)):
    project = _assert_project_exists(session, project_id)
    return _project_dict(project)


@router.patch("/{project_id}")
def update_project(project_id: str, req: ProjectUpdateRequest, session: Session = Depends(get_session)):
    project = _assert_project_exists(session, project_id)

    if req.name is not None:
        project.name = req.name.strip()
    if req.description is not None:
        project.description = req.description
    if req.allocationStartDate is not None:
        project.allocation_start_date = _parse_iso_date(req.allocationStartDate)
    if req.allocationEndDate is not None:
        project.allocation_end_date = _parse_iso_date(req.allocationEndDate)
    if project.allocation_start_date and project.allocation_end_date and project.allocation_start_date > project.allocation_end_date:
        raise HTTPException(status_code=400, detail="Allocation start date cannot be after end date")
    if req.isActive is not None:
        project.is_active = req.isActive

    project.updated_at = datetime.now(timezone.utc)
    session.add(project)
    session.commit()
    session.refresh(project)
    return _project_dict(project)


@router.get("/{project_id}/config")
def get_project_config(project_id: str, session: Session = Depends(get_session)):
    _assert_project_exists(session, project_id)
    config = session.exec(select(ProjectConfiguration).where(ProjectConfiguration.project_id == project_id)).first()
    if not config:
        config = ProjectConfiguration(project_id=project_id)
        session.add(config)
        session.commit()
        session.refresh(config)
    return {
        "id": config.id,
        "projectId": config.project_id,
        "defaultSprintDurationDays": config.default_sprint_duration_days,
    }


@router.patch("/{project_id}/config")
def update_project_config(project_id: str, req: ProjectConfigUpdateRequest, session: Session = Depends(get_session)):
    _assert_project_exists(session, project_id)
    config = session.exec(select(ProjectConfiguration).where(ProjectConfiguration.project_id == project_id)).first()
    if not config:
        config = ProjectConfiguration(project_id=project_id)

    if req.defaultSprintDurationDays is not None:
        config.default_sprint_duration_days = req.defaultSprintDurationDays

    config.updated_at = datetime.now(timezone.utc)
    session.add(config)
    session.commit()
    session.refresh(config)
    return {
        "id": config.id,
        "projectId": config.project_id,
        "defaultSprintDurationDays": config.default_sprint_duration_days,
    }


@router.get("/{project_id}/members")
def list_members(project_id: str, session: Session = Depends(get_session)):
    _assert_project_exists(session, project_id)
    members = session.exec(
        select(TeamMember)
        .where(TeamMember.project_id == project_id)
        .order_by(TeamMember.created_at.desc())
    ).all()
    return {
        "items": [
            {
                "id": m.id,
                "projectId": m.project_id,
                "name": m.name,
                "email": m.email,
                "role": m.role,
                "isActive": m.is_active,
            }
            for m in members
        ]
    }


@router.post("/{project_id}/members")
def create_member(project_id: str, req: TeamMemberCreateRequest, session: Session = Depends(get_session)):
    _assert_project_exists(session, project_id)
    member = TeamMember(project_id=project_id, name=req.name.strip(), email=req.email, role=req.role)
    session.add(member)
    session.commit()
    session.refresh(member)
    return {
        "id": member.id,
        "projectId": member.project_id,
        "name": member.name,
        "email": member.email,
        "role": member.role,
        "isActive": member.is_active,
    }


@router.patch("/{project_id}/members/{member_id}")
def update_member(project_id: str, member_id: str, req: TeamMemberUpdateRequest, session: Session = Depends(get_session)):
    _assert_project_exists(session, project_id)
    member = session.get(TeamMember, member_id)
    if not member or member.project_id != project_id:
        raise HTTPException(status_code=404, detail="Team member not found")

    if req.name is not None:
        member.name = req.name.strip()
    if req.email is not None:
        member.email = req.email
    if req.role is not None:
        member.role = req.role
    if req.isActive is not None:
        member.is_active = req.isActive
    member.updated_at = datetime.now(timezone.utc)

    session.add(member)
    session.commit()
    session.refresh(member)
    return {
        "id": member.id,
        "projectId": member.project_id,
        "name": member.name,
        "email": member.email,
        "role": member.role,
        "isActive": member.is_active,
    }


@router.get("/{project_id}/contacts")
def list_contacts(project_id: str, session: Session = Depends(get_session)):
    _assert_project_exists(session, project_id)
    contacts = session.exec(
        select(ProjectContact)
        .where(ProjectContact.project_id == project_id)
        .order_by(ProjectContact.created_at.desc())
    ).all()
    return {
        "items": [
            {
                "id": c.id,
                "projectId": c.project_id,
                "name": c.name,
                "email": c.email,
                "contactRole": c.contact_role,
                "isPrimary": c.is_primary,
            }
            for c in contacts
        ]
    }


@router.post("/{project_id}/contacts")
def create_contact(project_id: str, req: ProjectContactCreateRequest, session: Session = Depends(get_session)):
    _assert_project_exists(session, project_id)
    contact = ProjectContact(
        project_id=project_id,
        name=req.name.strip(),
        email=req.email,
        contact_role=req.contactRole,
        is_primary=req.isPrimary,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return {
        "id": contact.id,
        "projectId": contact.project_id,
        "name": contact.name,
        "email": contact.email,
        "contactRole": contact.contact_role,
        "isPrimary": contact.is_primary,
    }


@router.get("/{project_id}/allocations")
def list_allocations(project_id: str, session: Session = Depends(get_session)):
    _assert_project_exists(session, project_id)
    allocations = session.exec(
        select(TeamAllocation)
        .where(TeamAllocation.project_id == project_id)
        .order_by(TeamAllocation.start_date.desc())
    ).all()
    return {
        "items": [
            {
                "id": a.id,
                "projectId": a.project_id,
                "teamMemberId": a.team_member_id,
                "startDate": a.start_date.isoformat(),
                "endDate": a.end_date.isoformat() if a.end_date else None,
                "allocationPercentage": a.allocation_percentage,
            }
            for a in allocations
        ]
    }


@router.post("/{project_id}/allocations")
def create_allocation(project_id: str, req: TeamAllocationCreateRequest, session: Session = Depends(get_session)):
    _assert_project_exists(session, project_id)

    member = session.get(TeamMember, req.teamMemberId)
    if not member or member.project_id != project_id:
        raise HTTPException(status_code=404, detail="Team member not found")

    start_date = _parse_iso_date(req.startDate)
    end_date = _parse_iso_date(req.endDate)
    if end_date and start_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Allocation start date cannot be after end date")

    existing = session.exec(
        select(TeamAllocation)
        .where(TeamAllocation.project_id == project_id)
        .where(TeamAllocation.team_member_id == req.teamMemberId)
    ).all()

    for alloc in existing:
        alloc_start = alloc.start_date
        alloc_end = alloc.end_date or date.max
        req_end = end_date or date.max
        if not (req_end < alloc_start or start_date > alloc_end):
            raise HTTPException(status_code=409, detail="Allocation range overlaps with existing allocation")

    allocation = TeamAllocation(
        project_id=project_id,
        team_member_id=req.teamMemberId,
        start_date=start_date,
        end_date=end_date,
        allocation_percentage=req.allocationPercentage,
    )
    session.add(allocation)
    session.commit()
    session.refresh(allocation)

    return {
        "id": allocation.id,
        "projectId": allocation.project_id,
        "teamMemberId": allocation.team_member_id,
        "startDate": allocation.start_date.isoformat(),
        "endDate": allocation.end_date.isoformat() if allocation.end_date else None,
        "allocationPercentage": allocation.allocation_percentage,
    }
