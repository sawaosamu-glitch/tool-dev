# Dejiina Agent - Install Script (Windows)
# Usage: cd ~/dejiina_agent && .\scripts\install.ps1
#
# Skills : Junction link (auto-updated by git pull)
# Agents : Copy (re-run install.ps1 to update)

$ErrorActionPreference = "Stop"

$DEJIINA_DIR = Split-Path -Parent $PSScriptRoot
$CLAUDE_DIR  = "$HOME\.claude"

function Write-Ok   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "  [->] $msg" -ForegroundColor Cyan }

Write-Host ""
Write-Host "=== Dejiina Agent - Install (Windows) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Install to: $CLAUDE_DIR"
Write-Host ""

# --------------------------------------------------
# Skills (Junction link)
# --------------------------------------------------
Write-Host "--- Skills ---" -ForegroundColor White
Write-Host ""

$TARGET_SKILLS = "$CLAUDE_DIR\skills"
$SOURCE_SKILLS = "$DEJIINA_DIR\.claude\skills"

if (-not (Test-Path $TARGET_SKILLS)) {
    New-Item -ItemType Directory -Path $TARGET_SKILLS -Force | Out-Null
    Write-Ok "Created ~/.claude/skills/"
}

$SKILL_INSTALLED = 0
$SKILL_SKIPPED   = 0

Get-ChildItem -Path $SOURCE_SKILLS -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $skillDir  = $_.FullName
    $skillName = $_.Name
    $target    = "$TARGET_SKILLS\$skillName"

    if (-not (Test-Path "$skillDir\SKILL.md")) { return }

    if ((Test-Path $target) -and (-not ((Get-Item $target).Attributes -band [IO.FileAttributes]::ReparsePoint))) {
        Remove-Item $target -Recurse -Force
    }

    if (-not (Test-Path $target)) {
        New-Item -ItemType Junction -Path $target -Target $skillDir | Out-Null
        $SKILL_INSTALLED++
    } else {
        $SKILL_SKIPPED++
    }
}

$SKILL_TOTAL = (Get-ChildItem $TARGET_SKILLS -Directory -ErrorAction SilentlyContinue).Count
Write-Ok "Skills done -- new: ${SKILL_INSTALLED} / skip: ${SKILL_SKIPPED} / total: ${SKILL_TOTAL}"
Write-Info "Junction links: skills auto-update after git pull"

Write-Host ""

# --------------------------------------------------
# Agents (Copy)
# --------------------------------------------------
Write-Host "--- Agents ---" -ForegroundColor White
Write-Host ""

$TARGET_AGENTS = "$CLAUDE_DIR\agents"
$SOURCE_AGENTS = "$DEJIINA_DIR\.claude\agents"

if (-not (Test-Path $TARGET_AGENTS)) {
    New-Item -ItemType Directory -Path $TARGET_AGENTS -Force | Out-Null
    Write-Ok "Created ~/.claude/agents/"
}

$AGENT_INSTALLED = 0
$AGENT_SKIPPED   = 0

Get-ChildItem -Path $SOURCE_AGENTS -Filter "*.md" -ErrorAction SilentlyContinue | ForEach-Object {
    $target = "$TARGET_AGENTS\$($_.Name)"
    if (-not (Test-Path $target)) {
        Copy-Item $_.FullName -Destination $target
        $AGENT_INSTALLED++
    } else {
        $AGENT_SKIPPED++
    }
}

$AGENT_TOTAL = (Get-ChildItem $TARGET_AGENTS -Filter "*.md" -ErrorAction SilentlyContinue).Count
Write-Ok "Agents done -- new: ${AGENT_INSTALLED} / skip: ${AGENT_SKIPPED} / total: ${AGENT_TOTAL}"
Write-Info "Agents are copied. Re-run install.ps1 after git pull to update."

Write-Host ""

# --------------------------------------------------
# CLAUDE.md (Append)
# --------------------------------------------------
Write-Host "--- CLAUDE.md ---" -ForegroundColor White
Write-Host ""

$MARKER     = "# Dejiina Agent"
$SRC_CLAUDE = "$DEJIINA_DIR\.claude\CLAUDE.md"
$DST_CLAUDE = "$CLAUDE_DIR\CLAUDE.md"

if (Test-Path $SRC_CLAUDE) {
    if (Test-Path $DST_CLAUDE) {
        $existing = [System.IO.File]::ReadAllText($DST_CLAUDE)
        if ($existing.Contains($MARKER)) {
            Write-Info "CLAUDE.md: Dejiina section already exists (skip)"
        } else {
            $append = "`n`n" + [System.IO.File]::ReadAllText($SRC_CLAUDE)
            [System.IO.File]::AppendAllText($DST_CLAUDE, $append)
            Write-Ok "Appended Dejiina section to CLAUDE.md"
        }
    } else {
        Copy-Item $SRC_CLAUDE $DST_CLAUDE
        Write-Ok "Created CLAUDE.md"
    }
}

# --------------------------------------------------
# Done
# --------------------------------------------------
Write-Host ""
Write-Host "=== Install Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Skills : $SKILL_TOTAL (Junction -- auto-update with git pull)"
Write-Host "  Agents : $AGENT_TOTAL"
Write-Host ""
Write-Host "  -> Restart Claude Code to activate."
Write-Host ""
Write-Host "  Update:"
Write-Host "    git pull                  # skills auto-reflect"
Write-Host "    .\scripts\install.ps1     # only needed to update agents"
Write-Host ""
