import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, File, Trash2, RefreshCw, CheckCircle, Clock, XCircle, Plus } from 'lucide-react'
import { materialsAPI } from '../api/endpoints'
import { toast } from '../components/Toast'

const STATUS_CONFIG = {
  completed:  { icon: CheckCircle, color: 'text-emerald-400', badge: 'badge-green',  label: 'Ready' },
  processing: { icon: RefreshCw,   color: 'text-amber-400 animate-spin', badge: 'badge-yellow', label: 'Processing' },
  pending:    { icon: Clock,       color: 'text-slate-400',  badge: 'badge-yellow', label: 'Pending' },
  failed:     { icon: XCircle,     color: 'text-red-400',    badge: 'badge-red',    label: 'Failed' },
}

function MaterialCard({ material, onDelete, onRefresh }) {
  const { icon: StatusIcon, color, badge, label } = STATUS_CONFIG[material.status] || STATUS_CONFIG.pending
  const ext = material.file_type?.toUpperCase() || 'TXT'
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }} className="glass-card-hover p-5">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
          <FileText size={20} className="text-primary-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-slate-200 truncate">{material.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge bg-surface-500/60 text-slate-400 text-xs">{ext}</span>
            <span className={`badge ${badge} text-xs`}>
              <StatusIcon size={10} className={color} /> {label}
            </span>
            {material.word_count && (
              <span className="text-xs text-slate-500">{material.word_count.toLocaleString()} words</span>
            )}
          </div>
          {material.status === 'processing' && (
            <div className="progress-bar mt-3">
              <div className="progress-bar-fill" style={{ width: `${material.progress || 20}%` }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {material.status === 'processing' && (
            <button onClick={() => onRefresh(material.id)}
              className="p-2 text-slate-500 hover:text-amber-400 transition-colors rounded-lg hover:bg-amber-500/10"
              title="Refresh status">
              <RefreshCw size={15} />
            </button>
          )}
          <button onClick={() => onDelete(material.id)}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
            title="Delete material">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function Materials() {
  const [materials, setMaterials]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [dragOver, setDragOver]     = useState(false)
  const [textMode, setTextMode]     = useState(false)
  const [textForm, setTextForm]     = useState({ title: '', content: '' })
  const fileInputRef = useRef()

  const fetchMaterials = useCallback(async () => {
    try {
      const { data } = await materialsAPI.getAll()
      setMaterials(data.data || [])
    } catch { toast('Failed to load materials.', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  // Poll for processing status every 5s
  useEffect(() => {
    const processing = materials.some((m) => m.status === 'processing' || m.status === 'pending')
    if (!processing) return
    const timer = setInterval(fetchMaterials, 5000)
    return () => clearInterval(timer)
  }, [materials, fetchMaterials])

  const uploadFile = async (file) => {
    if (!file) return
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      toast('Only PDF, DOCX, and TXT files are supported.', 'error'); return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const { data } = await materialsAPI.upload(formData)
      setMaterials((prev) => [data.data, ...prev])
      toast('File uploaded. Parsing in background…', 'info')
    } catch (err) {
      toast(err.response?.data?.message || 'Upload failed.', 'error')
    } finally { setUploading(false) }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  const handleDelete = async (id) => {
    try {
      await materialsAPI.delete(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
      toast('Material deleted.', 'info')
    } catch { toast('Could not delete material.', 'error') }
  }

  const handleRefresh = async (id) => {
    try {
      const { data } = await materialsAPI.getById(id)
      setMaterials((prev) => prev.map((m) => m.id === id ? data.data : m))
    } catch { /* silent */ }
  }

  const handleTextSubmit = async (e) => {
    e.preventDefault()
    if (!textForm.title.trim() || !textForm.content.trim()) {
      toast('Please provide both a title and content.', 'warning'); return
    }
    setUploading(true)
    try {
      const { data } = await materialsAPI.uploadText({ title: textForm.title, content: textForm.content })
      setMaterials((prev) => [data.data, ...prev])
      setTextForm({ title: '', content: '' })
      setTextMode(false)
      toast('Text material saved!', 'success')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save text.', 'error')
    } finally { setUploading(false) }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Study Materials</h1>
          <p className="section-subtitle">Upload files or paste text to begin studying.</p>
        </div>
        <button onClick={() => setTextMode((t) => !t)} className="btn-secondary gap-2" id="add-text-btn">
          <Plus size={16} /> Paste Text
        </button>
      </div>

      {/* Text paste modal */}
      <AnimatePresence>
        {textMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleTextSubmit} className="glass-card p-6 space-y-4">
              <h3 className="font-semibold text-slate-200">Paste Study Text</h3>
              <input id="text-title" type="text" placeholder="Title (e.g. Chapter 3 Notes)"
                value={textForm.title} onChange={(e) => setTextForm({ ...textForm, title: e.target.value })}
                className="input-field" />
              <textarea id="text-content" rows={6} placeholder="Paste or type your study material here…"
                value={textForm.content} onChange={(e) => setTextForm({ ...textForm, content: e.target.value })}
                className="input-field resize-none" />
              <div className="flex gap-3">
                <button type="submit" disabled={uploading} className="btn-primary">
                  {uploading ? 'Saving…' : 'Save Material'}
                </button>
                <button type="button" onClick={() => setTextMode(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag & Drop Zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        animate={{ borderColor: dragOver ? '#6366f1' : 'rgba(99,102,241,0.2)', scale: dragOver ? 1.01 : 1 }}
        className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-8
                   hover:border-primary-500/60 hover:bg-primary-500/5"
        id="drop-zone"
      >
        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt"
          onChange={(e) => uploadFile(e.target.files[0])} />
        <div className="w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center mx-auto mb-4">
          {uploading
            ? <RefreshCw size={24} className="text-primary-400 animate-spin" />
            : <Upload size={24} className="text-primary-400" />
          }
        </div>
        <p className="text-slate-300 font-semibold mb-1">
          {uploading ? 'Uploading…' : dragOver ? 'Drop to upload!' : 'Drag & drop your file here'}
        </p>
        <p className="text-slate-500 text-sm">Supports PDF, DOCX, TXT — click to browse</p>
      </motion.div>

      {/* Materials List */}
      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
        ) : materials.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <File size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No materials yet</p>
            <p className="text-slate-500 text-sm mt-1">Upload a file or paste text to get started.</p>
          </div>
        ) : (
          <AnimatePresence>
            {materials.map((m) => (
              <MaterialCard key={m.id} material={m} onDelete={handleDelete} onRefresh={handleRefresh} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
