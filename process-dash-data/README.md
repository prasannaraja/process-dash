# process-dash-data

Persistent storage directory for Process Dash. Contains the live SQLite database file used by `process-dash-core-api`.

## Contents

| File | Description |
|---|---|
| `workobs.sqlite` | Active SQLite database — all work observability events |

## Usage

This directory is mounted into the backend container at `/data` by Docker Compose:

```yaml
volumes:
  - ./process-dash-data:/data
```

`process-dash-core-api` is configured to read and write to `/data/workobs.sqlite` inside the container via the `WORKOBS_DB_PATH=/data/workobs.sqlite` environment variable.

When running without Docker, the API defaults to an OS-specific location (see `process-dash-core-api/README.md`). You can point it here instead:

```bash
export WORKOBS_DB_PATH=/path/to/process-dash/process-dash-data/workobs.sqlite
```

## Backups

Backup copies are not stored here. A separate `process-dash-backups/` directory (sibling to this one) is used for timestamped SQLite snapshots. See `process-dash-docs/backup-restore.md` for the backup and restore workflow.

## Notes

- `workobs.sqlite` is excluded from git via `.gitignore` — do not commit the live database.
- The directory itself is tracked so the mount point exists when the repo is cloned.
