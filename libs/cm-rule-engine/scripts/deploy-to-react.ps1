# Configuration - Update these paths for your environment
$WorkspaceRoot = "D:\Development\Q2C\Other\BOMDemoAPIApp\demoworkspace"
$SourcePath = "$WorkspaceRoot\libs\cm-rule-engine\dist"
$DestinationPath = "D:\Development\Q2C\Q2C-DEV-SECOND-BRANCH\Q2C.React.Main\my-react-app-packages\cm-rule-engine"
$ReactAppPath = "D:\Development\Q2C\Q2C-DEV-SECOND-BRANCH\Q2C.React.Main"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "cm-rule-engine React Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Workspace Root: $WorkspaceRoot" -ForegroundColor White
Write-Host "  Source Path:    $SourcePath" -ForegroundColor White
Write-Host "  Destination:    $DestinationPath" -ForegroundColor White
Write-Host "  React App:      $ReactAppPath" -ForegroundColor White
Write-Host ""

# Step 1: Verify source path exists
Write-Host "[1/5] Verifying source path..." -ForegroundColor Cyan
if (-not (Test-Path $SourcePath)) {
    Write-Host "  ✗ Error: Source path does not exist: $SourcePath" -ForegroundColor Red
    Write-Host "  Please run 'npx nx build cm-rule-engine' first" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Source path verified" -ForegroundColor Green
Write-Host ""

# Step 2: Verify package.json exists in dist
Write-Host "[2/5] Verifying build output..." -ForegroundColor Cyan
$PackageJsonPath = "$SourcePath\package.json"
if (-not (Test-Path $PackageJsonPath)) {
    Write-Host "  ✗ Error: package.json not found in dist folder" -ForegroundColor Red
    Write-Host "  Please run 'npx nx build cm-rule-engine' first" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Build output verified" -ForegroundColor Green
Write-Host ""

# Step 3: Create destination directory if it doesn't exist
Write-Host "[3/5] Preparing destination..." -ForegroundColor Cyan
if (-not (Test-Path $DestinationPath)) {
    Write-Host "  Creating destination directory: $DestinationPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    Write-Host "  ✓ Destination directory created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Destination directory exists" -ForegroundColor Green
}
Write-Host ""

# Step 4: Copy files
Write-Host "[4/5] Copying files..." -ForegroundColor Cyan
try {
    # Copy all files from dist to destination
    Copy-Item "$SourcePath\*" -Destination $DestinationPath -Recurse -Force
    
    # Verify critical files were copied
    $CriticalFiles = @("package.json", "browser", "node")
    $AllFilesExist = $true
    foreach ($file in $CriticalFiles) {
        if (-not (Test-Path "$DestinationPath\$file")) {
            Write-Host "  ✗ Warning: $file not found in destination" -ForegroundColor Yellow
            $AllFilesExist = $false
        }
    }
    
    if ($AllFilesExist) {
        Write-Host "  ✓ All files copied successfully" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Files copied with warnings" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Error copying files: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Install in React app
Write-Host "[5/5] Installing in React application..." -ForegroundColor Cyan
if (-not (Test-Path $ReactAppPath)) {
    Write-Host "  ✗ Error: React app directory does not exist: $ReactAppPath" -ForegroundColor Red
    exit 1
}

$CurrentLocation = Get-Location
try {
    Set-Location -Path $ReactAppPath
    Write-Host "  Running npm install..." -ForegroundColor White
    
    $npmOutput = npm install 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ npm install completed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ npm install failed with exit code $LASTEXITCODE" -ForegroundColor Red
        Write-Host "  Output: $npmOutput" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "  ✗ Error running npm install: $_" -ForegroundColor Red
    exit 1
} finally {
    Set-Location -Path $CurrentLocation
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Deployment completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Import in your React components:" -ForegroundColor White
Write-Host "     import { useRuleEngine } from '@org/cm-rule-engine/react';" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Or use the core engine:" -ForegroundColor White
Write-Host "     import { RuleEngine } from '@org/cm-rule-engine';" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
