import { useState, useRef } from 'react'
import { uploadFile } from '../api'
import './PageShared.css'
import './StoragePage.css'

export default function StoragePage() {
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState([])
  const fileRef = useRef()

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const files = [...e.dataTransfer.files]
    files.forEach(upload)
  }

  function handleFileSelect(e) {
    const files = [...e.target.files]
    files.forEach(upload)
  }

  async function upload(file) {
    const id = Date.now() + Math.random()
    setUploads(prev => [...prev, { id, name: file.name, size: file.size, status: 'uploading', fileId: null }])
    try {
      const res = await uploadFile(file)
      setUploads(prev => prev.map(u =>
        u.id === id ? { ...u, status: 'done', fileId: res.fileId, link: res.webViewLink } : u
      ))
    } catch (e) {
      setUploads(prev => prev.map(u =>
        u.id === id ? { ...u, status: 'error', error: e.message } : u
      ))
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="page storage-page">
      <div className="page-header animate-fadeUp">
        <h1 className="page-title">📁 File Storage</h1>
        <p className="page-subtitle">Upload large files to Google Drive via the storage microservice on :3001</p>
      </div>

      {/* Drop zone */}
      <div
        className={`storage-dropzone animate-fadeUp ${dragging ? 'storage-dropzone--drag' : ''}`}
        style={{ animationDelay: '0.1s' }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
        <div className="storage-dropzone__icon">{dragging ? '📂' : '⬆️'}</div>
        <p className="storage-dropzone__title">
          {dragging ? 'Drop files to upload' : 'Drag & drop files here'}
        </p>
        <p className="storage-dropzone__sub">or click to browse — supports files &gt;5GB via streaming</p>
        <button className="btn btn--primary btn--sm" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
          Browse Files
        </button>
      </div>

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="storage-uploads animate-fadeIn">
          <p className="section-label">Upload Queue</p>
          {uploads.map(u => (
            <div key={u.id} className="card storage-upload-row">
              <div className="storage-upload-row__info">
                <span className="storage-upload-row__name">{u.name}</span>
                <span className="storage-upload-row__size">{formatSize(u.size)}</span>
              </div>
              <div>
                {u.status === 'uploading' && (
                  <span className="badge badge--warning"><div className="spinner" style={{ width: 10, height: 10 }} /> Uploading…</span>
                )}
                {u.status === 'done' && (
                  u.link
                    ? <a href={u.link} target="_blank" rel="noreferrer" className="badge badge--success" style={{ textDecoration: 'none' }}>✓ Open in Drive ↗</a>
                    : <span className="badge badge--success">✓ Uploaded</span>
                )}
                {u.status === 'error' && (
                  <span className="badge badge--error" title={u.error}>✗ Error</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info cards */}
      <div className="storage-info-grid animate-fadeUp" style={{ animationDelay: '0.2s' }}>
        {[
          { icon: '🔄', title: 'Chunked Streaming', desc: 'Uploads stream directly without buffering — handles files beyond 5GB' },
          { icon: '🔐', title: 'Google Drive Auth', desc: 'Uses OAuth2 or Service Account — configure via GOOGLE_CREDENTIALS' },
          { icon: '🔁', title: 'Auto-Retry', desc: 'Failed chunks automatically retry with exponential backoff' },
          { icon: '📄', title: 'File Metadata', desc: 'Retrieve size, MIME type, Drive link, and timestamps via /file/:id/meta' },
        ].map(c => (
          <div key={c.title} className="card card--glow storage-info-card">
            <div className="storage-info-card__icon">{c.icon}</div>
            <h4>{c.title}</h4>
            <p>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
