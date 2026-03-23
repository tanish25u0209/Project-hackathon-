// API Client — wraps all backend endpoints

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const API_KEY  = import.meta.env.VITE_API_KEY || 'dev_local_api_key_9f3b'
export const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000'

const AUTH_TOKEN_KEY = 'pf_auth_token'
const AUTH_USER_KEY = 'pf_auth_user'

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY)
export const getAuthUser = () => {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveAuthSession({ token, user }) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Api-Key': API_KEY,
  ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
})

async function request(method, path, body) {
  const opts = { method, headers: headers() }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE_URL}${path}`, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(extractApiErrorMessage(data, res.status))
  return data
}

function extractApiErrorMessage(data, status) {
  if (!data || typeof data !== 'object') return `HTTP ${status}`
  if (typeof data.message === 'string' && data.message) return data.message
  if (typeof data.error === 'string' && data.error) return data.error
  if (data.error && typeof data.error.message === 'string' && data.error.message) return data.error.message
  return `HTTP ${status}`
}

// Research
export const runMultiModel  = (input)    => request('POST', '/multimodel', { input })
export const runResearch    = (problem)  => request('POST', '/research', { problemStatement: problem })
export const runResearchAsync = (problem)=> request('POST', '/research/async', { problemStatement: problem })
export const pollJobStatus  = (jobId)    => request('GET', `/research/job/${jobId}`)

// Sessions
export const listSessions   = (params = {}) => {
  const q = new URLSearchParams({ limit: 20, offset: 0, ...params }).toString()
  return request('GET', `/sessions?${q}`)
}
export const getSession     = (id)       => request('GET', `/sessions/${id}`)
export const deleteSession  = (id)       => request('DELETE', `/sessions/${id}`)
export const synthesize     = (id)       => request('POST', `/sessions/${id}/synthesize`, {})
export const getSessionIdeas= (id)       => request('GET', `/sessions/${id}/ideas?unique=true`)

// Ideas
export const listSavedIdeas = (params = {}) => {
  const q = new URLSearchParams({ limit: 50, offset: 0, ...params }).toString()
  return request('GET', `/ideas/saved?${q}`)
}
export const saveIdea       = (payload)  => request('POST', '/ideas/save', payload)
export const rateIdea       = (id,rating)=> request('POST', `/ideas/${id}/rate`, { rating })
export const updateIdea     = (id,patch) => request('PATCH', `/ideas/${id}`, patch)
export const deleteIdea     = (id)       => request('DELETE', `/ideas/${id}`)
export const getRelatedIdeas= (id)       => request('GET', `/ideas/${id}/related`)
export const deepenIdea     = (sessionId,ideaId,opts={}) =>
  request('POST', `/research/${sessionId}/deepen/${ideaId}`, opts)

// Health
export const healthCheck    = ()         => request('GET', '/health')

// Auth
export async function registerUser(payload) {
  const result = await request('POST', '/auth/register', payload)
  saveAuthSession(result.data)
  return result.data
}

export async function loginUser(payload) {
  const result = await request('POST', '/auth/login', payload)
  saveAuthSession(result.data)
  return result.data
}

// Projects
export const getProjects = async () => {
  const result = await request('GET', '/projects')
  return result.data
}

export const createProject = async (payload) => {
  const result = await request('POST', '/projects', payload)
  return result.data
}

export const getProjectMembers = async (projectId) => {
  const result = await request('GET', `/projects/${projectId}/members`)
  return result.data
}

export const addProjectMember = async (projectId, payload) => {
  const result = await request('POST', `/projects/${projectId}/members`, payload)
  return result.data
}

export const getProjectFiles = async (projectId) => {
  const result = await request('GET', `/projects/${projectId}/files`)
  return result.data
}

export const linkProjectFile = async (projectId, payload) => {
  const result = await request('POST', `/projects/${projectId}/files`, payload)
  return result.data
}

export const deleteProjectFile = async (projectId, fileId) => {
  const result = await request('DELETE', `/projects/${projectId}/files/${fileId}`)
  return result.data
}

export const renameProjectFile = async (projectId, fileId, newName) => {
  const result = await request('PUT', `/projects/${projectId}/files/${fileId}`, { fileName: newName })
  return result.data
}

// Storage backend (localhost:8000)
export async function uploadFile(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${STORAGE_URL}/upload`, {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Upload failed')
  }
  return res.json()
}
export async function getFileMeta(fileId) {
  const res = await fetch(`${STORAGE_URL}/file/${fileId}/meta`)
  return res.json()
}
