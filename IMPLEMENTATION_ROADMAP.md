# Website Implementation Roadmap

## 📋 Phase-by-Phase Implementation Plan

### Phase 1: Foundation & Setup (Week 1)

#### 1.1 Backend Setup
- [ ] Clone/setup research_backend repository
- [ ] Install Node.js dependencies: `npm install`
- [ ] Create `.env` file with all required variables
- [ ] Setup PostgreSQL database
- [ ] Run migrations: `npm run migrate`
- [ ] Setup Redis server
- [ ] Obtain API keys:
  - [ ] OpenRouter API keys (5 keys)
  - [ ] Google Gemini API key
  - [ ] Anthropic Claude API key
  - [ ] Grok API key

#### 1.2 Verify Backend Works
```bash
# Terminal 1
npm start

# Terminal 2
npm run worker

# Terminal 3 - Test
curl http://localhost:3000/api/v1/health
# Should return: {"success": true, "status": "ok"}
```

#### 1.3 Environment Configuration
```
Copy to .env:
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/research_db
REDIS_URL=redis://localhost:6379
OPENROUTER_API_KEYS=key1,key2,key3,key4,key5
API_KEY=dev_local_api_key_9f3b
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000
RESEARCH_MODELS=deepseek/deepseek-chat,perplexity/sonar,mistralai/mistral-large,meta-llama/llama-3-8b-instruct,google/gemma-3-27b-it
```

#### 1.4 Test Multi-Model API
```bash
curl -X POST http://localhost:3000/api/v1/multimodel \
  -H "X-Api-Key: dev_local_api_key_9f3b" \
  -H "Content-Type: application/json" \
  -d '{"input":"What is the future of AI?"}'

# Should return: sessionId + results from 5 models
```

---

### Phase 2: Frontend Foundation (Week 1-2)

#### 2.1 Create React Project
```bash
npm create vite@latest research-web -- --template react
cd research-web
npm install
```

#### 2.2 Install Dependencies
```bash
npm install axios zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer
```

#### 2.3 Setup API Client
**`src/api/client.js`**
```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const API_KEY = import.meta.env.VITE_API_KEY || 'dev_local_api_key_9f3b';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'X-Api-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});

export const executeMultiModel = (input) => 
  client.post('/multimodel', { input });

export const synthesizeIdeas = (sessionId) => 
  client.post(`/sessions/${sessionId}/synthesize`);

export const saveIdea = (data) => 
  client.post('/ideas/save', data);

export const getSavedIdeas = () => 
  client.get('/ideas/saved');

export const rateIdea = (ideaId, rating) => 
  client.post(`/ideas/${ideaId}/rate`, { rating });

export default client;
```

#### 2.4 Setup State Management **`src/store/research.js`**
```javascript
import { create } from 'zustand';

export const useResearchStore = create((set) => ({
  // State
  currentSession: null,
  results: null,
  synthesizedIdeas: null,
  loading: false,
  error: null,
  
  // Actions
  setSession: (session) => set({ currentSession: session }),
  setResults: (results) => set({ results }),
  setSynthesized: (ideas) => set({ synthesizedIdeas: ideas }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ 
    currentSession: null, 
    results: null, 
    synthesizedIdeas: null,
    error: null 
  }),
}));
```

#### 2.5 Create Layout Component **`src/components/Layout.jsx`**
```javascript
import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex gap-6">
          <Link to="/" className="font-bold text-lg">🚀 ResearchApp</Link>
          <Link to="/research">Research</Link>
          <Link to="/ideas">Ideas</Link>
          <Link to="/sessions">Sessions</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

---

### Phase 3: Core Pages (Week 2)

#### 3.1 Research Input Page

**`src/pages/Research.jsx`**
```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { executeMultiModel } from '../api/client';
import { useResearchStore } from '../store/research';

export default function Research() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setSession = useResearchStore(s => s.setSession);
  const setResults = useResearchStore(s => s.setResults);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await executeMultiModel(input);
      const { sessionId, results } = response.data.data;
      setSession(sessionId);
      setResults(results);
      navigate(`/results/${sessionId}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Research failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Research</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your research problem or question..."
          className="w-full h-32 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          minLength={10}
          maxLength={5000}
        />
        
        <div className="text-sm text-gray-600">
          {input.length} / 5000 characters
        </div>
        
        <button
          type="submit"
          disabled={loading || input.length < 10}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing (3-30s)...' : 'Execute Multi-Model Research'}
        </button>
      </form>
      
      <div className="mt-10 p-6 bg-blue-50 rounded-lg">
        <h3 className="font-bold mb-2">📚 How it works:</h3>
        <ol className="space-y-2 text-sm">
          <li>1️⃣ Enter your research question</li>
          <li>2️⃣ System executes 5 AI models in parallel</li>
          <li>3️⃣ View raw outputs from each model</li>
          <li>4️⃣ Synthesize into strategic ideas</li>
          <li>5️⃣ Save and organize your findings</li>
        </ol>
      </div>
    </div>
  );
}
```

#### 3.2 Results Display Page

**`src/pages/Results.jsx`**
```javascript
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { synthesizeIdeas, saveIdea } from '../api/client';
import { useResearchStore } from '../store/research';

export default function Results() {
  const { sessionId } = useParams();
  const results = useResearchStore(s => s.results);
  const [synthesized, setSynthesized] = useState(null);
  const [synthLoading, setSynthLoading] = useState(false);

  const handleSynthesize = async () => {
    setSynthLoading(true);
    try {
      const response = await synthesizeIdeas(sessionId);
      setSynthesized(response.data.data);
    } catch (error) {
      alert('Synthesis failed: ' + error.message);
    } finally {
      setSynthLoading(false);
    }
  };

  const handleSaveIdea = async (ideaText, sourceModel) => {
    try {
      await saveIdea({
        ideaText,
        sourceModel,
        sessionId,
        tags: [],
      });
      alert('Idea saved!');
    } catch (error) {
      alert('Save failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Research Results</h1>
      
      {/* Raw Outputs */}
      {results && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Raw Outputs (5 Models)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {results.map((result) => (
              <div key={result.model} className="border rounded-lg p-4">
                <h3 className="font-bold text-sm mb-2">{result.model.split('/')[1]}</h3>
                <p className="text-xs text-gray-700 mb-2">{result.output?.slice(0, 200)}...</p>
                <div className="text-xs text-gray-500">
                  <div>Speed: {result.latencyMs}ms</div>
                  <div>Tokens: {result.promptTokens + result.completionTokens}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Synthesis Button */}
      <button
        onClick={handleSynthesize}
        disabled={synthLoading}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
      >
        {synthLoading ? 'Synthesizing...' : '✨ Synthesize Ideas'}
      </button>
      
      {/* Synthesized Ideas */}
      {synthesized && (
        <div className="space-y-6">
          {/* Themes */}
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-3">🎯 Dominant Themes</h3>
            <div className="flex flex-wrap gap-2">
              {synthesized.researchSummary?.dominantThemes?.map((theme, i) => (
                <span key={i} className="bg-purple-200 px-3 py-1 rounded-full text-sm">
                  {theme}
                </span>
              ))}
            </div>
          </div>
          
          {/* Ideas */}
          <div>
            <h3 className="text-xl font-bold mb-3">💡 Strategic Ideas ({synthesized.uniqueIdeas?.length})</h3>
            <div className="space-y-3">
              {synthesized.uniqueIdeas?.map((idea) => (
                <div key={idea.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold">{idea.text}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        From: {idea.source?.split('/')[1]}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {idea.tags?.map((tag, i) => (
                          <span key={i} className="text-xs bg-blue-100 px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveIdea(idea.text, idea.source)}
                      className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      💾 Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3.3 Ideas Library Page

**`src/pages/IdeasLibrary.jsx`**
```javascript
import { useEffect, useState } from 'react';
import { getSavedIdeas, rateIdea } from '../api/client';

export default function IdeasLibrary() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      const response = await getSavedIdeas();
      setIdeas(response.data.data.ideas);
    } catch (error) {
      console.error('Error loading ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (ideaId, rating) => {
    try {
      await rateIdea(ideaId, rating);
      loadIdeas(); // Reload
    } catch (error) {
      alert('Rating failed: ' + error.message);
    }
  };

  const filteredIdeas = ideas.filter(idea =>
    idea.text.toLowerCase().includes(filter.toLowerCase()) ||
    idea.tags?.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">💡 Ideas Library</h1>
      
      <input
        type="text"
        placeholder="Search ideas or tags..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No ideas found. Start a research to create ideas!
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map((idea) => (
            <div key={idea.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-lg">{idea.text}</p>
                  <p className="text-sm text-gray-600">From: {idea.sourceModel}</p>
                  
                  {/* Rating */}
                  <div className="flex gap-1 mt-2">
                    {[1,2,3,4,5].map(star => (
                      <button
                        key={star}
                        onClick={() => handleRate(idea.id, star)}
                        className={`text-lg ${
                          star <= (idea.rating || 0)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  
                  {/* Tags */}
                  {idea.tags && idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {idea.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Notes */}
                  {idea.notes && (
                    <p className="text-sm text-gray-700 mt-2 italic">"{idea.notes}"</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Phase 4: Advanced Features (Week 3)

#### 4.1 Sessions History Page
#### 4.2 Dashboard with Statistics
#### 4.3 Export Functionality
#### 4.4 Search & Filter
#### 4.5 Related Ideas Discovery

---

### Phase 5: Optimization & Deployment (Week 4)

#### 5.1 Testing
- [ ] Unit tests for API services
- [ ] Integration tests for critical flows
- [ ] E2E tests with Cypress/Playwright

#### 5.2 Performance
- [ ] Image optimization
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Caching strategy

#### 5.3 Deployment
- [ ] Build production bundle
- [ ] Setup CI/CD pipeline
- [ ] Deploy to hosting (Vercel/Netlify)
- [ ] Configure custom domain

#### 5.4 Monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (Mixpanel/GA)
- [ ] Performance monitoring
- [ ] Uptime monitoring

---

## 🎯 Quick Implementation Checklist

```
WEEK 1:
□ Setup backend & verify with health check
□ Obtain all required API keys
□ Test multi-model API endpoint
□ Create React project
□ Setup API client & store

WEEK 2:
□ Implement Research input page
□ Implement Results display page
□ Implement Ideas library page
□ Test all API connections
□ Basic styling with Tailwind

WEEK 3:
□ Add Sessions history page
□ Add Dashboard page
□ Add Export functionality
□ Add Related ideas discovery
□ Add bulk operations

WEEK 4:
□ Write & run tests
□ Optimize for production
□ Deploy backend
□ Deploy frontend
□ Setup monitoring

POST-LAUNCH:
□ Gather user feedback
□ Fix bugs
□ Optimize based on usage
□ Add new features
```

---

## 🚀 Launch Commands

### Development
```bash
# Terminal 1: Backend
cd research_backend
npm install
npm start

# Terminal 2: Worker
cd research_backend
npm run worker

# Terminal 3: Frontend
cd research-web
npm install
npm run dev
```

### Production
```bash
# Backend
npm run build
npm start

# Frontend
npm run build
# Deploy dist/ to static host
```

---

## 📊 Success Metrics to Track

- [ ] Average research execution time: < 30s
- [ ] Synthesis time: < 3s
- [ ] Frontend load time: < 2s
- [ ] API error rate: < 1%
- [ ] User retention: > 50% weekly
- [ ] Ideas saved per research: > 3
- [ ] Average rating: > 4/5 stars

---

## 🔗 Resources & Links

### Documentation
- [Complete Analysis](PROJECT_COMPLETE_ANALYSIS.md)
- [Architecture Guide](ARCHITECTURE_GUIDE.md)
- [Quick Reference](QUICK_REFERENCE.md)

### External Docs
- [React.js Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand Store](https://github.com/pmndrs/zustand)
- [Axios Client](https://axios-http.com)

### API Documentation
- [OpenRouter API](https://openrouter.ai/docs)
- [Express.js API](https://expressjs.com/api.html)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## 💡 Pro Tips

1. **Start Simple**: Get the research page working first
2. **Test Early**: Test each API endpoint as you build
3. **Use Console**: Check browser console for API errors
4. **Cache Results**: Store sessionId for faster access
5. **Progressive Enhancement**: Build basic version first, then add polish
6. **Error Handling**: Always show user-friendly error messages
7. **Loading States**: Show spinners during async operations
8. **Mobile First**: Design for mobile, enhance for desktop

---

**Document Last Updated:** 2026-03-20  
**Implementation Status:** Ready to Start  
**Estimated Duration:** 4 Weeks  
**Team Size:** 1-2 developers
