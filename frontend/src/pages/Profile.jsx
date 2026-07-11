import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Shield, Calendar, Award, BookOpen, Clock, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI } from '../api/endpoints'
import { toast } from '../components/Toast'

export default function Profile() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsAPI.get()
      .then(({ data }) => setStats(data.data))
      .catch(() => toast('Failed to load profile stats.', 'error'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-container max-w-4xl">
      <h1 className="section-title">My Profile</h1>
      <p className="section-subtitle">Manage your personal account details and review your achievements.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex flex-col items-center text-center md:col-span-1"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-glow">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <h2 className="text-xl font-bold text-white">{user?.username}</h2>
          <p className="text-sm text-slate-400 mb-6">{user?.email}</p>

          <div className="w-full border-t border-white/5 pt-4 space-y-3 text-left">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield size={14} className="text-primary-400" />
              <span>Role: Student</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar size={14} className="text-primary-400" />
              <span>Member since: July 2026</span>
            </div>
          </div>
        </motion.div>

        {/* Details & Achievements */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 md:col-span-2 space-y-6"
        >
          {/* Account Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4 pb-2 border-b border-white/5">Account Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Username</label>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-200 bg-white/3 px-3 py-2.5 rounded-xl border border-white/5">
                  <User size={14} className="text-slate-500" />
                  <span>{user?.username}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-200 bg-white/3 px-3 py-2.5 rounded-xl border border-white/5">
                  <Mail size={14} className="text-slate-500" />
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4 pb-2 border-b border-white/5">Learning Statistics</h3>
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="skeleton h-20" />
                <div className="skeleton h-20" />
                <div className="skeleton h-20" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/3 border border-white/5 p-4 rounded-xl text-center">
                  <BookOpen size={18} className="text-primary-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{stats?.materials_uploaded ?? 0}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Materials</p>
                </div>
                <div className="bg-white/3 border border-white/5 p-4 rounded-xl text-center">
                  <Clock size={18} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{stats?.study_hours ?? 0}h</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Study Time</p>
                </div>
                <div className="bg-white/3 border border-white/5 p-4 rounded-xl text-center">
                  <Award size={18} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{stats?.completion_percentage ?? 0}%</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Mastery</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
