#!/bin/bash

# ============================================================
#  Pre-built Test Commands for Google Drive Backend
# ============================================================

BASE_URL="http://localhost:8000"

echo "╔════════════════════════════════════════════════════╗"
echo "║  Backend Test Commands - Copy & Run              ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Command:"
echo "curl -X GET http://localhost:8000/health | jq"
echo ""
echo "Running..."
curl -X GET "$BASE_URL/health" -s | jq '.'
echo ""

# Test 2: Upload test_file.txt
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Upload a File"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Command:"
echo "curl -X POST http://localhost:8000/upload -F 'file=@/path/to/file'"
echo ""
echo "Running with test_file.txt..."
curl -X POST "$BASE_URL/upload" \
    -F "file=@./test_file.txt" \
    -s | jq '.'
echo ""

# Test 3: 404 Test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Not Found Route (404)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Command:"
echo "curl -X GET http://localhost:8000/invalid"
echo ""
echo "Running..."
curl -X GET "$BASE_URL/invalid" \
    -s | jq '.'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ All tests complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For Download and Metadata tests, you need a valid Google Drive File ID."
echo "After uploading a file, copy the file ID from the upload response."
echo ""
echo "Then run:"
echo "  curl -X GET http://localhost:8000/file/{FILE_ID} --output myfile"
echo "  curl -X GET http://localhost:8000/file/{FILE_ID}/meta | jq"
