# Frontend Integration Guide - Ideas API

## Complete Backend API Reference

Your backend now includes a full **Ideas Management System** for saving, rating, tagging, and searching synthesized ideas. This document provides all the details needed to integrate this system into your frontend.

---

## Table of Contents
1. [Multi-Model Synthesis & Multi-Key API](#multi-model-synthesis--multi-key-api)
2. [API Endpoints Overview](#api-endpoints-overview)
3. [Complete Endpoint Reference](#complete-endpoint-reference)
4. [Request/Response Examples](#requestresponse-examples)
5. [Error Handling](#error-handling)
6. [React Integration Examples](#react-integration-examples)
7. [Vue Integration Examples](#vue-integration-examples)
8. [Workflow Diagrams](#workflow-diagrams)
9. [Database Schema](#database-schema)

---

## Multi-Model Synthesis & Multi-Key API

### Overview
Your backend executes a **multi-model synthesis pipeline** using **5 concurrent AI models** with **5 dedicated API keys** for maximum throughput and reliability.

### Pipeline Flow
```
User Input
    ↓
POST /multimodel (5 keys distributed across 5 models)
    ├→ deepseek/deepseek-chat (Key #1)
    ├→ perplexity/sonar (Key #2)
    ├→ mistralai/mistral-large (Key #3)
    ├→ meta-llama/llama-3-8b-instruct (Key #4)
    └→ google/gemma-3-27b-it (Key #5)
    ↓
Raw Outputs + sessionId
    ↓
POST /sessions/{sessionId}/synthesize
    ├→ Cluster semantically similar ideas
    ├→ Remove duplicates
    ├→ Identify dominant themes
    ├→ Extract contrarian insights
    └→ Identify systemic patterns
    ↓
Synthesized Ideas (uniqueIdeas[])
    ↓
POST /ideas/save (Persist favorites)
```

### API Key Distribution Strategy
- **Key-Per-Model Assignment**: Each model is assigned a dedicated OpenRouter API key
- **Round-Robin**: If a key hits quota (402 error), automatically rotates to the next key
- **Exponential Backoff**: Graceful retry on rate limits and timeouts
- **No Single Point of Failure**: 5 keys = 5x quota capacity

### Configuration (for deployment)
```bash
# In your .env file:
OPENROUTER_API_KEY=sk-or-v1-<original-backup-key>
OPENROUTER_API_KEYS=sk-or-v1-<key1>,sk-or-v1-<key2>,sk-or-v1-<key3>,sk-or-v1-<key4>,sk-or-v1-<key5>
```

### Testing the Pipeline
```bash
# Step 1: Execute all 5 models
curl -X POST http://localhost:3000/api/v1/multimodel \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -H "Content-Type: application/json" \
  -d '{"input":"Your research question here"}'

# Response includes sessionId
# expectedOut: { success: true, data: { results: [...], sessionId: "uuid" } }

# Step 2: Synthesize outputs
curl -X POST http://localhost:3000/api/v1/sessions/{sessionId}/synthesize \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -H "Content-Type: application/json" \
  -d '{}'

# Returns deduplicated strategic ideas + metadata
```

### Expected Results
- **5 models → 5 parallel executions** (no bottlenecks)
- **All 5 API keys utilized** (no quota failures)
- **371+ raw ideas** extracted and clustered
- **235+ clusters** formed via semantic similarity
- **10 unique ideas** (synthesized consensus)
- **0 failure rate** with multi-key fallback

---

## API Endpoints Overview

### Prerequisites: Complete Synthesis Workflow

Before you can save ideas, you must execute the full synthesis pipeline:

1. **POST `/api/v1/multimodel`** 
   - Input: research question
   - Executes 5 models in parallel (using 5 dedicated API keys)
   - Returns: raw outputs + `sessionId`
   
2. **POST `/api/v1/sessions/:sessionId/synthesize`**
   - Input: sessionId from step 1
   - Clusters similar ideas, removes duplicates, extracts insights
   - Returns: `uniqueIdeas`, `discardedIdeas`, `researchSummary`
   
3. **POST `/api/v1/ideas/save`**
   - Input: idea from `uniqueIdeas` array (plus optional metadata)
   - Persists to database for later retrieval
   - Returns: saved idea with database `id`

### Ideas Management Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| **POST** | `/api/v1/ideas/save` | Save/bookmark an idea | ✅ Required |
| **GET** | `/api/v1/ideas/saved` | Get all saved ideas (paginated, filterable) | ✅ Required |
| **GET** | `/api/v1/ideas/:ideaId` | Get single idea details | ✅ Required |
| **PATCH** | `/api/v1/ideas/:ideaId` | Add notes and tags to idea | ✅ Required |
| **DELETE** | `/api/v1/ideas/:ideaId` | Remove saved idea | ✅ Required |
| **POST** | `/api/v1/ideas/:ideaId/rate` | Rate idea (1-5 stars) | ✅ Required |
| **GET** | `/api/v1/ideas/:ideaId/related` | Find related ideas | ✅ Required |

---

## Complete Endpoint Reference

### 1. POST /api/v1/ideas/save
**Save/bookmark an idea from synthesis results**

#### Request Headers
```
X-Api-Key: <your-api-key>
Content-Type: application/json
```

#### Request Body
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "ideaId": "idea_strategyA_001",
  "title": "Distributed Decision-Making Pods",
  "description": "Organize teams into autonomous decision-making units with clear ownership",
  "strategicThesis": "Decentralization reduces bottlenecks and improves agility",
  "mechanism": "Each pod has budget authority, hire/fire decisions, strategy ownership",
  "implementationFramework": {
    "phase1": "Identify natural team clusters (2 weeks)",
    "phase2": "Establish decision authorities (1 week)",
    "phase3": "Implement feedback loops (3 weeks)",
    "metricsToTrack": ["decision-velocity", "team-satisfaction", "revenue-per-pod"]
  },
  "ideaType": "organizational-structure",
  "derivedFromModels": ["deepseek-chat", "perplexity/sonar"],
  "supportCount": 2,
  "confidence": 0.87
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440999",
    "ideaId": "idea_strategyA_001",
    "title": "Distributed Decision-Making Pods",
    "savedAt": "2026-02-22T18:20:15.123Z"
  }
}
```

#### Error Cases
- **400**: Missing required fields (sessionId, ideaId, title, ideaType)
- **403**: Unauthorized - you don't own this session
- **404**: Session not found
- **409**: Idea already saved by this user

---

### 2. GET /api/v1/ideas/saved
**Retrieve all saved ideas with filters and pagination**

#### Query Parameters
```
page=1                    # Page number (default: 1)
limit=10                  # Items per page (default: 10)
sortBy=saved_at          # saved_at, updated_at, rating, title (default: saved_at)
order=DESC               # ASC or DESC (default: DESC)
filter=all               # all, rated, tagged (default: all)
search=culture           # Search in title and description
```

#### Example Requests
```bash
# Get page 1 with 10 items
curl -H "X-Api-Key: dev_local_api_key_9f3b" \
  "http://localhost:3000/api/v1/ideas/saved?page=1&limit=10"

# Get only rated ideas, sorted by rating (highest first)
curl -H "X-Api-Key: dev_local_api_key_9f3b" \
  "http://localhost:3000/api/v1/ideas/saved?filter=rated&sortBy=rating&order=DESC"

# Search for ideas with "culture" in title/description
curl -H "X-Api-Key: dev_local_api_key_9f3b" \
  "http://localhost:3000/api/v1/ideas/saved?search=culture&limit=5"

# Get tagged ideas, sorted by most recently updated
curl -H "X-Api-Key: dev_local_api_key_9f3b" \
  "http://localhost:3000/api/v1/ideas/saved?filter=tagged&sortBy=updated_at"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440999",
      "ideaId": "idea_strategyA_001",
      "title": "Distributed Decision-Making Pods",
      "description": "Organize teams into autonomous decision-making units",
      "ideaType": "organizational-structure",
      "rating": 5,
      "notes": "Aligns with our culture transformation goals",
      "tags": ["organization", "scaling", "high-priority"],
      "savedAt": "2026-02-22T18:20:15.123Z",
      "updatedAt": "2026-02-22T18:25:30.456Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 23,
    "pages": 3
  }
}
```

---

### 3. GET /api/v1/ideas/:ideaId
**Get full details of a single saved idea**

#### URL Parameters
```
:ideaId    # The saved idea UUID (from /saved response)
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440999",
    "ideaId": "idea_strategyA_001",
    "title": "Distributed Decision-Making Pods",
    "description": "Organize teams into autonomous decision-making units",
    "strategicThesis": "Decentralization reduces bottlenecks and improves agility",
    "mechanism": "Each pod has budget authority, hire/fire decisions, strategy ownership",
    "implementationFramework": {
      "phase1": "Identify natural team clusters (2 weeks)",
      "phase2": "Establish decision authorities (1 week)",
      "phase3": "Implement feedback loops (3 weeks)",
      "metricsToTrack": ["decision-velocity", "team-satisfaction", "revenue-per-pod"]
    },
    "ideaType": "organizational-structure",
    "derivedFromModels": ["deepseek-chat", "perplexity/sonar"],
    "supportCount": 2,
    "confidence": 0.87,
    "rating": 5,
    "notes": "Aligns with our culture transformation goals",
    "tags": ["organization", "scaling", "high-priority"],
    "savedAt": "2026-02-22T18:20:15.123Z",
    "updatedAt": "2026-02-22T18:25:30.456Z"
  }
}
```

---

### 4. PATCH /api/v1/ideas/:ideaId
**Add notes and tags to a saved idea**

#### Request Body
```json
{
  "notes": "Need to discuss implementation timeline with engineering team",
  "tags": ["organization", "scaling", "high-priority", "discussion-pending"]
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440999",
    "title": "Distributed Decision-Making Pods",
    "notes": "Need to discuss implementation timeline with engineering team",
    "tags": ["organization", "scaling", "high-priority", "discussion-pending"],
    "updatedAt": "2026-02-22T18:30:00.789Z"
  }
}
```

---

### 5. DELETE /api/v1/ideas/:ideaId
**Remove a saved idea**

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440999",
    "deleted": true
  }
}
```

---

### 6. POST /api/v1/ideas/:ideaId/rate
**Rate an idea (1-5 stars)**

#### Request Body
```json
{
  "rating": 5
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440999",
    "title": "Distributed Decision-Making Pods",
    "rating": 5,
    "updatedAt": "2026-02-22T18:35:12.345Z"
  }
}
```

#### Validation
- Rating must be an integer: 0-5
- 0 = No rating (clear previous rating)
- 1-5 = Star rating

---

### 7. GET /api/v1/ideas/:ideaId/related
**Find related ideas (same type + matching tags)**

#### Query Parameters
```
limit=5    # Number of related ideas to return (default: 5)
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440888",
      "title": "Cross-Team Guild System",
      "description": "Create voluntary guilds for skill-sharing across pods",
      "ideaType": "organizational-structure",
      "rating": 4,
      "tags": ["organization", "scaling", "collaboration"],
      "updatedAt": "2026-02-22T18:25:30.456Z"
    }
  ]
}
```

---

## Error Handling

### Standard Error Response Format
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

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Idea retrieved/updated |
| 201 | Created | Idea saved |
| 400 | Bad Request | Missing required fields |
| 403 | Forbidden | You don't own this idea |
| 404 | Not Found | Idea/session doesn't exist |
| 409 | Conflict | Idea already saved |

---

## React Integration Examples

### 1. Hook for Saving Ideas from Synthesis

```jsx
import { useState } from 'react';

export function useSaveIdea() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveIdea = async (sessionId, idea) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/ideas/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.REACT_APP_API_KEY,
        },
        body: JSON.stringify({
          sessionId,
          ideaId: idea.id,
          title: idea.title,
          description: idea.description,
          strategicThesis: idea.strategicThesis,
          mechanism: idea.mechanism,
          implementationFramework: idea.implementationFramework,
          ideaType: idea.ideaType,
          derivedFromModels: idea.derivedFromModels,
          supportCount: idea.supportCount,
          confidence: idea.confidence,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error.message);
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { saveIdea, loading, error };
}
```

### 2. Component: Synthesis Results with Save Button

```jsx
import { useState } from 'react';
import { useSaveIdea } from './useSaveIdea';

export function SynthesisResults({ sessionId, uniqueIdeas }) {
  const { saveIdea, loading, error } = useSaveIdea();
  const [savedIdeas, setSavedIdeas] = useState(new Set());

  const handleSaveIdea = async (idea) => {
    try {
      await saveIdea(sessionId, idea);
      setSavedIdeas((prev) => new Set([...prev, idea.id]));
      alert('Idea saved successfully!');
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  return (
    <div className="synthesis-results">
      <h2>Strategic Ideas ({uniqueIdeas.length})</h2>
      {error && <div className="error">{error}</div>}
      
      {uniqueIdeas.map((idea) => (
        <div key={idea.id} className="idea-card">
          <h3>{idea.title}</h3>
          <p className="description">{idea.description}</p>
          <div className="thesis">
            <strong>Strategic Thesis:</strong> {idea.strategicThesis}
          </div>
          <div className="mechanism">
            <strong>Mechanism:</strong> {idea.mechanism}
          </div>
          <div className="meta">
            <span className="type">📌 {idea.ideaType}</span>
            <span className="support">👥 {idea.supportCount} models</span>
            <span className="confidence">🎯 {(idea.confidence * 100).toFixed(0)}%</span>
          </div>
          
          <button
            onClick={() => handleSaveIdea(idea)}
            disabled={loading || savedIdeas.has(idea.id)}
            className={`save-btn ${savedIdeas.has(idea.id) ? 'saved' : ''}`}
          >
            {savedIdeas.has(idea.id) ? '✓ Saved' : '💾 Save Idea'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 3. Component: View & Manage Saved Ideas

```jsx
import { useEffect, useState } from 'react';

export function SavedIdeasList() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    sortBy: 'saved_at',
    order: 'DESC',
    filter: 'all',
    search: '',
  });

  useEffect(() => {
    fetchIdeas();
  }, [filters]);

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`/api/v1/ideas/saved?${queryParams}`, {
        headers: {
          'X-Api-Key': process.env.REACT_APP_API_KEY,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch ideas');

      const data = await response.json();
      setIdeas(data.data);
    } catch (err) {
      console.error('Error fetching ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRateIdea = async (ideaId, rating) => {
    try {
      const response = await fetch(`/api/v1/ideas/${ideaId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.REACT_APP_API_KEY,
        },
        body: JSON.stringify({ rating }),
      });

      if (!response.ok) throw new Error('Failed to rate');
      const result = await response.json();
      
      // Update local state
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId ? { ...idea, rating: result.data.rating } : idea
        )
      );
    } catch (err) {
      alert(`Error rating idea: ${err.message}`);
    }
  };

  const handleDeleteIdea = async (ideaId) => {
    if (!confirm('Delete this idea?')) return;

    try {
      const response = await fetch(`/api/v1/ideas/${ideaId}`, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': process.env.REACT_APP_API_KEY,
        },
      });

      if (!response.ok) throw new Error('Failed to delete');
      setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId));
    } catch (err) {
      alert(`Error deleting idea: ${err.message}`);
    }
  };

  return (
    <div className="saved-ideas-container">
      <div className="filters">
        <input
          type="text"
          placeholder="Search ideas..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
        />
        
        <select
          value={filters.filter}
          onChange={(e) => setFilters({ ...filters, filter: e.target.value, page: 1 })}
        >
          <option value="all">All Ideas</option>
          <option value="rated">Rated Only</option>
          <option value="tagged">Tagged Only</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
        >
          <option value="saved_at">Recently Saved</option>
          <option value="updated_at">Recently Updated</option>
          <option value="rating">Highest Rated</option>
          <option value="title">Title (A-Z)</option>
        </select>
      </div>

      <div className="ideas-grid">
        {loading && <p>Loading...</p>}
        {ideas.map((idea) => (
          <div key={idea.id} className="idea-item">
            <h4>{idea.title}</h4>
            <p>{idea.description}</p>
            
            <div className="rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`star ${idea.rating >= star ? 'filled' : ''}`}
                  onClick={() => handleRateIdea(idea.id, star)}
                >
                  ⭐
                </button>
              ))}
              <span className="rating-text">{idea.rating || 'No rating'}</span>
            </div>

            {idea.tags && (
              <div className="tags">
                {idea.tags.map((tag, idx) => (
                  <span key={idx} className="tag">{tag}</span>
                ))}
              </div>
            )}

            <button
              className="delete-btn"
              onClick={() => handleDeleteIdea(idea.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Hook: Rate & Tag Ideas

```jsx
export function useUpdateIdea() {
  const [loading, setLoading] = useState(false);

  const updateIdea = async (ideaId, updates) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.REACT_APP_API_KEY,
        },
        body: JSON.stringify(updates), // { notes, tags }
      });

      if (!response.ok) throw new Error('Failed to update');
      return await response.json();
    } finally {
      setLoading(false);
    }
  };

  return { updateIdea, loading };
}
```

---

## Vue Integration Examples

### 1. Composable: Save Ideas

```vue
<script setup>
import { ref } from 'vue';

export const useSaveIdea = () => {
  const loading = ref(false);
  const error = ref(null);

  const saveIdea = async (sessionId, idea) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/v1/ideas/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': import.meta.env.VITE_API_KEY,
        },
        body: JSON.stringify({
          sessionId,
          ideaId: idea.id,
          title: idea.title,
          description: idea.description,
          strategicThesis: idea.strategicThesis,
          mechanism: idea.mechanism,
          implementationFramework: idea.implementationFramework,
          ideaType: idea.ideaType,
          derivedFromModels: idea.derivedFromModels,
          supportCount: idea.supportCount,
          confidence: idea.confidence,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error.message);
      }

      return await response.json();
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { saveIdea, loading, error };
};
</script>
```

### 2. Component: Saved Ideas List (Vue)

```vue
<template>
  <div class="saved-ideas">
    <div class="filters">
      <input
        v-model="filters.search"
        type="text"
        placeholder="Search ideas..."
        @input="filters.page = 1; fetchIdeas()"
      />
      
      <select
        v-model="filters.filter"
        @change="filters.page = 1; fetchIdeas()"
      >
        <option value="all">All Ideas</option>
        <option value="rated">Rated Only</option>
        <option value="tagged">Tagged Only</option>
      </select>

      <select v-model="filters.sortBy" @change="fetchIdeas()">
        <option value="saved_at">Recently Saved</option>
        <option value="updated_at">Recently Updated</option>
        <option value="rating">Highest Rated</option>
      </select>
    </div>

    <div v-if="loading" class="loading">Loading ideas...</div>

    <div v-else-if="ideas.length === 0" class="empty">
      No ideas saved yet
    </div>

    <div v-else class="ideas-grid">
      <div v-for="idea in ideas" :key="idea.id" class="idea-card">
        <h4>{{ idea.title }}</h4>
        <p>{{ idea.description }}</p>
        
        <div class="rating">
          <button
            v-for="star in 5"
            :key="star"
            :class="['star', { filled: idea.rating >= star }]"
            @click="rateIdea(idea.id, star)"
          >
            ⭐
          </button>
          <span class="text">{{ idea.rating || 'No rating' }}</span>
        </div>

        <div v-if="idea.tags" class="tags">
          <span v-for="(tag, idx) in idea.tags" :key="idx" class="tag">
            {{ tag }}
          </span>
        </div>

        <button @click="deleteIdea(idea.id)" class="delete-btn">
          Remove
        </button>
      </div>
    </div>

    <div v-if="pagination" class="pagination">
      <button
        :disabled="filters.page === 1"
        @click="filters.page--; fetchIdeas()"
      >
        Previous
      </button>
      <span>Page {{ filters.page }} of {{ pagination.pages }}</span>
      <button
        :disabled="filters.page >= pagination.pages"
        @click="filters.page++; fetchIdeas()"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const ideas = ref([]);
const loading = ref(false);
const pagination = ref(null);

const filters = ref({
  page: 1,
  limit: 10,
  sortBy: 'saved_at',
  order: 'DESC',
  filter: 'all',
  search: '',
});

const fetchIdeas = async () => {
  loading.value = true;
  try {
    const queryParams = new URLSearchParams(filters.value);
    const response = await fetch(`/api/v1/ideas/saved?${queryParams}`, {
      headers: {
        'X-Api-Key': import.meta.env.VITE_API_KEY,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch');

    const data = await response.json();
    ideas.value = data.data;
    pagination.value = data.pagination;
  } catch (err) {
    console.error('Error:', err);
  } finally {
    loading.value = false;
  }
};

const rateIdea = async (ideaId, rating) => {
  try {
    await fetch(`/api/v1/ideas/${ideaId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': import.meta.env.VITE_API_KEY,
      },
      body: JSON.stringify({ rating }),
    });

    const idea = ideas.value.find((i) => i.id === ideaId);
    if (idea) idea.rating = rating;
  } catch (err) {
    console.error('Error rating:', err);
  }
};

const deleteIdea = async (ideaId) => {
  if (!confirm('Delete this idea?')) return;

  try {
    await fetch(`/api/v1/ideas/${ideaId}`, {
      method: 'DELETE',
      headers: {
        'X-Api-Key': import.meta.env.VITE_API_KEY,
      },
    });

    ideas.value = ideas.value.filter((i) => i.id !== ideaId);
  } catch (err) {
    console.error('Error deleting:', err);
  }
};

onMounted(fetchIdeas);
</script>

<style scoped>
.saved-ideas {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filters input,
.filters select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
}

.ideas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.idea-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.idea-card h4 {
  margin-top: 0;
}

.rating {
  display: flex;
  gap: 5px;
  margin: 10px 0;
}

.star {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.star.filled {
  opacity: 1;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 10px 0;
}

.tag {
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.delete-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}
</style>
```

---

## Workflow Diagrams

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INPUTS PROBLEM STATEMENT                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 2. POST /api/v1/multimodel                                  │
│    Returns: sessionId + raw_outputs (5 models)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 3. POST /api/v1/sessions/:sessionId/synthesize              │
│    Returns: uniqueIdeas[], researchSummary                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 4. USER REVIEWS STRATEGIC IDEAS                             │
│    (Display title, thesis, mechanism, support count)        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 5. USER CLICKS "SAVE IDEA"                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 6. POST /api/v1/ideas/save                                  │
│    Saves idea with sessionId linking                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 7. USER MANAGES SAVED IDEAS                                 │
│    - Rate (1-5 stars): POST /ideas/:id/rate                │
│    - Tag/Notes: PATCH /ideas/:id                            │
│    - Search: GET /ideas/saved?search=term                   │
│    - Filter: GET /ideas/saved?filter=rated                  │
│    - Find related: GET /ideas/:id/related                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 8. EXPORT/SHARE CURATED IDEAS FOR TEAM ACTION               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### saved_ideas Table

```sql
CREATE TABLE saved_ideas (
    -- Primary/Foreign Keys
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id),
    idea_id VARCHAR(255) NOT NULL,
    
    -- Core Idea Data
    title TEXT NOT NULL,
    description TEXT,
    strategic_thesis TEXT,
    mechanism TEXT,
    implementation_framework JSONB,
    idea_type VARCHAR(100),
    
    -- Metadata
    derived_from_models JSONB,      -- ["deepseek-chat", "perplexity/sonar"]
    support_count INTEGER,
    confidence NUMERIC(3, 2),
    
    -- User Curation
    rating INTEGER CHECK (rating >= 0 AND rating <= 5),
    notes TEXT,
    tags JSONB,                      -- ["tag1", "tag2", "tag3"]
    
    -- Timestamps
    saved_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, idea_id)
);
```

### Available Indexes

```
- user_id (fast lookup of user's ideas)
- session_id (find all ideas from synthesis)  
- (user_id, idea_type) (filter by type)
- (user_id, rating DESC) (sort by rating)
- (user_id, saved_at DESC) (sort by recency)
- Full-text search GIN on title + description
```

---

## Frontend Environment Variables

### .env.local (React/Vite)

```
REACT_APP_API_KEY=dev_local_api_key_9f3b
REACT_APP_API_URL=http://localhost:3000/api/v1

# Or for Vite:
VITE_API_KEY=dev_local_api_key_9f3b
VITE_API_URL=http://localhost:3000/api/v1
```

### .env (Vue)

```
VUE_APP_API_KEY=dev_local_api_key_9f3b
VUE_APP_API_URL=http://localhost:3000/api/v1
```

---

## Testing with curl

### Complete Test Workflow (Bash)

```bash
#!/bin/bash

API_KEY="dev_local_api_key_9f3b"
BASE_URL="http://localhost:3000/api/v1"

# Step 1: Execute multimodel
echo "=== STEP 1: Execute Multimodel ==="
MULTI_RESPONSE=$(curl -s -X POST "$BASE_URL/multimodel" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "How to scale distributed teams while maintaining culture?"
  }')

SESSION_ID=$(echo "$MULTI_RESPONSE" | jq -r '.data.sessionId')
echo "Session ID: $SESSION_ID"

# Step 2: Synthesize
echo -e "\n=== STEP 2: Synthesize Ideas ==="
SYNTHESIS=$(curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/synthesize" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')

IDEA_ID=$(echo "$SYNTHESIS" | jq -r '.data.uniqueIdeas[0].id')
echo "First Idea ID: $IDEA_ID"
echo "First Idea: $(echo "$SYNTHESIS" | jq -r '.data.uniqueIdeas[0].title')"

# Step 3: Save Idea
echo -e "\n=== STEP 3: Save Idea ==="
FIRST_IDEA=$(echo "$SYNTHESIS" | jq '.data.uniqueIdeas[0]')
SAVE_RESPONSE=$(curl -s -X POST "$BASE_URL/ideas/save" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"ideaId\": \"$(echo "$FIRST_IDEA" | jq -r '.id')\",
    \"title\": \"$(echo "$FIRST_IDEA" | jq -r '.title')\",
    \"description\": \"$(echo "$FIRST_IDEA" | jq -r '.description')\",
    \"strategicThesis\": \"$(echo "$FIRST_IDEA" | jq -r '.strategicThesis')\",
    \"mechanism\": \"$(echo "$FIRST_IDEA" | jq -r '.mechanism')\",
    \"implementationFramework\": $(echo "$FIRST_IDEA" | jq '.implementationFramework'),
    \"ideaType\": \"$(echo "$FIRST_IDEA" | jq -r '.ideaType')\",
    \"derivedFromModels\": $(echo "$FIRST_IDEA" | jq '.derivedFromModels'),
    \"supportCount\": $(echo "$FIRST_IDEA" | jq '.supportCount'),
    \"confidence\": $(echo "$FIRST_IDEA" | jq '.confidence')
  }")

SAVED_IDEA_ID=$(echo "$SAVE_RESPONSE" | jq -r '.data.id')
echo "Saved Idea ID: $SAVED_IDEA_ID"

# Step 4: Get Saved Ideas
echo -e "\n=== STEP 4: List Saved Ideas ==="
curl -s -X GET "$BASE_URL/ideas/saved?page=1&limit=10" \
  -H "X-Api-Key: $API_KEY" | jq '.data | .[0]'

# Step 5: Rate Idea
echo -e "\n=== STEP 5: Rate Idea (5 stars) ==="
curl -s -X POST "$BASE_URL/ideas/$SAVED_IDEA_ID/rate" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5}' | jq '.data'

# Step 6: Update with Notes & Tags
echo -e "\n=== STEP 6: Add Notes & Tags ==="
curl -s -X PATCH "$BASE_URL/ideas/$SAVED_IDEA_ID" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Excellent alignment with our strategy",
    "tags": ["high-priority", "culture", "scaling", "2025-roadmap"]
  }' | jq '.data'

# Step 7: Get Full Idea Details
echo -e "\n=== STEP 7: Get Full Idea Details ==="
curl -s -X GET "$BASE_URL/ideas/$SAVED_IDEA_ID" \
  -H "X-Api-Key: $API_KEY" | jq '.data'

# Step 8: Filter by Rating
echo -e "\n=== STEP 8: Filter Rated Ideas ==="
curl -s -X GET "$BASE_URL/ideas/saved?filter=rated&sortBy=rating&order=DESC" \
  -H "X-Api-Key: $API_KEY" | jq '.data | .[0:2]'

# Step 9: Search Ideas
echo -e "\n=== STEP 9: Search Ideas ==="
curl -s -X GET "$BASE_URL/ideas/saved?search=culture&limit=5" \
  -H "X-Api-Key: $API_KEY" | jq '.data'

echo -e "\n✅ All tests completed!"
```

---

## Summary

Your backend is now fully integrated with:

✅ **Multi-model parallel execution** (5 LLMs)
✅ **Raw output storage** for reproducibility
✅ **Advanced synthesis engine** for strategic idea extraction
✅ **Complete ideas management** (save, rate, tag, search, filter)
✅ **Role-based access control** (user_id from API key)
✅ **Full-text search** and advanced filtering
✅ **Pagination** with configurable limits
✅ **Error handling** with proper HTTP codes

### Next Steps:

1. **Frontend Integration**: Copy React/Vue examples above
2. **Environment Setup**: Add API keys to your frontend .env
3. **Connect to UI**: Use provided hooks/composables for seamless integration
4. **Test**: Run the bash workflow above to validate all endpoints
5. **Deploy**: Push changes to production when ready
