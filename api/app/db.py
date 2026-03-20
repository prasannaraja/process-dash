import logging

from sqlmodel import create_engine, Session, SQLModel
from sqlmodel import select
from sqlalchemy import text
from app.settings import settings

logger = logging.getLogger("uvicorn.error")

engine = create_engine(settings.database_url, echo=False)

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    logger.info("Storage config: database=%s", settings.db_path)
    logger.info("Storage config: backups=%s", settings.backup_dir)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        ensure_sqlite_compat_schema(session)
        ensure_default_project(session)


def ensure_sqlite_compat_schema(session: Session):
    # Existing local/docker SQLite files may predate new columns.
    # Add missing columns/indexes in-place to avoid 500s on startup.
    if not str(settings.database_url).startswith("sqlite"):
        return

    _ensure_column(session, "event_log", "project_id", "VARCHAR")
    _ensure_index(session, "ix_event_log_project_id", "event_log", "project_id")

    _ensure_column(session, "sprint_definitions", "project_id", "VARCHAR")
    _ensure_index(session, "ix_sprint_definitions_project_id", "sprint_definitions", "project_id")

    session.commit()


def _ensure_column(session: Session, table_name: str, column_name: str, column_type: str):
    rows = session.exec(text(f"PRAGMA table_info({table_name})")).all()
    existing_columns = {row[1] for row in rows}
    if column_name in existing_columns:
        return
    session.exec(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))


def _ensure_index(session: Session, index_name: str, table_name: str, column_name: str):
    session.exec(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name}({column_name})"))


def ensure_default_project(session: Session):
    from app.models import Project, ProjectConfiguration

    existing = session.exec(
        select(Project).where(Project.is_active == True)  # noqa: E712
    ).first()
    if existing:
        return existing

    project = Project(name="Default Project", description="Initial project")
    session.add(project)
    session.commit()
    session.refresh(project)

    config = ProjectConfiguration(project_id=project.id)
    session.add(config)
    session.commit()
    return project
