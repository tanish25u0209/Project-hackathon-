import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const NAV = [
  { to: '/projects', icon: '🗂️', label: 'Projects', exact: true },
  { to: '/research', icon: '🔬', label: 'Research' },
  { to: '/results',  icon: '📊', label: 'Results' },
  { to: '/library',  icon: '💡', label: 'Idea Library' },
  { to: '/history',  icon: '🕒', label: 'Sessions' },
  { to: '/chatbot',  icon: '⚡', label: 'PROMPTFORGE' },
]

export default function Sidebar({ user, onLogout }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">⚡</div>
        <div>
          <div className="sidebar__logo-title">PROMPTFORGE</div>
          <div className="sidebar__logo-sub">Multi-LLM Platform</div>
        </div>
      </div>

      <div className="sidebar__divider" />

      {/* Nav */}
      <nav className="sidebar__nav">
        <p className="sidebar__section-label">Navigation</p>
        {NAV.map(({ to, icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__link-icon">{icon}</span>
            <span className="sidebar__link-label">{label}</span>
            {to === '/chatbot' && <span className="badge badge--accent" style={{ fontSize: '9px', padding: '2px 6px' }}>LIVE</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom status */}
      <div className="sidebar__footer">
        <div className="sidebar__footer-main">
          <div className="sidebar__status-dot" />
          <span className="sidebar__status-text" title={user?.username || 'User'}>
            {user?.username ? user.username.split('@')[0] : 'User'}
          </span>
        </div>
        <button className="btn btn--ghost btn--sm sidebar__logout" onClick={onLogout}>Logout</button>
      </div>
    </aside>
  )
}
