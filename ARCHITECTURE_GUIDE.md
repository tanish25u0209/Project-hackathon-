# System Architecture & Integration Guide

## 🏗️ Complete System Architecture

### Overall System Flow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         🌐 WEBSITE APPLICATION                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │              USER INTERFACE (React/Vue Component)                      │ │
│  │                                                                        │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │ │
│  │  │ Research Input   │  │ Results Display  │  │ Ideas Library    │   │ │
│  │  │      Page        │  │      Page        │  │     Page         │   │ │
│  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘   │ │
│  └───────────┼──────────────────────┼──────────────────────┼────────────┘ │
│              │                      │                      │               │
│              └──────────────────────┼──────────────────────┘               │
│                                     │                                       │
│                                     ▼                                       │
│                     ┌───────────────────────────────┐                      │
│                     │   API Client with Headers     │                      │
│                     │   X-Api-Key: api_key_9f3b    │                      │
│                     └───────────────┬───────────────┘                      │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ HTTP(S)
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
        ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
        │ POST Request │       │ GET Request  │       │ DELETE Req   │
        │ /multimodel  │       │ /sessions    │       │ /ideas/{id}  │
        │ /ideas/save  │       │ /ideas/saved │       │ /sessions    │
        │ /synthesize  │       │ /ideas/{id}  │       │              │
        └──────────────┘       └──────────────┘       └──────────────┘
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
          ┌──────────────────────────▼──────────────────────────┐
          │                                                     │
          │     🚀 RESEARCH BACKEND SERVER                      │
          │        (Express.js on localhost:3000)              │
          │                                                     │
          │  ┌────────────────────────────────────────────┐   │
          │  │           MIDDLEWARE STACK                 │   │
          │  ├────────────────────────────────────────────┤   │
          │  │ • Helmet (Security Headers)                │   │
          │  │ • CORS (Cross-Origin)                      │   │
          │  │ • Auth Validation (API Key)                │   │
          │  │ • Rate Limiting (100 req/min)              │   │
          │  │ • Request Validation                       │   │
          │  └────────────────────────────────────────────┘   │
          │                       │                            │
          │                       ▼                            │
          │  ┌────────────────────────────────────────────┐   │
          │  │         ROUTE HANDLERS (Controllers)       │   │
          │  ├────────────────────────────────────────────┤   │
          │  │ • research.routes.js                       │   │
          │  │ • multimodel.routes.js                     │   │
          │  │ • sessions.routes.js                       │   │
          │  │ • synthesis.routes.js                      │   │
          │  │ • ideas.routes.js                          │   │
          │  └────────────────────────────────────────────┘   │
          │                       │                            │
          │                       ▼                            │
          │  ┌────────────────────────────────────────────┐   │
          │  │      BUSINESS LOGIC (Services Layer)       │   │
          │  ├────────────────────────────────────────────┤   │
          │  │ • researchService.js                       │   │
          │  │ • synthesisEngine.js                       │   │
          │  │ • similarityService.js                     │   │
          │  │ • embeddingService.js                      │   │
          │  │ • sessionRepository.js                     │   │
          │  │ • rawOutputRepository.js                   │   │
          │  └────────────────────────────────────────────┘   │
          │                       │                            │
          │       ┌───────────────┼───────────────┐            │
          │       │               │               │            │
          │       ▼               ▼               ▼            │
          │  ┌─────────┐   ┌─────────────┐  ┌──────────┐     │
          │  │Queue    │   │Providers    │  │Clients   │     │
          │  │Worker   │   │(AI APIs)    │  │(OpenAI)  │     │
          │  │(BullMQ) │   └─────────────┘  │          │     │
          │  │         │                    │OpenRouter│     │
          │  │Processes│   • Gemini API    │Client    │     │
          │  │long-    │   • Grok API      │(Multi-   │     │
          │  │running  │   • Anthropic     │Key)      │     │
          │  │jobs     │                    │          │     │
          │  └─────────┘                    └──────────┘     │
          │       │                               │           │
          │       ▼                               ▼           │
          │  ┌─────────────────────────────────────────────┐  │
          │  │  EXTERNAL AI SERVICES (Parallel Calls)      │  │
          │  ├─────────────────────────────────────────────┤  │
          │  │ ┌────────────────────────────────────────┐  │  │
          │  │ │ OpenRouter Unified API                 │  │  │
          │  │ ├────────────────────────────────────────┤  │  │
          │  │ │ Key1 → deepseek/deepseek-chat          │  │  │
          │  │ │ Key2 → perplexity/sonar                │  │  │
          │  │ │ Key3 → mistralai/mistral-large         │  │  │
          │  │ │ Key4 → meta-llama/llama-3-8b-instruct  │  │  │
          │  │ │ Key5 → google/gemma-3-27b-it           │  │  │
          │  │ └────────────────────────────────────────┘  │  │
          │  └─────────────────────────────────────────────┘  │
          │                                                   │
          │  ┌─────────────────────────────────────────────┐  │
          │  │    DATA LAYER (Persistence)                │  │
          │  ├─────────────────────────────────────────────┤  │
          │  │                                             │  │
          │  │ ┌──────────────┐  ┌──────────────────────┐ │  │
          │  │ │ PostgreSQL   │  │ Redis Cache         │ │  │
          │  │ │ Database     │  │ (Hot Data)          │ │  │
          │  │ ├──────────────┤  ├──────────────────────┤ │  │
          │  │ │ • sessions   │  │ • Session cache     │ │  │
          │  │ │ • raw_output │  │ • Rate limits       │ │  │
          │  │ │ • ideas      │  │ • Job queue (BullMQ)│ │  │
          │  │ │ • saved_idea │  │ • Temporary state   │ │  │
          │  │ │ • jobs       │  │                     │ │  │
          │  │ └──────────────┘  └──────────────────────┘ │  │
          │  │                                             │  │
          │  └─────────────────────────────────────────────┘  │
          │                                                   │
          └───────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
         ┌────────────────┐ ┌────────────────┐ ┌───────────────┐
         │ 📁 STORAGE     │ │ 📊 ANALYTICS   │ │ 🔔 MONITORING │
         │   BACKEND      │ │   & TRACKING   │ │   & LOGGING   │
         │ (localhost:    │ │ • Cost tracker │ │ • Winston logs│
         │    3001)       │ │ • Usage stats  │ │ • Error track │
         │                │ │ • Metrics      │ │ • Performance │
         │ Google Drive   │ └────────────────┘ └───────────────┘
         │ Integration    │
         └────────────────┘
```

---

## 🔄 Request-Response Cycle

### Multi-Model Research Flow
```
FRONTEND REQUEST:
  POST /api/v1/multimodel
  {
    "input": "How should we scale our startup?"
  }
         │
         ↓
BACKEND PROCESSES:

1. Create Session
   • Generate UUID for session
   • Store problem statement
   • Set status = "pending"
         │
         ↓

2. Get All Models
   • Load: [deepseek, perplexity, mistral, llama, gemma]
   • Get assigned API keys for each
         │
         ↓

3. Execute in Parallel
   • Model 1 (DeepSeek)     → Call OpenRouter with Key1
   • Model 2 (Perplexity)   → Call OpenRouter with Key2
   • Model 3 (Mistral)      → Call OpenRouter with Key3
   • Model 4 (Llama)        → Call OpenRouter with Key4
   • Model 5 (Gemma)        → Call OpenRouter with Key5
         │
         ↓ (5-30 seconds)

4. Collect Results
   • Parse all responses
   • Calculate token usage
   • Measure latency
         │
         ↓

5. Store Raw Outputs
   • Save to raw_outputs table
   • Associate with session_id
         │
         ↓

6. Return Response
         ▼
FRONTEND RECEIVES:
  {
    "success": true,
    "data": {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "results": [
        {
          "model": "deepseek/deepseek-chat",
          "output": "...",
          "latencyMs": 3200,
          "promptTokens": 250,
          "completionTokens": 1847
        },
        // ... 4 more models
      ]
    }
  }
```

---

### Idea Synthesis Flow
```
FRONTEND REQUEST:
  POST /api/v1/sessions/{sessionId}/synthesize
         │
         ↓
BACKEND PROCESSES:

1. Fetch Raw Outputs
   • Query raw_outputs table
   • Filter by sessionId
         │
         ↓

2. Create SynthesisEngine Instance
   • Load semantic similarity model
         │
         ↓

3. Extract All Ideas
   • Parse each model's output
   • Split into numbered/bulleted items
   • Clean and normalize text
   • Result: ~45-75 raw ideas
         │
         ↓

4. Cluster Similar Ideas
   • Calculate embeddings for each idea
   • Compute semantic similarity scores
   • Group similar ideas (threshold: 0.85)
   • Result: ~20-30 clusters
         │
         ↓

5. Identify Key Themes
   • Analyze cluster frequency
   • Extract dominant patterns
   • Label themes
         │
         ↓

6. Extract Contrarian Insights
   • Find outlier ideas
   • Find conflicting ideas
   • Mark as contrarian
         │
         ↓

7. Identify Systemic Patterns
   • Look for cross-cluster patterns
   • Find system-level insights
         │
         ↓

8. Generate Unique Ideas
   • Select best idea from each cluster
   • Enrich with metadata
   • Assign confidence scores
         │
         ↓

9. Store Results
   • Save to ideas table
   • Link to session_id
   • Store clustered data
         │
         ↓

10. Return Response
         ▼
FRONTEND RECEIVES:
  {
    "success": true,
    "data": {
      "researchSummary": {
        "dominantThemes": [
          "Cost optimization",
          "Team empowerment",
          "Culture building"
        ],
        "contrarianInsights": [
          "Decentralized decision making is more scalable"
        ],
        "systemicPatterns": [
          "Balance growth with culture"
        ]
      },
      "uniqueIdeas": [
        {
          "id": "uuid",
          "text": "Implement OKR-based autonomy...",
          "source": "deepseek/deepseek-chat",
          "confidence": 0.95,
          "tags": ["autonomy", "management"],
          "relatedIdeas": ["uuid", "uuid"]
        },
        // ... 22 more ideas
      ]
    }
  }
```

---

## 🗄️ Data Flow Diagram

### From Research to Database
```
User Input
    ↓
Multi-Model API Call
    ├→ OpenRouter API (5 keys)
    │   ├→ DeepSeek → Output A
    │   ├→ Perplexity → Output B
    │   ├→ Mistral → Output C
    │   ├→ Llama → Output D
    │   └→ Gemma → Output E
    │
    ├→ Store in PostgreSQL
    │   └→ raw_outputs table
    │       (sessionId, model, output, tokens)
    │
    ├→ Return sessionId to Frontend
    │
User Requests Synthesis
    │
Synthesis Engine
    ├→ Load raw_outputs from DB
    ├→ Extract 75 ideas
    ├→ Cluster similar (25 clusters)
    ├→ Select best (23 unique ideas)
    │
    ├→ Store in PostgreSQL
    │   └→ ideas table
    │       (sessionId, text, source, confidence)
    │
    └→ Return synthesized ideas

User Saves Favorite Ideas
    │
    ├→ POST /ideas/save
    │   └→ Store in saved_ideas table
    │       (ideaId, rating, notes, tags)
    │
User Browses Ideas Library
    │
    ├→ GET /ideas/saved?tags=innovation
    │   ├→ Query saved_ideas table
    │   ├→ Filter by tags
    │   ├→ Cache in Redis
    │   └→ Return sorted list
```

---

## 🔌 API Evolution Path

### Phase 1: Core Features (Current)
```
POST /multimodel          - Execute models
POST /synthesize          - Synthesize ideas
POST /ideas/save          - Save favorites
GET /ideas/saved          - Browse saved
```

### Phase 2: Advanced Features (Recommended)
```
POST /batch-research      - Multiple concurrent researches
GET /ideas/analytics      - Stats on ideas
POST /ideas/export        - Export to CSV/PDF
POST /research/compare    - Compare 2 sessions
```

### Phase 3: Enterprise Features (Future)
```
POST /teams/:id/research  - Team-based research
POST /projects/:id/ideas  - Project-based ideas
GET /admin/dashboard      - System analytics
POST /sync/api            - Webhook delivery
```

---

## 💰 Cost Attribution Model

### Per Research Execution
```
Input Token Costs:
  All 5 models get same prompt: ~250 tokens
  
  deepseek: 250 × 0.0005 = $0.000125
  perplexity: 250 × 0.003 = $0.00075
  mistral: 250 × 0.004 = $0.001
  llama: 250 × 0.0002 = $0.00005
  gemma: 250 × 0.0001 = $0.000025
  
  Input Total ≈ $0.00195

Output Token Costs (avg 1500 tokens each):
  deepseek: 1500 × 0.002 = $0.003
  perplexity: 1500 × 0.015 = $0.0225
  mistral: 1500 × 0.012 = $0.018
  llama: 1500 × 0.0003 = $0.00045
  gemma: 1500 × 0.0002 = $0.0003
  
  Output Total ≈ $0.04625

Total Cost Per Research: ≈ $0.048 (4.8 cents)
```

---

## 🚦 Performance Expectations by Component

### API Response Times
```
Endpoint                        Expected Time
──────────────────────────────────────────────
POST /multimodel                3-30 seconds
  (parallel 5 models)           (depends on model speed)
  
POST /synthesize                1-3 seconds
  (clustering 50-75 ideas)      (depends on idea count)
  
GET /ideas/saved                100-500ms
  (query + pagination)          (depends on index)
  
POST /ideas/save                30-100ms
  (single insert)               (local DB)
  
GET /sessions                   500ms-2s
  (list with pagination)        (depends on count)
  
GET /find/related               100-200ms
  (semantic search)             (embedding lookup)
```

---

## 🔐 Security Architecture

### Authentication Flow
```
Frontend Request
    ↓
  Include Header: X-Api-Key: dev_local_api_key_9f3b
    ↓
Backend auth.js Middleware
    ├→ Extract header
    ├→ Compare with config API_KEY
    ├→ If match → next()
    └→ If no match → 401 Unauthorized

Rate Limiter
    ├→ Track by IP address
    ├→ Count requests in 1-minute window
    ├→ Limit: 100 requests/min
    ├→ If exceeded → 429 Too Many Requests
    └→ If underscore → next()

Request Validator
    ├→ Validate request body schema
    ├→ Validate path parameters
    ├→ Validate query strings
    ├→ If invalid → 400 Bad Request
    └→ If valid → next()

Business Logic Layer
    └→ Process request
```

---

## 🎯 Website Architecture (Frontend)

### Page Hierarchy
```
Root (/)
├─ Home / Landing
│  └─ Feature highlights
│  └─ Statistics
│  └─ CTA: "Start Research"
│
├─ Research (/research)
│  ├─ Input form
│  ├─ Model selection (optional)
│  └─ Submit button
│
├─ Results (/results?sessionId=...)
│  ├─ 5-column model outputs
│  ├─ Synthesis button
│  ├─ Synthesized ideas display
│  └─ Save buttons (per idea)
│
├─ Ideas Library (/ideas)
│  ├─ Global search
│  ├─ Tag filters
│  ├─ Sort options
│  ├─ Idea grid/list
│  └─ Bulk actions
│
├─ Sessions (/sessions)
│  ├─ History table
│  ├─ Filter by status
│  ├─ Quick actions
│  └─ Re-run / Re-synthesize
│
├─ Dashboard (/dashboard)
│  ├─ Stats cards
│  ├─ Charts
│  └─ Recent activity
│
└─ Settings (/settings)
   ├─ API configuration
   ├─ User preferences
   └─ Export options
```

---

## 📡 Deployment Architecture

### Local Development
```
Ports:
  3000 → Research Backend
  3001 → Storage Backend
  5432 → PostgreSQL
  6379 → Redis
  8081 → Frontend (static)

Start Order:
  1. PostgreSQL
  2. Redis
  3. Backend (npm start)
  4. Worker (npm run worker)
  5. Frontend (npm run dev)
```

### Production Deployment
```
Docker Compose:
  redis:5.0 ────┬─→ Research Backend Container → /api/v1
  postgres:12 ──┤
                ├─→ Storage Backend Container → localhost:3001
                │
                ├─→ Frontend Nginx → index.html + assets
                │
                └─→ Prometheus (monitoring)

Load Balancer:
  api.yourdomain.com → Research Backend (3 instances)
  app.yourdomain.com → Frontend (CDN)
  storage.yourdomain.com → Storage Backend

CI/CD:
  Git Push → GitHub Actions
  → Run Tests
  → Build Docker Images
  → Push to Docker Registry
  → Deploy to Kubernetes
```

---

## 📊 Database Query Patterns

### Common Queries
```sql
-- Get all raw outputs for a session
SELECT * FROM raw_outputs 
WHERE session_id = $1 
ORDER BY created_at DESC;

-- Find ideas by tag
SELECT * FROM ideas 
WHERE tags @> $1 
LIMIT 50;

-- Get all messages in a session
SELECT * FROM ideas 
WHERE session_id = $1 
AND confidence_score > 0.8 
ORDER BY confidence_score DESC;

-- Count ideas by source model
SELECT source_model, COUNT(*) 
FROM ideas 
GROUP BY source_model;

-- Get trending tags (last 30 days)
SELECT 
  jsonb_array_elements(tags) as tag, 
  COUNT(*) 
FROM ideas 
WHERE created_at > NOW() - INTERVAL '30 days' 
GROUP BY tag 
ORDER BY COUNT(*) DESC 
LIMIT 20;

-- Find similar ideas
SELECT * FROM ideas 
WHERE id != $1 
AND session_id = $2 
ORDER BY similarity(idea_text, (SELECT idea_text FROM ideas WHERE id = $1)) DESC 
LIMIT 10;
```

---

## 🎨 UI Component Architecture

### React Component Tree Example
```
<App>
  <Layout>
    <Header>
      <Nav>
        <Link to="/research" />
        <Link to="/ideas" />
        <Link to="/sessions" />
      </Nav>
    </Header>
    
    <Routes>
      <Route path="/" component={<Home />} />
      
      <Route path="/research" component={<Research />}>
        <ProblemInput />
        <ModelSelector />
        <SubmitButton />
      </Route>
      
      <Route path="/results/:sessionId" component={<Results />}>
        <ModelOutputs>
          <ModelCard model="deepseek" />
          <ModelCard model="perplexity" />
          ...
        </ModelOutputs>
        <SynthesisResults>
          <ThemesList />
          <IdeasList>
            <IdeaCard />
          </IdeasList>
        </SynthesisResults>
      </Route>
      
      <Route path="/ideas" component={<IdeasLibrary />}>
        <SearchBox />
        <TagFilter />
        <IdeasGrid>
          <IdeaCard />
        </IdeasGrid>
      </Route>
    </Routes>
    
    <Footer />
  </Layout>
</App>
```

---

## 🌍 Multi-Tenant Capability (Future Ready)

### Current: Single-Tenant
```
One database for all users
All data in shared tables
API key: static
```

### Ready to Scale to Multi-Tenant
```
Tenant ID in all tables
Row-level security (RLS)
API key per tenant
Rate limits per tenant
Separate Redis namespaces
```

Implementation easy because:
- ✅ UUID-based IDs (not sequential)
- ✅ Modular service layer
- ✅ PostgreSQL RLS support
- ✅ API key auth ready

---

## 📞 Support Matrix

| Component | Problem | Solution |
|-----------|---------|----------|
| Backend | Won't start | Check env vars, logs |
| Database | Connection fails | Verify PostgreSQL running |
| Redis | Queue stuck | Check Redis connection |
| Frontend | API errors | Check CORS, API key |
| Models | 402 errors | Verify API credit |
| Synthesis | Slow | Check DB indexes, Redis |
| Files | Upload fails | Check Google Drive quota |

---

**Last Updated:** 2026-03-20  
**Version:** 1.0.0  
**Status:** Ready for Implementation
