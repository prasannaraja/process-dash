from fastapi import APIRouter
from pathlib import Path
from app.settings import settings

router = APIRouter()

@router.get("/health")
def get_health():
    return {"status": "ok"}


@router.get("/health/storage")
def get_storage_info():
    db_path = settings.db_path
    backup_dir = settings.backup_dir

    db_exists = db_path.exists()
    db_size = db_path.stat().st_size if db_exists else 0
    db_modified = db_path.stat().st_mtime if db_exists else None

    return {
        "databasePath": str(db_path),
        "databaseExists": db_exists,
        "databaseSizeBytes": db_size,
        "databaseModifiedAtEpoch": db_modified,
        "backupDir": str(backup_dir),
        "backupDirExists": Path(backup_dir).exists(),
    }
