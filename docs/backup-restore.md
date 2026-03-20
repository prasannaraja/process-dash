# Backup and Restore Runbook

This runbook uses file-copy backups for the SQLite database.

## Paths

- Active DB path is controlled by `WORKOBS_DB_PATH`.
- Backup directory is controlled by `WORKOBS_BACKUP_DIR`.
- Check effective runtime values at:

```bash
GET /api/health/storage
```

Docker default values:
- DB: `/data/workobs.sqlite` (host: `./data/workobs.sqlite`)
- Backups: `/backups` (host: `./backups`)

## Create Backup

PowerShell:

```powershell
.\scripts\db_backup.ps1
```

Optional overrides:

```powershell
.\scripts\db_backup.ps1 -DbPath ".\data\workobs.sqlite" -BackupDir ".\backups" -NamePrefix "manual"
```

## Restore Backup

Recommended order:
1. Stop app processes/containers.
2. Restore selected backup file.
3. Start app.
4. Verify via `/api/health` and key API calls.

PowerShell:

```powershell
.\scripts\db_restore.ps1 -BackupFile ".\backups\workobs-20260309-120000.sqlite" -Force
```

## Docker Example

```powershell
& 'C:\Program Files\Docker\Docker\resources\bin\docker.EXE' compose -f 'docker-compose.yml' down
.\scripts\db_restore.ps1 -BackupFile ".\backups\workobs-20260309-120000.sqlite" -Force
& 'C:\Program Files\Docker\Docker\resources\bin\docker.EXE' compose -f 'docker-compose.yml' up -d --build
```

## Troubleshooting

- `Database file not found`:
  - Confirm `WORKOBS_DB_PATH` and mounted host path.
  - Check `GET /api/health/storage` for effective paths.

- `Backup file not found`:
  - Use an absolute path or run from repository root.
  - List `./backups` and ensure filename exists.

- `Target DB already exists` on restore:
  - Re-run with `-Force` to overwrite.

- API returns `500` after restore:
  - Ensure you restored while app was stopped.
  - Restart Docker stack.
  - Check backend logs for schema mismatch messages.

- Permission denied on copy:
  - Verify write access to configured backup directory.
  - On Docker, ensure host folder permissions allow writes.
