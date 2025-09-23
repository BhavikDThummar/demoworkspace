#!/bin/bash

# QPA vs RefDes Rule API Testing Script
# Make sure the bomdemoapiv2 application is running before executing this script

BASE_URL="http://localhost:8001/api"

echo "🧪 Testing QPA vs RefDes Rule API Endpoints"
echo "=========================================="

# Test 1: Health Check
echo ""
echo "1. Health Check"
echo "GET $BASE_URL/bom-rules/qpa-refdes/health"
curl -s -X GET "$BASE_URL/bom-rules/qpa-refdes/health" | jq '.' || echo "Failed to parse JSON response"

# Test 2: Rule Metadata
echo ""
echo "2. Rule Metadata"
echo "GET $BASE_URL/bom-rules/qpa-refdes/metadata"
curl -s -X GET "$BASE_URL/bom-rules/qpa-refdes/metadata" | jq '.' || echo "Failed to parse JSON response"

# Test 3: Validate Rule Availability
echo ""
echo "3. Validate Rule Availability"
echo "GET $BASE_URL/bom-rules/qpa-refdes/validate-rule"
curl -s -X GET "$BASE_URL/bom-rules/qpa-refdes/validate-rule" | jq '.' || echo "Failed to parse JSON response"

# Test 4: Test with Sample Data
echo ""
echo "4. Test with Sample Data"
echo "POST $BASE_URL/bom-rules/qpa-refdes/test"
curl -s -X POST "$BASE_URL/bom-rules/qpa-refdes/test" | jq '.' || echo "Failed to parse JSON response"

# Test 5: Custom Validation
echo ""
echo "5. Custom BOM Item Validation"
echo "POST $BASE_URL/bom-rules/qpa-refdes/validate"
curl -s -X POST "$BASE_URL/bom-rules/qpa-refdes/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "bomItem": {
      "lineID": 2,
      "custPN": "CPN-2001",
      "qpa": 2,
      "refDesig": "C1, C2",
      "refDesigCount": 2,
      "dnpQty": "0",
      "dnpDesig": "",
      "dnpDesigCount": 0,
      "uomID": "EACH",
      "mfgPNDescription": "Capacitor 100nF",
      "mfgCode": "MFR-B",
      "mfgPN": "MPN-2001",
      "description": "Decoupling capacitor",
      "mountingtypes": "SMD",
      "functionaltypes": "Capacitor",
      "field1": "data2-1",
      "field2": "data2-2",
      "field3": "data2-3",
      "field4": "data2-4",
      "field5": "data2-5",
      "field6": "data2-6",
      "field7": "data2-7"
    },
    "configData": {
      "_OddelyRefDesList": ["p?", "P*"],
      "maxREFDESAllow": 50,
      "_UOM": {
        "EACH": "EACH"
      }
    },
    "validationFlags": {},
    "otherValidation": {}
  }' | jq '.' || echo "Failed to parse JSON response"

# Test 6: Mismatch Scenario
echo ""
echo "6. QPA Mismatch Scenario"
echo "POST $BASE_URL/bom-rules/qpa-refdes/validate"
curl -s -X POST "$BASE_URL/bom-rules/qpa-refdes/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "bomItem": {
      "lineID": 3,
      "custPN": "CPN-3001",
      "qpa": 3,
      "refDesig": "R1, R2",
      "refDesigCount": 2,
      "dnpQty": "0",
      "dnpDesig": "",
      "dnpDesigCount": 0,
      "uomID": "EACH",
      "mfgPNDescription": "Resistor 1k Ohm",
      "mfgCode": "MFR-C",
      "mfgPN": "MPN-3001",
      "description": "Pull-up resistor",
      "mountingtypes": "SMD",
      "functionaltypes": "Resistor",
      "field1": "data3-1",
      "field2": "data3-2",
      "field3": "data3-3",
      "field4": "data3-4",
      "field5": "data3-5",
      "field6": "data3-6",
      "field7": "data3-7"
    },
    "configData": {
      "_OddelyRefDesList": ["p?", "P*"],
      "maxREFDESAllow": 50,
      "_UOM": {
        "EACH": "EACH"
      }
    },
    "validationFlags": {},
    "otherValidation": {}
  }' | jq '.' || echo "Failed to parse JSON response"

echo ""
echo "✅ API Testing Complete!"
echo ""
echo "Note: If any tests failed, make sure:"
echo "1. The bomdemoapiv2 application is running (npx nx serve bomdemoapiv2)"
echo "2. The application is accessible at $BASE_URL"
echo "3. The QPA vs RefDes rule file is present in the configured path"
echo "4. jq is installed for JSON formatting (optional)"