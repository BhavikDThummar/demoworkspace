# QPA vs RefDes Rule API Testing Script (PowerShell)
# Make sure the bomdemoapiv2 application is running before executing this script

$BaseUrl = "http://localhost:8001/api"

Write-Host "🧪 Testing QPA vs RefDes Rule API Endpoints" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host ""
Write-Host "1. Health Check" -ForegroundColor Yellow
Write-Host "GET $BaseUrl/bom-rules/qpa-refdes/health"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/bom-rules/qpa-refdes/health" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Rule Metadata
Write-Host ""
Write-Host "2. Rule Metadata" -ForegroundColor Yellow
Write-Host "GET $BaseUrl/bom-rules/qpa-refdes/metadata"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/bom-rules/qpa-refdes/metadata" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Metadata request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Validate Rule Availability
Write-Host ""
Write-Host "3. Validate Rule Availability" -ForegroundColor Yellow
Write-Host "GET $BaseUrl/bom-rules/qpa-refdes/validate-rule"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/bom-rules/qpa-refdes/validate-rule" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Rule validation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test with Sample Data
Write-Host ""
Write-Host "4. Test with Sample Data" -ForegroundColor Yellow
Write-Host "POST $BaseUrl/bom-rules/qpa-refdes/test"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/bom-rules/qpa-refdes/test" -Method Post
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Sample test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Custom Validation
Write-Host ""
Write-Host "5. Custom BOM Item Validation" -ForegroundColor Yellow
Write-Host "POST $BaseUrl/bom-rules/qpa-refdes/validate"
$customPayload = @{
    bomItem = @{
        lineID = 2
        custPN = "CPN-2001"
        qpa = 2
        refDesig = "C1, C2"
        refDesigCount = 2
        dnpQty = "0"
        dnpDesig = ""
        dnpDesigCount = 0
        uomID = "EACH"
        mfgPNDescription = "Capacitor 100nF"
        mfgCode = "MFR-B"
        mfgPN = "MPN-2001"
        description = "Decoupling capacitor"
        mountingtypes = "SMD"
        functionaltypes = "Capacitor"
        field1 = "data2-1"
        field2 = "data2-2"
        field3 = "data2-3"
        field4 = "data2-4"
        field5 = "data2-5"
        field6 = "data2-6"
        field7 = "data2-7"
    }
    configData = @{
        _OddelyRefDesList = @("p?", "P*")
        maxREFDESAllow = 50
        _UOM = @{
            EACH = "EACH"
        }
    }
    validationFlags = @{}
    otherValidation = @{}
}

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/bom-rules/qpa-refdes/validate" -Method Post -Body ($customPayload | ConvertTo-Json -Depth 10) -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Custom validation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Mismatch Scenario
Write-Host ""
Write-Host "6. QPA Mismatch Scenario" -ForegroundColor Yellow
Write-Host "POST $BaseUrl/bom-rules/qpa-refdes/validate"
$mismatchPayload = @{
    bomItem = @{
        lineID = 3
        custPN = "CPN-3001"
        qpa = 3
        refDesig = "R1, R2"
        refDesigCount = 2
        dnpQty = "0"
        dnpDesig = ""
        dnpDesigCount = 0
        uomID = "EACH"
        mfgPNDescription = "Resistor 1k Ohm"
        mfgCode = "MFR-C"
        mfgPN = "MPN-3001"
        description = "Pull-up resistor"
        mountingtypes = "SMD"
        functionaltypes = "Resistor"
        field1 = "data3-1"
        field2 = "data3-2"
        field3 = "data3-3"
        field4 = "data3-4"
        field5 = "data3-5"
        field6 = "data3-6"
        field7 = "data3-7"
    }
    configData = @{
        _OddelyRefDesList = @("p?", "P*")
        maxREFDESAllow = 50
        _UOM = @{
            EACH = "EACH"
        }
    }
    validationFlags = @{}
    otherValidation = @{}
}

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/bom-rules/qpa-refdes/validate" -Method Post -Body ($mismatchPayload | ConvertTo-Json -Depth 10) -ContentType "application/json"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Mismatch scenario test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ API Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: If any tests failed, make sure:" -ForegroundColor Yellow
Write-Host "1. The bomdemoapiv2 application is running (npx nx serve bomdemoapiv2)" -ForegroundColor Yellow
Write-Host "2. The application is accessible at $BaseUrl" -ForegroundColor Yellow
Write-Host "3. The QPA vs RefDes rule file is present in the configured path" -ForegroundColor Yellow