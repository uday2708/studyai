import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, Bell, Shield, Keyboard, Database, Sliders, Info } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { toast } from '../components/Toast'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState({
    quizReminders: true,
    weeklyReports: false,
    aiTips: true
  })
  const [studyPreferences, setStudyPreferences] = useState({
    defaultDuration: 7,
    autoBackup: true
  })

  const saveSettings = () => {
    toast('Settings saved successfully!', 'success')
  }

  return (
    <div className="page-container max-w-4xl">
      <h1 className="section-title">Settings</h1>
      <p className="section-subtitle">Manage application configuration, styling preference, and local storage rules.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-2 md:col-span-1">
          <button className="w-full text-left px-4 py-3 rounded-xl bg-primary-600/20 text-primary-300 border border-primary-500/20 text-sm font-semibold flex items-center gap-3">
            <Sliders size={18} /> General Settings
          </button>
          <button onClick={() => toast('Security configurations are pre-defined by JWT protocol.', 'info')} 
            className="w-full text-left px-4 py-3 rounded-xl text-slate-400 hover:bg-white/3 transition-colors text-sm font-medium flex items-center gap-3">
            <Shield size={18} /> Security & Auth
          </button>
          <button onClick={() => toast('Keyboard shortcuts: Use left/right arrow keys inside Flashcards!', 'info')}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-400 hover:bg-white/3 transition-colors text-sm font-medium flex items-center gap-3">
            <Keyboard size={18} /> Hotkeys & Shortcuts
          </button>
        </div>

        {/* Content Area */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:col-span-2 space-y-6"
        >
          {/* Theme Switcher */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              Theme Configuration
            </h3>
            <div className="flex items-center justify-between bg-white/3 border border-white/5 p-4 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-slate-200">Visual Theme</p>
                <p className="text-xs text-slate-500">Toggle between dark night styling or clean daylight mode.</p>
              </div>
              <button 
                onClick={toggleTheme}
                className="btn-secondary gap-2 px-4 py-2"
                id="settings-theme-btn"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <span className="capitalize">{theme} Theme</span>
              </button>
            </div>
          </div>

          {/* Notification toggles */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Notification Subscriptions</h3>
            <div className="space-y-3">
              {[
                { key: 'quizReminders', label: 'Quiz Reminders', desc: 'Notify me when I have pending mock tests.' },
                { key: 'weeklyReports', label: 'Weekly Summary Analytics', desc: 'Receive weekend recap performance graphs via email.' },
                { key: 'aiTips', label: 'Adaptive Tips & Hints', desc: 'Show tailored suggestions on weak areas directly on study guides.' }
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between">
                  <div className="pr-4">
                    <label className="text-sm font-semibold text-slate-300 block cursor-pointer" htmlFor={key}>{label}</label>
                    <span className="text-xs text-slate-500">{desc}</span>
                  </div>
                  <input 
                    type="checkbox"
                    id={key}
                    checked={notifications[key]}
                    onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-white/3 text-primary-500 accent-primary-500 mt-1 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Backup / Cache */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Data management</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-300">Clean local storage</p>
                <p className="text-xs text-slate-500">Wipe auth session data and themes from this browser instance.</p>
              </div>
              <button 
                onClick={() => {
                  localStorage.clear()
                  toast('Browser workspace cleaned. Logging out...', 'warning')
                  setTimeout(() => window.location.reload(), 1500)
                }}
                className="btn-danger py-2 px-4 text-xs font-semibold"
              >
                Reset Cache
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <button onClick={saveSettings} className="btn-primary py-2 px-6">
              Save Settings
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
