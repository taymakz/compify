# build-installer.ps1
# Builds Compify + bundles it into CompifySetup.exe
#
# Usage:  .\build-installer.ps1
#
# Output: dist\CompifySetup.exe  (single self-contained installer)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Step($msg) { Write-Host "`n  $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }
function Die($msg)  { Write-Host "`n  FAIL  $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  Compify — Build Installer" -ForegroundColor White
Write-Host "  ===========================" -ForegroundColor DarkGray

# ── Locate cargo target directory ─────────────────────────────────────────────
Step "Locating cargo target directory..."
Set-Location $Root

if ($env:CARGO_TARGET_DIR) {
    $CargoTarget = $env:CARGO_TARGET_DIR
} else {
    try {
        $metaJson = & cargo metadata --no-deps --format-version 1 2>$null
        $meta = $metaJson | ConvertFrom-Json
        $CargoTarget = $meta.target_directory
    } catch {}
}

if (-not $CargoTarget) {
    $CargoTarget = Join-Path $Root "target"
}
OK "Target: $CargoTarget"

# ── Step 1: Build main app ────────────────────────────────────────────────────
Step "[1/3] Building main app (no bundle)..."
Set-Location $Root
& pnpm tauri build --no-bundle
if ($LASTEXITCODE -ne 0) { Die "Main app build failed (exit $LASTEXITCODE)" }

$MainExe = Join-Path $CargoTarget "release\tauri-starter.exe"
if (-not (Test-Path $MainExe)) { Die "Main exe not found at: $MainExe" }
$MainSizeMB = [math]::Round((Get-Item $MainExe).Length / 1MB, 1)
OK "Main app built — $MainSizeMB MB"

# ── Step 2: Copy exe and assets into installer ────────────────────────────────
Step "[2/3] Embedding main app into installer..."
$InstallerRes = Join-Path $Root "installer\src-tauri\resources"
New-Item -ItemType Directory -Force $InstallerRes | Out-Null
Copy-Item $MainExe (Join-Path $InstallerRes "Compify.exe") -Force
OK "Copied Compify.exe -> installer/src-tauri/resources/"

$InstallerAssets = Join-Path $Root "installer\src\assets"
New-Item -ItemType Directory -Force $InstallerAssets | Out-Null
$LogoSrc = Join-Path $Root "src\assets\logo-128.png"
if (Test-Path $LogoSrc) {
    Copy-Item $LogoSrc (Join-Path $InstallerAssets "logo-128.png") -Force
    OK "Copied logo-128.png -> installer/src/assets/"
} else {
    Write-Host "  WARN  logo-128.png not found, logo will be missing in installer" -ForegroundColor Yellow
}

# ── Step 3: Build installer app ───────────────────────────────────────────────
Step "[3/3] Building installer app..."
Set-Location (Join-Path $Root "installer")

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing npm deps..." -ForegroundColor DarkGray
    & pnpm install
    if ($LASTEXITCODE -ne 0) { Die "pnpm install failed" }
}

& pnpm tauri build --no-bundle
if ($LASTEXITCODE -ne 0) { Die "Installer build failed (exit $LASTEXITCODE)" }

# ── Output ────────────────────────────────────────────────────────────────────
$InstallerExe = Join-Path $CargoTarget "release\compify-installer.exe"
if (-not (Test-Path $InstallerExe)) { Die "Installer exe not found at: $InstallerExe" }

$DistDir = Join-Path $Root "dist"
New-Item -ItemType Directory -Force $DistDir | Out-Null
$Output = Join-Path $DistDir "CompifySetup.exe"
Copy-Item $InstallerExe $Output -Force

$OutMB = [math]::Round((Get-Item $Output).Length / 1MB, 1)

Set-Location $Root

Write-Host ""
Write-Host "  ✓ Done!  $Output  ($OutMB MB)" -ForegroundColor Green
Write-Host ""
