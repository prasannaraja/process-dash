param(
    [string]$DbPath = $env:WORKOBS_DB_PATH,
    [string]$BackupDir = $env:WORKOBS_BACKUP_DIR,
    [string]$NamePrefix = "workobs"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $DbPath) {
    $DbPath = Join-Path $repoRoot "data\workobs.sqlite"
}
if (-not $BackupDir) {
    $BackupDir = Join-Path $repoRoot "backups"
}

$DbPath = [System.IO.Path]::GetFullPath($DbPath)
$BackupDir = [System.IO.Path]::GetFullPath($BackupDir)

if (-not (Test-Path -Path $DbPath -PathType Leaf)) {
    throw "Database file not found: $DbPath"
}

New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $BackupDir ("{0}-{1}.sqlite" -f $NamePrefix, $timestamp)

Copy-Item -Path $DbPath -Destination $backupFile -Force

Write-Host "Backup created"
Write-Host "Source:      $DbPath"
Write-Host "Destination: $backupFile"
