from datetime import date, datetime, timezone
import uuid
from sqlmodel import Field, SQLModel
from typing import Optional


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    allocation_start_date: Optional[date] = None
    allocation_end_date: Optional[date] = None
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectConfiguration(SQLModel, table=True):
    __tablename__ = "project_configurations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="projects.id", index=True)
    default_sprint_duration_days: int = Field(default=14)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TeamMember(SQLModel, table=True):
    __tablename__ = "team_members"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="projects.id", index=True)
    name: str
    email: Optional[str] = None
    role: str = Field(default="CONTRIBUTOR")
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectContact(SQLModel, table=True):
    __tablename__ = "project_contacts"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="projects.id", index=True)
    name: str
    email: Optional[str] = None
    contact_role: str = Field(default="STAKEHOLDER")
    is_primary: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TeamAllocation(SQLModel, table=True):
    __tablename__ = "team_allocations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="projects.id", index=True)
    team_member_id: str = Field(foreign_key="team_members.id", index=True)
    start_date: date
    end_date: Optional[date] = None
    allocation_percentage: int = Field(default=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventLog(SQLModel, table=True):
    __tablename__ = "event_log"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="projects.id", index=True)
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    type: str = Field(index=True)
    payload: str  # JSON stored as string
    
    class Config:
        arbitrary_types_allowed = True


class SprintDefinition(SQLModel, table=True):
    __tablename__ = "sprint_definitions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="projects.id", index=True)
    name: str
    start_date: date = Field(index=True)
    end_date: date = Field(index=True)
    duration_days: int
    is_archived: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
