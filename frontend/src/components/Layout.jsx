import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderOpen, FileText, CreditCard,
  HelpCircle, CalendarDays, BarChart3, LogOut, Menu, X,
  BookOpenCheck, Sun, Moon, ChevronRight, Bell, User, Settings, Info
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { toast } from './Toast'

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/materials', icon: FolderOpen,      label: 'Materials' },
  { to: '/summaries', icon: FileText,        label: 'Summaries' },
  { to: '/flashcards',icon: CreditCard,      label: 'Flashcards' },
  { to: '/quizzes',   icon: HelpCircle,      label: 'Quizzes' },
  { to: '/schedules', icon: CalendarDays,    label: 'Study Plan' },
  { to: '/analytics', icon: BarChart3,       label: 'Analytics' },
]

function NavItem({ to, icon: Icon, label, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
        ${isActive
          ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`
      }
    >
      <Icon size={20} className="flex-shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2 py-1 bg-surface-700 text-slate-200 text-xs rounded-lg
                        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap
                        border border-white/10 shadow-glass z-50">
          {label}
        </div>
      )}
    </NavLink>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const profileRef = useRef(null)
  const notificationsRef = useRef(null)

  // Auto-close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    toast('Logged out successfully', 'info')
    navigate('/login')
  }

  // Breadcrumbs builder
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean)
    if (paths.length === 0) return [{ label: 'Dashboard', to: '/' }]
    
    return [
      { label: 'Dashboard', to: '/' },
      ...paths.map((p, i) => {
        const to = '/' + paths.slice(0, i + 1).join('/')
        // Capitalize route name
        const label = p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' ')
        return { label, to }
      })
    ]
  }

  const breadcrumbs = getBreadcrumbs()

  const sidebar = (
    <aside
      className={`flex flex-col h-full border-r transition-all duration-300
                  border-white/5 bg-surface-800/80 backdrop-blur-xl
                  ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
          <BookOpenCheck size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg gradient-text">StudyAI</span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto text-slate-500 hover:text-slate-300 transition-colors hidden md:block"
          aria-label="Toggle sidebar"
          id="sidebar-toggle-btn"
        >
          <ChevronRight size={16} className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>

      {/* Footer / Theme toggle & Account Info */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <button
          onClick={toggleTheme}
          id="sidebar-theme-toggle-btn"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-200"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {!collapsed && (
          <div 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/5 transition-colors cursor-pointer border border-white/5"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          id="sidebar-logout-btn"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-surface-900 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">{sidebar}</div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 h-full z-50 md:hidden w-60"
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-800/80 backdrop-blur-xl h-16">
          {/* Left part: Mobile Menu Button or Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              id="mobile-menu-btn"
              className="text-slate-400 hover:text-slate-200 transition-colors md:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumbs (Desktop & Tablet) */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-400">
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.to} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight size={12} className="text-slate-600" />}
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="text-slate-200 font-semibold">{crumb.label}</span>
                  ) : (
                    <NavLink to={crumb.to} className="hover:text-slate-200 transition-colors">
                      {crumb.label}
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right part: Actions, Notifications, User menu */}
          <div className="flex items-center gap-3">
            {/* Notification placeholder */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl bg-white/3 border border-white/5 text-slate-400 hover:text-slate-200 transition-all duration-200 relative"
                aria-label="Notifications"
                id="notifications-btn"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500" />
              </button>
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 glass-card p-4 shadow-glass z-50 border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-xs font-bold text-white">Notifications</span>
                      <span className="text-[10px] text-primary-400 hover:underline cursor-pointer" onClick={() => toast('All read!', 'success')}>Mark all as read</span>
                    </div>
                    <div className="space-y-2.5 max-h-60 overflow-y-auto">
                      <div className="flex gap-2.5 text-xs p-2 rounded-lg bg-white/3 border border-white/5">
                        <Info size={14} className="text-primary-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-200">Study plan ready</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Your study schedule guide is successfully prepared.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Popover / Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-colors"
                id="profile-dropdown-btn"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-xs font-semibold text-slate-200 pr-1.5 hidden sm:inline">{user?.username}</span>
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 glass-card py-2 shadow-glass z-50 border border-white/10"
                  >
                    <button 
                      onClick={() => { setProfileMenuOpen(false); navigate('/profile') }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                    >
                      <User size={14} /> View Profile
                    </button>
                    <button 
                      onClick={() => { setProfileMenuOpen(false); navigate('/settings') }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                    >
                      <Settings size={14} /> Settings
                    </button>
                    <div className="border-t border-white/5 my-1" />
                    <button 
                      onClick={() => { setProfileMenuOpen(false); handleLogout() }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dynamic page content scrollable */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
