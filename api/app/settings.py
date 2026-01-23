import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Work Observability"
    WORKOBS_DB_PATH: str | None = None
    
    @property
    def db_path(self) -> Path:
        if self.WORKOBS_DB_PATH:
            return Path(self.WORKOBS_DB_PATH)
        
        # OS-specific defaults
        home = Path.home()
        if sys.platform == "darwin":
            base = home / "Library/Application Support/work-observability"
        elif sys.platform == "win32":
            base = Path(os.environ["APPDATA"]) / "work-observability"
        else:
            base = home / ".local/share/work-observability"
            
        base.mkdir(parents=True, exist_ok=True)
        return base / "workobs.sqlite"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.db_path}"

settings = Settings()
