# Quick Reference Guide - Features & Endpoints

## 🚀 Quick Start

**Backend URL:** `http://localhost:3000/api/v1`  
**Auth:** `X-Api-Key: dev_local_api_key_9f3b`  
**Frontend URL:** `http://127.0.0.1:8081/index.html`

---

## 📌 Core Features at a Glance

| Feature | Endpoint | Method | Use Case |
|---------|----------|--------|----------|
| **Multi-Model Research** | `/multimodel` | POST | Get 5 LLM perspectives |
| **Synthesize Ideas** | `/sessions/{id}/synthesize` | POST | Deduplicate & cluster ideas |
| **Save Idea** | `/ideas/save` | POST | Like/favorite an idea |
| **View Saved Ideas** | `/ideas/saved` | GET | Browse your favorites |
| **Rate Idea** | `/ideas/{id}/rate` | POST | Rate 1-5 stars |
| **Find Related** | `/ideas/{id}/related` | GET | Discover similar ideas |
| **Session History** | `/sessions` | GET | View past researches |
| **File Upload** | `/upload` | POST | Store to Google Drive |
| **File Download** | `/file/{id}` | GET | Retrieve from Drive |

---

## 💻 ONE-LINE CURL EXAMPLES

### Execute Multi-Model Research
```bash
curl -X POST http://localhost:3000/api/v1/multimodel \
  -H "X-Api-Key: dev_local_api_key_9f3b" -H "Content-Type: application/json" \
  -d '{"input":"How to scale a startup?"}'
# Returns: sessionId + results from 5 models
```

### Synthesize Raw Outputs
```bash
curl -X POST http://localhost:3000/api/v1/sessions/{sessionId}/synthesize \
  -H "X-Api-Key: dev_local_api_key_9f3b"
# Returns: uniqueIdeas, dominantThemes, contrarianInsights
```

### Save an Idea
```bash
curl -X POST http://localhost:3000/api/v1/ideas/save \
  -H "X-Api-Key: dev_local_api_key_9f3b" -H "Content-Type: application/json" \
  -d '{"ideaText":"...", "sessionId":"...", "tags":["innovation"]}'
# Returns: ideaId
```

### Get All Saved Ideas
```bash
curl -X GET "http://localhost:3000/api/v1/ideas/saved?limit=50" \
  -H "X-Api-Key: dev_local_api_key_9f3b"
# Returns: Array of saved ideas
```

### Rate an Idea
```bash
curl -X POST http://localhost:3000/api/v1/ideas/{ideaId}/rate \
  -H "X-Api-Key: dev_local_api_key_9f3b" -H "Content-Type: application/json" \
  -d '{"rating":5}'
```

### Find Related Ideas
```bash
curl -X GET http://localhost:3000/api/v1/ideas/{ideaId}/related \
  -H "X-Api-Key: dev_local_api_key_9f3b"
# Returns: Similar ideas + similarity scores
```

### Get Session History
```bash
curl -X GET "http://localhost:3000/api/v1/sessions?limit=20" \
  -H "X-Api-Key: dev_local_api_key_9f3b"
# Returns: Paginated list of sessions
```

### Upload File to Google Drive
```bash
curl -X POST http://localhost:3001/upload \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  --data-binary @file.pdf
# Returns: fileId, webViewLink
```

### Download File from Google Drive
```bash
curl -X GET http://localhost:3001/file/{fileId} \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  --output downloaded_file
```

---

## 5️⃣ LLM Models Included

| Model | Provider | Speed | Cost | Best For |
|-------|----------|-------|------|----------|
| DeepSeek Chat | DeepSeek | Fast | $$ | Reasoning |
| Perplexity Sonar | Perplexity | Slow | $$$ | Web search |
| Mistral Large | Mistral | Medium | $$ | Balance |
| Llama 3 8B | Meta | Fast | $ | Speed |
| Gemma 3 27B | Google | Medium | $ | Quality |

---

## 📊 Response Format

### Multi-Model Response
```json
{
  "success": true,
  "data": {
    "sessionId": "12345-abc",
    "results": [
      {"model": "deepseek/deepseek-chat", "output": "...", "latencyMs": 3200},
      {"model": "perplexity/sonar", "output": "...", "latencyMs": 4100},
      // ... 3 more models
    ],
    "successCount": 5,
    "failureCount": 0
  }
}
```

### Synthesis Response
```json
{
  "success": true,
  "data": {
    "researchSummary": {
      "dominantThemes": ["theme1", "theme2"],
      "contrarianInsights": ["insight1"],
      "systemicPatterns": ["pattern1"]
    },
    "uniqueIdeas": [
      {"id": "uuid", "text": "Idea", "source": "model", "confidence": 0.95},
      // ... more ideas
    ],
    "metadata": {
      "modelCount": 5,
      "totalIdeasExtracted": 234,
      "synthesizedAt": "2026-03-20T10:00:00Z"
    }
  }
}
```

### Get Saved Ideas Response
```json
{
  "success": true,
  "data": {
    "ideas": [
      {
        "id": "uuid",
        "text": "Idea content",
        "sourceModel": "deepseek/deepseek-chat",
        "rating": 5,
        "tags": ["innovation", "strategy"],
        "notes": "User notes",
        "savedAt": "2026-03-20T10:00:00Z"
      }
    ],
    "total": 1203
  }
}
```

---

## 🔧 Configuration

### environment Variables (.env)
```bash
# Core
NODE_ENV=development
PORT=3000

# OpenRouter (5 keys for multi-model)
OPENROUTER_API_KEYS=key1,key2,key3,key4,key5

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/research_db
REDIS_URL=redis://localhost:6379

# API Security
API_KEY=dev_local_api_key_9f3b

# CORS
ALLOWED_ORIGINS=http://localhost:8081,https://yourdomain.com

# Models
RESEARCH_MODELS=deepseek/deepseek-chat,perplexity/sonar,mistralai/mistral-large,meta-llama/llama-3-8b-instruct,google/gemma-3-27b-it
```

---

## 📁 Folder Reference

| Folder | Purpose |
|--------|---------|
| `research_backend/` | Main API server (Express.js) |
| `research_backend/src/controllers/` | Endpoint handlers |
| `research_backend/src/services/` | Business logic |
| `research_backend/src/routes/` | API route definitions |
| `research_backend/src/providers/` | LLM provider wrappers |
| `research_backend/src/queue/` | Background job queue |
| `research_backend/src/db/` | Database setup & migrations |
| `chatbot/` | Frontend web app (React) |
| `storage/` | Google Drive integration |

---

## 🎯 Workflow Example

### Step 1: User Submits Research Problem
```
Input: "How should startups handle remote team management?"
```

### Step 2: Frontend Calls Multi-Model API
```javascript
POST /multimodel with input
```

### Step 3: Backend Executes 5 Models in Parallel
```
DeepSeek Chat     →  Generates 15 ideas
Perplexity Sonar  →  Generates 18 ideas  
Mistral Large     →  Generates 14 ideas
Llama 3 8B        →  Generates 12 ideas
Gemma 3 27B       →  Generates 16 ideas
Total: 75 ideas
```

### Step 4: User Triggers Synthesis
```
POST /sessions/{sessionId}/synthesize
```

### Step 5: Backend Deduplicates & Clusters
```
Semantic analysis → Groups similar ideas
Results: 75 ideas → 23 unique ideas
```

### Step 6: User Saves Favorites
```
POST /ideas/save (multiple times)
User saves: 5 ideas with tags #remote-work #management
```

### Step 7: User Can Later
```
GET /ideas/saved?tags=remote-work
→ Returns all saved ideas with that tag
```

---

## ⚡ Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| Multi-model execution | 3-30s | 5 models in parallel |
| Synthesis | 1-3s | Depends on ideas count |
| Search ideas | <100ms | Cached queries |
| Save idea | <50ms | Quick DB insert |
| Get all ideas | 1-2s | Pagination (50/page) |
| File upload | Variable | Depends on file size |

---

## 🔒 Security Headers

### Automatically Added
- `Content-Security-Policy` - XSS protection
- `X-Frame-Options: DENY` - Clickjacking protection
- `X-Content-Type-Options: nosniff` - MIME sniffing protection
- `Strict-Transport-Security` - HTTPS enforcement
- `CORS: Whitelist only allowed origins`
- `Rate-Limit: 100 requests/min per IP`

---

## 📈 Data Storage

### PostgreSQL Tables
- `sessions` - Research sessions & metadata
- `raw_outputs` - Raw model outputs (searchable)
- `ideas` - Extracted ideas with metadata
- `saved_ideas` - User favorites with ratings/notes
- `research_jobs` - Background job tracking

### Redis Usage
- Session cache (TTL: 24h)
- Rate limit counters
- Job queue messages

---

## 🐛 Debugging Tips

### Check Backend Status
```bash
curl http://localhost:3000/api/v1/health
```

### View Recent Logs
```bash
tail -f logs/combined.log
```

### Test Database Connection
```bash
psql postgresql://user:pass@localhost:5432/research_db
```

### Test Redis Connection
```bash
redis-cli ping
```

### Monitor Job Queue
```bash
# From Node.js
import Queue from 'bullmq';
const queue = new Queue('research', { connection: { host: 'localhost', port: 6379 } });
const jobs = await queue.getJobs();
```

---

## 📋 Common Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 400 | Bad request | Check input format |
| 401 | Unauthorized | Verify API key |
| 402 | Quota exceeded | Check OpenRouter credits |
| 404 | Not found | Check resource exists |
| 429 | Rate limited | Wait before retrying |
| 500 | Server error | Check logs |

---

## 🚀 Deployment Checklist

```
□ Database: PostgreSQL running + migrations done
□ Cache: Redis running
□ API keys: All 5 OpenRouter keys configured
□ Other providers: Google, Anthropic, Grok keys set
□ CORS: Allowed origins configured for frontend domain
□ Rate limiting: Configured per environment
□ Logs: Configured to file system
□ Monitoring: Error tracking enabled
□ Frontend: Built and hosted
□ Storage: Google Drive credentials configured
```

---

## 📚 Related Documentation

- 📖 [Complete Analysis](PROJECT_COMPLETE_ANALYSIS.md)
- 🔌 [API Quick Reference](research_backend/API_QUICK_REFERENCE.md)
- 🎨 [Frontend Integration Guide](research_backend/FRONTEND_INTEGRATION.md)
- ✅ [Implementation Status](research_backend/IMPLEMENTATION_COMPLETE.md)

---

**Quick Copy-Paste Endpoints:**

```
Research:       POST /multimodel
Synthesize:     POST /sessions/{id}/synthesize
Sessions:       GET /sessions
Session Detail: GET /sessions/{id}
Save Idea:      POST /ideas/save
Get Ideas:      GET /ideas/saved
Rate Idea:      POST /ideas/{id}/rate
Related:        GET /ideas/{id}/related
Upload File:    POST /upload
Download File:  GET /file/{id}
Health Check:   GET /health
```

**Remember:** Always include header: `X-Api-Key: dev_local_api_key_9f3b`
