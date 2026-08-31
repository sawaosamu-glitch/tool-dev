# Dejiina Agent - Project Setup (Windows)
# Usage: cd C:\your\project && ~\dejiina_agent\scripts\setup-project.ps1
#
# Creates .claude/ Junction in your project folder.
# After running, open the project in Claude Code to use all Dejiina skills/agents.

param([string]$ProjectPath)

$ErrorActionPreference = "Stop"

$DEJIINA_DIR = Split-Path -Parent $PSScriptRoot

if ($ProjectPath) {
    if (-not (Test-Path $ProjectPath)) {
        New-Item -ItemType Directory -Path $ProjectPath -Force | Out-Null
    }
    $PROJECT_DIR = (Resolve-Path $ProjectPath).Path
} else {
    $PROJECT_DIR = (Get-Location).Path
}

function Write-Ok   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "  [->] $msg" -ForegroundColor Cyan }

Write-Host ""
Write-Host "=== Dejiina Agent - Project Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Dejiina : $DEJIINA_DIR"
Write-Host "  Project : $PROJECT_DIR"
Write-Host ""

if (-not (Test-Path "$DEJIINA_DIR\.claude")) {
    Write-Host "  [NG] $DEJIINA_DIR\.claude not found." -ForegroundColor Red
    Write-Host "       Run .\scripts\install.ps1 first."
    exit 1
}

# --------------------------------------------------
# git init
# --------------------------------------------------
if (-not (Test-Path "$PROJECT_DIR\.git")) {
    git -C $PROJECT_DIR init -q 2>$null
    Write-Ok "Git initialized"
} else {
    Write-Ok "Git already initialized"
}

# --------------------------------------------------
# .claude/ Junction
# --------------------------------------------------
$CLAUDE_LINK = "$PROJECT_DIR\.claude"

if (Test-Path $CLAUDE_LINK) {
    $item = Get-Item $CLAUDE_LINK -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Write-Ok ".claude\ already linked (skip)"
    } else {
        Write-Warn ".claude\ exists as a regular folder."
        $reply = Read-Host "  Backup and replace with Junction? [y/N]"
        if ($reply -match '^[Yy]$') {
            $backup = "${CLAUDE_LINK}.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
            Move-Item $CLAUDE_LINK $backup
            New-Item -ItemType Junction -Path $CLAUDE_LINK -Target "$DEJIINA_DIR\.claude" | Out-Null
            Write-Ok "Linked .claude\ (backup: $backup)"
        } else {
            Write-Info "Skipped"
        }
    }
} else {
    New-Item -ItemType Junction -Path $CLAUDE_LINK -Target "$DEJIINA_DIR\.claude" | Out-Null
    Write-Ok ".claude\ -> $DEJIINA_DIR\.claude\"
}

# --------------------------------------------------
# .gitignore
# --------------------------------------------------
$GITIGNORE = "$PROJECT_DIR\.gitignore"
$entries   = @(".claude/", ".mcp.json", ".env")

foreach ($entry in $entries) {
    $exists = (Test-Path $GITIGNORE) -and (Select-String -Path $GITIGNORE -Pattern "^$([regex]::Escape($entry))$" -Quiet)
    if (-not $exists) {
        Add-Content -Path $GITIGNORE -Value $entry
    }
}
Write-Ok ".gitignore updated (.claude/ .mcp.json .env)"

# --------------------------------------------------
# Done
# --------------------------------------------------
$SKILL_COUNT = (Get-ChildItem "$DEJIINA_DIR\.claude\skills" -Directory -ErrorAction SilentlyContinue).Count
$AGENT_COUNT = (Get-ChildItem "$DEJIINA_DIR\.claude\agents" -Filter "*.md" -ErrorAction SilentlyContinue).Count

Write-Host ""
Write-Host "  .claude\   -> $DEJIINA_DIR\.claude\"
Write-Host "  Skills     : $SKILL_COUNT"
Write-Host "  Agents     : $AGENT_COUNT"
Write-Host ""
Write-Host "  -> Open this folder in Claude Code to use Dejiina Agent."
Write-Host ""
