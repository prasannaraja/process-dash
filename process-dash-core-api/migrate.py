"""
Smart migration runner for process-dash-core-api.

Handles three cases:
  1. Fresh database (no file yet)      — create_all() + alembic upgrade head
  2. Pre-Alembic database (no version) — create_all() + stamp head (tables already exist)
  3. Managed database (version exists) — alembic upgrade head (applies any pending migrations)

Called by start.sh before uvicorn starts.
"""
import subprocess
import sys

from sqlalchemy import inspect, text
from sqlmodel import SQLModel, create_engine

# ── Bootstrap path so app modules are importable ───────────────────────────────
sys.path.insert(0, "/code")

from app.models import (  # noqa: E402, F401 — import all models to register metadata
    EventLog,
    Project,
    ProjectConfiguration,
    ProjectContact,
    SprintDefinition,
    TeamAllocation,
    TeamMember,
    UserStory,
)
from app.settings import settings  # noqa: E402

# ── Create engine ──────────────────────────────────────────────────────────────
engine = create_engine(settings.database_url, echo=False)


def run(cmd: list[str]) -> int:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    return result.returncode


def main() -> int:
    print(f"[migrate] Database: {settings.db_path}")

    # Step 1 — ensure every table defined in the models exists.
    # create_all() is idempotent: it skips tables that already exist.
    # This handles both fresh installs and pre-Alembic databases.
    print("[migrate] Running create_all() to ensure tables exist...")
    SQLModel.metadata.create_all(engine)

    # Step 2 — check whether Alembic has ever been run against this database.
    insp = inspect(engine)
    has_version_table = "alembic_version" in insp.get_table_names()

    if not has_version_table:
        # The database was created outside of Alembic (e.g. via create_all).
        # All tables already exist, so stamp at the current head so Alembic
        # knows we're up to date without trying to recreate anything.
        print("[migrate] No alembic_version table found — stamping at head...")
        code = run(["python", "-m", "alembic", "stamp", "head"])
        if code != 0:
            print("[migrate] ERROR: alembic stamp failed.", file=sys.stderr)
            return code
        print("[migrate] Stamp OK.")
    else:
        # Step 3 — apply any migrations that haven't been run yet.
        # Safe to call every startup: Alembic skips already-applied revisions.
        print("[migrate] Running alembic upgrade head...")
        code = run(["python", "-m", "alembic", "upgrade", "head"])
        if code != 0:
            print("[migrate] ERROR: alembic upgrade head failed.", file=sys.stderr)
            return code
        print("[migrate] Migrations OK.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
