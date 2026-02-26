#!/bin/bash

# ============================================================
#  Interactive Test Script for Google Drive Backend
# ============================================================

BASE_URL="http://localhost:8000"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Google Drive Backend - Interactive Test Suite     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}\n"

show_menu() {
    echo -e "${YELLOW}Choose a test option:${NC}"
    echo "1. Health Check (GET /health)"
    echo "2. Upload a File (POST /upload)"
    echo "3. Download a File (GET /file/:fileId)"
    echo "4. Get File Metadata (GET /file/:fileId/meta)"
    echo "5. Exit"
    echo ""
    read -p "Enter your choice (1-5): " choice
}

test_health() {
    echo -e "\n${GREEN}Testing Health Check...${NC}"
    curl -X GET "$BASE_URL/health" -H "Accept: application/json" -s | jq '.' 2>/dev/null || curl -X GET "$BASE_URL/health" -s
    echo -e "\n${GREEN}✓ Health check complete${NC}\n"
}

test_upload() {
    echo -e "\n${GREEN}File Upload Test${NC}"
    read -p "Enter the file path to upload: " filepath
    
    if [ ! -f "$filepath" ]; then
        echo -e "${RED}✗ File not found: $filepath${NC}\n"
        return
    fi
    
    filename=$(basename "$filepath")
    echo -e "${YELLOW}Uploading: $filename${NC}"
    
    curl -X POST "$BASE_URL/upload" \
        -F "file=@$filepath" \
        -H "Accept: application/json" \
        -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/upload" -F "file=@$filepath" -s
    
    echo -e "\n${GREEN}✓ Upload test complete${NC}\n"
}

test_download() {
    echo -e "\n${GREEN}File Download Test${NC}"
    read -p "Enter the Google Drive File ID: " fileid
    read -p "Enter the output filename (default: downloaded_file): " outputfile
    outputfile="${outputfile:-downloaded_file}"
    
    if [ -z "$fileid" ]; then
        echo -e "${RED}✗ File ID cannot be empty${NC}\n"
        return
    fi
    
    echo -e "${YELLOW}Downloading file: $fileid${NC}"
    
    curl -X GET "$BASE_URL/file/$fileid" \
        -H "Accept: */*" \
        -o "$outputfile" \
        -s
    
    if [ -f "$outputfile" ]; then
        filesize=$(du -h "$outputfile" | cut -f1)
        echo -e "${GREEN}✓ Downloaded: $outputfile ($filesize)${NC}\n"
    else
        echo -e "${RED}✗ Download failed${NC}\n"
    fi
}

test_metadata() {
    echo -e "\n${GREEN}File Metadata Test${NC}"
    read -p "Enter the Google Drive File ID: " fileid
    
    if [ -z "$fileid" ]; then
        echo -e "${RED}✗ File ID cannot be empty${NC}\n"
        return
    fi
    
    echo -e "${YELLOW}Fetching metadata for: $fileid${NC}"
    
    curl -X GET "$BASE_URL/file/$fileid/meta" \
        -H "Accept: application/json" \
        -s | jq '.' 2>/dev/null || curl -X GET "$BASE_URL/file/$fileid/meta" -s
    
    echo -e "\n${GREEN}✓ Metadata test complete${NC}\n"
}

# Main loop
while true; do
    show_menu
    
    case $choice in
        1) test_health ;;
        2) test_upload ;;
        3) test_download ;;
        4) test_metadata ;;
        5) 
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0 
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}\n"
            ;;
    esac
done
