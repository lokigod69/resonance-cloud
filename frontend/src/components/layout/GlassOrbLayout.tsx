import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { RedeemCodeDialog } from '@/components/RedeemCodeDialog'
import ProfileModal from '@/components/ProfileModal'

const navItems = [
  { icon: 'grid_view', path: '/dashboard', label: 'Dashboard' },
  { icon: 'auto_awesome', path: '/generate', label: 'Generate' },
  { icon: 'style', path: '/study', label: 'Study' },
]

export default function GlassOrbLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="go-root">
      <div className="global-nav">
        {/* Credits button */}
        <button
          onClick={() => setRedeemOpen(true)}
          title="Credits"
          style={{
            width: 'auto',
            height: 44,
            borderRadius: 22,
            paddingLeft: 12,
            paddingRight: 14,
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>toll</span>
          {profile?.credits ?? 0}
        </button>

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

        {/* Profile button */}
        <button
          onClick={() => setProfileOpen(true)}
          title="Profile"
        >
          <span className="material-symbols-outlined">person</span>
        </button>
      </div>
      <Outlet />
      <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  )
}
