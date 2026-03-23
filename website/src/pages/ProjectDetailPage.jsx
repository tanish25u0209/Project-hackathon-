import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  addProjectMember,
  deleteProjectFile,
  getProjectFiles,
  getProjectMembers,
  linkProjectFile,
  uploadFile,
  renameProjectFile,
  STORAGE_URL,
  getAuthUser
} from '../api'
import './PageShared.css'
import './ProjectDetailPage.css'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const currentUser = getAuthUser()
  const [tab, setTab] = useState('files')
  const [members, setMembers] = useState([])
  const [files, setFiles] = useState([])
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renamingName, setRenamingName] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    loadMembers()
    loadFiles()
  }, [id])

  async function loadMembers() {
    setLoadingMembers(true)
    try {
      const data = await getProjectMembers(id)
      setMembers(data.members || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMembers(false)
    }
  }

  async function loadFiles() {
    setLoadingFiles(true)
    try {
      const data = await getProjectFiles(id)
      setFiles(data.files || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingFiles(false)
    }
  }

  async function onInvite(e) {
    e.preventDefault()
    if (!username.trim()) return

    setInviting(true)
    setError('')
    try {
      await addProjectMember(id, { username: username.trim() })
      setUsername('')
      await loadMembers()
    } catch (err) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function uploadOne(file) {
    const uploaded = await uploadFile(file)
    const driveFile = uploaded.file || {}

    await linkProjectFile(id, {
      googleFileId: driveFile.id,
      fileName: driveFile.name || file.name,
      size: driveFile.size ? Number(driveFile.size) : file.size,
      mimeType: driveFile.mimeType || file.type || null,
    })
  }

  async function handleFiles(inputFiles) {
    const selected = [...inputFiles]
    if (!selected.length) return

    setUploading(true)
    setError('')

    try {
      for (const file of selected) {
        await uploadOne(file)
      }
      await loadFiles()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  async function onDelete(fileId) {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await deleteProjectFile(id, fileId)
      await loadFiles()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onRename(file) {
    if (renamingId !== file.id) {
      setRenamingId(file.id)
      setRenamingName(file.file_name)
      return
    }

    if (!renamingName.trim() || renamingName === file.file_name) {
      setRenamingId(null)
      return
    }

    try {
      await renameProjectFile(id, file.id, renamingName)
      setRenamingId(null)
      await loadFiles()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <div className="page-header animate-fadeUp">
        <h1 className="page-title">📁 Project Detail</h1>
        <p className="page-subtitle">Manage members and files for this project.</p>
        <div className="page-actions">
          <Link to="/projects" className="btn btn--ghost">← Back to Projects</Link>
        </div>
      </div>

      <div className="project-tabs animate-fadeUp" style={{ animationDelay: '0.08s' }}>
        <button className={`tag ${tab === 'files' ? 'active' : ''}`} onClick={() => setTab('files')}>Files</button>
        <button className={`tag ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>Members</button>
      </div>

      {error && <p className="project-error">{error}</p>}

      {tab === 'members' ? (
        <div className="card project-panel animate-fadeUp" style={{ animationDelay: '0.12s' }}>
          <p className="section-label">Invite Member</p>
          <form className="project-invite" onSubmit={onInvite}>
            <input
              className="input"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <button className="btn btn--primary" type="submit" disabled={inviting || !username.trim()}>
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </form>

          <div className="divider" />

          <p className="section-label">Members</p>
          {loadingMembers ? (
            <p>Loading members...</p>
          ) : (
            <div className="project-members">
              {members.map(member => (
                <div key={member.id} className="project-member-row">
                  <span>{member.username}</span>
                  <span className={`badge ${member.role === 'Admin' ? 'badge--accent' : 'badge--neutral'}`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="project-files-wrap">
          <div
            className={`project-dropzone card animate-fadeUp ${dragging ? 'project-dropzone--drag' : ''}`}
            style={{ animationDelay: '0.12s' }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
            <p className="project-dropzone__title">Drag & drop files, or click to upload</p>
            <p className="project-dropzone__sub">Uploads to Drive and links metadata to this project.</p>
            <button
              className="btn btn--primary btn--sm"
              onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Browse Files'}
            </button>
          </div>

          <div className="card project-panel animate-fadeUp" style={{ animationDelay: '0.16s' }}>
            <p className="section-label">Files</p>
            {loadingFiles ? (
              <p>Loading files...</p>
            ) : files.length === 0 ? (
              <p>No files yet.</p>
            ) : (
              <div className="project-files-table">
                <div className="project-files-head">
                  <span>Name</span>
                  <span>Size</span>
                  <span>Uploader</span>
                  <span>Uploaded</span>
                  <span style={{ textAlign: 'right' }}>Actions</span>
                </div>
                {files.map(file => {
                  const isUserAdmin = members.some(m => m.id === currentUser?.id && m.role === 'Admin');
                  const canEdit = isUserAdmin || file.uploaded_by === currentUser?.id;
                  
                  return (
                  <div key={file.id} className="project-files-row">
                    <div className="project-files-name">
                      {renamingId === file.id ? (
                        <input
                          autoFocus
                          className="input"
                          style={{ padding: '0.2rem 0.5rem', margin: 0, height: 'auto', minHeight: '30px' }}
                          value={renamingName}
                          onChange={e => setRenamingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') onRename(file)
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          onBlur={() => onRename(file)}
                        />
                      ) : (
                        <span>{file.file_name}</span>
                      )}
                    </div>
                    <span>{formatSize(file.size)}</span>
                    <span>{file.uploaded_by_username || 'Unknown'}</span>
                    <span>{new Date(file.uploaded_at).toLocaleString()}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {file.google_file_id && (
                        <a
                          className="btn btn--primary btn--sm"
                          href={`${STORAGE_URL}/file/${file.google_file_id}`}
                          download={file.file_name}
                        >
                          Download
                        </a>
                      )}
                      {canEdit && renamingId !== file.id && (
                        <button className="btn btn--neutral btn--sm" onClick={() => onRename(file)}>
                          Rename
                        </button>
                      )}
                      {canEdit && (
                        <button className="btn btn--danger btn--sm" onClick={() => onDelete(file.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatSize(bytes) {
  const value = Number(bytes || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
