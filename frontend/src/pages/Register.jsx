import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, BookOpenCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/Toast'

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form, setForm]         = useState({ email: '', username: '', password: '', confirm: '' })
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.username || !form.password) {
      toast('Please fill in all required fields.', 'warning'); return
    }
    if (form.password !== form.confirm) {
      toast('Passwords do not match.', 'error'); return
    }
    if (form.password.length < 6) {
      toast('Password must be at least 6 characters.', 'warning'); return
    }
    setLoading(true)
    try {
      await register(form.email, form.username, form.password)
      toast("Account created! Let's start studying 🚀", 'success')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.'
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { id: 'register-email',    label: 'Email',    key: 'email',    type: 'email',    Icon: Mail,  placeholder: 'you@example.com', autoComplete: 'email' },
    { id: 'register-username', label: 'Username', key: 'username', type: 'text',     Icon: User,  placeholder: 'john_doe',        autoComplete: 'username' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
            <BookOpenCheck size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">StudyAI</span>
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">Create account</h2>
        <p className="text-slate-400 text-sm mb-8">Start your AI-powered learning journey today.</p>

        <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
          {fields.map(({ id, label, key, type, Icon, placeholder, autoComplete }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
              <div className="relative">
                <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id={id}
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="input-field pl-10"
                  autoComplete={autoComplete}
                />
              </div>
            </div>
          ))}

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="register-password"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 characters"
                className="input-field pl-10 pr-10"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPass((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Toggle password visibility">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="register-confirm"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Repeat password"
                className="input-field pl-10"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
