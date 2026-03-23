import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { synthesize, saveIdea } from '../api'
import './PageShared.css'
import './ResultsPage.css'

const MODEL_COLORS = {
  deepseek:   '#6366f1',
  perplexity: '#10b981',
  mistral:    '#f59e0b',
  llama:      '#38bdf8',
  gemma:      '#a78bfa',
}
const MODEL_ICONS = {
  deepseek: '🔮', perplexity: '🌐', mistral: '🌬️', llama: '🦙', gemma: '💎'
}

function getModelKey(modelId = '') {
  const m = modelId.toLowerCase()
  if (m.includes('deepseek'))    return 'deepseek'
  if (m.includes('perplexity'))  return 'perplexity'
  if (m.includes('mistral'))     return 'mistral'
  if (m.includes('llama'))       return 'llama'
  if (m.includes('gemma'))       return 'gemma'
  return 'deepseek'
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState(null)
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [synthesis, setSynthesis] = useState(null)
  const [synthesizing, setSynthesizing] = useState(false)
  const [synthError, setSynthError] = useState(null)
  const [expandedModel, setExpandedModel] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    const raw = sessionStorage.getItem('pf_results')
    const inp = sessionStorage.getItem('pf_input')
    if (raw) {
      const parsed = JSON.parse(raw)
      setResults(parsed.data?.results || [])
      setSessionId(parsed.data?.sessionId)
    }
    if (inp) setInput(inp)
  }, [])

  async function handleSynthesize() {
    if (!sessionId || synthesizing) return
    setSynthesizing(true)
    setSynthError(null)
    try {
      const res = await synthesize(sessionId)
      setSynthesis(res.data)
    } catch (e) {
      setSynthError(e.message)
    } finally {
      setSynthesizing(false)
    }
  }

  async function handleSaveIdea(idea, ideaIdFallback) {
    const ideaId = idea.id || ideaIdFallback || `idea-${Date.now()}`
    if (savedIds.has(ideaId)) return
    try {
      await saveIdea({
        sessionId,
        ideaId: ideaId,
        title: (idea.title || idea.description || idea.text || '').substring(0, 250),
        description: idea.description || idea.text || '',
        ideaType: idea.ideaType || 'synthesis_idea',
        confidence: idea.confidence || 0.8,
        supportCount: idea.supportCount || 1,
        derivedFromModels: idea.derivedFromModels || [],
      })
      setSavedIds(prev => new Set([...prev, ideaId]))
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes("already saved")) { setSavedIds(prev => new Set([...prev, ideaId])); } else { console.error("Save Idea failed:", err); alert("Failed to save idea: " + err.message); }
    }
  }

  if (!results) {
    return (
      <div className="page">
        <div className="empty-state" style={{ marginTop: 120 }}>
          <div className="empty-state__icon">📊</div>
          <div className="empty-state__text">No results yet</div>
          <div className="empty-state__sub">Run a research query first</div>
          <button className="btn btn--primary" onClick={() => navigate('/research')}>← Back to Research</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page results-page">
      {/* Header */}
      <div className="page-header animate-fadeUp">
        <div className="results-breadcrumb">
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/research')}>← New Research</button>
        </div>
        <h1 className="page-title">Research Results</h1>
        <p className="page-subtitle results-query">{input}</p>
        <div className="results-meta">
          <span className="badge badge--success">✓ {results.filter(r => !r.error).length} Models Succeeded</span>
          {results.filter(r => r.error).length > 0 && (
            <span className="badge badge--error">✗ {results.filter(r => r.error).length} Failed</span>
          )}
          {sessionId && <span className="badge badge--neutral mono" style={{ fontSize: 10 }}>{sessionId}</span>}
        </div>
      </div>

      {/* Model outputs grid */}
      <div className="results-grid animate-fadeUp" style={{ animationDelay: '0.1s' }}>
        {results.map((r, i) => {
          const key = getModelKey(r.model)
          const isExpanded = expandedModel === i
          return (
            <div
              key={i}
              className={`card results-model-card ${isExpanded ? 'results-model-card--expanded' : ''}`}
              style={{ '--mc': MODEL_COLORS[key] }}
            >
              <div className="results-model-card__header">
                <div className="results-model-card__name">
                  <span>{MODEL_ICONS[key]}</span>
                  <span>{r.model?.split('/').pop() || r.model}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {r.latencyMs && (
                    <span className="results-model-card__latency">{(r.latencyMs / 1000).toFixed(1)}s</span>
                  )}
                  {r.error
                    ? <span className="badge badge--error">Error</span>
                    : <span className="badge badge--success">OK</span>
                  }
                  <button className="btn btn--ghost btn--sm" onClick={() => setExpandedModel(isExpanded ? null : i)}>
                    {isExpanded ? '↑ Collapse' : '↓ Expand'}
                  </button>
                </div>
              </div>
              {r.error ? (
                <div className="results-model-card__error">{r.error}</div>
              ) : (
                <div className={`results-model-card__output ${isExpanded ? 'expanded' : ''}`}>
                  {r.output}
                </div>
              )}
              {r.promptTokens && (
                <div className="results-model-card__tokens">
                  Tokens: {r.promptTokens} in / {r.completionTokens} out
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Synthesize section */}
      <div className="results-synthesis animate-fadeUp" style={{ animationDelay: '0.2s' }}>
        {!synthesis && (
          <div className="results-synthesis__cta card">
            <div className="results-synthesis__cta-content">
              <div className="results-synthesis__cta-icon">🧬</div>
              <div>
                <h3>Synthesize Insights</h3>
                <p>Deduplicate all {results.length} model outputs, cluster semantically similar ideas, and extract unique strategic insights.</p>
              </div>
            </div>
            {synthError && <div className="research-error"><span>⚠</span> {synthError}</div>}
            <button
              className="btn btn--primary btn--lg"
              onClick={handleSynthesize}
              disabled={synthesizing || !sessionId}
              id="synthesize-btn"
            >
              {synthesizing ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Synthesizing…</> : '🧬 Synthesize Ideas'}
            </button>
          </div>
        )}

        {synthesis && (
          <div className="synthesis-results">
            {/* Themes */}
            {synthesis.researchSummary && (
              <div className="synthesis-themes">
                {synthesis.researchSummary.dominantThemes?.length > 0 && (
                  <div className="synthesis-theme-group">
                    <p className="section-label">Dominant Themes</p>
                    <div className="synthesis-theme-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {synthesis.researchSummary.dominantThemes.map((t, i) => (
                        <div key={i} className="theme-card" style={{ padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderRadius: '12px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {synthesis.researchSummary.contrarianInsights?.length > 0 && (
                  <div className="synthesis-theme-group">
                    <p className="section-label" style={{ color: 'var(--amber)' }}>Contrarian Insights</p>
                    <div className="synthesis-theme-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {synthesis.researchSummary.contrarianInsights.map((t, i) => (
                        <div key={i} className="theme-card" style={{ padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--amber)', borderRadius: '12px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Unique Ideas */}
            <p className="section-label" style={{ marginTop: 24 }}>
              {synthesis.uniqueIdeas?.length} Unique Strategic Ideas
            </p>
            <div className="synthesis-ideas-grid">
              {synthesis.uniqueIdeas?.map((idea, i) => {
                const ideaId = idea.id || `${sessionId}-idea-${i}`;
                return (
                <div key={ideaId} className="card synthesis-idea-card card--glow">
                  <div className="synthesis-idea-card__top">
                    <span className="badge badge--accent">#{i + 1}</span>
                    <span className="synthesis-idea-card__conf">
                      {Math.round((idea.confidence || 0.8) * 100)}% confidence
                    </span>
                  </div>
                  {idea.title && <h4 style={{ margin: '12px 0 8px', fontSize: '16px', color: 'var(--text-primary)' }}>{idea.title}</h4>}
                  <p className="synthesis-idea-card__text">{idea.description || idea.text}</p>
                  {idea.tags?.length > 0 && (
                    <div className="synthesis-tags" style={{ marginTop: 10 }}>
                      {idea.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  )}
                  <button
                    className={`btn btn--sm ${savedIds.has(ideaId) ? 'btn--ghost' : 'btn--primary'}`}
                    style={{ marginTop: 12, alignSelf: 'flex-start' }}
                    onClick={() => handleSaveIdea(idea, ideaId)}
                    disabled={savedIds.has(ideaId)}
                  >
                    {savedIds.has(ideaId) ? '✓ Saved' : '💾 Save to Library'}
                  </button>
                </div>
              )})}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
