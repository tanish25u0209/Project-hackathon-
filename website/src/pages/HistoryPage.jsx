import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSessions, deleteSession } from '../api'
import './PageShared.css'
import './HistoryPage.css'

const STATUS_BADGE = {
  completed:  'badge--success',
  processing: 'badge--warning',
  pending:    'badge--neutral',
  failed:     'badge--error',
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await listSessions({ limit: 50 })
      setSessions(res.data?.sessions || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id) {
    setDeleting(id)
    try {
      await deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch {}
    setDeleting(null)
  }

  return (
    <div className="page history-page">
      <div className="page-header animate-fadeUp">
        <h1 className="page-title">🕒 Session History</h1>
        <p className="page-subtitle">All your past research sessions</p>
        <div className="page-actions">
          <button className="btn btn--ghost btn--sm" onClick={load}>↺ Refresh</button>
          <button className="btn btn--primary btn--sm" onClick={() => navigate('/research')}>+ New Research</button>
        </div>
      </div>

      {error && <div className="research-error"><span>⚠</span> {error}</div>}

      {loading ? (
        <div className="history-list animate-fadeIn">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🕒</div>
          <div className="empty-state__text">No sessions yet</div>
          <div className="empty-state__sub">Complete a research query to see it here</div>
          <button className="btn btn--primary" onClick={() => navigate('/research')}>Start Research</button>
        </div>
      ) : (
        <div className="history-list animate-fadeIn">
          {sessions.map(session => (
            <div key={session.id} className="card card--glow history-row">
              <div className="history-row__main">
                <span className={`badge ${STATUS_BADGE[session.status] || 'badge--neutral'}`}>
                  {session.status}
                </span>
                <p className="history-row__problem">{session.problemStatement || session.problem_statement}</p>
              </div>
              <div className="history-row__meta">
                {session.uniqueIdeasCount > 0 && (
                  <span className="history-row__stat">💡 {session.uniqueIdeasCount} ideas</span>
                )}
                <span className="history-row__date">{fmtDate(session.createdAt || session.created_at)}</span>
              </div>
              <div className="history-row__actions">
                <span className="history-row__id mono">{session.id?.slice(0,8)}…</span>
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(session.id)}
                  disabled={deleting === session.id}
                >
                  {deleting === session.id ? '…' : '🗑'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <p className="history-footer">{sessions.length} sessions total</p>
      )}
    </div>
  )
}
