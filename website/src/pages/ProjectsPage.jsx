import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createProject, getProjects } from '../api'
import './PageShared.css'
import './ProjectsPage.css'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)
    setError('')
    try {
      const data = await getProjects()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError('')
    try {
      await createProject({ name: name.trim() })
      setName('')
      await loadProjects()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header animate-fadeUp">
        <h1 className="page-title">🗂️ Projects</h1>
        <p className="page-subtitle">Create projects and manage shared files by membership.</p>
      </div>

      <form className="card projects-create animate-fadeUp" onSubmit={onCreate} style={{ animationDelay: '0.08s' }}>
        <p className="section-label">Create New Project</p>
        <div className="projects-create__row">
          <input
            className="input"
            placeholder="Project name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={255}
          />
          <button className="btn btn--primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>

      {error && <p className="projects-error">{error}</p>}

      <div className="projects-list animate-fadeUp" style={{ animationDelay: '0.14s' }}>
        <p className="section-label">Your Projects</p>
        {loading ? (
          <div className="card projects-empty">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="card projects-empty">No projects yet. Create your first one above.</div>
        ) : (
          projects.map(project => (
            <Link key={project.id} to={`/projects/${project.id}`} className="card projects-item">
              <div>
                <h3>{project.name}</h3>
                <p className="projects-meta">Role: {project.role}</p>
              </div>
              <span className="badge badge--accent">Open</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
