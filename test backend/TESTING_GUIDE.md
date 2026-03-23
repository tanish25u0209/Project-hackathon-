# Backend Testing Guide

## 🚀 Quick Start

The backend is running on **http://localhost:3000**

### 1. Verify Server is Running

```bash
curl http://localhost:3000/api/v1/health | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-02-24T14:26:51.578Z",
    "version": "1.0.0",
    "uptime": 184
  }
}
```

---

## 📝 Test Inputs (Sample Requests)

### Test 1: Machine Learning Best Practices

```bash
curl -X POST http://localhost:3000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "What are the best practices for implementing machine learning in production environments?",
    "metadata": {
      "testCaseId": "test-001",
      "category": "ML Best Practices"
    }
  }' | jq
```

---

### Test 2: AI Future Trends

```bash
curl -X POST http://localhost:3000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "What are the most important trends and breakthroughs expected in artificial intelligence for the next 5 years?",
    "metadata": {
      "testCaseId": "test-002",
      "category": "AI Trends"
    }
  }' | jq
```

---

### Test 3: Remote Team Management

```bash
curl -X POST http://localhost:3000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "What are the most effective strategies for managing and motivating remote teams in a distributed work environment?",
    "metadata": {
      "testCaseId": "test-003",
      "category": "Management"
    }
  }' | jq
```

---

### Test 4: Blockchain Technology

```bash
curl -X POST http://localhost:3000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "How can blockchain technology be applied to improve supply chain transparency and reduce counterfeiting?",
    "metadata": {
      "testCaseId": "test-004",
      "category": "Blockchain"
    }
  }' | jq
```

---

### Test 5: Cybersecurity Strategy

```bash
curl -X POST http://localhost:3000/api/v1/research \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -d '{
    "problemStatement": "What are the essential components of a comprehensive cybersecurity strategy for mid-size enterprises?",
    "metadata": {
      "testCaseId": "test-005",
      "category": "Security"
    }
  }' | jq
```

---

## 📊 Request Format

All research requests follow this format:

```json
{
  "problemStatement": "Your question here (required, 20-5000 characters)",
  "metadata": {
    "key": "value",
    "custom": "data"
  }
}
```

---

## ✅ Expected Response

When you submit a research request, you'll get an immediate response with a sessionId:

```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "jobId": "550e8400-e29b-41d4-a716-446655440001",
    "message": "Session created and research job enqueued. Poll GET /api/v1/research/:sessionId for status.",
    "pollUrl": "/api/v1/research/550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## 🔄 Check Session Status

Once you have a sessionId, you can check the research progress:

```bash
# Replace with your actual sessionId
SESSION_ID="550e8400-e29b-41d4-a716-446655440000"

curl -s -H "X-Api-Key: dev_local_api_key_9f3b" \
  http://localhost:3000/api/v1/research/$SESSION_ID | jq
```

---

## 🛠️ Interactive Testing

Run the interactive test tool:

```bash
chmod +x /tmp/interactive_test.sh
/tmp/interactive_test.sh
```

This provides a menu-driven interface for testing:
- Health checks
- Pre-configured test cases
- Custom problem statements
- Session status queries

---

## 📉 Response Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Successful GET request |
| 202 | Accepted | Research job enqueued |
| 400 | Bad Request | Invalid input format |
| 401 | Unauthorized | Missing/invalid API key |
| 404 | Not Found | Invalid endpoint or sessionId |
| 500 | Server Error | Internal server error |

---

## 🔐 Authentication

All protected endpoints require the API key header:

```bash
-H "X-Api-Key: dev_local_api_key_9f3b"
```

---

## 📝 Notes

- The backend uses an asynchronous queue-based architecture
- POST requests return immediately with a jobId for long-running operations
- Use the sessionId to poll for results
- The research service queries multiple LLM providers (OpenRouter, Claude, Gemini)
- Results are deduplicated using semantic embeddings

---

## 🐛 Troubleshooting

**Connection Refused?**
```bash
# Check if server is running
curl http://localhost:3000/api/v1/health
```

**401 Unauthorized?**
Make sure you're including the X-Api-Key header:
```bash
-H "X-Api-Key: dev_local_api_key_9f3b"
```

**Request Timing Out?**
The research endpoint may take time to process. Try with a longer timeout:
```bash
curl --max-time 30 ...
```

---

**Last Updated:** 2026-02-24
