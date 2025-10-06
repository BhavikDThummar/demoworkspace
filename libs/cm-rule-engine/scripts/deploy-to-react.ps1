# ===============================================
# cm-rule-engine React Deployment Script
# ===============================================

# --- CONFIGURATION ---
$WorkspaceRoot   = "D:\Development\Q2C\Other\BOMDemoAPIApp\demoworkspace"
$SourcePath      = "$WorkspaceRoot\libs\cm-rule-engine\dist\browser"
$DestinationPath = "D:\Development\Q2C\Q2C-DEV-SECOND-BRANCH\Q2C.React.Main\my-react-app-packages\cm-rule-engine"
$ReactAppPath    = "D:\Development\Q2C\Q2C-DEV-SECOND-BRANCH\Q2C.React.Main"

# --- ERROR HANDLER ---
function Fail-AndWait([string]$Message) {
    Write-Host "`n✗ ERROR: $Message" -ForegroundColor Red
    Read-Host 'Press ENTER to retry or close this window to abort...'
}

# --- INTRO ---
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'cm-rule-engine React Deployment Script' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Configuration:' -ForegroundColor Yellow
Write-Host "  Workspace Root: $WorkspaceRoot"
Write-Host "  Source Path:    $SourcePath"
Write-Host "  Destination:    $DestinationPath"
Write-Host "  React App:      $ReactAppPath"
Write-Host ''
Read-Host 'Press ENTER to continue...'

# --- VERIFY SOURCE PATH ---
if (-not (Test-Path $SourcePath)) {
    Fail-AndWait "Source path not found: $SourcePath. Run 'npx nx build cm-rule-engine' first."
    exit
}
Write-Host '✓ Source path verified' -ForegroundColor Green
Write-Host ''

# --- VERIFY BUILD OUTPUT ---
$PackageJsonPath = Join-Path $SourcePath 'package.json'
if (-not (Test-Path $PackageJsonPath)) {
    Fail-AndWait "package.json not found in dist folder. Build the project first."
    exit
}
Write-Host '✓ Build output verified' -ForegroundColor Green
Write-Host ''

# --- ENSURE DESTINATION EXISTS ---
if (-not (Test-Path $DestinationPath)) {
    Write-Host "Creating destination directory: $DestinationPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    Write-Host '✓ Destination directory created' -ForegroundColor Green
} else {
    Write-Host '✓ Destination directory exists' -ForegroundColor Green
}
Write-Host ''

# --- COPY FILES ---
$copySucceeded = $false
while (-not $copySucceeded) {
    try {
        Write-Host 'Copying files...' -ForegroundColor Cyan
        Copy-Item "$SourcePath\*" -Destination $DestinationPath -Recurse -Force -ErrorAction Stop

        # Check critical files
        $CriticalFiles = @('package.json','browser','node')
        $Missing = $CriticalFiles | Where-Object { -not (Test-Path (Join-Path $DestinationPath $_)) }

        if ($Missing.Count -eq 0) {
            Write-Host '✓ All files copied successfully' -ForegroundColor Green
            $copySucceeded = $true
        } else {
            Fail-AndWait "Warning: Missing critical files: $($Missing -join ', ')"
        }
    } catch {
        Fail-AndWait "Failed to copy files: $_"
    }
}
Write-Host ''

# --- NPM INSTALL IN REACT APP ---
if (-not (Test-Path $ReactAppPath)) {
    Fail-AndWait "React app directory not found: $ReactAppPath"
    exit
}

$CurrentDir = Get-Location
try {
    Set-Location $ReactAppPath
    Write-Host 'Running npm install...' -ForegroundColor Cyan
    $npmOutput = npm install 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host '✓ npm install completed successfully' -ForegroundColor Green
    } else {
        Fail-AndWait "npm install failed with exit code $LASTEXITCODE.`n$npmOutput"
    }
} catch {
    Fail-AndWait "Exception during npm install: $_"
} finally {
    Set-Location $CurrentDir
}
Write-Host ''

# --- SUMMARY ---
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '✓ Deployment completed successfully!' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Next steps:' -ForegroundColor Yellow
Write-Host '  1. Import in React components:' -ForegroundColor White
Write-Host '     import { useRuleEngine } from ''@org/cm-rule-engine/react'';' -ForegroundColor Gray
Write-Host ''
Write-Host '  2. Or use the core engine:' -ForegroundColor White
Write-Host '     import { RuleEngine } from ''@org/cm-rule-engine'';' -ForegroundColor Gray
Write-Host ''

Read-Host 'Press ENTER to exit'
