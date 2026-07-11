import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Sparkles, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import { materialsAPI, summariesAPI } from '../api/endpoints'
import { toast } from '../components/Toast'

export default function Summaries() {
  const [materials, setMaterials] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [summary, setSummary]       = useState(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState(true)

  useEffect(() => {
    materialsAPI.getAll().then(({ data }) => {
      const ready = (data.data || []).filter((m) => m.status === 'completed')
      setMaterials(ready)
      if (ready.length) setSelectedId(ready[0].id)
    }).catch(() => toast('Failed to load materials.', 'error'))
    .finally(() => setLoading(false))
  }, [])

  // Load existing summary when material changes
  useEffect(() => {
    if (!selectedId) return
    setSummary(null)
    summariesAPI.getByMaterial(selectedId)
      .then(({ data }) => setSummary(data.data))
      .catch(() => { /* no summary yet */ })
  }, [selectedId])

  const generate = async () => {
    if (!selectedId) { toast('Please select a material first.', 'warning'); return }
    setGenerating(true)
    try {
      const { data } = await summariesAPI.generate({ material_id: selectedId })
      setSummary(data.data)
      toast('Summary generated!', 'success')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to generate summary.', 'error')
    } finally { setGenerating(false) }
  }

  return (
    <div className="page-container">
      <h1 className="section-title">AI Summaries</h1>
      <p className="section-subtitle">Generate structured markdown summaries from your study materials.</p>

      {/* Controls */}
      <div className="glass-card p-5 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Material</label>
          {loading ? <div className="skeleton h-11 rounded-xl" /> : (
            <select
              id="summary-material-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input-field"
            >
              {materials.length === 0
                ? <option>No completed materials yet</option>
                : materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)
              }
            </select>
          )}
        </div>
        <button
          id="generate-summary-btn"
          onClick={generate}
          disabled={generating || !selectedId || materials.length === 0}
          className="btn-primary gap-2"
        >
          {generating
            ? <><Loader size={16} className="animate-spin" /> Generating…</>
            : <><Sparkles size={16} /> Generate Summary</>
          }
        </button>
      </div>

      {/* Summary Display */}
      <AnimatePresence mode="wait">
        {generating && (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass-card p-8 text-center">
            <Loader size={32} className="text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-300 font-medium">AI is generating your summary…</p>
            <p className="text-slate-500 text-sm mt-1">This may take 15–30 seconds.</p>
          </motion.div>
        )}

        {!generating && summary && (
          <motion.div key="sum" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden">
            {/* Summary Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-primary-400" />
                <h2 className="font-semibold text-slate-200 text-sm">{summary.title}</h2>
              </div>
              <button onClick={() => setExpanded((e) => !e)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                aria-label="Toggle summary">
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 py-5 markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summary.markdown_content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {!generating && !summary && materials.length > 0 && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card p-12 text-center">
            <Sparkles size={36} className="text-primary-500/50 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No summary yet</p>
            <p className="text-slate-500 text-sm mt-1">Select a material and click Generate Summary.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
