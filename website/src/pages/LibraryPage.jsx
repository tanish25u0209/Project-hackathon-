import { useState, useEffect, useCallback } from 'react'
import { listSavedIdeas, rateIdea, updateIdea, deleteIdea, getRelatedIdeas } from '../api'
import './PageShared.css'
import './LibraryPage.css'

export default function LibraryPage() {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [selectedIdea, setSelectedIdea] = useState(null)
  const [relatedIdeas, setRelatedIdeas] = useState([])
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (activeTag) params.tags = activeTag
      const res = await listSavedIdeas(params)
      setIdeas(Array.isArray(res.data) ? res.data : (res.data?.ideas || []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [activeTag])

  useEffect(() => { load() }, [load])

  // Collect all tags
  const allTags = [...new Set(ideas.flatMap(i => i.tags || []))]

  // Filter by search
  const filtered = ideas.filter(idea =>
    !searchQ || (idea.title || idea.description)?.toLowerCase().includes(searchQ.toLowerCase())
  )

  async function handleRate(idea, rating) {
    try {
      await rateIdea(idea.id, rating)
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, rating } : i))
      if (selectedIdea?.id === idea.id) setSelectedIdea(prev => ({ ...prev, rating }))
    } catch {}
  }

  async function handleDelete(id) {
    try {
      await deleteIdea(id)
      setIdeas(prev => prev.filter(i => i.id !== id))
      if (selectedIdea?.id === id) setSelectedIdea(null)
    } catch {}
  }

  async function openDetail(idea) {
    setSelectedIdea(idea)
    setEditNotes(idea.notes || '')
    setRelatedIdeas([])
    try {
      const res = await getRelatedIdeas(idea.id)
      setRelatedIdeas(Array.isArray(res.data) ? res.data : (res.data?.relatedIdeas || []))
    } catch {}
  }

  async function handleSaveNotes() {
    if (!selectedIdea) return
    setSaving(true)
    try {
      await updateIdea(selectedIdea.id, { notes: editNotes })
      setIdeas(prev => prev.map(i => i.id === selectedIdea.id ? { ...i, notes: editNotes } : i))
      setSelectedIdea(prev => ({ ...prev, notes: editNotes }))
    } catch {}
    setSaving(false)
  }

  return (
    <div className="page library-page">
      <div className="page-header animate-fadeUp">
        <h1 className="page-title">💡 Idea Library</h1>
        <p className="page-subtitle">{ideas.length} saved ideas across all research sessions</p>

        <div className="library-toolbar">
          <input
            className="input library-search"
            placeholder="🔍  Search ideas…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          <button className="btn btn--ghost btn--sm" onClick={load}>↺ Refresh</button>
        </div>

        {allTags.length > 0 && (
          <div className="library-tags">
            <span
              className={`tag ${!activeTag ? 'active' : ''}`}
              onClick={() => setActiveTag(null)}
            >All</span>
            {allTags.map(t => (
              <span
                key={t}
                className={`tag ${activeTag === t ? 'active' : ''}`}
                onClick={() => setActiveTag(activeTag === t ? null : t)}
              >#{t}</span>
            ))}
          </div>
        )}
      </div>

      {error && <div className="research-error"><span>⚠</span> {error}</div>}

      {loading ? (
        <div className="library-grid animate-fadeIn">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">💡</div>
          <div className="empty-state__text">No saved ideas yet</div>
          <div className="empty-state__sub">Run research and save ideas from the Results page</div>
        </div>
      ) : (
        <div className="library-grid animate-fadeIn">
          {filtered.map(idea => (
            <div
              key={idea.id}
              className={`card card--glow library-card ${selectedIdea?.id === idea.id ? 'library-card--selected' : ''}`}
              onClick={() => openDetail(idea)}
            >
              <div className="library-card__body"><h3 className="library-card__title" style={{ fontSize: "15px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>{idea.title}</h3>
                <p className="library-card__text">{idea.description}</p>
              </div>

              {/* Stars */}
              <div className="library-card__footer">
                <div className="stars" onClick={e => e.stopPropagation()}>
                  {[1,2,3,4,5].map(n => (
                    <span
                      key={n}
                      className="star"
                      style={{ opacity: n <= (idea.rating || 0) ? 1 : 0.25 }}
                      onClick={() => handleRate(idea, n)}
                    >★</span>
                  ))}
                </div>
                <div className="library-card__tags">
                  {(idea.tags || []).slice(0,3).map(t => (
                    <span key={t} className="tag" style={{ fontSize: '10px', padding: '2px 7px' }}>#{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedIdea && (
        <div className="library-detail animate-fadeIn" onClick={() => setSelectedIdea(null)}>
          <div className="library-detail__panel card" onClick={e => e.stopPropagation()}>
            <div className="library-detail__header">
              <h3>Idea Detail</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => setSelectedIdea(null)}>✕</button>
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>{selectedIdea.title}</h2><p className="library-detail__text">{selectedIdea.description}</p>

            <div className="stars">
              {[1,2,3,4,5].map(n => (
                <span
                  key={n}
                  className="star"
                  style={{ fontSize: 22, opacity: n <= (selectedIdea.rating || 0) ? 1 : 0.25 }}
                  onClick={() => handleRate(selectedIdea, n)}
                >★</span>
              ))}
            </div>

            <div>
              <p className="section-label" style={{ margin: '16px 0 8px' }}>Notes</p>
              <textarea className="input" rows={4} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              <button className="btn btn--primary btn--sm" style={{ marginTop: 8 }} onClick={handleSaveNotes} disabled={saving}>
                {saving ? 'Saving…' : 'Save Notes'}
              </button>
            </div>

            {relatedIdeas.length > 0 && (
              <div>
                <p className="section-label" style={{ margin: '16px 0 8px' }}>Related Ideas</p>
                {relatedIdeas.slice(0,3).map((ri, i) => (
                  <div key={i} className="library-related-item">{ri.title || ri.description}</div>
                ))}
              </div>
            )}

            <button
              className="btn btn--danger btn--sm"
              style={{ marginTop: 16 }}
              onClick={() => handleDelete(selectedIdea.id)}
            >🗑 Delete Idea</button>
          </div>
        </div>
      )}
    </div>
  )
}
