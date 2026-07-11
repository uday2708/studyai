import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  FolderOpen, FileText, CreditCard, HelpCircle,
  TrendingUp, Target, Clock, Zap, ChevronRight
} from 'lucide-react'
import { analyticsAPI } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler)

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
  },
}

function StatCard({ icon: Icon, label, value, color, to, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Link to={to} className="glass-card-hover p-5 flex items-center gap-4 block">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
          <p className="text-xs text-slate-400 font-medium">{label}</p>
        </div>
        <ChevronRight size={16} className="ml-auto text-slate-600" />
      </Link>
    </motion.div>
  )
}

function SkeletonCard() {
  return <div className="glass-card p-5 h-28 skeleton" />
}

export default function Dashboard() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading]     = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data } = await analyticsAPI.get()
      setAnalytics(data.data)
    } catch { /* silently fail — show placeholders */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  /* ── Derived chart data ─────────────────────────────────────────────── */
  const scores = analytics?.quiz_scores?.slice(-10) || []
  const scoreLabels = scores.map((s, i) => `Quiz ${i + 1}`)
  const scoreValues = scores.map((s) => ((s.score / s.max_score) * 100).toFixed(1))
  const avgScore = scoreValues.length
    ? (scoreValues.reduce((a, b) => a + parseFloat(b), 0) / scoreValues.length).toFixed(1)
    : 0

  const weakTopics = analytics?.weak_topics || []

  const lineData = {
    labels: scoreLabels.length ? scoreLabels : ['No data'],
    datasets: [{
      label: 'Score %',
      data: scoreValues.length ? scoreValues : [0],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointRadius: 5,
    }],
  }

  const doughnutData = {
    labels: ['Known', 'Remaining'],
    datasets: [{
      data: [
        analytics?.completion_percentage ?? 0,
        100 - (analytics?.completion_percentage ?? 0),
      ],
      backgroundColor: ['#6366f1', 'rgba(99,102,241,0.12)'],
      borderColor:     ['#818cf8', 'rgba(99,102,241,0.0)'],
      borderWidth: 2,
    }],
  }

  const stats = [
    { icon: FolderOpen, label: 'Materials Uploaded',   value: analytics?.materials_uploaded,   color: 'bg-primary-600',  to: '/materials', delay: 0.1 },
    { icon: FileText,   label: 'Summaries Generated',  value: analytics?.summaries_generated,  color: 'bg-violet-600',   to: '/summaries', delay: 0.2 },
    { icon: CreditCard, label: 'Flashcards Created',   value: analytics?.flashcards_generated, color: 'bg-accent-600',   to: '/flashcards',delay: 0.3 },
    { icon: TrendingUp, label: 'Average Quiz Score',   value: `${avgScore}%`,                  color: 'bg-emerald-600',  to: '/quizzes',   delay: 0.4 },
    { icon: Clock,      label: 'Study Hours',           value: `${analytics?.study_hours ?? 0}h`, color: 'bg-amber-600', to: '/analytics', delay: 0.5 },
    { icon: Target,     label: 'Completion',           value: `${analytics?.completion_percentage ?? 0}%`, color: 'bg-cyan-600', to: '/flashcards', delay: 0.6 },
  ]

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="section-title text-3xl">
          Welcome back, <span className="gradient-text">{user?.username}</span> 👋
        </h1>
        <p className="section-subtitle">Here's your study progress at a glance.</p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="glass-card p-4 mb-8 flex flex-wrap gap-3">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-2">
          <Zap size={13} /> Quick Start
        </span>
        {[
          { label: 'Upload Material', to: '/materials' },
          { label: 'Generate Quiz',   to: '/quizzes' },
          { label: 'Study Plan',      to: '/schedules' },
          { label: 'View Analytics',  to: '/analytics' },
        ].map(({ label, to }) => (
          <Link key={to} to={to} className="btn-secondary py-1.5 px-3 text-xs">{label}</Link>
        ))}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {loading
          ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((s) => <StatCard key={s.label} {...s} />)
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Score History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }} className="glass-card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Quiz Score History</h3>
          <div className="h-48">
            {loading ? <div className="skeleton h-full rounded-xl" /> :
              <Line data={lineData} options={CHART_DEFAULTS} />}
          </div>
        </motion.div>

        {/* Completion Donut */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }} className="glass-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 self-start">Flashcard Mastery</h3>
          <div className="h-36 w-36 relative">
            {loading ? <div className="skeleton rounded-full h-full w-full" /> : (
              <>
                <Doughnut data={doughnutData} options={{ ...CHART_DEFAULTS, scales: undefined, cutout: '72%' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold gradient-text">{analytics?.completion_percentage ?? 0}%</span>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3">Cards Mastered</p>
        </motion.div>
      </div>

      {/* Weak Topics */}
      {(weakTopics.length > 0 || loading) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">⚠️ Weak Topics to Review</h3>
            <Link to="/quizzes" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              Practice Now →
            </Link>
          </div>
          {loading
            ? <div className="flex gap-2">{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-7 w-24 rounded-full" />)}</div>
            : (
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((t) => (
                  <span key={t} className="badge-red">{t}</span>
                ))}
              </div>
            )
          }
        </motion.div>
      )}
    </div>
  )
}
