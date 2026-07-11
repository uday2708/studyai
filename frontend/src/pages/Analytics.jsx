import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { BarChart3, TrendingUp, BookOpen, CreditCard, FileText, Clock, Target } from 'lucide-react'
import { analyticsAPI } from '../api/endpoints'
import { toast } from '../components/Toast'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler)

const CHART_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
    tooltip: {
      backgroundColor: 'rgba(17,17,24,0.95)',
      borderColor: 'rgba(99,102,241,0.4)',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
    },
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
  },
}

function MetricCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="glass-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
      </div>
    </motion.div>
  )
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    analyticsAPI.get()
      .then(({ data }) => setAnalytics(data.data))
      .catch(() => toast('Failed to load analytics.', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const scores = analytics?.quiz_scores?.slice(-12) || []
  const scoreLabels = scores.map((_, i) => `Quiz ${i + 1}`)
  const scoreValues = scores.map((s) => parseFloat(((s.score / s.max_score) * 100).toFixed(1)))

  const lineData = {
    labels: scoreLabels.length ? scoreLabels : ['No data'],
    datasets: [{
      label: 'Score %',
      data: scoreValues.length ? scoreValues : [0],
      borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true, tension: 0.4, pointBackgroundColor: '#818cf8', pointRadius: 5,
    }],
  }

  const barData = {
    labels: ['Materials', 'Summaries', 'Flashcards'],
    datasets: [{
      label: 'Count',
      data: [
        analytics?.materials_uploaded  || 0,
        analytics?.summaries_generated || 0,
        analytics?.flashcards_generated|| 0,
      ],
      backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(139,92,246,0.7)', 'rgba(217,70,239,0.7)'],
      borderColor:     ['#6366f1', '#8b5cf6', '#d946ef'],
      borderWidth: 2, borderRadius: 8,
    }],
  }

  const donutData = {
    labels: ['Mastered', 'Remaining'],
    datasets: [{
      data: [analytics?.completion_percentage ?? 0, 100 - (analytics?.completion_percentage ?? 0)],
      backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(99,102,241,0.1)'],
      borderColor:     ['#818cf8', 'transparent'],
      borderWidth: 2,
    }],
  }

  const weakTopics = analytics?.weak_topics || []
  const avgScore = scores.length
    ? (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(1)
    : 0

  const metrics = [
    { icon: BookOpen,    label: 'Materials Uploaded',    value: analytics?.materials_uploaded,    color: 'bg-primary-600',  delay: 0.1 },
    { icon: FileText,    label: 'Summaries Generated',   value: analytics?.summaries_generated,   color: 'bg-violet-600',   delay: 0.15 },
    { icon: CreditCard,  label: 'Flashcards Generated',  value: analytics?.flashcards_generated,  color: 'bg-accent-600',   delay: 0.2 },
    { icon: TrendingUp,  label: 'Average Score',         value: `${avgScore}%`,                   color: 'bg-emerald-600',  delay: 0.25 },
    { icon: Clock,       label: 'Study Hours',            value: `${analytics?.study_hours ?? 0}h`, color: 'bg-amber-600',  delay: 0.3 },
    { icon: Target,      label: 'Mastery Level',         value: `${analytics?.completion_percentage ?? 0}%`, color: 'bg-cyan-600', delay: 0.35 },
  ]

  return (
    <div className="page-container">
      <h1 className="section-title flex items-center gap-2">
        <BarChart3 size={22} className="text-primary-400" /> Analytics
      </h1>
      <p className="section-subtitle">Track your learning progress and performance over time.</p>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {loading
          ? Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
          : metrics.map((m) => <MetricCard key={m.label} {...m} />)
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Score History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Quiz Score History</h3>
          <div className="h-52">
            {loading ? <div className="skeleton h-full rounded-xl" /> :
              <Line data={lineData} options={{ ...CHART_BASE, plugins: { ...CHART_BASE.plugins, legend: { display: false } } }} />}
          </div>
        </motion.div>

        {/* Mastery Donut */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 self-start">Flashcard Mastery</h3>
          <div className="h-40 w-40 relative">
            {loading ? <div className="skeleton rounded-full h-full w-full" /> : (
              <>
                <Doughnut data={donutData} options={{ ...CHART_BASE, scales: undefined, cutout: '70%',
                  plugins: { ...CHART_BASE.plugins, legend: { display: false } } }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold gradient-text">{analytics?.completion_percentage ?? 0}%</span>
                  <span className="text-xs text-slate-500">mastered</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Activity Bar Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="glass-card p-6 mb-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Activity Breakdown</h3>
        <div className="h-48">
          {loading ? <div className="skeleton h-full rounded-xl" /> :
            <Bar data={barData} options={{ ...CHART_BASE, plugins: { ...CHART_BASE.plugins, legend: { display: false } } }} />}
        </div>
      </motion.div>

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">⚠️ Weak Topics Detected</h3>
          <div className="flex flex-wrap gap-2">
            {weakTopics.map((t) => <span key={t} className="badge-red">{t}</span>)}
          </div>
        </motion.div>
      )}
    </div>
  )
}
