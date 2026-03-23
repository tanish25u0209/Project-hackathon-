# Quick Reference - Ideas API & Multi-Model Synthesis

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
```
Header: X-Api-Key: dev_local_api_key_9f3b
```

## Endpoints Cheat Sheet

### Multi-Model Synthesis (Core Pipeline)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/multimodel` | Execute 5 models in parallel (deepseek, perplexity, mistral, llama, gemma) |
| POST | `/sessions/:sessionId/synthesize` | Synthesize raw outputs into strategic ideas |

### Ideas Management (Save & Organize)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/ideas/save` | Save an idea from synthesis results |
| GET | `/ideas/saved` | List saved ideas with filters |
| GET | `/ideas/:id` | Get idea details |
| PATCH | `/ideas/:id` | Update (notes, tags) |
| DELETE | `/ideas/:id` | Delete idea |
| POST | `/ideas/:id/rate` | Rate (1-5 stars) |
| GET | `/ideas/:id/related` | Find related ideas |

## Quick Examples

### 0. Execute Multi-Model Synthesis Pipeline
```bash
# Request synthesis from 5 models in parallel
curl -X POST http://localhost:3000/api/v1/multimodel \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -H "Content-Type: application/json" \
  -d '{"input":"How to scale distributed teams while maintaining culture?"}'

# Response includes sessionId (use for synthesis step)
# Models: deepseek/deepseek-chat, perplexity/sonar, mistralai/mistral-large,
#         meta-llama/llama-3-8b-instruct, google/gemma-3-27b-it
```

### 0b. Synthesize Results into Strategic Ideas
```bash
# Takes raw outputs from 5 models and creates deduplicated strategic ideas
curl -X POST http://localhost:3000/api/v1/sessions/{sessionId}/synthesize \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -H "Content-Type: application/json" \
  -d '{}'

# Response: uniqueIdeas (synthesized consensus), discardedIdeas (generic/redundant),
#           researchSummary (dominantThemes, contrarianInsights, systemicPatterns)
```

### 1. Save an Idea
```bash
curl -X POST http://localhost:3000/api/v1/ideas/save \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid-here",
    "ideaId": "idea_001",
    "title": "My Idea",
    "description": "Description",
    "strategicThesis": "The core thinking",
    "mechanism": "How it works",
    "implementationFramework": {},
    "ideaType": "organizational-structure",
    "derivedFromModels": ["model1", "model2"],
    "supportCount": 2,
    "confidence": 0.85
  }'
```

### 2. List Ideas (with filters)
```bash
# All ideas, page 1
curl http://localhost:3000/api/v1/ideas/saved \
  -H "X-Api-Key: dev_local_api_key_9f3b"

# Only rated ideas
curl "http://localhost:3000/api/v1/ideas/saved?filter=rated" \
  -H "X-Api-Key: dev_local_api_key_9f3b"

# Search for text
curl "http://localhost:3000/api/v1/ideas/saved?search=culture" \
  -H "X-Api-Key: dev_local_api_key_9f3b"

# Sort by rating (highest first)
curl "http://localhost:3000/api/v1/ideas/saved?sortBy=rating&order=DESC" \
  -H "X-Api-Key: dev_local_api_key_9f3b"
```

### 3. Get One Idea
```bash
curl http://localhost:3000/api/v1/ideas/{ideaId} \
  -H "X-Api-Key: dev_local_api_key_9f3b"
```

### 4. Rate an Idea
```bash
curl -X POST http://localhost:3000/api/v1/ideas/{ideaId}/rate \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5}'
```

### 5. Add Tags & Notes
```bash
curl -X PATCH http://localhost:3000/api/v1/ideas/{ideaId} \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Important for Q1 planning",
    "tags": ["important", "culture", "2025"]
  }'
```

### 6. Delete an Idea
```bash
curl -X DELETE http://localhost:3000/api/v1/ideas/{ideaId} \
  -H "X-Api-Key: dev_local_api_key_9f3b"
```

### 7. Find Related Ideas
```bash
curl "http://localhost:3000/api/v1/ideas/{ideaId}/related?limit=5" \
  -H "X-Api-Key: dev_local_api_key_9f3b"
```

## Query Parameters for GET /ideas/saved

| Param | Default | Options |
|-------|---------|---------|
| `page` | 1 | any integer |
| `limit` | 10 | 1-100 |
| `sortBy` | saved_at | saved_at, updated_at, rating, title |
| `order` | DESC | ASC, DESC |
| `filter` | all | all, rated, tagged |
| `search` | "" | any text |

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "message": "Session not found",
    "code": "NOT_FOUND",
    "statusCode": 404
  }
}
```

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request (missing fields)
- `403` - Forbidden (don't own this)
- `404` - Not Found
- `409` - Conflict (already saved)

## Files & Locations

| File | Purpose |
|------|---------|
| `src/controllers/ideas.controller.js` | Request handlers (7 endpoints) |
| `src/repositories/ideaRepository.js` | Database queries |
| `src/routes/ideas.routes.js` | Route definitions |
| `src/db/migrations/004_saved_ideas.sql` | Database schema |
| `FRONTEND_INTEGRATION.md` | Full documentation |
| `IMPLEMENTATION_COMPLETE.md` | Implementation summary |

## Frontend Setup

### React
```js
const API_KEY = process.env.REACT_APP_API_KEY;
const res = await fetch('/api/v1/ideas/save', {
  method: 'POST',
  headers: {
    'X-Api-Key': API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(ideaData),
});
```

### Vue
```js
const API_KEY = import.meta.env.VITE_API_KEY;
const res = await fetch('/api/v1/ideas/save', {
  method: 'POST',
  headers: {
    'X-Api-Key': API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(ideaData),
});
```

## Common Workflows

### Workflow: Save an Idea from Synthesis
```
1. POST /multimodel → get sessionId
2. POST /sessions/{sessionId}/synthesize → get uniqueIdeas
3. POST /ideas/save (with data from uniqueIdeas[0])
4. GET /ideas/{savedId} → retrieve full idea
```

### Workflow: View & Rate Ideas
```
1. GET /ideas/saved → list all saved ideas
2. GET /ideas/{id} → view full details
3. POST /ideas/{id}/rate → rate with 1-5 stars
4. PATCH /ideas/{id} → add tags and notes
```

### Workflow: Search & Filter
```
1. GET /ideas/saved?search=culture → find by text
2. GET /ideas/saved?filter=rated → only rated
3. GET /ideas/saved?filter=tagged → only tagged
4. GET /ideas/saved?sortBy=rating&order=DESC → sort
```

## Database Info

**Table**: `saved_ideas`
**Columns**: id, user_id, session_id, idea_id, title, description, rating, tags, notes, saved_at, updated_at, ...
**Indexes**: user_id, session_id, (user_id, rating), full-text search
**Constraint**: UNIQUE(user_id, idea_id) - prevents duplicate saves

---

## Support

For full API docs: See `FRONTEND_INTEGRATION.md`
For implementation details: See `IMPLEMENTATION_COMPLETE.md`
