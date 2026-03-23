#!/bin/bash
# Copy-Paste Ready Test Commands for Research Backend
# Just copy each section and paste into your terminal!

# ═══════════════════════════════════════════════════════════════════════════
# TEST 1: Health Check (No Auth Required)
# ═══════════════════════════════════════════════════════════════════════════

echo "TEST 1: Health Check"
curl -s http://localhost:3000/api/v1/health | jq '.'

# Expected: 
# {
#   "success": true,
#   "data": {
#     "status": "ok",
#     "timestamp": "2026-02-24T14:29:24.219Z",
#     "version": "1.0.0",
#     "uptime": 337
#   }
# }

# ═══════════════════════════════════════════════════════════════════════════
# TEST 2: Submit Research - Machine Learning
# ═══════════════════════════════════════════════════════════════════════════

echo -e "\n\nTEST 2: Machine Learning Research"
curl -X POST http://localhost:3000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "What are the best practices for implementing machine learning in production environments?",
    "metadata": {
      "test": "ml-production"
    }
  }' | jq '.'

# Expected:
# {
#   "success": true,
#   "data": {
#     "sessionId": "uuid-string",
#     "jobId": "uuid-string",
#     "message": "Session created and research job enqueued...",
#     "pollUrl": "/api/v1/research/uuid-string"
#   }
# }

# ═══════════════════════════════════════════════════════════════════════════
# TEST 3: Submit Research - Blockchain
# ═══════════════════════════════════════════════════════════════════════════

echo -e "\n\nTEST 3: Blockchain Technology Research"
curl -X POST http://localhost:3000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "How can blockchain technology be applied to improve supply chain transparency and reduce counterfeiting?",
    "metadata": {
      "test": "blockchain-supply-chain"
    }
  }' | jq '.'

# ═══════════════════════════════════════════════════════════════════════════
# TEST 4: Submit Research - AI Future
# ═══════════════════════════════════════════════════════════════════════════

echo -e "\n\nTEST 4: AI Future Trends Research"
curl -X POST http://localhost:3000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "What are the most important trends and breakthroughs expected in artificial intelligence for the next 5 years?",
    "metadata": {
      "test": "ai-future-trends"
    }
  }' | jq '.'

# ═══════════════════════════════════════════════════════════════════════════
# TEST 5: Submit Research - Remote Management
# ═══════════════════════════════════════════════════════════════════════════

echo -e "\n\nTEST 5: Remote Team Management Research"
curl -X POST http://localhost:3000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "What are the most effective strategies for managing and motivating remote teams in a distributed work environment?",
    "metadata": {
      "test": "remote-management"
    }
  }' | jq '.'

# ═══════════════════════════════════════════════════════════════════════════
# TEST 6: Check Session Status
# ═══════════════════════════════════════════════════════════════════════════

# First, run TEST 2 and copy the sessionId from the response
# Then replace the sessionId below with your actual ID

echo -e "\n\nTEST 6: Check Session Status"
curl -s \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  http://localhost:3000/api/v1/research/REPLACE_WITH_SESSION_ID | jq '.'

# Example with a real sessionId:
# curl -s \
#   -H "X-Api-Key: dev_local_api_key_9f3b" \
#   http://localhost:3000/api/v1/research/550e8400-e29b-41d4-a716-446655440000 | jq '.'

# ═══════════════════════════════════════════════════════════════════════════
# TEST 7: Async Research (Alternative to sync)
# ═══════════════════════════════════════════════════════════════════════════

echo -e "\n\nTEST 7: Async Research Endpoint"
curl -X POST http://localhost:3000/api/v1/research/async \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "What is the most cost-effective strategy for cloud infrastructure optimization?",
    "metadata": {
      "test": "cloud-optimization"
    }
  }' | jq '.'

# ═══════════════════════════════════════════════════════════════════════════
# TIPS
# ═══════════════════════════════════════════════════════════════════════════

# 1. Always include the X-Api-Key header for protected endpoints
# 2. Problem statements must be 20-5000 characters
# 3. POST requests return 202 (Accepted) immediately
# 4. Use the sessionId to poll for results
# 5. Metadata is optional and can contain any custom data
# 6. Pretty print JSON with | jq if available
# 7. Remove | jq '.' if you don't have jq installed

# ═══════════════════════════════════════════════════════════════════════════
# API KEY REFERENCE
# ═══════════════════════════════════════════════════════════════════════════

# API Key: dev_local_api_key_9f3b
# Usage:   -H "X-Api-Key: dev_local_api_key_9f3b"
# Endpoints requiring auth:
#   - POST /api/v1/research
#   - POST /api/v1/research/async
#   - GET  /api/v1/research/:sessionId
#   - GET  /api/v1/research/job/:jobId
#   - POST /api/v1/research/:sessionId/deepen/:ideaId

# ═══════════════════════════════════════════════════════════════════════════
