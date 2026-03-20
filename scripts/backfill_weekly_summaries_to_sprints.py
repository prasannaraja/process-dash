import json
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Ensure `app` package is importable when script is run from repository root.
API_ROOT = Path(__file__).resolve().parents[1] / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from sqlmodel import Session, select

from app.db import engine
from app.models import EventLog, SprintDefinition


def parse_year_week(year_week: str):
    year, week = year_week.split("-W")
    start = datetime.strptime(f"{int(year)}-W{int(week)}-1", "%Y-W%W-%w").date()
    end = start + timedelta(days=6)
    return start, end


def ensure_sprint_for_year_week(session: Session, year_week: str) -> SprintDefinition:
    start, end = parse_year_week(year_week)

    existing = session.exec(
        select(SprintDefinition)
        .where(SprintDefinition.start_date == start)
        .where(SprintDefinition.end_date == end)
    ).first()
    if existing:
        return existing

    sprint = SprintDefinition(
        name=f"Legacy {year_week}",
        start_date=start,
        end_date=end,
        duration_days=7,
    )
    session.add(sprint)
    session.commit()
    session.refresh(sprint)
    return sprint


def has_sprint_summary(session: Session, sprint_id: str) -> bool:
    evt = session.exec(
        select(EventLog)
        .where(EventLog.type == "sprint_summary_saved")
        .where(EventLog.payload.contains(f'"sprintId": "{sprint_id}"'))
    ).first()
    return evt is not None


def main():
    with Session(engine) as session:
        weekly_events = session.exec(
            select(EventLog)
            .where(EventLog.type == "weekly_summary_saved")
            .order_by(EventLog.ts.asc())
        ).all()

        created_sprints = 0
        created_summaries = 0

        for evt in weekly_events:
            payload = json.loads(evt.payload)
            year_week = payload.get("yearWeek")
            if not year_week:
                continue

            existed_before = session.exec(
                select(SprintDefinition)
                .where(SprintDefinition.start_date == parse_year_week(year_week)[0])
                .where(SprintDefinition.end_date == parse_year_week(year_week)[1])
            ).first()
            sprint = ensure_sprint_for_year_week(session, year_week)
            if not existed_before:
                created_sprints += 1

            if has_sprint_summary(session, sprint.id):
                continue

            new_payload = {
                "sprintId": sprint.id,
                "topFragmenters": payload.get("topFragmenters", []),
                "notPerformanceIssues": payload.get("notPerformanceIssues", []),
                "oneChangeNextWeek": payload.get("oneChangeNextWeek", ""),
                "migratedFrom": "weekly_summary_saved",
                "legacyYearWeek": year_week,
            }

            migrated = EventLog(type="sprint_summary_saved", payload=json.dumps(new_payload), ts=evt.ts)
            session.add(migrated)
            session.commit()
            created_summaries += 1

        print(f"Processed weekly summaries: {len(weekly_events)}")
        print(f"Created sprint definitions: {created_sprints}")
        print(f"Created sprint summaries: {created_summaries}")


if __name__ == "__main__":
    main()
