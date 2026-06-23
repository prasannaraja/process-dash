from __future__ import annotations
import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Work Observability"
    WORKOBS_DB_PATH: str | None = None
    WORKOBS_BACKUP_DIR: str | None = None
    WORKOBS_DB_STRICT_PATH: bool = False

    def _default_db_path(self) -> Path:
        # OS-specific defaults
        home = Path.home()
        if sys.platform == "darwin":
            base = home / "Library/Application Support/work-observability"
        elif sys.platform == "win32":
            base = Path(os.environ["APPDATA"]) / "work-observability"
        else:
            base = home / ".local/share/work-observability"
        return base / "workobs.sqlite"

    def _resolve_path(self, path_value: str | Path) -> Path:
        path = Path(path_value).expanduser()
        if not path.is_absolute():
            path = path.resolve()
        return path

    def _validate_parent_dir(self, path: Path, label: str) -> None:
        parent = path.parent
        if self.WORKOBS_DB_STRICT_PATH and not parent.exists():
            raise RuntimeError(f"{label} parent directory does not exist: {parent}")
        parent.mkdir(parents=True, exist_ok=True)
        if not os.access(parent, os.W_OK):
            raise RuntimeError(f"{label} parent directory is not writable: {parent}")
    
    @property
    def db_path(self) -> Path:
        if self.WORKOBS_DB_PATH:
            path = self._resolve_path(self.WORKOBS_DB_PATH)
        else:
            path = self._default_db_path().resolve()

        self._validate_parent_dir(path, "WORKOBS_DB_PATH")
        return path

    @property
    def backup_dir(self) -> Path:
        if self.WORKOBS_BACKUP_DIR:
            path = self._resolve_path(self.WORKOBS_BACKUP_DIR)
        else:
            path = self.db_path.parent / "backups"

        if self.WORKOBS_DB_STRICT_PATH and not path.exists():
            raise RuntimeError(f"WORKOBS_BACKUP_DIR does not exist: {path}")
        path.mkdir(parents=True, exist_ok=True)
        if not os.access(path, os.W_OK):
            raise RuntimeError(f"WORKOBS_BACKUP_DIR is not writable: {path}")
        return path

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.db_path}"

settings = Settings()
