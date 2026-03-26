import { Outlet, useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { icon: 'grid_view', path: '/dashboard', label: 'Dashboard' },
  { icon: 'auto_awesome', path: '/generate', label: 'Generate' },
  { icon: 'style', path: '/study', label: 'Study' },
  { icon: 'settings', path: '/settings', label: 'Settings' },
]

export default function GlassOrbLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="go-root">
      <div className="global-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            title={item.label}
            style={{
              boxShadow: location.pathname === item.path
                ? '0 0 12px rgba(94, 106, 210, 0.6)'
                : undefined,
              borderColor: location.pathname === item.path
                ? 'rgba(94, 106, 210, 0.6)'
                : undefined,
            }}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
          </button>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
