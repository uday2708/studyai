import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

/* ── Toast Store (simple module-level singleton) ────────────────────────── */
let _addToast = null

export function registerToast(fn) { _addToast = fn }

export function toast(message, type = 'info') {
  if (_addToast) _addToast(message, type)
}

/* ── Toast icons & colors ────────────────────────────────────────────────── */
const CONFIGS = {
  success: { Icon: CheckCircle, color: 'text-emerald-400', bg: 'border-emerald-500/40 bg-emerald-500/10' },
  error:   { Icon: XCircle,     color: 'text-red-400',     bg: 'border-red-500/40 bg-red-500/10' },
  warning: { Icon: AlertCircle, color: 'text-amber-400',   bg: 'border-amber-500/40 bg-amber-500/10' },
  info:    { Icon: Info,        color: 'text-primary-400', bg: 'border-primary-500/40 bg-primary-500/10' },
}

/* ── Individual Toast ────────────────────────────────────────────────────── */
function ToastItem({ id, message, type, onRemove }) {
  const { Icon, color, bg } = CONFIGS[type] || CONFIGS.info
  return (
    <motion.div
      key={id}
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{    opacity: 0, x: 80, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-glass max-w-sm w-full ${bg}`}
    >
      <Icon size={18} className={`mt-0.5 flex-shrink-0 ${color}`} />
      <p className="text-sm text-slate-200 flex-1">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

/* ── Toast Container ─────────────────────────────────────────────────────── */
export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 4000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Register the adder so it can be called from anywhere
  useState(() => { registerToast(addToast) })

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
