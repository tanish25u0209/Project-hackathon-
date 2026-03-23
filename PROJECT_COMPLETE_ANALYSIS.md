# Complete Project Analysis & Website Build Guide

## 📋 Project Overview

This is a **Multi-LLM Research & Ideas Platform** with three main components:

1. **Research Backend** - A production-grade API for multi-model AI research synthesis
2. **Chatbot Frontend** - A local deployable web interface (PROMPTFORGE)
3. **Storage Backend** - Google Drive integration for file management

The platform enables users to submit research problems, get multiple AI model perspectives, synthesize insights, and save/organize ideas.

---

## 🏗️ Folder Structure & Components

### 1. **research_backend/** - Main API Server
**Purpose:** Core backend API for research execution, ideas management, and multi-model synthesis

#### Key Files:
- **src/app.js** - Express application setup with security middleware
- **src/config/index.js** - Configuration management (API keys, allowed origins, database)
- **src/config/models.js** - LLM model configurations and metadata
- **package.json** - Dependencies: Express, OpenAI, Google AI, Anthropic, BullMQ, PostgreSQL, Redis

#### Core Modules:

##### Controllers (`src/controllers/`)
- **research.controller.js** - Synchronous and async research execution
- **multimodel.controller.js** - Parallel execution of 5 LLM models
- **session.controller.js** - Session tracking and retrieval
- **synthesis.controller.js** - Idea synthesis and deduplication
- **ideas.controller.js** - CRUD operations for saved ideas

##### Services (`src/services/`)
- **researchService.js** - Main research pipeline orchestration
- **synthesisEngine.js** - Advanced idea synthesis with semantic clustering
- **similarityService.js** - Semantic similarity detection for deduplication
- **embeddingService.js** - Vector embeddings for similarity analysis
- **sessionRepository.js** - Session persistence layer
- **rawOutputRepository.js** - Raw model output storage

##### Routes (`src/routes/`)
- **research.routes.js** - `/research` endpoints (sync/async research)
- **multimodel.routes.js** - `/multimodel` endpoints (5-model execution)
- **session.routes.js** - `/sessions` endpoints (session management)
- **synthesis.routes.js** - `/sessions/:id/synthesize` (idea synthesis)
- **ideas.routes.js** - `/ideas` endpoints (save/rate/search ideas)

##### Providers (`src/providers/`)
- **openrouter.js** - OpenRouter unified client for all models
- **gemini.js** - Google Gemini API wrapper
- **grok.js** - Grok API wrapper
- **index.js** - Provider routing logic

##### Clients (`src/clients/`)
- **openrouterClient.js** - Multi-key OpenRouter client with fallback logic

##### Middleware (`src/middleware/`)
- **auth.js** - API key validation
- **errorHandler.js** - Global error handling
- **rateLimiter.js** - Request rate limiting
- **validate.js** - Input validation

##### Queue System (`src/queue/`)
- **researchQueue.js** - Job queue management using BullMQ
- **worker.js** - Background job processor

##### Database (`src/db/`)
- **pool.js** - PostgreSQL connection pooling
- **migrate.js** - Database schema migrations
- **migrations/** - SQL migration files

##### Utilities (`src/utils/`)
- **logger.js** - Winston logging
- **promptBuilder.js** - intelligent prompt template builder
- **llmSchema.js** - Response schema validation
- **errors.js** - Custom error classes

#### Test Files
- **test-all-models.js** - Tests all 5 LLM models in parallel
- **test-openrouter-simple.js** - Simple OpenRouter API test
- **test-similarity-service.js** - Semantic similarity testing
- **test-diagnostics.js** - System diagnostics

---

### 2. **chatbot/** - Frontend Web Application
**Purpose:** User-facing interface for research interaction (PROMPTFORGE)

#### Files:
- **index.html** - Main HTML entry point (React SPA)
- **assets/index-D1nFTFIr.js** - Compiled React/JavaScript bundle
- **assets/index-DbSHTNpS.css** - Compiled CSS styles
- **start-local.ps1** - PowerShell script to run locally
- **README.md** - Frontend deployment guide

#### Features:
- Interactive problem statement input
- Real-time research execution status
- Multi-model output visualization
- Idea synthesis results display
- Idea saving and rating interface
- Session history and management

#### How It Works:
1. User inputs a problem statement
2. Frontend calls `/api/v1/multimodel` endpoint
3. Gets responses from 5 LLM models in parallel
4. Displays raw outputs
5. User triggers synthesis via `/sessions/:sessionId/synthesize`
6. Shows deduplicated, strategically organized ideas
7. Users can save, rate, and organize ideas

---

### 3. **storage/** - File Management Backend
**Purpose:** Google Drive integration for file upload/download

#### Key Files:
- **index.js** - Express server for file operations
- **routes/files.js** - Upload/download endpoints
- **middleware/errorHandler.js** - Error handling for file operations
- **utils/googleAuth.js** - Google OAuth/Service Account authentication
- **package.json** - Dependencies: Express, googleapis, busboy

#### Endpoints:
- **POST /upload** - Stream large files to Google Drive
- **GET /file/:fileId** - Download file from Google Drive
- **GET /file/:fileId/meta** - Get file metadata

#### Features:
- Large file streaming support (>5GB)
- OAuth2 or Service Account authentication
- Automatic chunked upload/download
- Error retry logic

---

## 🔧 Complete Technical Architecture

### Technology Stack
```
Frontend:
- React.js (UI framework)
- Vite/Build tooling
- Modern CSS with animations

Backend:
- Node.js/Express.js
- PostgreSQL (data persistence)
- Redis (caching & queue)
- BullMQ (job queue)

AI/LLM:
- OpenRouter (unified API)
- Models: DeepSeek, Perplexity, Mistral, Llama, Gemma
- Anthropic Claude API
- Google Gemini API
- Grok API

Storage:
- Google Drive API v3
- Large file streaming

Infrastructure:
- Docker-ready
- Environment-based configuration
- Production security headers
```

### Request Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (PROMPTFORGE)                       │
│                  (React SPA on localhost:8081)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
           ┌─────────────────────────────────────┐
           │   RESEARCH BACKEND (localhost:3000)  │
           └──────────────┬──────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ↓               ↓               ↓
    ┌──────────┐  ┌──────────────┐  ┌──────────┐
    │PostgreSQL│  │   Redis      │  │ BullMQ   │
    │(Sessions,│  │  (caching)   │  │ (queues) │
    │Ideas)    │  │              │  │          │
    └──────────┘  └──────────────┘  └──────────┘
          │
          ↓
    ┌────────────────────────────────────┐
    │   EXTERNAL AI SERVICES             │
    ├────────────────────────────────────┤
    │ • OpenRouter API (unified)          │
    │   - DeepSeek/deepseek-chat         │
    │   - Perplexity/sonar               │
    │   - Mistral/mistral-large          │
    │   - Llama/llama-3-8b-instruct      │
    │   - Google/gemma-3-27b-it          │
    │                                     │
    │ • Anthropic Claude API              │
    │ • Google Gemini API                 │
    │ • Grok API                          │
    └────────────────────────────────────┘
          │
          ↓
    ┌────────────────────────────┐
    │   STORAGE BACKEND          │
    │  (localhost:3001)          │
    └──────────────┬─────────────┘
                   ↓
            ┌─────────────────────┐
            │   Google Drive API  │
            │   (File Storage)    │
            └─────────────────────┘
```

---

## 📡 Complete API Reference

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
```
Header: X-Api-Key: dev_local_api_key_9f3b
```

### Core Endpoints

#### 1. Multi-Model Research Execution
```
POST /multimodel
Request: { input: string (10-5000 chars) }
Response: {
  success: boolean,
  data: {
    sessionId: UUID,
    results: [
      { model, output, latencyMs, promptTokens, completionTokens },
      ...
    ],
    successCount: number,
    failureCount: number
  }
}
```

#### 2. Synchronous Research (Single Model)
```
POST /research
Request: { problemStatement: string (20-5000 chars), metadata?: object }
Response: {
  success: boolean,
  data: {
    sessionId: UUID,
    jobId: string,
    pollUrl: string
  }
}
```

#### 3. Asynchronous Research
```
POST /research/async
Request: { problemStatement: string, metadata?: object }
Response: {
  success: boolean,
  data: {
    sessionId: UUID,
    jobId: string,
    status: 'pending' | 'processing' | 'completed',
    result?: object
  }
}
```

#### 4. Poll Research Status
```
GET /research/:sessionId
Response: { sessionId, status, result, createdAt, updatedAt }
```

#### 5. Check Job Status
```
GET /research/job/:jobId
Response: { jobId, status, result, progress }
```

#### 6. Synthesize Raw Outputs → Strategic Ideas
```
POST /sessions/:sessionId/synthesize
Request: {} (uses raw outputs from session)
Response: {
  success: boolean,
  data: {
    researchSummary: {
      dominantThemes: string[],
      contrarianInsights: string[],
      systemicPatterns: string[]
    },
    uniqueIdeas: [
      { id, text, source, confidence, tags, relatedIdeas },
      ...
    ],
    discardedIdeas: [ { reason, originalIdeas } ],
    metadata: { modelCount, totalExtracted, synthesizedAt }
  }
}
```

#### 7. Get Session Details
```
GET /sessions/:id
Response: {
  id: UUID,
  problemStatement: string,
  status: string,
  uniqueIdeas: number,
  createdAt: ISO8601,
  updatedAt: ISO8601
}
```

#### 8. List Sessions
```
GET /sessions?limit=20&offset=0&status=completed
Response: { success: boolean, data: { sessions: [...], total: number } }
```

#### 9. Get Session Ideas
```
GET /sessions/:id/ideas?unique=true
Response: { success: boolean, data: { ideas: [...] } }
```

#### 10. Save Idea (Like/Favorite)
```
POST /ideas/save
Request: {
  ideaText: string,
  sourceModel: string,
  sessionId: UUID,
  tags: string[]
}
Response: { success: boolean, data: { id, createdAt } }
```

#### 11. Get Saved Ideas
```
GET /ideas/saved?tags=innovation&limit=50&offset=0
Response: { success: boolean, data: { ideas: [...], total: number } }
```

#### 12. Get Single Idea
```
GET /ideas/:ideaId
Response: {
  id: UUID,
  text: string,
  sourceModel: string,
  tags: string[],
  rating: 1-5,
  relatedIdeas: UUID[],
  notes: string,
  savedAt: ISO8601
}
```

#### 13. Update Idea (Add Notes/Tags)
```
PATCH /ideas/:ideaId
Request: { notes: string, tags: string[] }
Response: { success: boolean, data: { id, updatedAt } }
```

#### 14. Rate Idea
```
POST /ideas/:ideaId/rate
Request: { rating: 1-5 }
Response: { success: boolean, data: { id, rating, updatedAt } }
```

#### 15. Find Related Ideas
```
GET /ideas/:ideaId/related
Response: {
  success: boolean,
  data: { relatedIdeas: [...], similarity: number[] }
}
```

#### 16. Delete Session
```
DELETE /sessions/:id
Response: { success: boolean, data: { id, deletedAt } }
```

#### 17. Delete Idea
```
DELETE /ideas/:ideaId
Response: { success: boolean, data: { id, deletedAt } }
```

#### 18. Deepen Idea (Get More Details on Specific Idea)
```
POST /research/:sessionId/deepen/:ideaId
Request: {
  provider?: string (model ID),
  depthLevel?: 1-3
}
Response: {
  success: boolean,
  data: {
    ideaExpanded: string,
    implementation: string,
    challenges: string,
    opportunities: string
  }
}
```

#### 19. File Upload to Google Drive
```
POST /upload
Headers: Content-Type: application/octet-stream
Body: File stream
Response: { fileId, fileName, size, mimeType, webViewLink }
```

#### 20. File Download from Google Drive
```
GET /file/:fileId
Response: File stream (binary)
```

#### 21. Get File Metadata
```
GET /file/:fileId/meta
Response: { fileId, fileName, size, mimeType, createdTime, modifiedTime }
```

#### 22. Health Check
```
GET /health
Response: { success: true, status: 'ok', uptime: number, version: string }
```

---

## 💾 Database Schema

### PostgreSQL Tables

#### 1. `sessions` table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  problem_statement TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  unique_ideas_count INT DEFAULT 0,
  metadata JSONB,
  session_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

#### 2. `raw_outputs` table
```sql
CREATE TABLE raw_outputs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  model_id VARCHAR(255),
  output TEXT,
  error TEXT,
  latency_ms INT,
  prompt_tokens INT,
  completion_tokens INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `ideas` table
```sql
CREATE TABLE ideas (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  idea_text TEXT NOT NULL,
  source_model VARCHAR(255),
  confidence_score FLOAT,
  tags JSONB,
  rating INT,
  notes TEXT,
  related_ideas JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

#### 4. `saved_ideas` table
```sql
CREATE TABLE saved_ideas (
  id UUID PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id),
  user_id VARCHAR(255),
  rating INT,
  notes TEXT,
  tags JSONB,
  saved_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

#### 5. `research_jobs` table (BullMQ)
```sql
CREATE TABLE research_jobs (
  id UUID PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE,
  session_id UUID REFERENCES sessions(id),
  status VARCHAR(50),
  result JSONB,
  error TEXT,
  progress INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Key Features Explained

### Feature 1: Multi-Model Research Pipeline
**What It Does:** Executes the same research prompt across 5 AI models in parallel

**Models Used:**
1. DeepSeek Chat - Strong reasoning, cost-effective
2. Perplexity Sonar - Real-time data, web search
3. Mistral Large - Balanced performance
4. Llama 3 8B - Lightweight, fast
5. Gemma 3 27B - Google's latest, strong reasoning

**How It Works:**
```
Your Problem → 5 API Keys → Execute 5 Models → Parallel Execution (5-30 seconds)
```

**API Response Includes:**
- Raw output from each model
- Token usage (cost tracking)
- Latency metrics
- Combined sessionId for synthesis

---

### Feature 2: Idea Synthesis Engine
**What It Does:** Deduplicates and clusters ideas across all 5 models

**Process:**
1. Extract all ideas from 5 model outputs
2. Calculate semantic similarity (embeddings-based)
3. Group similar ideas into clusters
4. Identify dominant themes
5. Extract contrarian insights
6. Identify systemic patterns
7. Generate unique strategic ideas

**Output:**
```json
{
  "uniqueIdeas": [{
    "id": "uuid",
    "text": "Idea here",
    "source": "model_name",
    "confidence": 0.95,
    "tags": ["theme", "category"],
    "relatedIdeas": ["other_idea_ids"]
  }],
  "dominantThemes": ["theme1", "theme2"],
  "contrarianInsights": ["different perspective"],
  "systemicPatterns": ["underlying pattern"]
}
```

---

### Feature 3: Ideas Management System
**What It Does:** Save, organize, rate, and search ideas

**Capabilities:**
- ✅ Save favorite ideas
- ✅ Add custom notes and tags
- ✅ Rate ideas (1-5 stars)
- ✅ Find related ideas (semantic search)
- ✅ Search by tags
- ✅ Track creation/update timestamps
- ✅ Soft delete with recovery potential

**Use Cases:**
- Build a personal knowledge base
- Create tagged collections
- Track idea development over time
- Find patterns in your insights

---

### Feature 4: Queue-Based Async Processing
**What It Does:** Handles long-running research jobs without blocking

**Technologies:**
- BullMQ - Job queue
- Redis - Message broker
- Worker processes - Background execution

**workflow:**
```
POST /research/async → Create Job → Return jobId Immediately
  ↓ (background)
Process with Worker → Poll GET /research/job/:jobId → Check Status
  ↓ (completed)
Retrieve full result
```

---

### Feature 5: Multi-Key API Fallback Strategy
**What It Does:** Prevents quota errors with 5 dedicated API keys

**How:**
```
modelA (Key #1) ──→ 402 Error ──→ Try Key #2
modelB (Key #2) ──→ Success ✓
modelC (Key #3) ──→ Rotate if needed
modelD (Key #4) ──→ Round-robin distribution
modelE (Key #5) ──→ 5x throughput capacity
```

**Benefit:** Can handle 5x more concurrent research requests

---

### Feature 6: Security & Rate Limiting
**What It Does:** Protects API from abuse

**Implementations:**
- API key validation on all routes
- Rate limiting per IP (globalLimiter)
- Research-specific rate limiting (researchLimiter)
- Input validation & sanitization
- Helmet security headers
- CORS configuration
- HTTP Parameter Pollution (HPP) prevention
- Request size limits (50KB)

---

### Feature 7: Production Logging
**What It Does:** Tracks system performance and issues

**Logger:** Winston
**Log Levels:** Info, Debug, Warn, Error
**Tracked:**
- Request received/completed
- Job status changes
- Error stack traces
- API latency
- Token usage
- Model performance

---

## 🌐 How to Build a Website with All Features

### Step 1: Frontend Architecture
```
┌─────────────────────────────────────┐
│        WEBSITE HOMEPAGE              │
├─────────────────────────────────────┤
│  1. Research Input Page              │
│     - Problem statement textarea     │
│     - Submit button                  │
│     - Status messages                │
│                                       │
│  2. Research Results Page            │
│     - Display raw outputs (5 models) │
│     - Show synthesis summary         │
│     - List unique ideas              │
│                                       │
│  3. Ideas Management Page            │
│     - Saved ideas library            │
│     - Filter by tags/rating          │
│     - Search functionality           │
│     - Bulk operations                │
│                                       │
│  4. Session History Page             │
│     - List all past researches       │
│     - Quick re-synthesis             │
│     - Export results                 │
│                                       │
│  5. Dashboard Page                   │
│     - Statistics (ideas saved, etc)  │
│     - Trending tags                  │
│     - Recent activity                │
└─────────────────────────────────────┘
```

### Step 2: Key Pages to Implement

#### Page 1: Research Input Page
```html
<form>
  <textarea id="problemStatement" placeholder="Describe your research problem..."></textarea>
  <button onclick="submitResearch()">Execute Multi-Model Research</button>
  <div id="status">Waiting for input...</div>
</form>
<script>
async function submitResearch() {
  const input = document.getElementById('problemStatement').value;
  const res = await fetch('/api/v1/multimodel', {
    method: 'POST',
    headers: { 'X-Api-Key': 'dev_local_api_key_9f3b', 'Content-Type': 'application/json' },
    body: JSON.stringify({ input })
  });
  const data = await res.json();
  window.location.href = `/results?sessionId=${data.data.sessionId}`;
}
</script>
```

#### Page 2: Research Results Page
```html
<div id="rawOutputs">
  <!-- Display 5 model outputs side-by-side -->
  <div class="model-card">DeepSeek: [output]</div>
  <div class="model-card">Perplexity: [output]</div>
  <div class="model-card">Mistral: [output]</div>
  <div class="model-card">Llama: [output]</div>
  <div class="model-card">Gemma: [output]</div>
</div>
<button onclick="synthesize()">Synthesize Ideas</button>
<div id="synthesisResults">
  <!-- Display synthesized ideas -->
</div>
<script>
async function synthesize() {
  const sessionId = getSessionId();
  const res = await fetch(`/api/v1/sessions/${sessionId}/synthesize`, {
    method: 'POST',
    headers: { 'X-Api-Key': 'dev_local_api_key_9f3b' }
  });
  const data = await res.json();
  displaySynthesizedIdeas(data.data.uniqueIdeas);
}
</script>
```

#### Page 3: Ideas Library Page
```html
<div>
  <input id="searchBox" placeholder="Search ideas...">
  <div id="tagFilter">
    <!-- Dynamically populate tags -->
  </div>
  <div id="ideasGrid">
    <!-- Display all saved ideas -->
    <div class="idea-card">
      <h3>Idea Title</h3>
      <p>Idea content</p>
      <div class="rating">⭐⭐⭐⭐⭐</div>
      <div class="tags">#tag1 #tag2</div>
      <button onclick="viewRelated(ideaId)">See Related</button>
    </div>
  </div>
</div>
<script>
async function loadIdeas() {
  const res = await fetch('/api/v1/ideas/saved?limit=50', {
    headers: { 'X-Api-Key': 'dev_local_api_key_9f3b' }
  });
  const data = await res.json();
  renderIdeas(data.data.ideas);
}
</script>
```

#### Page 4: Session History Page
```html
<table>
  <tr>
    <th>Problem Statement</th>
    <th>Status</th>
    <th>Ideas Count</th>
    <th>Created At</th>
    <th>Actions</th>
  </tr>
  <tbody id="sessions">
    <!-- Populated dynamically -->
  </tbody>
</table>
<script>
async function loadSessions() {
  const res = await fetch('/api/v1/sessions?limit=100', {
    headers: { 'X-Api-Key': 'dev_local_api_key_9f3b' }
  });
  const data = await res.json();
  renderSessions(data.data.sessions);
}
</script>
```

### Step 3: Frontend Features Checklist

```
□ Homepage / Landing Page
  □ Call-to-action for research
  □ Stats dashboard (total researches, ideas saved)
  □ Feature highlights

□ Research Page
  □ Problem input form
  □ Real-time status updates
  □ Model selection (optional)
  □ Progress bar & time estimates

□ Results Page
  □ 5-column layout (one per model)
  □ Raw output display
  □ Copy/export functionality
  □ Synthesis trigger button
  □ Synthesized ideas display
  □ Save idea buttons

□ Ideas Library Page
  □ Grid/list view toggle
  □ Advanced search
  □ Tag filtering
  □ Sort by rating/date
  □ Batch operations (tag, rate, delete)
  □ Export to CSV/JSON

□ Session History
  □ Sortable table
  □ Quick re-synthesis
  □ Compare sessions
  □ Bulk actions

□ Dashboard
  □ Statistics (searches, ideas, avg rating)
  □ Trending tags cloud
  □ Recent activity feed
  □ Quick stats

□ Settings Page
  □ API key management (if needed)
  □ Preferences (models, default tags)
  □ Export settings

□ Optional: Search & Export
  □ Global search across ideas
  □ PDF report generation
  □ CSV export
```

### Step 4: Frontend Integration Examples

#### React Example (Hook-based)
```jsx
import { useState, useEffect } from 'react';

function ResearchPage() {
  const [problemStatement, setProblemStatement] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/v1/multimodel', {
      method: 'POST',
      headers: {
        'X-Api-Key': 'dev_local_api_key_9f3b',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: problemStatement })
    });
    const data = await res.json();
    setSessionId(data.data.sessionId);
    setResults(data.data.results);
    setLoading(false);
  };

  const handleSynthesize = async () => {
    const res = await fetch(`/api/v1/sessions/${sessionId}/synthesize`, {
      method: 'POST',
      headers: { 'X-Api-Key': 'dev_local_api_key_9f3b' }
    });
    const data = await res.json();
    setResults(data.data);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          placeholder="Enter your research problem..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Execute Research'}
        </button>
      </form>

      {results && (
        <div>
          <h2>Results</h2>
          {results.results?.map(r => (
            <div key={r.model}>
              <h3>{r.model}</h3>
              <p>{r.output}</p>
            </div>
          ))}
          <button onClick={handleSynthesize}>Synthesize Ideas</button>
        </div>
      )}
    </div>
  );
}

export default ResearchPage;
```

#### Vue Example
```vue
<template>
  <div class="research-page">
    <form @submit.prevent="submitResearch">
      <textarea
        v-model="problemStatement"
        placeholder="Enter your research problem..."
      ></textarea>
      <button :disabled="loading">
        {{ loading ? 'Processing...' : 'Execute Research' }}
      </button>
    </form>

    <div v-if="results" class="results">
      <h2>Results</h2>
      <div v-for="result in results.results" :key="result.model" class="model-output">
        <h3>{{ result.model }}</h3>
        <p>{{ result.output }}</p>
      </div>
      <button @click="synthesize">Synthesize Ideas</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      problemStatement: '',
      sessionId: null,
      results: null,
      loading: false
    };
  },
  methods: {
    async submitResearch() {
      this.loading = true;
      const res = await fetch('/api/v1/multimodel', {
        method: 'POST',
        headers: {
          'X-Api-Key': 'dev_local_api_key_9f3b',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: this.problemStatement })
      });
      const data = await res.json();
      this.sessionId = data.data.sessionId;
      this.results = data.data;
      this.loading = false;
    },
    async synthesize() {
      const res = await fetch(`/api/v1/sessions/${this.sessionId}/synthesize`, {
        method: 'POST',
        headers: { 'X-Api-Key': 'dev_local_api_key_9f3b' }
      });
      const data = await res.json();
      this.results = data.data;
    }
  }
};
</script>
```

---

## 🚀 Deployment Guide

### Backend Deployment (research_backend/)

#### 1. Prerequisites
- Node.js ≥ 18.0.0
- PostgreSQL 12+
- Redis 6+
- OpenRouter API key (with 5 keys for multi-model)
- Google Cloud credentials (for Gemini)
- Anthropic API key

#### 2. Environment Setup (.env)
```bash
# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# API Keys (5 keys for multi-model)
OPENROUTER_API_KEYS=key1,key2,key3,key4,key5
GOOGLE_API_KEY=your_google_key
ANTHROPIC_API_KEY=your_anthropic_key
GROK_API_KEY=your_grok_key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/research_db
REDIS_URL=redis://localhost:6379

# Auth
API_KEY=dev_local_api_key_9f3b

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Models
RESEARCH_MODELS=deepseek/deepseek-chat,perplexity/sonar,mistralai/mistral-large,meta-llama/llama-3-8b-instruct,google/gemma-3-27b-it
```

#### 3. Database Setup
```bash
npm run migrate  # Runs migrations/schema setup
```

#### 4. Start Services
```bash
npm start           # Start main server
npm run worker      # Start background job processor (in separate terminal)
```

#### 5. Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm ci --only=production
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]
```

### Frontend Deployment (chatbot/)

#### 1. Build Production Bundle
```bash
npm run build  # Creates optimized bundle
```

#### 2. Serve Static Files
```bash
# Option A: Use any static hosting (AWS S3, Vercel, Netlify)
# Option B: Use Express to serve
const express = require('express');
const app = express();
app.use(express.static('dist'));
app.listen(8081);
```

#### 3. Environment Variables
```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_API_KEY=dev_local_api_key_9f3b
```

### Storage Deployment (storage/)

#### 1. Google Drive Setup
```bash
# Create service account or OAuth2 credentials
# Store in .env:
GOOGLE_DRIVE_FOLDER_ID=your_folder_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY='{"type":"service_account",...}'
# OR
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_secret
GOOGLE_OAUTH_REFRESH_TOKEN=your_refresh_token
```

#### 2. Start Storage Service
```bash
npm start  # Runs on port 3001
```

---

## 📊 Usage Statistics & Metrics

### Track These Metrics
```
- Total researches executed
- Average research time (per model)
- Model success rates
- API token usage (cost tracking)
- Ideas saved per session
- Popular tags/themes
- User engagement (sessions, ideas added)
- System uptime & latency
- Error rates by component
```

### Example Monitoring Dashboard
```
┌─────────────────────────────┐
│  SYSTEM HEALTH              │
│  Backend: 99.9% uptime      │
│  Avg Response: 8.2s         │
│  Errors (24h): 3            │
├─────────────────────────────┤
│  USAGE (24 hours)           │
│  Researches: 234            │
│  Ideas Saved: 1,203         │
│  Total Models: 1,170        │
│  Avg Ideas/Research: 5.1    │
├─────────────────────────────┤
│  COST TRACKING              │
│  Tokens Used: 4.2M          │
│  Est. Cost: $12.50          │
│  Top Model: Deepseek (45%)  │
└─────────────────────────────┘
```

---

## 🔐 Security Considerations

1. **API Key Management**
   - Rotate keys regularly
   - Use environment variables
   - Never commit keys to repo

2. **Database Security**
   - Use PostgreSQL SSL connections
   - Implement Row-Level Security (RLS)
   - Regular backups

3. **Input Validation**
   - Validate all user inputs
   - Sanitize before storing
   - Max request sizes enforced

4. **Rate Limiting**
   - Global rate limiter
   - Research-specific limits
   - Per-IP tracking

5. **Logging & Monitoring**
   - Log all API calls
   - Monitor for suspicious patterns
   - Error tracking & alerts

---

## 📝 Additional Resources

### Documentation Files in Project
- [FRONTEND_INTEGRATION.md](research_backend/FRONTEND_INTEGRATION.md) - Complete frontend guide
- [API_QUICK_REFERENCE.md](research_backend/API_QUICK_REFERENCE.md) - Quick API examples
- [IMPLEMENTATION_COMPLETE.md](research_backend/IMPLEMENTATION_COMPLETE.md) - Implementation status

### External Documentation
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [BullMQ Queue System](https://docs.bullmq.io/)

---

## ✅ Complete Checklist for Website Build

```
BACKEND:
□ Setup PostgreSQL database
□ Setup Redis cache
□ Configure OpenRouter API keys (5 keys)
□ Configure other LLM providers (Google, Anthropic, Grok)
□ Deploy backend server
□ Setup background job worker
□ Configure CORS for frontend domain
□ Setup logging & monitoring
□ Configure rate limiting
□ Run database migrations
□ Test all API endpoints

FRONTEND:
□ Build React/Vue application
□ Implement research input page
□ Implement results display page
□ Implement ideas library page
□ Implement session history page
□ Add authentication (optional)
□ Add responsive design
□ Add error handling
□ Implement real-time status updates
□ Add export functionality
□ Deploy to hosting

STORAGE:
□ Setup Google Drive service account
□ Deploy storage backend
□ Test file upload/download
□ Integrate with research backend
□ Add file metadata display

TESTING:
□ Unit tests for controllers
□ Integration tests for APIs
□ E2E tests for critical flows
□ Load testing for multi-model execution
□ Security testing

MONITORING:
□ Setup error tracking
□ Setup performance monitoring
□ Setup uptime monitoring
□ Setup cost tracking
□ Create dashboards
```

---

## 🎓 Example Use Cases

### Use Case 1: Business Strategy Research
```
Problem: "How should we expand into Asian markets?"
→ 5 Models generate: 45 unique ideas
→ Synthesis produces: 12 strategic themes
→ Top ideas: Market entry strategies, partnerships, regulatory
→ Save top 5 for executive review
```

### Use Case 2: Product Innovation
```
Problem: "What features would make our product 10x better?"
→ 5 Models brainstorm: Multi-angle perspectives
→ Similar ideas consolidated: Reduces 234 ideas to 28 unique
→ Themes: AI integration, personalization, automation
→ Save & tag: #innovation #roadmap
```

### Use Case 3: Academic Research
```
Problem: "Summarize recent advances in quantum computing"
→ Perplexity provides: Latest research
→ Other models: Analysis & synthesis
→ Ideas: Key breakthroughs, limitations, applications
→ Export: Bibliography + formatted results
```

---

## 🤝 Support & Troubleshooting

### Common Issues

**Issue: 402 Quota Error**
- Solution: Ensure 5 API keys configured in OPENROUTER_API_KEYS
- Check: Keys have sufficient credits

**Issue: Slow Synthesis**
- Solution: Check Redis connection
- Check: Database indexes on raw_outputs table
- Tune: Similarity threshold in synthesis engine

**Issue: File Upload Fails**
- Solution: Check Google Drive API quota
- Check: Service account permissions
- Verify: GOOGLE_DRIVE_FOLDER_ID is correct

**Issue: Frontend Not Connecting**
- Solution: Check CORS configuration
- Check: API URL in frontend .env
- Check: API key matches backend config

---

## 📞 Next Steps

1. **Immediate:** Deploy backend + database
2. **Week 1:** Build frontend UI
3. **Week 2:** Integrate frontend with API
4. **Week 3:** Add monitoring & optimization
5. **Week 4:** Launch MVP & gather feedback

---

**Last Updated:** 2026-03-20
**Version:** 1.0.0 Complete
**Status:** Ready for Production
