import Sidebar from './components/Sidebar'
import { Routes, Route, Navigate } from 'react-router-dom'
import ResearchPage    from './pages/ResearchPage'
import ResultsPage     from './pages/ResultsPage'
import LibraryPage     from './pages/LibraryPage'
import HistoryPage     from './pages/HistoryPage'
import ChatbotPage     from './pages/ChatbotPage'
import AuthPage        from './pages/AuthPage'
import ProjectsPage    from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import { clearAuthSession, getAuthToken, getAuthUser } from './api'
import './App.css'
import { useState } from 'react'

export default function App() {
  const [token, setToken] = useState(getAuthToken())
  const [user, setUser] = useState(getAuthUser())

  function onAuthSuccess(data) {
    setToken(data.token)
    setUser(data.user)
  }

  function onLogout() {
    clearAuthSession()
    setToken(null)
    setUser(null)
  }

  if (!token) {
    return <AuthPage onAuthSuccess={onAuthSuccess} />
  }

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="app-main">
        <Routes>
          <Route path="/"        element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </main>
    </div>
  )
}
