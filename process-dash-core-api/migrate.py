"""
Smart migration runner for process-dash-core-api.

Handles three cases:
  1. Fresh database (no file yet)      — create_all() + stamp head (tables created by create_all)
  2. Pre-Alembic database (no version) — create_all() + stamp head (tables already exist)
  3. Managed database (version exists) — alembic upgrade head (applies any pending migrations)

Called by start.sh before uvicorn starts.
"""
import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import inspect
from sqlmodel import SQLModel, create_engine

# ── Bootstrap: ensure /code is on the path regardless of cwd ──────────────────
CODE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CODE_DIR))

from app.models import (  # noqa: E402, F401 — import ALL models to register metadata
    EventLog,
    FinancialYear,
    Project,
    ProjectConfiguration,
    ProjectContact,
    SprintDefinition,
    SprintTask,
    TeamAllocation,
    TeamMember,
    UserStory,
)
from app.settings import settings  # noqa: E402


# ── Ensure the data directory exists before touching the DB ───────────────────
def ensure_data_dir() -> None:
    db_path = Path(str(settings.db_path))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    print(f"[migrate] Data directory ready: {db_path.parent}")


# ── Create engine ──────────────────────────────────────────────────────────────
def make_engine():
    return create_engine(settings.database_url, echo=False)


def run(cmd: list[str]) -> int:
    """Run a subprocess with CODE_DIR as cwd so alembic always finds alembic.ini."""
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(CODE_DIR))
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    return result.returncode


def main() -> int:
    print(f"[migrate] Database: {settings.db_path}")

    # Step 0 — guarantee the data directory exists (critical for Docker volumes)
    ensure_data_dir()

    engine = make_engine()

    # Step 1 — create_all() is idempotent: creates any table that doesn't exist yet.
    # This covers both fresh installs and pre-Alembic databases. All models must be
    # imported above so their metadata is registered before this call.
    print("[migrate] Running create_all() to ensure all tables exist...")
    SQLModel.metadata.create_all(engine)
    print("[migrate] create_all() done.")

    # Step 2 — check whether Alembic has ever been run against this database.
    insp = inspect(engine)
    has_version_table = "alembic_version" in insp.get_table_names()

    if not has_version_table:
        # Fresh install or pre-Alembic DB — tables already exist via create_all().
        # Stamp at head so Alembic knows it's current without re-running migrations.
        print("[migrate] No alembic_version found — stamping at head...")
        code = run(["python", "-m", "alembic", "stamp", "head"])
        if code != 0:
            print("[migrate] ERROR: alembic stamp failed.", file=sys.stderr)
            return code
        print("[migrate] Stamp OK.")
    else:
        # Existing managed DB — apply any pending migrations.
        # Safe every startup: Alembic skips already-applied revisions.
        print("[migrate] Running alembic upgrade head...")
        code = run(["python", "-m", "alembic", "upgrade", "head"])
        if code != 0:
            print("[migrate] ERROR: alembic upgrade head failed.", file=sys.stderr)
            return code
        print("[migrate] Migrations OK.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
