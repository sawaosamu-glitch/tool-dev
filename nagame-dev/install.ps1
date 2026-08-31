# nagame-dev v2.0 インストーラ (Windows)
# 使い方: powershell -ExecutionPolicy Bypass -File install.ps1
$ErrorActionPreference = "Stop"

$SRC = Split-Path -Parent $MyInvocation.MyCommand.Path
$DEST = Join-Path $env:USERPROFILE ".claude\skills\nagame-dev"

if (-not (Test-Path (Join-Path $SRC "SKILL.md"))) {
    Write-Error "SKILL.md が見つかりません"
    exit 1
}

New-Item -ItemType Directory -Force -Path $DEST | Out-Null

Copy-Item (Join-Path $SRC "SKILL.md") -Destination $DEST -Force
if (Test-Path (Join-Path $SRC "README.md")) {
    Copy-Item (Join-Path $SRC "README.md") -Destination $DEST -Force
}

$docsPath = Join-Path $SRC "docs"
if (Test-Path $docsPath) {
    $destDocs = Join-Path $DEST "docs"
    if (Test-Path $destDocs) { Remove-Item $destDocs -Recurse -Force }
    Copy-Item $docsPath -Destination $destDocs -Recurse
    Write-Host "docs/ ディレクトリ（サブファイル31本）をコピーしました"
}

$total = (Get-ChildItem $DEST -Recurse -File).Count
Write-Host "インストール完了: $DEST ($total ファイル)"
Write-Host "Claude Code を再起動して /nagame-dev が使えます"
