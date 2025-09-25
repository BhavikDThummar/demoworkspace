# Hardcoded paths
$SourcePath = "D:\Development\Q2C\Other\BOMDemoAPIApp\demoworkspace\libs\minimal-gorules\dist\browser"
$DestinationPath = "D:\Development\Q2C\Q2C-DEV-SECOND-BRANCH\Q2C.React.Main\my-react-app-packages\minimal-gorules"
$ReactAppPath = "D:\Development\Q2C\Q2C-DEV-SECOND-BRANCH\Q2C.React.Main"

Write-Host "Starting deployment of minimal-gorules to React application..." -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor White

Write-Host "Using paths:" -ForegroundColor Yellow
Write-Host "Source: $SourcePath" -ForegroundColor Yellow
Write-Host "Destination: $DestinationPath" -ForegroundColor Yellow
Write-Host "React App: $ReactAppPath" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor White

# Check if source path exists
if (-not (Test-Path $SourcePath)) {
    Write-Host "Error: Source path does not exist: $SourcePath" -ForegroundColor Red
    exit 1
}

# Create destination directory if it doesn't exist
if (-not (Test-Path $DestinationPath)) {
    Write-Host "Creating destination directory: $DestinationPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $DestinationPath -Force
}

# Copy files
Write-Host "Copying files from $SourcePath to $DestinationPath..." -ForegroundColor Cyan
try {
    Copy-Item "$SourcePath\*" -Destination $DestinationPath -Recurse -Force
    Write-Host "Files copied successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error copying files: $_" -ForegroundColor Red
    exit 1
}

# Switch to React app directory and run npm install
if (Test-Path $ReactAppPath) {
    Write-Host "Switching to React app directory: $ReactAppPath" -ForegroundColor Cyan
    Set-Location -Path $ReactAppPath

    Write-Host "Running npm install..." -ForegroundColor Cyan
    try {
        npm install
        Write-Host "npm install completed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Error running npm install: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Error: React app directory does not exist: $ReactAppPath" -ForegroundColor Red
    exit 1
}

Write-Host "----------------------------------------" -ForegroundColor White
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')