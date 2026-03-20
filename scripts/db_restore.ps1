param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$DbPath = $env:WORKOBS_DB_PATH,
    [switch]$Force
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $DbPath) {
    $DbPath = Join-Path $repoRoot "data\workobs.sqlite"
}

$DbPath = [System.IO.Path]::GetFullPath($DbPath)
$BackupFile = [System.IO.Path]::GetFullPath($BackupFile)

if (-not (Test-Path -Path $BackupFile -PathType Leaf)) {
    throw "Backup file not found: $BackupFile"
}

if ((Test-Path $DbPath) -and (-not $Force)) {
    throw "Target DB already exists at '$DbPath'. Re-run with -Force to overwrite."
}

New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($DbPath)) -Force | Out-Null
Copy-Item -Path $BackupFile -Destination $DbPath -Force

Write-Host "Restore completed"
Write-Host "Backup:  $BackupFile"
Write-Host "Target:  $DbPath"
Write-Host "Note: Stop running app containers/processes before restore for best consistency."
