import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CalendarDays, Sparkles, Loader, Download } from 'lucide-react'
import { studyPlanAPI } from '../api/endpoints'
import { analyticsAPI } from '../api/endpoints'
import { toast } from '../components/Toast'

export default function Schedules() {
  const [plan, setPlan]         = useState(null)
  const [form, setForm]         = useState({ duration_days: 7, goals: '', weak_topics_str: '' })
  const [generating, setGen]    = useState(false)
  const [loading, setLoading]   = useState(true)
  const [weakTopics, setWeak]   = useState([])

  useEffect(() => {
    // Load existing plan
    studyPlanAPI.get()
      .then(({ data }) => setPlan(data.data))
      .catch(() => { /* none yet */ })
      .finally(() => setLoading(false))

    // Pre-fill weak topics from analytics
    analyticsAPI.get()
      .then(({ data }) => setWeak(data.data?.weak_topics || []))
      .catch(() => {})
  }, [])

  const generate = async (e) => {
    e.preventDefault()
    if (!form.goals.trim()) { toast('Please describe your learning goals.', 'warning'); return }
    setGen(true)
    try {
      const weak_topics = [
        ...weakTopics,
        ...form.weak_topics_str.split(',').map((t) => t.trim()).filter(Boolean)
      ]
      const { data } = await studyPlanAPI.generate({
        duration_days: form.duration_days,
        goals: form.goals,
        weak_topics,
      })
      setPlan(data.data)
      toast('Study plan generated!', 'success')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to generate plan.', 'error')
    } finally { setGen(false) }
  }

  const exportTxt = () => {
    if (!plan) return
    const blob = new Blob([plan.markdown_content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'study-plan.txt' })
    a.click(); URL.revokeObjectURL(url)
    toast('Study plan exported!', 'success')
  }

  return (
    <div className="page-container">
      <h1 className="section-title">Study Schedule</h1>
      <p className="section-subtitle">Generate a personalized AI study plan based on your materials and goals.</p>

      {/* Generator Form */}
      <form onSubmit={generate} className="glass-card p-6 mb-6 space-y-5" id="schedule-form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Duration</label>
            <select id="duration-select" value={form.duration_days}
              onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} className="input-field">
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Additional Weak Topics <span className="normal-case text-slate-500 font-normal">(comma separated)</span>
            </label>
            <input id="weak-topics-input" type="text"
              value={form.weak_topics_str}
              onChange={(e) => setForm({ ...form, weak_topics_str: e.target.value })}
              placeholder="e.g. Recursion, Binary Trees"
              className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Learning Goals</label>
          <textarea id="goals-textarea" rows={3} required
            value={form.goals}
            onChange={(e) => setForm({ ...form, goals: e.target.value })}
            placeholder="e.g. Prepare for my data structures final exam and master algorithms…"
            className="input-field resize-none" />
        </div>
        {weakTopics.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Auto-detected weak topics from your quizzes:</p>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((t) => <span key={t} className="badge-red">{t}</span>)}
            </div>
          </div>
        )}
        <button id="generate-schedule-btn" type="submit" disabled={generating} className="btn-primary gap-2">
          {generating ? <><Loader size={16} className="animate-spin" /> Generating Plan…</>
                      : <><Sparkles size={16} /> Generate Study Plan</>}
        </button>
      </form>

      {/* Loading Skeleton */}
      {loading && <div className="glass-card p-8 skeleton h-64 rounded-2xl" />}

      {/* Generating overlay */}
      {generating && (
        <div className="glass-card p-12 text-center">
          <Loader size={32} className="text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">AI is building your study plan…</p>
          <p className="text-slate-500 text-sm mt-1">This may take 20–40 seconds.</p>
        </div>
      )}

      {/* Plan Display */}
      <AnimatePresence>
        {!generating && plan && (
          <motion.div key="plan" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <CalendarDays size={18} className="text-primary-400" />
                <h2 className="font-semibold text-slate-200 text-sm">
                  {plan.duration_days}-Day Study Plan
                </h2>
                <span className="badge-primary text-xs">{plan.duration_days} days</span>
              </div>
              <button id="export-plan-btn" onClick={exportTxt}
                className="btn-secondary gap-1.5 py-1.5 px-3 text-xs">
                <Download size={13} /> Export TXT
              </button>
            </div>
            <div className="px-6 py-5 markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.markdown_content}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !generating && !plan && (
        <div className="glass-card p-12 text-center">
          <CalendarDays size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No study plan generated yet</p>
          <p className="text-slate-500 text-sm mt-1">Fill in your goals and click Generate to get started.</p>
        </div>
      )}
    </div>
  )
}
